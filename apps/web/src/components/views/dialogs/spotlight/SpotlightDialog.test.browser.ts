/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";

import fontSizes from "../../../../../res/css/_font-sizes.pcss?raw";
import spotlightStyles from "../../../../../res/css/views/dialogs/_SpotlightDialog.pcss?raw";

const fontSizeVariables = new Map(
    [...fontSizes.matchAll(/^\$(font-[\w-]+):\s*([^;]+);/gm)].map(([, name, value]) => [name, value]),
);

/** Substitutes the font size variables, the only ones this stylesheet needs to lay out; the browser does the nesting. */
function toBrowserCss(pcss: string): string {
    return pcss.replace(/\$(font-[\w-]+)/g, (variable, name: string) => fontSizeVariables.get(name) ?? variable);
}

/** The DOM SpotlightDialog renders inside its modal, with a filter and one option. */
function spotlightDialog(arrows: string[]): string {
    const keys = arrows.map((arrow) => `<kbd>${arrow}</kbd>`).join("");
    return `
        <div class="mx_Dialog_wrapper mx_SpotlightDialog_wrapper" style="height: 480px; padding-top: 80px">
            <div class="mx_Dialog_border">
                <div class="mx_Dialog">
                    <div id="mx_SpotlightDialog_keyboardPrompt"><span>Use ${keys} to scroll</span></div>
                    <div class="mx_SpotlightDialog" role="dialog" style="width: 540px">
                        <div class="mx_Dialog_header"></div>
                        <div class="mx_SpotlightDialog_searchBox mx_textinput">
                            <div class="mx_SpotlightDialog_filter">
                                <span>People</span>
                                <div class="mx_AccessibleButton mx_SpotlightDialog_filter--close" role="button"></div>
                            </div>
                            <input type="text" value="home" />
                        </div>
                        <div id="mx_SpotlightDialog_content" role="listbox">
                            <div class="mx_SpotlightDialog_section mx_SpotlightDialog_results" role="group">
                                <h4>Spaces you're in</h4>
                                <div>
                                    <li class="mx_AccessibleButton mx_SpotlightDialog_option" role="option" aria-selected="true">Home</li>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function element(selector: string): Element {
    return document.querySelector(selector)!;
}

function radii(selector: string): Record<string, number> {
    const style = getComputedStyle(element(selector));
    return {
        topLeft: parseFloat(style.borderTopLeftRadius),
        topRight: parseFloat(style.borderTopRightRadius),
        bottomRight: parseFloat(style.borderBottomRightRadius),
        bottomLeft: parseFloat(style.borderBottomLeftRadius),
    };
}

function centre(rect: DOMRect): number {
    return rect.top + rect.height / 2;
}

let stylesheet: HTMLStyleElement;

describe("SpotlightDialog styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, app-web;
            @layer compound-tokens { ${compoundTokens} }
            @layer app-web {
                /* What _common.pcss sets: the body font, and the search box's row of filter and input */
                body { font: var(--cpd-font-body-md-regular); }
                .mx_Dialog .mx_textinput { display: flex; align-items: center; }
                .mx_Dialog .mx_textinput > input[type="text"] { border: none; flex: 1; }
                ${toBrowserCss(spotlightStyles)}
            }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("rounds the dialog's corners by its options' radius plus the padding around them", () => {
        document.body.innerHTML = spotlightDialog(["↓", "↑"]);
        const dialog = element(".mx_Dialog").getBoundingClientRect();
        const option = element(".mx_SpotlightDialog_option").getBoundingClientRect();
        const optionRadius = radii(".mx_SpotlightDialog_option").topLeft;

        const dialogRadius = optionRadius + (option.left - dialog.left);
        expect(dialog.right - option.right).toBe(option.left - dialog.left);
        expect(radii(".mx_Dialog")).toEqual({
            topLeft: dialogRadius,
            topRight: dialogRadius,
            bottomRight: dialogRadius,
            bottomLeft: dialogRadius,
        });
        // The search box fills the top of the dialog and the scrolling options its bottom
        expect(radii(".mx_SpotlightDialog_searchBox")).toEqual({
            topLeft: dialogRadius,
            topRight: dialogRadius,
            bottomRight: 0,
            bottomLeft: 0,
        });
        expect(radii("#mx_SpotlightDialog_content")).toEqual({
            topLeft: 0,
            topRight: 0,
            bottomRight: dialogRadius,
            bottomLeft: dialogRadius,
        });

        // The filter sits in the dialog's corner as far from its top edge as from its side
        const filter = element(".mx_SpotlightDialog_filter").getBoundingClientRect();
        expect(filter.top - dialog.top).toBe(filter.left - dialog.left);
        expect(radii(".mx_SpotlightDialog_filter").topLeft).toBe(dialogRadius - (filter.left - dialog.left));
    });

    it.each([[["↓", "↑"]], [["↓", "↑", "←", "→"]]])(
        "puts a small gap between the keys %j of the scroll hint, on one line with its words",
        (arrows) => {
            document.body.innerHTML = spotlightDialog(arrows);
            const keys = [...document.querySelectorAll("#mx_SpotlightDialog_keyboardPrompt kbd")].map((key) =>
                key.getBoundingClientRect(),
            );
            const words = document.createRange();
            words.selectNodeContents(element("#mx_SpotlightDialog_keyboardPrompt span").firstChild!);

            expect(keys).toHaveLength(arrows.length);
            for (let i = 1; i < keys.length; i++) {
                expect(keys[i].left - keys[i - 1].right).toBeCloseTo(2, 1);
            }
            for (const key of keys) expect(centre(key)).toBeCloseTo(centre(words.getBoundingClientRect()), 1);
        },
    );
});
