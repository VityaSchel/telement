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
import genericDropdownMenuStyles from "../../res/css/structures/_GenericDropdownMenu.pcss?raw";
import networkDropdownStyles from "../../res/css/views/directory/_NetworkDropdown.pcss?raw";
import readReceiptGroupStyles from "../../res/css/views/rooms/_ReadReceiptGroup.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";

/** Compound's RadioInput, sized as its stylesheet sizes it */
function radio(className: string, checked: boolean): string {
    return (
        `<div class="${className}" style="display: inline-flex; inline-size: 20px; block-size: 20px">` +
        `<input type="radio" style="margin: 0; inline-size: 20px; block-size: 20px"${checked ? " checked" : ""}></div>`
    );
}

/** The threads panel's filter menu, as ThreadPanelHeader renders it, with "All threads" selected. */
function renderThreadFilter(): void {
    const option = (id: string, label: string, description: string, checked: boolean): string =>
        `<div class="mx_AccessibleButton mx_ThreadPanel_Header_FilterOptionItem" role="menuitemradio" id="${id}" ` +
        `aria-checked="${checked}" tabindex="-1">${radio("mx_ThreadPanel_Header_FilterOptionItem_selection", checked)}` +
        `<span>${label}</span>` +
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

/** The room directory's server picker, as NetworkDropdown renders it, with Matrix on matrix.org selected. */
function renderServerPicker(): void {
    const option = (id: string, label: string, checked: boolean): string =>
        `<div class="mx_AccessibleButton mx_GenericDropdownMenu_Option mx_GenericDropdownMenu_Option--item" ` +
        `role="menuitemradio" id="${id}" aria-checked="${checked}" tabindex="-1">` +
        radio("mx_GenericDropdownMenu_Option--selection", checked) +
        `<div class="mx_GenericDropdownMenu_Option--label"><span>${label}</span></div></div>`;
    document.body.innerHTML = `
        <div class="mx_ContextualMenu_wrapper mx_GenericDropdownMenu_wrapper mx_NetworkDropdown_wrapper cpd-theme-light"
            style="top: 48px; left: 48px">
            <div class="mx_ContextualMenu" role="menu" id="menu">
                <div class="mx_GenericDropdownMenu_Option mx_GenericDropdownMenu_Option--header" id="header">
                    <div class="mx_GenericDropdownMenu_Option--label"><span>matrix.org</span><span>Your server</span></div>
                </div>
                ${option("matrix", "Matrix", true)}
                ${option("irc", "IRC", false)}
                <span class="mx_GenericDropdownMenu_divider" id="divider"></span>
                <div class="mx_AccessibleButton mx_GenericDropdownMenu_Option mx_GenericDropdownMenu_Option--item"
                    role="menuitemradio" id="add" aria-checked="false" tabindex="-1">
                    <svg viewBox="0 0 24 24"><path d="M11 5h2v14h-2zM5 11h14v2H5z" /></svg>
                    <div class="mx_GenericDropdownMenu_Option--label"><span>Add new server…</span></div>
                </div>
            </div>
        </div>
    `;
}

/** The read receipts popup, as ReadReceiptGroup renders it for two people. */
function renderReceiptsPopup(): void {
    const person = (id: string, name: string, time: string): string =>
        `<div class="mx_AccessibleButton mx_ReadReceiptGroup_person" role="menuitem" id="${id}" tabindex="-1">` +
        `<span class="mx_BaseAvatar" style="display: inline-block; inline-size: 24px; block-size: 24px"></span>` +
        `<div class="mx_ReadReceiptGroup_name"><p>${name}</p><p class="mx_ReadReceiptGroup_secondary">${time}</p></div>` +
        `</div>`;
    document.body.innerHTML = `
        <div class="mx_ContextualMenu_wrapper cpd-theme-light" style="top: 48px; left: 48px">
            <div class="mx_ContextualMenu mx_ReadReceiptGroup_popup" role="menu" id="menu">
                <div class="mx_AutoHideScrollbar">
                    <h3 class="mx_ReadReceiptGroup_title" role="menuitem" tabindex="-1" id="title">Seen by 2 people</h3>
                    ${person("alice", "Alice", "14:02")}
                    ${person("bob", "Bartholomew Montgomery-Fitzgerald of the Northern Reaches", "Thu, 9:41")}
                </div>
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
            ${[
                contextualMenuStyles,
                baseCardStyles,
                threadPanelStyles,
                legacyCallMenuStyles,
                genericDropdownMenuStyles,
                networkDropdownStyles,
                readReceiptGroupStyles,
            ]
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

        it("puts the radio where the other menus' icons are, centered on the first line, and the text after it", () => {
            renderThreadFilter();
            const menu = rectOf(document.getElementById("menu")!);
            const options = [...document.querySelectorAll<HTMLElement>(".mx_ThreadPanel_Header_FilterOptionItem")];
            const [label, description] = options[0].querySelectorAll("span");
            const lineHeight = parseFloat(getComputedStyle(label).lineHeight);

            // Regular 15px labels with 13px secondary descriptions, as in the sessions filter, in rows on the grid
            expect(getComputedStyle(label).fontSize).toBe("15px");
            expect(getComputedStyle(label).fontWeight).toBe("400");
            expect(getComputedStyle(description).fontSize).toBe("13px");
            expect(rectOf(options[0]).height).toBe(60);
            for (const option of options) {
                const radioBox = rectOf(option.querySelector(".mx_ThreadPanel_Header_FilterOptionItem_selection")!);
                expect(radioBox.width).toBe(20);
                expect(radioBox.left - menu.left).toBe(16);
                expect(radioBox.top + radioBox.height / 2).toBe(
                    rectOf(option.querySelector("span")!).top + lineHeight / 2,
                );
                // Both lines 12px after the radio, as in the message menu
                for (const text of option.querySelectorAll("span")) expect(textLeft(text) - menu.left).toBe(48);
            }
            expect(menu.right - rectOf(label).right).toBe(16);
        });

        it("doesn't point at its button, like the other menus", () => {
            renderThreadFilter();
            expect(getComputedStyle(document.querySelector(".mx_ContextualMenu_chevron_top")!).display).toBe("none");
        });

        it("draws the keyboard focus ring inside the option's highlight", async () => {
            renderThreadFilter();
            expect(await keyboardFocusRing(document.getElementById("mine")!)).toBe("solid 2px -2px");
        });
    });

    describe("the room directory's server picker", () => {
        it("lays out 40px rows inset 4px, radios and the add icon 16px in, and labels 12px after them", () => {
            renderServerPicker();
            const menu = rectOf(document.getElementById("menu")!);
            const items = [...document.querySelectorAll<HTMLElement>(".mx_GenericDropdownMenu_Option")];

            expect(rectOf(items[0]).top - menu.top).toBe(4);
            expect(menu.bottom - rectOf(items.at(-1)!).bottom).toBe(4);
            for (const item of items) {
                expect(rectOf(item).height).toBe(40);
                expect(rectOf(item).left - menu.left).toBe(4);
                expect(menu.right - rectOf(item).right).toBe(4);
                expect(getComputedStyle(item).borderRadius).toBe("8px");
            }
            // The group's title starts where the options' radios do
            expect(textLeft(document.querySelector("#header span")!) - menu.left).toBe(16);
            for (const id of ["matrix", "irc", "add"]) {
                const option = document.getElementById(id)!;
                const marker = rectOf(option.firstElementChild!);
                expect([marker.width, marker.left - menu.left]).toEqual([20, 16]);
                expect(textLeft(option.querySelector("span")!) - marker.right).toBe(12);
            }
            // The separator keeps the rows 4px clear of it, as the menu's edge does
            const divider = rectOf(document.getElementById("divider")!);
            expect(divider.top - rectOf(document.getElementById("irc")!).bottom).toBe(4);
            expect(rectOf(document.getElementById("add")!).top - divider.bottom).toBe(4);
        });

        it("highlights the hovered option and draws the focus ring inside its highlight", async () => {
            renderServerPicker();
            const irc = document.getElementById("irc")!;
            const rest = getComputedStyle(irc).backgroundColor;

            await userEvent.hover(irc);
            expect(getComputedStyle(irc).backgroundColor).not.toBe(rest);
            expect(await keyboardFocusRing(document.getElementById("matrix")!)).toBe("solid 2px -2px");
        });
    });

    describe("the read receipts popup", () => {
        it("has the menus' corners and a title like Compound's, with the people in 40px rows inset 4px", () => {
            renderReceiptsPopup();
            const menuElement = document.getElementById("menu")!;
            const menu = rectOf(menuElement);
            const title = document.getElementById("title")!;
            const people = [...document.querySelectorAll<HTMLElement>(".mx_ReadReceiptGroup_person")];

            expect(getComputedStyle(menuElement).borderRadius).toBe("12px");
            expect(textLeft(title) - menu.left).toBe(16);
            expect(getComputedStyle(title).fontWeight).toBe("600");
            expect(getComputedStyle(title).borderBottomStyle).toBe("solid");
            expect(rectOf(people[0]).top - rectOf(title).bottom).toBe(4);
            expect(menu.bottom - rectOf(people[1]).bottom).toBe(4);
            for (const person of people) {
                expect(rectOf(person).height).toBe(40);
                expect([rectOf(person).left - menu.left, menu.right - rectOf(person).right]).toEqual([4, 4]);
                expect(getComputedStyle(person).borderRadius).toBe("8px");
                const avatar = rectOf(person.querySelector(".mx_BaseAvatar")!);
                expect(avatar.left - menu.left).toBe(16);
                expect(textLeft(person.querySelector("p")!) - avatar.right).toBe(12);
                // The time ends where the row's content does, and a long name gives way to it
                expect(menu.right - rectOf(person.querySelector(".mx_ReadReceiptGroup_secondary")!).right).toBe(16);
            }
            const longName = people[1].querySelector("p")!;
            expect(longName.scrollWidth).toBeGreaterThan(longName.clientWidth);
        });

        it("highlights the hovered person and draws the focus ring inside the highlight", async () => {
            renderReceiptsPopup();
            const [alice, bob] = document.querySelectorAll<HTMLElement>(".mx_ReadReceiptGroup_person");
            const rest = getComputedStyle(bob).backgroundColor;

            await userEvent.hover(bob);
            expect(getComputedStyle(bob).backgroundColor).not.toBe(rest);
            expect(await keyboardFocusRing(alice)).toBe("solid 2px -2px");
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
