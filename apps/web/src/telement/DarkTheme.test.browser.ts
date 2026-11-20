/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, describe, expect, it } from "vitest";
import postcss from "postcss";
import postcssSimpleVars from "postcss-simple-vars";

import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";

/**
 * Loads `rules` with the dark theme's variables, resolved by postcss-simple-vars in the order the theme's entry point
 * imports them, as the build does. A variable takes the value of the right side where it is defined, so one that reads
 * a variable the dark theme only sets further down keeps the light theme's value. `toBrowserCss` resolves every
 * variable from its last definition, which hides that.
 */
async function loadWithDarkTheme(rules: string): Promise<HTMLStyleElement> {
    const { css } = await postcss([postcssSimpleVars()]).process([fontSizes, lightTheme, darkTheme, rules].join("\n"), {
        from: undefined,
    });
    const stylesheet = document.createElement("style");
    stylesheet.textContent = css;
    document.head.append(stylesheet);
    return stylesheet;
}

function colorOf(id: string): string {
    return getComputedStyle(document.getElementById(id)!).color;
}

describe("The dark theme", () => {
    let stylesheet: HTMLStyleElement | undefined;

    afterEach(() => {
        stylesheet?.remove();
        document.body.innerHTML = "";
    });

    it("writes muted text in its own header panel gray, not the light theme's", async () => {
        stylesheet = await loadWithDarkTheme(`
            #muted { color: $muted-fg-color; }
            #headerPanelText { color: $header-panel-text-primary-color; }
        `);
        document.body.innerHTML = `<p id="muted">Muted</p><p id="headerPanelText">Header panel</p>`;

        expect(colorOf("muted")).toBe(colorOf("headerPanelText"));
    });
});
