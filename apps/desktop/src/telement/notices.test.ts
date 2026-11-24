/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import recordedCrates from "../../telement/notices/crates.json" with { type: "json" };
import {
    type CargoMetadata,
    chooseLicenseFiles,
    isApacheLicensed,
    listBuiltInCrates,
} from "../../telement/notices/crates.ts";
import { generate } from "../../telement/notices/generate.ts";
import { collectNotices, type NoticesResult } from "../../telement/notices/notices.ts";
import { overrides as realOverrides } from "../../telement/notices/overrides.ts";
import { renderNotices } from "../../telement/notices/render.ts";
import { cratesWithoutLicenseFile } from "../../telement/notices/rustPackages.ts";
import { parseModulePath } from "../../telement/notices/scan.ts";
import { isInSameRange, parseStoreEntry } from "../../telement/notices/store.ts";
import { type Crates, type Notice, type Overrides } from "../../telement/notices/types.ts";

const noticesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "telement", "notices");
const STORE = "node_modules/.pnpm";

describe("third-party notices", () => {
    let repositoryDir: string;

    beforeEach(() => {
        repositoryDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "notices-")));
        write("apps/desktop/package.json", { name: "desktop", version: "1.0.0" });
        fs.mkdirSync(path.join(repositoryDir, "webapp"));
        fs.mkdirSync(path.join(repositoryDir, STORE), { recursive: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        fs.rmSync(repositoryDir, { recursive: true });
    });

    function write(file: string, content: string | object): void {
        const target = path.join(repositoryDir, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, typeof content === "string" ? content : JSON.stringify(content));
    }

    /** Installs a package as pnpm does, along with the files that it consists of. */
    function install(name: string, version: string, files: Record<string, string>, metadata: object = {}): void {
        const directory = `${STORE}/${name.replace("/", "+")}@${version}/node_modules/${name}`;
        write(`${directory}/package.json`, { name, version, license: "MIT", ...metadata });
        for (const [file, content] of Object.entries(files)) write(`${directory}/${file}`, content);
    }

    /** Makes a package available to another one, as pnpm does. */
    function link(directory: string, name: string, version: string): void {
        const target = path.join(repositoryDir, STORE, `${name}@${version}`, "node_modules", name);
        const modules = path.join(repositoryDir, directory, "node_modules");
        fs.mkdirSync(modules, { recursive: true });
        fs.symlinkSync(target, path.join(modules, name));
    }

    function bundle(sources: string[], sourcesContent?: string[]): void {
        write("webapp/bundles/abc/bundle.js.map", { sources, sourcesContent });
    }

    function collect(overrides: Partial<Overrides> = {}, crates: Partial<Crates> = {}): NoticesResult {
        return collectNotices({
            webappDir: path.join(repositoryDir, "webapp"),
            desktopDir: path.join(repositoryDir, "apps", "desktop"),
            textsDir: path.join(repositoryDir, "notices"),
            overrides: { notices: {}, contents: {}, unused: {}, origins: {}, rustPackages: [], ...overrides },
            crates: { packages: {}, crates: {}, texts: {}, ...crates },
        });
    }

    function listTitles({ notices }: NoticesResult): string[] {
        return notices.map(({ name, version, within }) => `${name} ${version ?? `in ${within}`}`);
    }

    describe("of bundled packages", () => {
        it("are those of the modules in source maps", () => {
            install("@scope/one", "1.0.0", { LICENSE: "License of one" });
            bundle([`webpack://app/../../${STORE}/@scope+one@1.0.0/node_modules/@scope/one/index.js`]);

            expect(collect()).toEqual({
                notices: [
                    expect.objectContaining({
                        name: "@scope/one",
                        version: "1.0.0",
                        license: "MIT",
                        texts: ["License of one"],
                    }),
                ],
                problems: [],
                unusedOverrides: [],
            });
        });

        it("are those of the modules that scripts name, which data has no source map for", () => {
            install("data", "1.0.0", { LICENSE: "License of data" });
            write("webapp/bundles/abc/1.js", `{"../../${STORE}/data@1.0.0/node_modules/data/x.json"(e){e.exports=1}}`);

            expect(listTitles(collect())).toEqual(["data 1.0.0"]);
        });

        it("include those that a bundled package's own source map names", () => {
            install("outer", "1.0.0", { "LICENSE": "License", "dist/outer.mjs.map": "" });
            write(`${STORE}/outer@1.0.0/node_modules/outer/dist/outer.mjs.map`, {
                sources: ["../src/outer.ts", "../node_modules/inner/index.js"],
            });
            install("inner", "2.0.0", { LICENSE: "License of inner" });
            bundle([`webpack://app/../../${STORE}/outer@1.0.0/node_modules/outer/dist/outer.mjs`]);

            expect(listTitles(collect())).toEqual(["outer 1.0.0", "inner in outer"]);
        });

        it("include those that the code of a bundle marks", () => {
            install("inner", "2.0.0", { LICENSE: "License of inner" });
            bundle(
                ["webpack://app/../../packages/own/dist/own.js"],
                [`let a;\n//#region ../../${STORE}/inner@2.0.0/node_modules/inner/index.js\nlet b;\n//#endregion`],
            );

            expect(listTitles(collect())).toEqual(["inner 2.0.0"]);
        });

        it("include the dependencies of those, and of packages of this repository, unless they're unused", () => {
            install("outer", "1.0.0", { LICENSE: "License" }, { dependencies: { inner: "^2.0.0", tool: "^3.0.0" } });
            install("inner", "2.0.1", { LICENSE: "License of inner" });
            install("helper", "4.0.0", { LICENSE: "License of helper" });
            link(`${STORE}/outer@1.0.0`, "inner", "2.0.1");
            write("packages/own/package.json", { name: "own", version: "1.0.0", dependencies: { helper: "^4.0.0" } });
            link("packages/own", "helper", "4.0.0");
            bundle([
                `webpack://app/../../${STORE}/outer@1.0.0/node_modules/outer/index.js`,
                "webpack://app/../../packages/own/dist/own.js",
            ]);

            expect(listTitles(collect({ unused: { outer: ["tool"] } }))).toEqual([
                "outer 1.0.0",
                "inner 2.0.1",
                "helper 4.0.0",
            ]);
            expect(collect().problems).toEqual([expect.stringContaining("tool 3.0.0 (in outer)")]);
        });
    });

    it("include those of the desktop app's dependencies, even of those for other platforms", () => {
        write("apps/desktop/package.json", {
            name: "desktop",
            dependencies: { runtime: "^1.0.0" },
            optionalDependencies: { "native-linux": "^5.0.0" },
        });
        install("runtime", "1.0.0", { LICENSE: "License of runtime" });
        link("apps/desktop", "runtime", "1.0.0");
        write("notices/native.txt", "License of native-linux");

        expect(listTitles(collect({ notices: { "native-linux": { license: "MIT", texts: ["native.txt"] } } }))).toEqual(
            ["runtime 1.0.0", "native-linux 5.0.0"],
        );
    });

    describe("without a license file", () => {
        beforeEach(() => {
            install("one", "1.2.0", { "README.md": "# one\n\n## License\n\nMIT\n" });
            bundle([`webpack://app/../../${STORE}/one@1.2.0/node_modules/one/index.js`]);
            write("notices/one.txt", "Copy of the license of one");
        });

        it("are reported", () => {
            const { notices, problems } = collect();
            expect(notices).toEqual([]);
            expect(problems).toEqual(["one 1.2.0 (in bundles/abc/bundle.js.map) has no license file"]);
        });

        it("have the text of the README", () => {
            const text = "Copyright (c) One\n\nPermission is hereby granted, free of charge\n";
            install("one", "1.2.0", { "README.md": `# one\n\n## License\n\n${text}\n## Support\n\nNone\n` });
            expect(collect().notices[0].texts).toEqual([`\n${text}\n`]);
        });

        it("have the texts of an override", () => {
            const override = { texts: ["one.txt"], copyright: "Copyright (c) One", remark: "Remark" };
            const { notices, problems } = collect({ notices: { one: override } });
            expect(problems).toEqual([]);
            expect(notices).toEqual([
                expect.objectContaining({
                    license: "MIT",
                    texts: ["Copy of the license of one"],
                    copyright: "Copyright (c) One",
                    remark: "Remark",
                }),
            ]);
        });

        it("have the texts of an override only within the range that it was checked for", () => {
            const override = { license: "ISC", texts: ["one.txt"] };
            expect(collect({ notices: { one: { ...override, versions: ["1.0.0"] } } }).problems).toEqual([]);
            expect(collect({ notices: { one: { ...override, versions: ["0.9.0", "2.0.0"] } } }).problems).toEqual([
                expect.stringContaining("one 1.2.0 (in bundles/abc/bundle.js.map) isn't in the ranges"),
            ]);
        });

        it("have the texts of the package that an override names", () => {
            install("two", "7.0.0", { LICENSE: "License of two" });
            expect(collect({ notices: { one: { sameAs: "two" } } }).notices[0].texts).toEqual(["License of two"]);
        });

        it("have the texts of another version of the package in the same range", () => {
            install("one", "1.3.0", { LICENSE: "License of one 1.3.0" });
            install("one", "2.0.0", { LICENSE: "License of one 2.0.0" });
            expect(collect().notices[0]).toMatchObject({ version: "1.2.0", texts: ["License of one 1.3.0"] });
        });
    });

    it("have the license of an override, and its texts in addition to the package's", () => {
        install("one", "1.0.0", { "LICENSE": "Either", "NOTICE.md": "Notice", "LICENSE-COMMERCIAL": "Paid" });
        bundle([`webpack://app/../../${STORE}/one@1.0.0/node_modules/one/index.js`]);
        write("notices/extra.txt", "Extra");

        const overrides = { notices: { one: { license: "ISC", extraTexts: ["extra.txt"] } } };
        expect(collect(overrides).notices[0]).toMatchObject({ license: "ISC", texts: ["Either", "Notice", "Extra"] });
    });

    it("tell that overrides apply to nothing", () => {
        const { unusedOverrides } = collect({
            notices: { one: {} },
            contents: { "two@1.0.0": ["three"] },
            unused: { four: ["five"] },
            origins: { "^fonts/": null },
        });
        expect(unusedOverrides).toEqual([
            "notice of one",
            "contents of two@1.0.0",
            "origin ^fonts/",
            "unused dependency five of four",
        ]);
    });

    describe("of files that aren't modules", () => {
        it.each(["fonts/One.woff2", "models/one.tflite", "one.wasm", "one.min.js"])("are needed for %s", (file) => {
            write(`webapp/${file}`, "");
            expect(collect().problems).toEqual([`${file}: nothing tells what it is from`]);
            expect(collect({ origins: { "one|One": null } }).problems).toEqual([]);
        });

        it.each(["bundles/abc/1.wasm", "img/one.png", "bundles/abc/1.js"])("aren't needed for %s", (file) => {
            write(`webapp/${file}`, "");
            expect(collect().problems).toEqual([]);
        });

        it("are those of the works that the overrides say", () => {
            write("webapp/fonts/One.woff2", "");
            write("notices/one.txt", "License of One");
            bundle(["webpack://app/./src/two.ts"]);
            const { notices, problems } = collect({
                notices: {
                    One: { license: "OFL-1.1", texts: ["one.txt"] },
                    Two: { license: "MIT", texts: ["one.txt"] },
                },
                origins: { "^fonts/One": "One", "/src/two\\.ts$": "Two" },
            });
            expect(problems).toEqual([]);
            expect(notices.map(({ name, within }) => [name, within])).toEqual([
                ["One", undefined],
                ["Two", undefined],
            ]);
        });
    });

    describe("of works contained in a package", () => {
        beforeEach(() => {
            install("outer", "1.2.0", { LICENSE: "License" });
            bundle([`webpack://app/../../${STORE}/outer@1.2.0/node_modules/outer/index.js`]);
            write("notices/library.txt", "License of the library");
        });

        const notices = { Library: { license: "Zlib", texts: ["library.txt"] } };

        it("are those that the overrides say", () => {
            const result = collect({ notices, contents: { outer: ["Library"] } });
            expect(result.problems).toEqual([]);
            expect(listTitles(result)).toEqual(["outer 1.2.0", "Library in outer"]);
        });

        it("are reported for versions that the overrides don't say it for", () => {
            expect(collect({ notices, contents: { "outer@1.0.0": ["Library"] } }).problems).toEqual([]);
            expect(collect({ notices, contents: { "outer@2.0.0": ["Library"] } }).problems).toEqual([
                "outer 1.2.0: what it contains is unknown",
            ]);
        });
    });

    describe("of Rust crates", () => {
        beforeEach(() => {
            install("module", "1.0.0", { LICENSE: "License" });
            bundle([`webpack://app/../../${STORE}/module@1.0.0/node_modules/module/index.js`]);
            write("notices/Apache-2.0.txt", "Apache License");
        });

        it("are those recorded for the package that contains them", () => {
            const { notices, problems } = collect(
                { rustPackages: ["module"] },
                {
                    packages: { "module@1.0.0": ["a@1.0.0", "b@0.2.0"], "module@0.9.0": ["c@3.0.0"] },
                    crates: {
                        "a@1.0.0": { license: "MIT OR Apache-2.0", texts: ["Apache-2.0.txt"] },
                        "b@0.2.0": { license: "MPL-2.0", texts: ["1234abcd"] },
                        "c@3.0.0": { license: "MIT", texts: ["1234abcd"] },
                    },
                    texts: { "1234abcd": "Mozilla Public License" },
                },
            );
            expect(problems).toEqual([]);
            expect(notices.slice(1)).toEqual([
                expect.objectContaining({ name: "a", version: "1.0.0", texts: ["Apache License"], remark: undefined }),
                expect.objectContaining({
                    name: "b",
                    version: "0.2.0",
                    texts: ["Mozilla Public License"],
                    remark: "Source code: https://crates.io/crates/b/0.2.0",
                }),
            ]);
        });

        it("are reported for a version that they weren't recorded for, with the command that records them", () => {
            const { problems } = collect({ rustPackages: ["module"] }, { packages: { "module@0.9.0": [] } });
            expect(problems).toEqual([
                expect.stringMatching(/in module@1\.0\.0 are unknown.*crates\.ts module@1\.0\.0$/),
            ]);
        });

        it("are recorded for the crates that a build contains, without those that only build it", () => {
            const crate = (name: string, kind = "lib", source: string | null = "registry"): object => ({
                id: name,
                name,
                targets: [{ kind: [kind] }],
                source,
            });
            const dependency = (pkg: string, kind: string | null = null): object => ({ pkg, dep_kinds: [{ kind }] });
            const metadata = {
                packages: [
                    crate("root", "cdylib", null),
                    crate("used"),
                    crate("indirect"),
                    crate("macro", "proc-macro"),
                    crate("macro-only"),
                    crate("build-only"),
                ],
                resolve: {
                    root: "root",
                    nodes: [
                        {
                            id: "root",
                            deps: [dependency("used"), dependency("macro"), dependency("build-only", "build")],
                        },
                        { id: "used", deps: [dependency("indirect")] },
                        { id: "indirect", deps: [] },
                        { id: "macro", deps: [dependency("macro-only")] },
                        { id: "macro-only", deps: [] },
                        { id: "build-only", deps: [] },
                    ],
                },
            } as unknown as CargoMetadata;
            expect(listBuiltInCrates(metadata).map(({ name }) => name)).toEqual(["used", "indirect"]);
        });

        it.each([
            ["Apache-2.0", true],
            ["MIT OR Apache-2.0", true],
            ["MIT/Apache-2.0", true],
            ["MIT", false],
            ["Apache-2.0 AND ISC", false],
            ["(MIT OR Apache-2.0) AND Unicode-3.0", false],
            ["Apache-2.0 WITH LLVM-exception", false],
        ])("have the Apache License's text if it's one to choose: %s", (license, expected) => {
            expect(isApacheLicensed(license)).toBe(expected);
        });

        it.each([
            ["Unlicense OR MIT", ["COPYING", "LICENSE-MIT", "UNLICENSE"], ["LICENSE-MIT"]],
            ["Apache-2.0 AND ISC", ["LICENSE", "LICENSE-BoringSSL"], ["LICENSE", "LICENSE-BoringSSL"]],
            ["MIT", ["LICENSE"], ["LICENSE"]],
        ])("have the text of the license to choose, or else all: %s", (license, files, expected) => {
            expect(chooseLicenseFiles(license, files)).toEqual(expected);
        });
    });

    it("have each license text once, under all the works that share it, in alphabetical order", () => {
        const notice = { license: "MIT", source: "test" };
        const notices: Notice[] = [
            { ...notice, name: "c", version: "1.0.0", texts: ["\n  MIT License\r\n\r\n  Text\n"] },
            { ...notice, name: "b", version: "10.0.0", texts: ["License of b", "Notice of b"] },
            { ...notice, name: "b", version: "9.0.0", texts: ["License of b"] },
            {
                ...notice,
                name: "A",
                within: "c",
                copyright: "Copyright (c) A\nand others",
                texts: ["MIT License  Text"],
            },
            { ...notice, name: "d", remark: "Remark", texts: ["License of d"] },
        ];

        const rule = "=".repeat(80);
        const thinRule = "-".repeat(80);
        const [introduction, ...sections] = renderNotices(notices).split(`${rule}\n`);
        expect(introduction).toMatch(/^THIRD-PARTY NOTICES\n/);
        expect(sections).toEqual([
            `A, in c (MIT)\n    Copyright (c) A\n    and others\nc 1.0.0 (MIT)\n${thinRule}\n\nMIT License  Text\n\n`,
            `b 9.0.0 (MIT)\nb 10.0.0 (MIT)\n${thinRule}\n\nLicense of b\n\n`,
            `b 10.0.0 (MIT)\n${thinRule}\n\nNotice of b\n\n`,
            `d (MIT)\n    Remark\n${thinRule}\n\nLicense of d\n`,
        ]);
    });

    it.each([
        [
            `webpack://app/../../${STORE}/@a+b@1.0.0_peer@2.0.0/node_modules/@a/b/x.js`,
            [{ name: "@a/b", version: "1.0.0" }],
        ],
        [
            `webpack://app/../${STORE}/outer@1.0.0/node_modules/${STORE}/inner@2.0.0/node_modules/inner/x.js`,
            [{ name: "inner", version: "2.0.0" }],
        ],
        [
            `../${STORE}/outer@1.0.0/node_modules/outer/node_modules/inner/x.js`,
            [{ name: "outer", version: "1.0.0" }, { name: "inner" }],
        ],
        [`../${STORE}/source-map-loader@5.0.0/node_modules/source-map-loader/dist/packages/own/x.js`, []],
        [
            `../${STORE}/outer@1.0.0/node_modules/.aspect_rules_js/a@0.0.0/node_modules/a/x.js`,
            [{ name: "outer", version: "1.0.0" }],
        ],
        ["../node_modules/@a/b/x.js", [{ name: "@a/b" }]],
        ["webpack://app/webpack/runtime/global", [{ name: "webpack" }]],
        ["webpack://app/./src/x.ts", []],
    ])("find the packages in the path of a module: %s", (modulePath, expected) => {
        expect(parseModulePath(modulePath)).toEqual(expected);
    });

    it("know the versions of packages from git by their commit", () => {
        const commit = "24929be0e741be6a5d0a7226f1c682e245263b8a";
        const url = "https+++codeload.github.com+org+name+tar.gz";
        expect(parseStoreEntry(`name@${url}+${commit}`)).toEqual({ name: "name", version: commit });
        expect(parseStoreEntry(`name@${url.slice(0, 30)}_56a13e21`)).toEqual({ name: "name", version: undefined });
        expect(isInSameRange(commit, "1.0.0")).toBe(true);
    });

    it.each([
        ["1.2.0", "1.10.3", true],
        ["1.2.0", "2.0.0", false],
        ["0.2.1", "0.2.9", true],
        ["0.2.1", "0.3.0", false],
        ["1.2.0", undefined, true],
    ])("take %s and %s as likely of the same license: %s", (version, otherVersion, expected) => {
        expect(isInSameRange(version, otherVersion)).toBe(expected);
    });

    describe("of Telement", () => {
        const { notices } = realOverrides;
        const crateTexts = Object.values(recordedCrates.crates).flatMap(({ texts }) => texts);
        const crateFiles = [...crateTexts, ...Object.values(cratesWithoutLicenseFile)].filter((id) => id.includes("/"));

        it("have only license texts that exist", () => {
            const files = Object.values(notices).flatMap(({ texts = [], extraTexts = [] }) => [
                ...texts,
                ...extraTexts,
            ]);
            const missing = [...files, ...crateFiles].filter((file) => !fs.existsSync(path.join(noticesDir, file)));
            expect(missing).toEqual([]);

            const ids = crateTexts.filter((id) => !id.includes("/"));
            expect(ids.filter((id) => !(id in recordedCrates.texts))).toEqual([]);
        });

        it("have no license texts that nothing uses", () => {
            const used = [...Object.values(notices).flatMap(({ texts = [] }) => texts), ...crateFiles];
            const files = fs.readdirSync(path.join(noticesDir, "texts")).map((file) => `texts/${file}`);
            expect(files.filter((file) => !used.includes(file))).toEqual([]);
        });

        it("are written for the packages of the desktop app", { timeout: 60_000 }, () => {
            const output = path.join(repositoryDir, "notices.txt");
            vi.spyOn(console, "warn").mockReturnValue();
            vi.spyOn(console, "log").mockReturnValue();

            expect(generate({ webapp: path.join(repositoryDir, "webapp"), output })).toBe(true);
            const text = fs.readFileSync(output, "utf8");
            expect(text).toMatch(/^electron-store [\d.]+ \(MIT\)$/m);
            expect(text).toMatch(/^OpenSSL, in @matrix-org\/seshat \(Apache-2\.0\)$/m);
        });

        it("end the build if something would ship without one", { timeout: 60_000 }, () => {
            write("webapp/fonts/Unknown.woff2", "");
            const output = path.join(repositoryDir, "notices.txt");
            const script = path.join(noticesDir, "generate.ts");
            const args = [script, "--webapp", path.join(repositoryDir, "webapp"), "--output", output];

            const { status, stderr } = spawnSync(process.execPath, args, { encoding: "utf8" });
            expect(status).toBe(1);
            expect(stderr).toContain("These would ship without a license notice:\n  fonts/Unknown.woff2");
            expect(fs.existsSync(output)).toBe(false);
        });
    });
});
