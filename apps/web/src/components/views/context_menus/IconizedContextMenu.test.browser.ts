/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import sharedComponentsStyles from "@element-hq/web-shared-components/dist/element-web-shared-components.css?raw";

import contextualMenuStyles from "../../../../res/css/structures/_ContextualMenu.pcss?raw";
import iconizedContextMenuStyles from "../../../../res/css/views/context_menus/_IconizedContextMenu.pcss?raw";
import spacePanelStyles from "../../../../res/css/structures/_SpacePanel.pcss?raw";

let stylesheet: HTMLStyleElement;

const ICON = `<svg viewBox="0 0 24 24"><rect width="24" height="24" /></svg>`;

function option(id: string, label: string, selectable = false): string {
    // Compound's 20px radio, which marks a selectable option where its icon would be
    const lead = selectable
        ? `<input type="radio" class="mx_IconizedContextMenu_selection" id="${id}-radio" style="inline-size: 20px; block-size: 20px; margin: 0" checked>`
        : ICON;
    return `<li class="mx_IconizedContextMenu_item" role="menuitem" tabindex="-1" id="${id}">${lead}<span class="mx_IconizedContextMenu_label">${label}</span></li>`;
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
                    ${option("reply", "Reply", true)}
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
            ${sharedComponentsStyles}
            :root {
                --cpd-color-border-interactive-secondary: gray;
                --cpd-color-gray-400: gray;
                --cpd-color-border-focused: blue;
                --cpd-color-text-primary: black;
                --cpd-color-text-critical-primary: rgb(200, 0, 0);
                --cpd-color-icon-critical-primary: rgb(200, 0, 0);
                --cpd-color-bg-critical-subtle: rgb(255, 230, 230);
                --cpd-color-text-disabled: rgb(150, 150, 150);
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

    it("gives the compact items the room menus' size: 40px rows, their 16px icons as far from the sides as from the top", () => {
        render(true);
        const item = rectOf("copy");
        const icon = document.querySelector("#copy svg")!.getBoundingClientRect();
        const label = document.querySelector("#copy .mx_IconizedContextMenu_label")!.getBoundingClientRect();

        expect(item.height).toBe(40);
        expect(rectOf("quote").top).toBe(item.bottom);
        expect(icon.width).toBe(16);
        expect(icon.top - item.top).toBe(12);
        expect(item.bottom - icon.bottom).toBe(12);
        expect(icon.left - item.left).toBe(12);
        // The label's padding puts it 12px after the icon; its line is centered on the row
        expect(label.left - icon.right).toBe(0);
        expect(
            parseFloat(getComputedStyle(document.querySelector("#copy .mx_IconizedContextMenu_label")!).paddingLeft),
        ).toBe(12);
        expect(label.top + label.height / 2).toBe(item.top + item.height / 2);
    });

    it.each([true, false])("puts what the items hold 16px from the menu's edge, compact: %s", (compact) => {
        render(compact);
        const menu = rectOf("menu");

        expect(document.querySelector("#copy svg")!.getBoundingClientRect().left - menu.left).toBe(16);
    });

    it("puts the radio of a selectable option where an icon would be, 12px before its label", () => {
        render(true);
        const radio = rectOf("reply-radio");
        const labelElement = document.querySelector("#reply .mx_IconizedContextMenu_label")!;
        const label = labelElement.getBoundingClientRect();

        expect(radio.left - rectOf("menu").left).toBe(16);
        // The label's padding puts its text 12px after the radio, as after an icon
        expect(label.left).toBe(radio.right);
        expect(getComputedStyle(labelElement).paddingInlineStart).toBe("12px");
        expect(radio.top + radio.height / 2).toBe(label.top + label.height / 2);
    });

    it("paints destructive items red, with a red highlight", async () => {
        render(true);
        const reply = document.getElementById("reply")!;
        reply.classList.add("mx_IconizedContextMenu_option_red");
        await userEvent.hover(reply);

        expect(getComputedStyle(reply).color).toBe("rgb(200, 0, 0)");
        expect(getComputedStyle(reply).backgroundColor).toBe("rgb(255, 230, 230)");
    });

    it("shows a disabled item in Compound's disabled color instead of fading it", () => {
        render(true);
        const copy = document.getElementById("copy")!;
        copy.classList.add("mx_AccessibleButton_disabled");

        expect(getComputedStyle(copy).opacity).toBe("1");
        expect(getComputedStyle(copy).color).toBe("rgb(150, 150, 150)");
    });

    it("draws the keyboard focus ring inside the item's highlight, clear of the menu's border", async () => {
        render(true);
        const item = document.getElementById("quote")!;
        // Focus moved after a key press, as the menu's arrow keys move it, matches :focus-visible
        await userEvent.keyboard("{Shift}");
        item.focus();

        expect(item.matches(":focus-visible")).toBe(true);
        const style = getComputedStyle(item);
        expect(style.outlineStyle).toBe("solid");
        expect(style.outlineWidth).toBe("2px");
        expect(style.outlineOffset).toBe("-2px");
        expect(style.outlineColor).toBe("rgb(0, 0, 255)");
        // The ring's outer edge is the highlight's, 4px from the menu's edge and 3px from its 1px border
        expect(item.getBoundingClientRect().left - rectOf("menu").left).toBe(4);
    });

    it("lines the space menu's header up with the icons of its items, 12px from the menu's top and the separator", () => {
        renderSpaceMenu();
        const menu = rectOf("menu");
        const header = rectOf("header");
        const separator = rectOf("options");

        expect(header.left - menu.left).toBe(16);
        expect(document.querySelector("#home svg")!.getBoundingClientRect().left - menu.left).toBe(16);
        expect(header.top - menu.top).toBe(12);
        expect(getComputedStyle(document.getElementById("options")!).borderTopWidth).toBe("1px");
        expect(separator.top - header.bottom).toBe(12);
    });
});
