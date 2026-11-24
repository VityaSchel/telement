/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/*
 * Records the Rust crates that packages were built from, which the packages don't tell, in crates.json.
 * Needs cargo, and downloads the sources of the packages and crates.
 * Usage: node crates.ts <name>@<version>..., with all the packages that contain Rust code
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { cratesWithoutLicenseFile, type RustPackage, rustPackages } from "./rustPackages.ts";
import { type Crates } from "./types.ts";

interface Crate {
    id: string;
    name: string;
    version: string;
    license: string | null;
    /** Null for crates that are in the repository of the package itself. */
    source: string | null;
    manifest_path: string;
    targets: { kind: string[] }[];
}

/** The parts of `cargo metadata`'s output that this uses. */
export interface CargoMetadata {
    packages: Crate[];
    resolve: {
        root: string;
        nodes: { id: string; deps: { pkg: string; dep_kinds: { kind: string | null }[] }[] }[];
    };
}

const LICENSE_FILE = /^(licen[sc]e|copying|copyright|notice|unlicense)/i;
const APACHE = "texts/Apache-2.0.txt";

/** Lists the crates that end up in the build of a package, which those that only build it don't. */
export function listBuiltInCrates({ packages, resolve }: CargoMetadata): Crate[] {
    const crates = new Map(packages.map((crate) => [crate.id, crate]));
    const dependencies = new Map(resolve.nodes.map(({ id, deps }) => [id, deps]));
    const isMacro = (id: string): boolean => crates.get(id)!.targets.some(({ kind }) => kind.includes("proc-macro"));

    const ids = new Set([resolve.root]);
    for (const id of ids) {
        const builtIn = dependencies.get(id)!.filter(({ dep_kinds: kinds }) => kinds.some(({ kind }) => kind === null));
        for (const { pkg } of builtIn.filter(({ pkg }) => !isMacro(pkg))) ids.add(pkg);
    }
    return [...ids].map((id) => crates.get(id)!).filter(({ source }) => source !== null);
}

/** Whether Telement uses a crate under the Apache License, as it does wherever it can, since one text then serves all. */
export function isApacheLicensed(license: string): boolean {
    return !/ AND |[()]/.test(license) && license.split(/ OR |\//).some((name) => name.trim() === "Apache-2.0");
}

/** Chooses the license files of a crate to show: those for the MIT License if it's one to choose, or else all. */
export function chooseLicenseFiles(license: string, files: string[]): string[] {
    const mitFiles = files.filter((file) => /mit/i.test(file));
    return /\bMIT\b/.test(license) && !license.includes(" AND ") && mitFiles.length ? mitFiles : files;
}

async function downloadSources(rustPackage: RustPackage, version: string, directory: string): Promise<void> {
    const { repository, tagPrefix = "" } = rustPackage;
    const url = `https://codeload.github.com/${repository}/tar.gz/refs/tags/${tagPrefix}${version}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.statusText}`);

    const archive = `${directory}.tar.gz`;
    fs.writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
    fs.mkdirSync(directory);
    execFileSync("tar", ["-xzf", archive, "--strip-components=1", "-C", directory]);
}

function readMetadata({ manifest, features = [], targets }: RustPackage, directory: string): CargoMetadata[] {
    const options = ["--format-version", "1", "--manifest-path", path.join(directory, manifest)];
    return targets.map((target) => {
        const args = [...options, "--features", features.join(","), "--filter-platform", target];
        // Where it runs, so the sources can't bring a configuration of cargo or rustup
        const cwd = path.dirname(directory);
        const output = execFileSync("cargo", ["metadata", ...args], { cwd, maxBuffer: 2 ** 30, encoding: "utf8" });
        return JSON.parse(output);
    });
}

async function main(keys: string[]): Promise<void> {
    const result: Crates = { packages: {}, crates: {}, texts: {} };
    const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "crates-"));

    function addText(text: string): string {
        const id = createHash("sha256").update(text.replaceAll(/\s+/g, " ").trim()).digest("hex").slice(0, 8);
        result.texts[id] ??= text;
        return id;
    }

    function listTexts({ name, license, manifest_path: manifest }: Crate): string[] {
        const directory = path.dirname(manifest);
        const files = fs.readdirSync(directory).filter((file) => LICENSE_FILE.test(file));
        const addFiles = (names: string[]): string[] =>
            names.map((file) => addText(fs.readFileSync(path.join(directory, file), "utf8")));

        if (isApacheLicensed(license!)) return [APACHE, ...addFiles(files.filter((file) => /^notice/i.test(file)))];
        if (files.length) return addFiles(chooseLicenseFiles(license!, files));
        const text = cratesWithoutLicenseFile[name];
        if (!text) throw new Error(`${name} has no license file; name its text in rustPackages.ts`);
        return [text];
    }

    for (const key of keys.toSorted()) {
        const [, name, version] = /^(.+)@(.+)$/.exec(key)!;
        const directory = path.join(temporaryDir, key.replaceAll("/", "+"));
        console.log(`Reading the crates of ${key}`);
        await downloadSources(rustPackages[name], version, directory);

        const crates = readMetadata(rustPackages[name], directory).flatMap(listBuiltInCrates);
        const crateKeys = new Set(crates.map((crate) => `${crate.name}@${crate.version}`));
        result.packages[key] = [...crateKeys].sort();
        for (const crate of crates) {
            result.crates[`${crate.name}@${crate.version}`] = { license: crate.license!, texts: listTexts(crate) };
        }
    }

    const sort = <T>(entries: Record<string, T>): Record<string, T> =>
        Object.fromEntries(Object.entries(entries).toSorted(([a], [b]) => (a < b ? -1 : 1)));
    const output = path.join(import.meta.dirname, "crates.json");
    fs.writeFileSync(output, JSON.stringify({ ...result, crates: sort(result.crates), texts: sort(result.texts) }));
    execFileSync("pnpm", ["exec", "oxfmt", output], { cwd: import.meta.dirname });
    fs.rmSync(temporaryDir, { recursive: true });
}

// Whether this is run, rather than imported
if (fs.realpathSync(process.argv[1]) === import.meta.filename) {
    main(process.argv.slice(2)).catch((e) => {
        console.error(e);
        process.exitCode = 1;
    });
}
