/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import fs from "node:fs";
import path from "node:path";

import {
    listBundledPackages,
    listDependencies,
    listDesktopPackages,
    listOwnPackages,
    listUntraceableFiles,
    readWebapp,
    type ShippedWork,
    type Webapp,
} from "./scan.ts";
import { type InstalledPackage, isInSameRange, type PackageReference, PackageStore, parsePackageKey } from "./store.ts";
import { type Crates, type Notice, type Override, type Overrides } from "./types.ts";

export interface NoticesInput {
    /** Build of the web app. */
    webappDir: string;
    /** Workspace of the desktop app. */
    desktopDir: string;
    /** Directory that the files of license texts in the overrides are relative to. */
    textsDir: string;
    overrides: Overrides;
    crates: Crates;
}

export interface NoticesResult {
    notices: Notice[];
    /** Reasons why something would ship without a notice. */
    problems: string[];
    /** Overrides that no longer apply to anything. */
    unusedOverrides: string[];
}

const LICENSE_FILE = /^(licen[sc]e|copying|copyright|notice|unlicense|third[-_ ]?party)/i;
/** Element's offer of a license other than the AGPL, which Telement doesn't use. */
const UNUSED_LICENSE_FILE = /commercial/i;
const LICENSE_TEXT = /permission is hereby granted|redistribution and use/i;

