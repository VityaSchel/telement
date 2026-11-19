/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundLightHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-base.css?raw";
import compoundLightHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-semantic.css?raw";
import compoundDarkHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-hc-base.css?raw";
import compoundDarkHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-hc-semantic.css?raw";

// The package's built bundle needs Node's `process`, so the tile's DOM is written out below and its stylesheet is
// loaded from source, with its local class names
// eslint-disable-next-line no-restricted-imports
import eventTileViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileView.module.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import accessibleButtonStyles from "../../res/css/views/elements/_AccessibleButton.pcss?raw";
import basicComposerStyles from "../../res/css/views/rooms/_BasicMessageComposer.pcss?raw";
import editComposerStyles from "../../res/css/views/rooms/_EditMessageComposer.pcss?raw";
import eventTileStyles from "../../res/css/views/rooms/_EventTile.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import lightHighContrastTheme from "../../res/themes/light-high-contrast/css/_light-high-contrast.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";
import { loadInter } from "../test/telement/fonts";

/** Each theme with the theme stylesheets it is built from, in the order its entry point imports them. Dark high
 * contrast is the dark theme on a system that asks for more contrast. */
const THEMES = [
    { name: "cpd-theme-light", sources: [lightTheme] },
    { name: "cpd-theme-dark", sources: [lightTheme, darkTheme] },
    { name: "cpd-theme-light-hc", sources: [lightTheme, lightHighContrastTheme] },
    { name: "cpd-theme-dark-hc", sources: [lightTheme, darkTheme] },
];

const APP_STYLES = [eventTileStyles, basicComposerStyles, editComposerStyles, accessibleButtonStyles].join("\n");

/**
 * Your own message being edited in place, as EditMessageComposerWrapper renders it in the bubble layout: the bar of the
 * links it previews over EditMessageComposer's field and its Cancel and Save buttons, with the hidden time beside them.
 * Save is disabled, as AccessibleButton disables it, until the text changes.
 */
function tile(text: string, saveDisabled: boolean): string {
    const saveClass = "mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary";
    const save = saveDisabled
        ? `class="${saveClass} mx_AccessibleButton_disabled" aria-disabled="true"`
        : `class="${saveClass}"`;
    return `
        <li class="root mx_EventTile layoutBubble stateOwnEvent stateLastInSection stateEditing">
            <div class="line mx_EventTile_line" data-testid="bubble">
                <div class="slotTimestamp"><a class="mx_MessageTimestamp">19:24</a></div>
                <div class="slotBody">
                    <div class="mx_EditMessageComposerWrapper">
                        <div data-testid="links" style="height: 34px; background: gray">1 link</div>
                        <div class="mx_EditMessageComposer mx_EventTile_content">
                            <div class="mx_BasicMessageComposer">
                                <div class="mx_BasicMessageComposer_input" contenteditable="true" role="textbox" dir="auto">${text}</div>
                            </div>
                            <div class="mx_EditMessageComposer_buttons">
                                <div role="button" class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_secondary">Cancel</div>
                                <div role="button" ${save} data-testid="save">Save</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    `;
}

const TEXT = "See https://telegram.org for the reference, and _please_ keep the corners concentric.";

function get(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`nothing matches ${selector}`);
    return element;
}

function box(selector: string): DOMRect {
    return get(selector).getBoundingClientRect();
}

function channels(color: string): number[] {
    return color.match(/\d+(\.\d+)?/g)!.map(Number);
}

/** The opaque color the screen shows for `color` painted over the opaque `under`. */
function composite(color: string, under: string): string {
    const [red, green, blue, alpha = 1] = channels(color);
    const base = channels(under);
    return `rgb(${[red, green, blue].map((channel, i) => channel * alpha + base[i] * (1 - alpha)).join(", ")})`;
}

/** WCAG's contrast ratio between two opaque `rgb()` colors. */
function contrast(first: string, second: string): number {
    const luminance = (color: string): number => {
        const [red, green, blue] = channels(color).map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
}

/** Where the field's text is drawn. */
function textBox(): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(get(".mx_BasicMessageComposer_input"));
    return range.getBoundingClientRect();
}

