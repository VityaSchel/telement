/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";

import contextualMenuStyles from "../../../../res/css/structures/_ContextualMenu.pcss?raw";
import iconizedContextMenuStyles from "../../../../res/css/views/context_menus/_IconizedContextMenu.pcss?raw";
import spacePanelStyles from "../../../../res/css/structures/_SpacePanel.pcss?raw";

let stylesheet: HTMLStyleElement;

const ICON = `<svg viewBox="0 0 24 24"><rect width="24" height="24" /></svg>`;

function option(id: string, label: string): string {
    return `<li class="mx_IconizedContextMenu_item" role="menuitem" id="${id}">${ICON}<span class="mx_IconizedContextMenu_label">${label}</span></li>`;
}

/** The DOM of the message menu, as MessageContextMenu renders it, with two lists of options. */
function render(compact: boolean): void {
    document.body.innerHTML = `
        <div class="mx_ContextualMenu" id="menu" style="position: static">
            <ul role="none" class="mx_IconizedContextMenu mx_MessageContextMenu${compact ? " mx_IconizedContextMenu_compact" : ""}">
                <div class="mx_IconizedContextMenu_optionList">
                    ${option("copy", "Copy")}
                    ${option("quote", "Quote")}
                </div>
                <div class="mx_IconizedContextMenu_optionList" id="secondList">
                    ${option("reply", "Reply")}
                </div>
            </ul>
        </div>
    `;
}

/** The DOM of a space's menu, as SpaceContextMenu renders it, with the space's name above the options. */
function renderSpaceMenu(): void {
    document.body.innerHTML = `
        <div class="mx_ContextualMenu" id="menu" style="position: static">
            <ul role="none" class="mx_IconizedContextMenu mx_SpacePanel_contextMenu mx_IconizedContextMenu_compact">
                <div class="mx_SpacePanel_contextMenu_header" id="header">My space</div>
                <div class="mx_IconizedContextMenu_optionList" id="options">
                    ${option("home", "Space home")}
                </div>
            </ul>
        </div>
    `;
}

function rectOf(id: string): DOMRect {
    return document.getElementById(id)!.getBoundingClientRect();
}

describe("IconizedContextMenu", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        // The browser does the nesting. The SCSS variables only set colours, which these tests don't look at, but a
        // border needs a valid colour to be drawn.
        stylesheet.textContent = `
            ${compoundTokens}
            :root {
                --cpd-color-border-interactive-secondary: gray;
                --cpd-color-gray-400: gray;
            }
            ${contextualMenuStyles}
            ${iconizedContextMenuStyles}
            ${spacePanelStyles}
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("insets the items by 4px from the menu's edge, its 1px border included", () => {
        render(true);
        const menu = rectOf("menu");

        expect(rectOf("copy").top - menu.top).toBe(4);
        expect(rectOf("copy").left - menu.left).toBe(4);
        expect(menu.right - rectOf("copy").right).toBe(4);
        expect(menu.bottom - rectOf("reply").bottom).toBe(4);
    });

    it("rounds the menu with an item highlight's radius plus that inset, so the corners are concentric", () => {
        render(true);

        expect(getComputedStyle(document.getElementById("menu")!).borderRadius).toBe("12px");
        for (const id of ["copy", "quote", "reply"]) {
            expect(getComputedStyle(document.getElementById(id)!).borderRadius).toBe("8px");
        }
    });

    it("keeps the item highlights the inset away from the separator between the lists", () => {
        render(true);
        const separator = document.getElementById("secondList")!;

        expect(getComputedStyle(separator).borderTopWidth).toBe("1px");
        expect(rectOf("secondList").top - rectOf("quote").bottom).toBe(4);
        expect(rectOf("reply").top - rectOf("secondList").top).toBe(4 + 1);
    });

    it("gives the compact items the room menus' size: 16px icons and 15px text with 8px above and below", () => {
        render(true);
        const item = rectOf("copy");
        const icon = document.querySelector("#copy svg")!.getBoundingClientRect();
        const labelText = document.createRange();
        labelText.selectNodeContents(document.querySelector("#copy .mx_IconizedContextMenu_label")!);
        const label = labelText.getBoundingClientRect();

        expect(item.height).toBe(38.5);
        expect(rectOf("quote").top).toBe(item.bottom);
        expect(icon.width).toBe(16);
        expect(icon.left - item.left).toBe(8);
        expect(label.left - icon.right).toBe(14);
    });

    it("puts the text of the items 12px from the menu's edge in compact menus and 20px in others", () => {
        render(true);
        expect(document.querySelector("#copy svg")!.getBoundingClientRect().left - rectOf("menu").left).toBe(12);

        render(false);
        expect(document.querySelector("#copy svg")!.getBoundingClientRect().left - rectOf("menu").left).toBe(20);
    });

    it("lines the space menu's header up with the icons of its items, 12px from the menu's edge and the separator", () => {
        renderSpaceMenu();
        const menu = rectOf("menu");
        const header = rectOf("header");
        const separator = rectOf("options");

        expect(header.left - menu.left).toBe(12);
        expect(document.querySelector("#home svg")!.getBoundingClientRect().left - menu.left).toBe(12);
        expect(header.top - menu.top).toBe(12);
        expect(getComputedStyle(document.getElementById("options")!).borderTopWidth).toBe("1px");
        expect(separator.top - header.bottom).toBe(12);
    });
});