/** Reads the license texts of a package, which some have in their README. */
function readOwnTexts({ directory }: InstalledPackage): string[] {
    const readTexts = (names: string[]): string[] =>
        names.map((name) => fs.readFileSync(path.join(directory, name), "utf8")).filter((text) => text.trim());
    const files = fs
        .readdirSync(directory, { withFileTypes: true })
        .filter((file) => file.isFile())
        .map((file) => file.name);

    const texts = readTexts(files.filter((name) => LICENSE_FILE.test(name) && !UNUSED_LICENSE_FILE.test(name)));
    if (texts.length) return texts;
    return readTexts(files.filter((name) => /^readme\b/i.test(name)))
        .flatMap((readme) => readme.split(/^(?=#)/m))
        .filter((section) => /^#+.*licen[sc]e/i.test(section) && LICENSE_TEXT.test(section))
        .map((section) => section.replace(/^.*\n/, ""));
}

/** Leaves each version of a work once, and the works without a version only if no version of them is known. */
function mergeWorks(works: ShippedWork[]): ShippedWork[] {
    const withVersion = new Set(works.filter(({ version }) => version).map(({ name }) => name));
    const merged = new Map<string, ShippedWork>();
    for (const work of works) {
        const key = `${work.name}@${work.version}`;
        if ((work.version || !withVersion.has(work.name)) && !merged.has(key)) merged.set(key, work);
    }
    return [...merged.values()];
}

/** Collects the notices of all that Telement ships. */
class NoticeCollector {
    private readonly problems: string[] = [];
    private readonly appliedOverrides = new Set<string>();
    private readonly repositoryDir: string;
    private readonly store: PackageStore;
    private readonly webapp: Webapp;
    private readonly input: NoticesInput;

    public constructor(input: NoticesInput) {
        this.input = input;
        this.repositoryDir = path.join(input.desktopDir, "..", "..");
        this.store = new PackageStore(path.join(this.repositoryDir, "node_modules", ".pnpm"));
        this.webapp = readWebapp(input.webappDir);
    }

    public collect(): NoticesResult {
        const bundled = listBundledPackages(this.webapp, this.store);
        const outer = [
            ...bundled,
            ...this.listUntracedDependencies(bundled),
            ...this.listOrigins(),
            ...listDesktopPackages(this.input.desktopDir),
        ];
        const works = [...outer, ...this.listContents(mergeWorks(outer))];

        const notices = mergeWorks(works).flatMap((work) => {
            const notice = this.findNotice(work);
            return notice ? { ...notice, within: this.describeContainers(work, works) } : [];
        });
        return {
            notices: [...notices, ...this.listCrates(mergeWorks(works))],
            problems: this.problems,
            unusedOverrides: this.listOverrides().filter((override) => !this.appliedOverrides.has(override)),
        };
    }

    /** Lists the dependencies of bundled packages, which these can hold copies of without a trace of them. */
    private listUntracedDependencies(bundled: ShippedWork[]): ShippedWork[] {
        const packages = [
            ...mergeWorks(bundled).flatMap((work) => this.store.find(work) ?? []),
            ...listOwnPackages(this.webapp, this.repositoryDir),
        ];
        const bundledNames = new Set(bundled.map(({ name }) => name));
        return listDependencies(packages, (name, dependent) => {
            const unused = this.input.overrides.unused[dependent.name] ?? [];
            const entry = unused.find((dependency) => [name, "*"].includes(dependency));
            if (entry) this.appliedOverrides.add(`unused dependency ${entry} of ${dependent.name}`);
            const isOptional = name in dependent.optionalDependencies;
            return entry !== undefined || isOptional || bundledNames.has(name) || name.startsWith("@types/");
        });
    }

    /** Lists the works that the paths of files and modules tell of. */
    private listOrigins(): ShippedWork[] {
        const paths = [...this.webapp.files, ...this.webapp.modules.keys()];
        const matches = Object.entries(this.input.overrides.origins).flatMap(([pattern, name]) => {
            const matching = paths.filter((file) => new RegExp(pattern).test(file));
            if (matching.length) this.appliedOverrides.add(`origin ${pattern}`);
            return matching.map((file) => ({ name, file }));
        });

        const knownFiles = new Set(matches.map(({ file }) => file));
        const unknownFiles = listUntraceableFiles(this.webapp).filter((file) => !knownFiles.has(file));
        this.problems.push(...unknownFiles.map((file) => `${file}: nothing tells what it is from`));

        return matches.flatMap(({ name, file }) =>
            name === null ? [] : { name, version: this.store.findOnly(name)?.version, foundIn: file },
        );
    }

    /** Lists the works contained in others, and those in them. */
    private listContents(works: ShippedWork[]): ShippedWork[] {
        const contents = works.flatMap(({ name, version }) => {
            const entries = Object.entries(this.input.overrides.contents)
                .map(([key, names]) => ({ key, names, container: parsePackageKey(key) }))
                .filter(({ container }) => container.name === name);
            const entry = entries.find(({ container }) => isInSameRange(container.version, version));
            if (entries.length && !entry) this.problems.push(`${name} ${version}: what it contains is unknown`);
            if (entry) this.appliedOverrides.add(`contents of ${entry.key}`);
            return (entry?.names ?? []).map((content) => ({ name: content, foundIn: name }));
        });
        return contents.length ? [...contents, ...this.listContents(contents)] : [];
    }

    private findNotice(work: ShippedWork): Notice | undefined {
        const { name, version, foundIn } = work;
        const override: Override = this.input.overrides.notices[name] ?? {};
        this.appliedOverrides.add(`notice of ${name}`);

        const installed = this.store.find(work);
        const similar = this.findLicensed(work);
        const twin = override.sameAs ? this.findLicensed({ name: override.sameAs }) : undefined;
        const isChecked = override.versions?.some((checked) => isInSameRange(checked, version)) ?? true;
        const candidates = [
            {
                texts: this.readTexts(installed, override.extraTexts),
                source: "its own license file",
                origin: installed,
            },
            isChecked && { texts: this.readTexts(undefined, override.texts), source: "an override", origin: installed },
            isChecked && { texts: this.readTexts(twin), source: `the license file of ${twin?.name}`, origin: twin },
            {
                texts: this.readTexts(similar),
                source: `the license file of version ${similar?.version}`,
                origin: similar,
            },
        ];
        const found = candidates.find((candidate) => candidate && candidate.texts.length);
        if (!found) {
            const reason = isChecked ? "has no license file" : "isn't in the ranges that its override was checked for";
            this.problems.push(`${name} ${version ?? ""} (in ${foundIn}) ${reason}`);
            return undefined;
        }

        const { texts, source, origin } = found;
        const license = override.license ?? installed?.license ?? origin?.license ?? "license below";
        return { name, version, license, copyright: override.copyright, remark: override.remark, texts, source };
    }

    /** Finds a package with license texts that are likely those of the given version. */
    private findLicensed(reference: PackageReference): InstalledPackage | undefined {
        return this.store.listSimilar(reference).find((installed) => readOwnTexts(installed).length);
    }

    /** Reads the texts of a package, followed by others if it has any or isn't given. */
    private readTexts(installed: InstalledPackage | undefined, files: string[] = []): string[] {
        const ownTexts = installed ? readOwnTexts(installed) : [];
        return installed && !ownTexts.length ? [] : [...ownTexts, ...files.map((file) => this.readText(file))];
    }

    private readText(file: string): string {
        return fs.readFileSync(path.join(this.input.textsDir, file), "utf8");
    }

    /** Names what contains a work, unless it has a version to tell it by or is a file of its own. */
    private describeContainers({ name, version }: ShippedWork, works: ShippedWork[]): string | undefined {
        if (version) return undefined;
        const names = new Set(works.map((work) => work.name));
        const containers = works.filter((work) => work.name === name && names.has(work.foundIn));
        return [...new Set(containers.map(({ foundIn }) => foundIn))].join(", ") || undefined;
    }

    private listCrates(works: ShippedWork[]): Notice[] {
        const { crates, overrides, textsDir } = this.input;
        const packages = works
            .filter(({ name }) => overrides.rustPackages.includes(name))
            .map(({ name, version }) => `${name}@${version}`);
        const unknown = packages.filter((key) => !crates.packages[key]);
        if (unknown.length) {
            const command = `node ${path.join(textsDir, "crates.ts")} ${packages.join(" ")}`;
            this.problems.push(`The crates in ${unknown.join(", ")} are unknown. Run ${command}`);
        }

        const keys = new Set(packages.flatMap((key) => crates.packages[key] ?? []));
        return [...keys].map((key) => {
            const { name, version } = parsePackageKey(key);
            const { license, texts } = crates.crates[key];
            // The MPL requires telling where the source code is
            const remark = license.includes("MPL")
                ? `Source code: https://crates.io/crates/${name}/${version}`
                : undefined;
            return {
                name,
                version,
                license: `Rust crate, ${license}`,
                remark,
                texts: texts.map((id) => crates.texts[id] ?? this.readText(id)),
                source: "crates.json",
            };
        });
    }

    private listOverrides(): string[] {
        const { notices, contents, origins, unused } = this.input.overrides;
        return [
            ...Object.keys(notices).map((name) => `notice of ${name}`),
            ...Object.keys(contents).map((key) => `contents of ${key}`),
            ...Object.keys(origins).map((pattern) => `origin ${pattern}`),
            ...Object.entries(unused).flatMap(([name, dependencies]) =>
                dependencies.map((dependency) => `unused dependency ${dependency} of ${name}`),
            ),
        ];
    }
}

/** Collects the notices of all that Telement ships, and what would ship without one. */
export function collectNotices(input: NoticesInput): NoticesResult {
    return new NoticeCollector(input).collect();
}
