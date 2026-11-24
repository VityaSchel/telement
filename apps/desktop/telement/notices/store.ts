/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import fs from "node:fs";
import path from "node:path";

/** A package in `node_modules`. */
export interface InstalledPackage {
    name: string;
    version: string;
    /** License of the package's metadata. */
    license?: string;
    directory: string;
    /** Version ranges of the dependencies, along with those only installed where they work. */
    dependencies: Record<string, string>;
    optionalDependencies: Record<string, string>;
}

/** Name and version of a package, as part of the path of one of its modules. */
export interface PackageReference {
    name: string;
    /** Unset when the path doesn't tell. */
    version?: string;
}

const COMMIT = /^[0-9a-f]{40}$/;

/** Parses the name of a directory in pnpm's virtual store, such as `@scope+name@1.2.3_peer@4.5.6`. */
export function parseStoreEntry(entry: string): PackageReference | undefined {
    const match = /^((?:@[^+]+\+)?[^@+]+)@([^_]+)/.exec(entry);
    if (!match) return undefined;

    const [, name, version] = match;
    const isUrl = version.includes("+++");
    const commit = version.split("+").at(-1)!;
    return { name: name.replace("+", "/"), version: !isUrl ? version : COMMIT.test(commit) ? commit : undefined };
}

/** Parses a package's name and version as `name@version`, or only its name. */
export function parsePackageKey(key: string): PackageReference {
    const [, name, version] = /^(@?[^@]+)(?:@(.+))?$/.exec(key)!;
    return { name, version };
}

/**
 * Whether a caret range includes both versions, as a package rarely changes its license within one.
 * Versions that are unknown or not yet released are taken as if it did.
 */
export function isInSameRange(version: string | undefined, otherVersion: string | undefined): boolean {
    if (!version || !otherVersion || COMMIT.test(version) || COMMIT.test(otherVersion)) return true;

    const [major, minor] = version.split(".");
    const [otherMajor, otherMinor] = otherVersion.split(".");
    return major === otherMajor && (major !== "0" || minor === otherMinor);
}

/** Reads the package in a directory, if there is one. */
export function readPackage(directory: string): InstalledPackage | undefined {
    const file = path.join(directory, "package.json");
    if (!fs.existsSync(file)) return undefined;

    const metadata = JSON.parse(fs.readFileSync(file, "utf8"));
    const license = metadata.license ?? metadata.licenses?.[0];
    return {
        name: metadata.name,
        version: metadata.version,
        license: license?.type ?? license,
        directory: fs.realpathSync(directory),
        dependencies: { ...metadata.dependencies, ...metadata.optionalDependencies },
        optionalDependencies: metadata.optionalDependencies ?? {},
    };
}

/** Finds a package's dependency where Node would. */
export function resolveDependency(directory: string, name: string): InstalledPackage | undefined {
    const installed = readPackage(path.join(directory, "node_modules", name));
    const parent = path.dirname(directory);
    return installed ?? (parent === directory ? undefined : resolveDependency(parent, name));
}

/** The packages in pnpm's virtual store, which is where pnpm installs all of them. */
export class PackageStore {
    public readonly directory: string;
    private readonly packages = new Map<string, InstalledPackage[]>();

    public constructor(directory: string) {
        this.directory = directory;
        for (const entry of fs.readdirSync(directory)) {
            const name = parseStoreEntry(entry)?.name;
            const installed = name && readPackage(path.join(directory, entry, "node_modules", name));
            if (installed) this.packages.set(name, [...(this.packages.get(name) ?? []), installed]);
        }
    }

    /** Finds a package by its name and exact version. */
    public find({ name, version }: PackageReference): InstalledPackage | undefined {
        return this.packages.get(name)?.find((installed) => installed.version === version);
    }

    /** Finds a package of which only one version is installed. */
    public findOnly(name: string): InstalledPackage | undefined {
        const versions = new Set(this.packages.get(name)?.map(({ version }) => version));
        return versions.size === 1 ? this.packages.get(name)![0] : undefined;
    }

    /** Lists the versions of a package that likely have the same license as the given version. */
    public listSimilar({ name, version }: PackageReference): InstalledPackage[] {
        return (this.packages.get(name) ?? []).filter((installed) => isInSameRange(installed.version, version));
    }
}