let stylesheet: HTMLStyleElement;
let unloadInter: () => void;

describe("Editing your own message in place", () => {
    beforeAll(async () => {
        // Each theme's variables apply within its own class, as each theme is a separate stylesheet in the app
        const themed = THEMES.map(
            ({ name, sources }) => `.${name} { ${toBrowserCss(APP_STYLES, commonStyles, fontSizes, ...sources)} }`,
        ).join("\n");
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, shared-components, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic}
                ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
                ${compoundLightHcTheme} ${compoundLightHcSemantic} ${compoundDarkHcTheme} ${compoundDarkHcSemantic}
            }
            @layer shared-components {
                ${telementTokens}
                ${eventTileViewStyles.replace(/:global\(([^)]*)\)/g, "$1")}
            }
            @layer app-web { ${themed} }
        `;
        document.head.append(stylesheet);
        unloadInter = await loadInter();
    });

    afterAll(() => {
        stylesheet.remove();
        unloadInter();
    });

    afterEach(async () => {
        await userEvent.unhover(document.body);
        document.body.innerHTML = "";
    });

    describe.each(THEMES)("in $name", ({ name }) => {
        function render(text = TEXT, saveDisabled = false): HTMLElement {
            document.body.innerHTML = `
                <ol class="${name}" style="width: 880px; margin: 0; padding: 0; list-style: none; font-family: Inter; --emoji-font-family: ''">
                    ${tile(text, saveDisabled)}
                </ol>
            `;
            return document.querySelector("ol")!;
        }

        it("keeps the links, the field and the buttons on the bubble's 12px padding at both ends, 8px apart and from its top and bottom", () => {
            render();
            const bubble = box("[data-testid=bubble]");
            const links = box("[data-testid=links]");
            const field = box(".mx_BasicMessageComposer_input");
            const buttons = box(".mx_EditMessageComposer_buttons");

            for (const part of [links, field]) {
                expect([part.left - bubble.left, bubble.right - part.right]).toEqual([12, 12]);
            }
            expect(links.top - bubble.top).toBe(8);
            expect(field.top - links.bottom).toBe(8);
            expect(buttons.top - field.bottom).toBe(8);
            expect(bubble.bottom - buttons.bottom).toBe(8);
            expect(box("[data-testid=save]").right).toBe(field.right);
            expect(box("[data-testid=save]").left - box(".mx_AccessibleButton_kind_secondary").right).toBe(8);
        });

        it("draws the field to the field spec: 8px corners, one line 36px tall with its text 12px inside the border", () => {
            render("Fixed");
            const field = box(".mx_BasicMessageComposer_input");
            const style = getComputedStyle(get(".mx_BasicMessageComposer_input"));

            expect(field.height).toBe(36);
            expect(style.borderTopLeftRadius).toBe("8px");
            expect(style.borderTopWidth).toBe("1px");
            expect(textBox().left - field.left).toBe(13);
        });

        it("starts right-to-left text 12px inside the field's other end", () => {
            render("תוקן את הפינות");

            expect(box(".mx_BasicMessageComposer_input").right - textBox().right).toBe(13);
        });

        it("borders the field in the bubble's translucent white, brighter when hovered and white when focused", async () => {
            const list = render();
            const field = get(".mx_BasicMessageComposer_input");
            const border = (): string => getComputedStyle(field).borderTopColor;

            expect(border()).toBe(tokenColor("--tl-color-separator-bubble-own", list));
            await userEvent.hover(field);
            expect(border()).toBe(tokenColor("--tl-color-on-bubble-own-secondary", list));
            field.focus();
            expect(border()).toBe(tokenColor("--tl-color-on-bubble-own", list));
        });

        it("labels Save, while it is disabled, in the bubble's secondary white, legible on its translucent fill", () => {
            const list = render(TEXT, true);
            const save = getComputedStyle(get("[data-testid=save]"));
            const pill = composite(save.backgroundColor, getComputedStyle(get("[data-testid=bubble]")).backgroundColor);

            expect(save.color).toBe(tokenColor("--tl-color-on-bubble-own-secondary", list));
            expect(contrast(composite(save.color, pill), pill)).toBeGreaterThanOrEqual(2);
        });
    });
});
