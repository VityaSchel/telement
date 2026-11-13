/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import contextualMenuStyles from "../../res/css/structures/_ContextualMenu.pcss?raw";
import composerDrawerStyles from "../../res/css/telement/_ComposerDrawer.pcss?raw";
import emojiPickerMenuStyles from "../../res/css/telement/_EmojiPickerMenu.pcss?raw";

// Pill radius + 8px inset + 1px menu border, around the picker's 36px category tabs and the drawer's 32px tabs
const CATEGORY_TABS_CORNER = 36 / 2 + 8 + 1;
const TABS_CORNER = 32 / 2 + 8 + 1;

let stylesheet: HTMLStyleElement;

/** A menu as ContextMenu renders it, holding a stand-in for the emoji picker that fills it. */
function render(menuClassName: string): { menu: HTMLElement; picker: HTMLElement } {
    document.body.innerHTML = `
        <div class="mx_ContextualMenu ${menuClassName}" id="menu" style="top: 20px; left: 20px">
            <div data-focus-lock-disabled="false">
                <section id="picker" style="width: 340px; height: 200px; border-radius: 4px; background: red"></section>
            </div>
        </div>
    `;
    return { menu: document.getElementById("menu")!, picker: document.getElementById("picker")! };
}

function radii(element: HTMLElement): number[] {
    const style = getComputedStyle(element);
    return [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomRightRadius,
        style.borderBottomLeftRadius,
    ].map(parseFloat);
}

describe("Menus holding the emoji picker", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        // Compound's semantic colors aren't loaded, and without its color the menu's whole border declaration is dropped
        stylesheet.textContent = `
            ${compoundTokens}
            ${telementTokens}
            :root {
                --cpd-color-border-interactive-secondary: gray;
            }
            ${contextualMenuStyles}
            ${composerDrawerStyles}
            ${emojiPickerMenuStyles}
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("rounds the composer drawer's menu around the picker's category tabs and the drawer's tabs", () => {
        const { menu } = render("mx_TelementComposerDrawer_menu");

        expect(radii(menu)).toEqual([CATEGORY_TABS_CORNER, CATEGORY_TABS_CORNER, TABS_CORNER, TABS_CORNER]);
    });

    it("rounds the reaction menu's bottom corners like its top ones, around the category tabs", () => {
        const { menu } = render("mx_TelementEmojiPickerMenu");

        expect(radii(menu)).toEqual([
            CATEGORY_TABS_CORNER,
            CATEGORY_TABS_CORNER,
            CATEGORY_TABS_CORNER,
            CATEGORY_TABS_CORNER,
        ]);
    });

    it("clips the reaction picker's bottom corners to the menu's inner edge", () => {
        const { menu, picker } = render("mx_TelementEmojiPickerMenu");
        const box = menu.getBoundingClientRect();
        const border = parseFloat(getComputedStyle(menu).borderLeftWidth);
        const innerRadius = radii(menu)[3] - border;
        expect(innerRadius).toBe(26);

        // Inside the picker's 4px corner, outside the menu's 26px inner corner
        const x = box.left + border + 6;
        const y = box.bottom - border - 6;
        expect(Math.hypot(innerRadius - 6, innerRadius - 6)).toBeGreaterThan(innerRadius);
        expect(document.elementFromPoint(x, y)).not.toBe(picker);
        expect(document.elementFromPoint(x + innerRadius, y - innerRadius)).toBe(picker);
    });
});
