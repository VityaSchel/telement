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

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import contextualMenuStyles from "../../res/css/structures/_ContextualMenu.pcss?raw";
import baseCardStyles from "../../res/css/views/right_panel/_BaseCard.pcss?raw";
import threadPanelStyles from "../../res/css/views/right_panel/_ThreadPanel.pcss?raw";
import legacyCallMenuStyles from "../../res/css/views/context_menus/_LegacyCallContextMenu.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";

const CHECK = `<svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6" /></svg>`;

/** The threads panel's filter menu, as ThreadPanelHeader renders it, with "All threads" selected. */
function renderThreadFilter(): void {
    const option = (id: string, label: string, description: string, checked: boolean): string =>
        `<div class="mx_AccessibleButton mx_ThreadPanel_Header_FilterOptionItem" role="menuitemradio" id="${id}" ` +
        `aria-checked="${checked}" tabindex="-1">${checked ? CHECK : ""}<span>${label}</span>` +
        `<span>${description}</span></div>`;
    document.body.innerHTML = `
        <div class="mx_ContextualMenu_wrapper mx_BaseCard_header_title cpd-theme-light" style="top: 48px; left: 48px">
            <div class="mx_ContextualMenu mx_ContextualMenu_withChevron_top" role="menu" id="menu">
                <div class="mx_ContextualMenu_chevron_top"></div>
                ${option("all", "All threads", "Shows all threads from current room", true)}
                ${option("mine", "My threads", "Shows all threads you've participated in", false)}
            </div>
        </div>
    `;
}

/** LegacyCallContextMenu for a call that can be transferred. */
function renderLegacyCallMenu(): void {
    document.body.innerHTML = `
        <div class="mx_ContextualMenu_wrapper cpd-theme-light" style="top: 48px; left: 48px">
            <div class="mx_ContextualMenu mx_ContextualMenu_left mx_ContextualMenu_top" role="menu" id="menu">
                <div class="mx_AccessibleButton mx_LegacyCallContextMenu_item" role="menuitem" tabindex="-1">Hold</div>
                <div class="mx_AccessibleButton mx_LegacyCallContextMenu_item" role="menuitem" tabindex="-1">Transfer</div>
            </div>
        </div>
    `;
}

function rectOf(element: Element): DOMRect {
    return element.getBoundingClientRect();
}

function textLeft(element: Element): number {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect().left;
}

/** Focuses the item as the keyboard does, so that it matches :focus-visible, and returns its focus ring. */
async function keyboardFocusRing(item: HTMLElement): Promise<string> {
    await userEvent.keyboard("{Shift}");
    item.focus();
    expect(item.matches(":focus-visible")).toBe(true);
    const style = getComputedStyle(item);
    return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineOffset}`;
}

let stylesheet: HTMLStyleElement;

describe("Legacy context menus", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${telementTokens}
            body { font: var(--cpd-font-body-md-regular); }
            ${[contextualMenuStyles, baseCardStyles, threadPanelStyles, legacyCallMenuStyles]
                .map((styles) => toBrowserCss(styles, lightTheme))
                .join("\n")}
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    describe("the threads panel's filter menu", () => {
        it("insets the options 4px from the menu's edge, rounded concentrically with it", () => {
            renderThreadFilter();
            const menu = rectOf(document.getElementById("menu")!);
            const options = [...document.querySelectorAll(".mx_ThreadPanel_Header_FilterOptionItem")];

            expect(getComputedStyle(document.getElementById("menu")!).borderRadius).toBe("12px");
            expect(rectOf(options[0]).top - menu.top).toBe(4);
            expect(menu.bottom - rectOf(options[1]).bottom).toBe(4);
            expect(rectOf(options[1]).top).toBe(rectOf(options[0]).bottom);
            for (const option of options) {
                expect(rectOf(option).left - menu.left).toBe(4);
                expect(menu.right - rectOf(option).right).toBe(4);
                expect(getComputedStyle(option).borderRadius).toBe("8px");
            }
        });

        it("puts the check where the other menus' icons are, centered on the first line, and the text after it", () => {
            renderThreadFilter();
            const menu = rectOf(document.getElementById("menu")!);
            const all = document.getElementById("all")!;
            const check = rectOf(all.querySelector("svg")!);
            const label = all.querySelector("span")!;
            const lineHeight = parseFloat(getComputedStyle(label).lineHeight);

            expect(check.width).toBe(16);
            expect(check.left - menu.left).toBe(16);
            expect(check.top - rectOf(all).top).toBe(8 + (lineHeight - 16) / 2);
            expect(check.top + check.height / 2).toBe(rectOf(label).top + lineHeight / 2);
            // Both options' text 12px after the check, as in the message menu
            for (const option of document.querySelectorAll(".mx_ThreadPanel_Header_FilterOptionItem")) {
                for (const text of option.querySelectorAll("span")) expect(textLeft(text) - menu.left).toBe(44);
            }
            expect(menu.right - rectOf(label).right).toBe(16);
        });

        it("draws the keyboard focus ring inside the option's highlight", async () => {
            renderThreadFilter();
            expect(await keyboardFocusRing(document.getElementById("mine")!)).toBe("solid 2px -2px");
        });
    });

    describe("the legacy call menu", () => {
        it("insets the items 4px from the menu's edge, rounded concentrically with it, the text 16px in", () => {
            renderLegacyCallMenu();
            const menu = rectOf(document.getElementById("menu")!);
            const items = [...document.querySelectorAll(".mx_LegacyCallContextMenu_item")];

            expect(rectOf(items[0]).top - menu.top).toBe(4);
            expect(menu.bottom - rectOf(items[1]).bottom).toBe(4);
            expect(rectOf(items[1]).top).toBe(rectOf(items[0]).bottom);
            for (const item of items) {
                expect(rectOf(item).left - menu.left).toBe(4);
                expect(menu.right - rectOf(item).right).toBe(4);
                expect(rectOf(item).height).toBe(40);
                expect(getComputedStyle(item).borderRadius).toBe("8px");
                expect(textLeft(item) - menu.left).toBe(16);
            }
        });

        it("highlights the hovered item and draws the focus ring inside its highlight", async () => {
            renderLegacyCallMenu();
            const [hold, transfer] = document.querySelectorAll<HTMLElement>(".mx_LegacyCallContextMenu_item");
            const rest = getComputedStyle(transfer).backgroundColor;

            await userEvent.hover(hold);
            expect(getComputedStyle(hold).backgroundColor).not.toBe(rest);
            expect(await keyboardFocusRing(transfer)).toBe("solid 2px -2px");
        });
    });
});
