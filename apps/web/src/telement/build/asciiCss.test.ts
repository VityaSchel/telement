/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";
import { existsSync, globSync, readFileSync } from "node:fs";
import path from "node:path";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import postcss from "postcss";
import postcssScss from "postcss-scss";

import { asciiCss } from "./asciiCss";

const APP_ROOT = path.resolve(import.meta.dirname, "../../..");

/** Every character of the text that isn't ASCII. */
const nonAscii = (text: string): string[] => text.match(/[^\0-\x7f]/gu) ?? [];

/** The CSS as the build ships it: through the plugin, then minified as webpack does. */
async function build(css: string): Promise<string> {
    const { css: escaped } = await postcss([asciiCss()]).process(css, { from: undefined });
    const { code } = await CssMinimizerPlugin.cssnanoMinify({ "bundle.css": escaped }, undefined, {});
    return code as string;
}

/** A CSS string's characters, with its escapes read as CSS does. */
const read = (string: string): string =>
    string.replace(/\\([\da-f]{1,6})\s?/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));

describe("asciiCss", () => {
    it.each(["​", "· ", "⚠️ ", "a·b", "​1", "💡 c"])("ships the content %j in ASCII, unchanged", async (text) => {
        const built = await build(`.a::before { content: "${text}"; }`);

        expect(nonAscii(built)).toEqual([]);
        expect(read(/content:"(.*?)"/.exec(built)![1])).toBe(text);
    });

    it("ships names, at-rules and custom properties in ASCII too", async () => {
        const built = await build(
            `@layer é { .ü { --ö: "→"; animation-name: ñ; } } @supports (content: "…") { .b { color: red; } }`,
        );

        expect(built).toContain(".\\fc ");
        expect(nonAscii(built)).toEqual([]);
    });

    it("leaves ASCII stylesheets alone", async () => {
        const css = `.a::before { content: "\\200b"; background: url("a.png"); }`;

        expect((await postcss([asciiCss()]).process(css, { from: undefined })).css).toBe(css);
    });

    it("runs on every stylesheet webpack bundles", () => {
        const config = readFileSync(path.join(APP_ROOT, "webpack.config.ts"), "utf8");
        const pluginLists = config.match(/"plugins": \[[^]*?\n\s*\],/g)!;

        expect(pluginLists).toHaveLength(config.match(/loader: "postcss-loader"/g)!.length);
        for (const plugins of pluginLists) expect(plugins).toContain("asciiCss(),");
    });

    it("is matched by scripts in ASCII", () => {
        const config = readFileSync(path.join(APP_ROOT, "webpack.config.ts"), "utf8");

        expect(/new TerserPlugin\(\{[^]*?\n\s*\}\),/.exec(config)![0]).toContain("format: { ascii_only: true }");
    });

    // The whole of what the app's stylesheets and the shared components' built one hold today
    it("leaves nothing but ASCII of the stylesheets in this repository", async () => {
        const dist = path.join(APP_ROOT, "../../packages/shared-components/dist/element-web-shared-components.css");
        const files = globSync("res/**/*.pcss", { cwd: APP_ROOT }).map((file) => path.join(APP_ROOT, file));
        if (existsSync(dist)) files.push(dist);
        const written = new Map<string, string[]>();
        for (const file of files) {
            const { css } = await postcss([asciiCss()]).process(readFileSync(file, "utf8"), {
                from: file,
                parser: postcssScss,
            });
            const found = nonAscii(css.replaceAll(/\/\*[^]*?\*\//g, ""));
            if (found.length) written.set(file, found);
        }

        expect(files.length).toBeGreaterThan(300);
        expect(written).toEqual(new Map());
    });
});
