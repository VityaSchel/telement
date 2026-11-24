/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import fs from "node:fs";
import path from "node:path";

import {
    type InstalledPackage,
    type PackageReference,
    type PackageStore,
    parseStoreEntry,
    readPackage,
    resolveDependency,
} from "./store.ts";

/** A package or other work that Telement ships, and what it was found in. */
export interface ShippedWork extends PackageReference {
    foundIn: string;
}

/** What a build of the web app consists of. */
export interface Webapp {
    /** Paths of the files, relative to the web app's. */
    files: string[];
    /** Paths of the bundled modules, as the bundler names them, and a file that each is in. */
    modules: Map<string, string>;
}

interface SourceMap {
    sources: string[];
    sourcesContent?: (string | null)[];
}

const STORE = ".pnpm/";

/** Webpack names some modules by the loader that handled them, rather than by their own path. */
const LOADERS = new Set(["source-map-loader"]);

/** Where bundlers write the path of each module they put in an unminified bundle. */
const MODULE_MARKERS = /^;?\/\/ ?(?:#region )?(\S*node_modules\/\S+)$/gm;

/** The directories in which formatjs's build keeps its own modules, as if they were packages. */
const BUILD_DIRECTORIES = /\/node_modules\/\.aspect_rules_js\/.*$/s;

/** Files that can be a work of others without a module that tells so. */
const UNTRACEABLE_FILES = /\.(woff2?|ttf|otf|wasm|tflite|onnx)$/;

/** Returns the part of a module's path that is in pnpm's virtual store. The one of a bundled package comes last. */
function getPathInStore(modulePath: string): string | undefined {
    const index = modulePath.lastIndexOf(STORE);
    return index === -1 ? undefined : modulePath.slice(index + STORE.length);
}

/** Finds the packages in the path of a module: its package, and one that this package brings a copy of. */
export function parseModulePath(modulePath: string): PackageReference[] {
    if (/^webpack:\/\/[^/]*\/webpack\//.test(modulePath)) return [{ name: "webpack" }];

    const pathInStore = getPathInStore(modulePath);
    const names = `/${pathInStore ?? modulePath}`
        .replace(BUILD_DIRECTORIES, "/")
        .split("/node_modules/")
        .slice(1)
        .map((directory) => ({ name: /^(?:@[^/]+\/)?[^/]*/.exec(directory)![0] }));
    if (pathInStore === undefined) return names.slice(-1);

    const reference = parseStoreEntry(pathInStore.split("/")[0]);
    return !reference || LOADERS.has(reference.name) ? [] : [reference, ...names.slice(1)];
}

function readSourceMap(file: string): SourceMap {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** Lists the paths of the modules that a source map or a script names. */
function listModules(file: string): string[] {
    if (file.endsWith(".map")) {
        const { sources, sourcesContent = [] } = readSourceMap(file);
        const bundled = sourcesContent.flatMap((content) => [...(content ?? "").matchAll(MODULE_MARKERS)]);
        return [...sources, ...bundled.map(([, modulePath]) => modulePath)];
    }
    // Webpack's IDs of the modules, which are the only trace of those that have no source map, such as JSON
    return fs.readFileSync(file, "utf8").match(/\.pnpm\/[^"'`\s\\]+/g) ?? [];
}

/** Reads what a build of the web app consists of. */
export function readWebapp(directory: string): Webapp {
    const files = fs
        .readdirSync(directory, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.relative(directory, path.join(entry.parentPath, entry.name)).replaceAll(path.sep, "/"))
        .sort();

    const modules = new Map<string, string>();
    for (const file of files.filter((name) => /\.(map|js)$/.test(name))) {
        for (const modulePath of listModules(path.join(directory, file))) {
            if (!modules.has(modulePath)) modules.set(modulePath, file);
        }
    }
    return { files, modules };
}

/** Lists the files of the web app that are or can be works of others, which no source map tells. */
export function listUntraceableFiles({ files }: Webapp): string[] {
    return files.filter((file) => {
        // Webpack names the modules of these, even of those in a file of their own
        if (file.startsWith("bundles/")) return false;
        return UNTRACEABLE_FILES.test(file) || (file.endsWith(".js") && !files.includes(`${file}.map`));
    });
}

/** Lists the packages with modules in the web app, or in the bundles of other packages that the web app uses. */
export function listBundledPackages({ modules }: Webapp, store: PackageStore): ShippedWork[] {
    /** Adds the version of a package that another one contains, if it is a dependency. */
    function locate(name: string, container: PackageReference): ShippedWork {
        const directory = store.find(container)?.directory;
        const version = directory && resolveDependency(directory, name)?.version;
        return { name, version, foundIn: container.name };
    }

    return [...modules].flatMap(([modulePath, file]) => {
        const [container, ...contents] = parseModulePath(modulePath);
        if (!container) return [];

        const pathInStore = getPathInStore(modulePath);
        const sourceMap = pathInStore && path.join(store.directory, `${/^[^?|]*/.exec(pathInStore)![0]}.map`);
        const sources = sourceMap && fs.existsSync(sourceMap) ? readSourceMap(sourceMap).sources : [];
        const inner = sources.filter((source) => source.includes("node_modules/")).flatMap(parseModulePath);
        return [{ ...container, foundIn: file }, ...[...contents, ...inner].map(({ name }) => locate(name, container))];
    });
}

/** Lists the dependencies of packages, and the dependencies of those, that aren't left out. */
export function listDependencies(
    packages: InstalledPackage[],
    isLeftOut: (name: string, dependent: InstalledPackage) => boolean = () => false,
): ShippedWork[] {
    const found = new Map<string, ShippedWork>();
    const remaining = [...packages];
    for (const dependent of remaining) {
        for (const [name, range] of Object.entries(dependent.dependencies)) {
            if (isLeftOut(name, dependent)) continue;
            const installed = resolveDependency(dependent.directory, name);
            // Those for other platforms aren't installed
            const { name: realName, version } = installed ?? { name, version: range.replace(/^[~^]/, "") };
            const key = `${realName}@${version}`;
            if (found.has(key)) continue;
            found.set(key, { name: realName, version, foundIn: dependent.name });
            if (installed) remaining.push(installed);
        }
    }
    const ownKeys = new Set(remaining.filter(isOwn).map(({ name, version }) => `${name}@${version}`));
    return [...found].flatMap(([key, work]) => (ownKeys.has(key) ? [] : work));
}

/** Whether a package is in this repository. */
function isOwn({ directory }: InstalledPackage): boolean {
    return !directory.split(path.sep).includes("node_modules");
}

/** Lists the packages of this repository with modules in the web app, whose builds contain copies of packages. */
export function listOwnPackages({ modules }: Webapp, repositoryDir: string): InstalledPackage[] {
    const directories = [...modules.keys()].flatMap(
        (modulePath) => /\/(packages\/[^/]+)\//.exec(modulePath)?.[1] ?? [],
    );
    return [...new Set(directories)].flatMap((directory) => readPackage(path.join(repositoryDir, directory)) ?? []);
}

/** Lists the packages that the desktop app's own code runs on, for all platforms. */
export function listDesktopPackages(desktopDir: string): ShippedWork[] {
    return listDependencies([readPackage(desktopDir)!]);
}
