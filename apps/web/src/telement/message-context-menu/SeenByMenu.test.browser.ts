/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar, AvatarStack } from "@vector-im/compound-web";
import { CopyIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package's built bundle needs Node's `process`, so the menus' DOM is written out below and the icon is taken from
// source
// eslint-disable-next-line no-restricted-imports
import { DoubleCheckIcon } from "../../../../../packages/shared-components/src/telement/core/icons/DoubleCheckIcon";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../../res/css/_common.pcss?raw";
import contextualMenuStyles from "../../../res/css/structures/_ContextualMenu.pcss?raw";
import iconizedContextMenuStyles from "../../../res/css/views/context_menus/_IconizedContextMenu.pcss?raw";
import seenByMenuStyles from "../../../res/css/telement/_SeenByMenu.pcss?raw";
import lightTheme from "../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../test/telement/browserCss";
import { tokenColor } from "../../test/telement/computedStyle";
import { loadInter } from "../../test/telement/fonts";
import { getSeenBySubmenuPosition } from "./getSeenBySubmenuPosition";

const READERS: Array<[name: string, time: string]> = [
    ["Bob", "19:34"],
    ["Carol", "19:30"],
    ["Bartholomew Montgomery-Fitzgerald of the Northern Reaches", "Thu 19:02"],
    ["Dan", "Thu 18:40"],
];

const avatar = (name: string): string =>
    renderToStaticMarkup(
        createElement(Avatar, {
            id: `@${name.toLowerCase()}:example.org`,
            name,
            size: "20px",
            type: "round",
            className: "mx_BaseAvatar",
        }),
    );

/** The message menu with the "Seen by" item on top, as MessageContextMenu and SeenByMenuItem render them. */
function menuHtml(left: number): string {
    const faces = renderToStaticMarkup(
        createElement(
            AvatarStack,
            { className: "mx_SeenByMenuItem_faces" },
            ...READERS.slice(0, 3).map(([name]) =>
                createElement(Avatar, {
                    key: name,
                    id: `@${name.toLowerCase()}:example.org`,
                    name,
                    size: "20px",
                    type: "round",
                    className: "mx_BaseAvatar",
                }),
            ),
        ),
    );
    return `
        <div class="mx_ContextualMenu_wrapper" style="top: 100px; left: ${left}px">
            <div class="mx_ContextualMenu mx_ContextualMenu_left mx_ContextualMenu_top" role="menu" id="menu">
                <ul role="none" class="mx_IconizedContextMenu mx_MessageContextMenu mx_IconizedContextMenu_compact">
                    <div class="mx_IconizedContextMenu_optionList">
                        <li class="mx_AccessibleButton mx_SeenByMenuItem mx_IconizedContextMenu_item" role="menuitem"
                            aria-haspopup="menu" tabindex="-1" id="seen-by">
                            ${renderToStaticMarkup(createElement(DoubleCheckIcon))}
                            <span class="mx_IconizedContextMenu_label">Seen by 4 people</span>
                            ${faces}
                        </li>
                    </div>
                    <div class="mx_IconizedContextMenu_optionList">
                        <li class="mx_AccessibleButton mx_IconizedContextMenu_item" role="menuitem" tabindex="-1">
                            ${renderToStaticMarkup(createElement(CopyIcon))}
                            <span class="mx_IconizedContextMenu_label">Copy text</span>
                        </li>
                    </div>
                </ul>
            </div>
        </div>
    `;
}

/** The submenu of readers, where SeenByMenuItem opens it beside the menu, as a legacy ContextMenu places it. */
function submenuHtml(): string {
    const menu = document.getElementById("menu")!.getBoundingClientRect();
    const item = document.getElementById("seen-by")!.getBoundingClientRect();
    const { top, left, right } = getSeenBySubmenuPosition(item, menu, document.documentElement.clientWidth);
    const side = left === undefined ? `right: ${right}px` : `left: ${left}px`;
    const rows = READERS.map(
        ([name, time]) => `
            <li class="mx_AccessibleButton mx_SeenByMenu_reader mx_IconizedContextMenu_item" role="menuitem"
                tabindex="-1">
                ${avatar(name)}
                <span class="mx_IconizedContextMenu_label">${name}</span>
                <span class="mx_SeenByMenu_time">${time}</span>
            </li>
        `,
    ).join("");
    return `
        <div class="mx_ContextualMenu_wrapper" style="top: ${top}px; ${side}">
            <div class="mx_ContextualMenu mx_SeenByMenu_submenu mx_ContextualMenu_${left === undefined ? "right" : "left"} mx_ContextualMenu_top"
                role="menu" id="submenu">
                <ul role="none" class="mx_IconizedContextMenu mx_SeenByMenu mx_IconizedContextMenu_compact">
                    <div class="mx_IconizedContextMenu_optionList">${rows}</div>
                </ul>
            </div>
        </div>
    `;
}

/** The message menu at `left`, with its submenu of readers open. */
function render(left = 40): void {
    const container = document.createElement("div");
    container.className = "cpd-theme-light";
    document.body.append(container);
    container.innerHTML = menuHtml(left);
    container.insertAdjacentHTML("beforeend", submenuHtml());
}

const rectOf = (element: Element): DOMRect => element.getBoundingClientRect();

function textRect(element: Element): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect();
}

