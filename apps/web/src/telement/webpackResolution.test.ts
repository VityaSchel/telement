/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const APP_ROOT = path.resolve(import.meta.dirname, "../..");

/** The extensions webpack tries, in order, for an import that names none. */
function getWebpackExtensions(): string[] {
    const config = readFileSync(path.join(APP_ROOT, "webpack.config.ts"), "utf8");
    return JSON.parse(/\bextensions: (\[.*?\])/.exec(config)![1]);
}

/** The modules of `directory` that another file takes the place of when webpack resolves their name. */
function findShadowedModules(directory: string): string[] {
    const extensions = getWebpackExtensions();
    return readdirSync(directory, { encoding: "utf8", recursive: true })
        .map((file) => path.join(directory, file))
        .filter((file) => {
            const name = /^(.*)\.tsx?$/.exec(file)?.[1];
            const resolved = name && extensions.find((extension) => existsSync(name + extension));
            return resolved && !/^\.tsx?$/.test(resolved);
        });
}

// TypeScript and Vite resolve an import without an extension to a TypeScript module before a JSON file of the same name,
// while webpack loads the JSON, without failing the build: only the app would break, and neither the types nor the tests
describe("webpack's module resolution", () => {
    it("finds the order of extensions in webpack's config", () => {
        expect(getWebpackExtensions()).toEqual(expect.arrayContaining([".js", ".json", ".ts", ".tsx"]));
    });

    it.each(["src", "../../packages/shared-components/src"])(
        "loads every TypeScript module of %s rather than a file of the same name",
        (directory) => {
            expect(findShadowedModules(path.join(APP_ROOT, directory))).toEqual([]);
        },
    );
});