let stylesheet: HTMLStyleElement;
let unloadInter: () => void;

describe("The message menu's Seen by item", () => {
    beforeAll(async () => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic}
            ${compoundStyles} ${telementTokens}
            body { font: var(--cpd-font-body-md-regular); font-family: Inter; }
            .cpd-theme-light {
                ${toBrowserCss(contextualMenuStyles + iconizedContextMenuStyles + seenByMenuStyles, commonStyles, lightTheme)}
            }
        `;
        document.head.append(stylesheet);
        unloadInter = await loadInter();
    });

    afterAll(() => {
        stylesheet.remove();
        unloadInter();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("is a menu row like the others: 32px, its 16px double check 16px in and its label 10px after it", () => {
        render();
        const menu = rectOf(document.getElementById("menu")!);
        const item = document.getElementById("seen-by")!;
        const check = rectOf(item.querySelector("svg")!);

        expect(rectOf(item).height).toBe(32);
        expect([check.width, check.height]).toEqual([16, 16]);
        expect(check.left - menu.left).toBe(16);
        expect(textRect(item.querySelector(".mx_IconizedContextMenu_label")!).left - check.right).toBe(10);
    });

    it("ends with a face pile of the three latest readers' 20px avatars, on the menu's 16px content edge", () => {
        render();
        const menu = rectOf(document.getElementById("menu")!);
        const item = document.getElementById("seen-by")!;
        const faces = [...item.querySelectorAll(".mx_SeenByMenuItem_faces .mx_BaseAvatar")].map(rectOf);
        const pile = rectOf(item.querySelector(".mx_SeenByMenuItem_faces")!);
        const row = rectOf(item);

        expect(faces).toHaveLength(3);
        for (const face of faces) {
            expect([face.width, face.height]).toEqual([20, 20]);
            expect(face.top + face.height / 2).toBe(row.top + row.height / 2);
        }
        // Each face over the one before it, as Compound stacks them
        expect(faces[1].left).toBeLessThan(faces[0].right);
        expect(menu.right - pile.right).toBe(16);
        expect(pile.left - textRect(item.querySelector(".mx_IconizedContextMenu_label")!).right).toBeGreaterThanOrEqual(
            8,
        );
    });

    it("opens the submenu of readers against the menu's end edge, its first row level with the item", () => {
        render();
        const menu = rectOf(document.getElementById("menu")!);
        const submenu = rectOf(document.getElementById("submenu")!);
        const [first] = document.querySelectorAll(".mx_SeenByMenu_reader");

        expect(submenu.left).toBe(menu.right);
        expect(rectOf(first).top).toBe(rectOf(document.getElementById("seen-by")!).top);
    });

    it("opens the submenu against the menu's start edge where the end side has no room for it", () => {
        render(document.documentElement.clientWidth - 300);
        const menu = rectOf(document.getElementById("menu")!);
        const submenu = rectOf(document.getElementById("submenu")!);

        expect(submenu.right).toBe(menu.left);
        expect(submenu.left).toBeGreaterThanOrEqual(0);
    });

    it("lists each reader in a 32px row: their 20px avatar 16px in, the name 10px after it, the time on the end edge", () => {
        render();
        const submenu = rectOf(document.getElementById("submenu")!);
        const rows = [...document.querySelectorAll<HTMLElement>(".mx_SeenByMenu_reader")];

        expect(rectOf(rows[0]).top - submenu.top).toBe(4);
        expect(submenu.bottom - rectOf(rows.at(-1)!).bottom).toBe(4);
        for (const row of rows) {
            const box = rectOf(row);
            const face = rectOf(row.querySelector(".mx_BaseAvatar")!);
            const name = textRect(row.querySelector(".mx_IconizedContextMenu_label")!);
            const time = row.querySelector(".mx_SeenByMenu_time")!;

            expect(box.height).toBe(32);
            expect([face.width, face.height]).toEqual([20, 20]);
            expect(face.left - submenu.left).toBe(16);
            expect(face.top + face.height / 2).toBe(box.top + box.height / 2);
            expect(name.left - face.right).toBe(10);
            expect(submenu.right - rectOf(time).right).toBe(16);
            expect(getComputedStyle(time).fontSize).toBe("13px");
            expect(getComputedStyle(time).color).toBe(tokenColor("--cpd-color-text-secondary", time));
        }
    });

    it("is as wide as its longest row allows, up to 320px, cutting a long name short before its time", () => {
        render();
        const submenu = rectOf(document.getElementById("submenu")!);
        const name = [...document.querySelectorAll(".mx_SeenByMenu_reader .mx_IconizedContextMenu_label")][2];

        expect(submenu.width).toBe(320);
        expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
    });
});
