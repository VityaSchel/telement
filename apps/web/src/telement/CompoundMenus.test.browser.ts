/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { Menu, MenuItem, MenuTitle, RadioMenuItem, Separator, TooltipProvider } from "@vector-im/compound-web";
import { AttachmentIcon, ImageIcon, PollsIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import tokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";

import compoundOverrides from "../../res/css/telement/_CompoundOverrides.pcss?raw";

let stylesheet: HTMLStyleElement;
let root: Root | undefined;

/** Renders an open Compound menu with real Compound components, so the hashed class names are compound-web's. */
async function renderMenu(children: ReactNode[]): Promise<HTMLElement> {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    flushSync(() =>
        root!.render(
            createElement(
                TooltipProvider,
                null,
                createElement(Menu, {
                    open: true,
                    onOpenChange: () => {},
                    title: "Attachment",
                    showTitle: false,
                    trigger: createElement("button", { type: "button" }, "Open"),
                    align: "start",
                    children,
                }),
            ),
        ),
    );
    const menu = await waitForElement<HTMLElement>('[role="menu"]');
    // Compound's menus slide in; the measurements need them at rest
    await Promise.all(menu.getAnimations().map((animation) => animation.finished));
    return menu;
}

async function waitForElement<T extends Element>(selector: string): Promise<T> {
    for (let i = 0; i < 50; i++) {
        const element = document.querySelector<T>(selector);
        if (element) return element;
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`No ${selector}`);
}

function item(label: string, Icon?: typeof ImageIcon): ReactNode {
    return createElement(MenuItem, { key: label, label, Icon, onSelect: () => {} });
}

function rows(menu: HTMLElement): HTMLElement[] {
    return [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
}

describe("Compound's menus", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${tokens} }
            @layer compound-web { ${compoundStyles} }
            @layer app-web { ${compoundOverrides} }
        `;
        document.head.append(stylesheet);
        // The menu opens in a portal on the body, so the theme goes on the root
        document.documentElement.classList.add("cpd-theme-light");
    });

    afterAll(() => {
        stylesheet.remove();
        document.documentElement.classList.remove("cpd-theme-light");
    });

    afterEach(() => {
        root?.unmount();
        root = undefined;
        document.body.innerHTML = "";
    });

    it("insets the items 4px from the menu's edge as 40px rows, rounded concentrically with its corners", async () => {
        const menu = await renderMenu([
            item("Photo or video", ImageIcon),
            item("File", AttachmentIcon),
            item("Poll", PollsIcon),
        ]);
        const edge = menu.getBoundingClientRect();
        const items = rows(menu);

        expect(getComputedStyle(menu).borderRadius).toBe("12px");
        expect(items[0].getBoundingClientRect().top - edge.top).toBe(4);
        expect(edge.bottom - items.at(-1)!.getBoundingClientRect().bottom).toBe(4);
        for (const row of items) {
            const rect = row.getBoundingClientRect();
            expect(rect.left - edge.left).toBe(4);
            expect(edge.right - rect.right).toBe(4);
            expect(rect.height).toBe(40);
            expect(getComputedStyle(row).borderRadius).toBe("8px");
            // What the item holds starts 16px from the menu's edge, as in Compound: a 16px icon, as far from the
            // item's start as from its top and bottom, with the label in regular text 12px after it
            const icon = row.querySelector("svg")!.getBoundingClientRect();
            expect(icon.left - edge.left).toBe(16);
            expect(icon.width).toBe(16);
            expect(icon.height).toBe(16);
            expect(icon.top - rect.top).toBe(12);
            expect(rect.bottom - icon.bottom).toBe(12);
            const label = row.querySelector("span")!;
            expect(label.getBoundingClientRect().left - icon.right).toBe(12);
            expect(getComputedStyle(label).fontWeight).toBe("400");
        }
        // One row after another, with no gap
        const tops = items.map((row) => row.getBoundingClientRect().top);
        expect(tops).toEqual(items.map((_, index) => tops[0] + 40 * index));
    });

    it("spans the item highlights with separators, 4px above and below", async () => {
        const menu = await renderMenu([
            item("Photo or video", ImageIcon),
            createElement(Separator, { key: "separator" }),
            item("Poll", PollsIcon),
        ]);
        const edge = menu.getBoundingClientRect();
        const separator = menu.querySelector('[role="separator"]')!.getBoundingClientRect();
        const [above, below] = rows(menu).map((row) => row.getBoundingClientRect());

        expect(separator.left - edge.left).toBe(4);
        expect(edge.right - separator.right).toBe(4);
        expect(separator.top - above.bottom).toBe(4);
        expect(below.top - separator.bottom).toBe(4);
    });

    it("puts a title's text where the items' content starts, 12px from the top, and centers radios on their rows", async () => {
        const menu = await renderMenu([
            createElement(MenuTitle, { key: "title", title: "Sort" }),
            createElement(RadioMenuItem, { key: "a", label: "Activity", checked: true, onSelect: () => {} }),
            createElement(RadioMenuItem, { key: "b", label: "A-Z", checked: false, onSelect: () => {} }),
        ]);
        const edge = menu.getBoundingClientRect();
        const title = menu.querySelector("h3")!;
        const text = document.createRange();
        text.selectNodeContents(title);
        const titleBox = title.getBoundingClientRect();

        expect(text.getBoundingClientRect().left - edge.left).toBe(16);
        expect(titleBox.top - edge.top + parseFloat(getComputedStyle(title).paddingTop)).toBe(12);
        // Its line spans the item highlights, like a separator, 4px above the first item
        expect(titleBox.left - edge.left).toBe(4);
        expect(rows(menu)[0].getBoundingClientRect().top - titleBox.bottom).toBe(4);
        for (const row of rows(menu)) {
            const rect = row.getBoundingClientRect();
            const radio = row.querySelector(":scope > div")!.getBoundingClientRect();
            expect(rect.height).toBe(40);
            expect(radio.top + radio.height / 2).toBe(rect.top + rect.height / 2);
            expect(radio.left - edge.left).toBe(16);
        }
    });

    it("draws the keyboard focus ring inside the focused item's highlight", async () => {
        const menu = await renderMenu([item("Photo or video", ImageIcon), item("File", AttachmentIcon)]);
        const file = rows(menu)[1];

        await userEvent.keyboard("{Shift}");
        file.focus();

        expect(file.matches(":focus-visible")).toBe(true);
        const style = getComputedStyle(file);
        expect(style.outlineStyle).toBe("solid");
        expect(style.outlineWidth).toBe("2px");
        expect(style.outlineOffset).toBe("-2px");
        // Highlighted as on hover
        expect(style.backgroundColor).not.toBe(getComputedStyle(rows(menu)[0]).backgroundColor);
    });

    it("leaves menus with a layout of their own to it", async () => {
        const menu = await renderMenu([
            createElement("section", { key: "profile" }, "Alice"),
            item("All settings", ImageIcon),
        ]);
        const edge = menu.getBoundingClientRect();
        const row = rows(menu)[0];

        expect(row.getBoundingClientRect().left - edge.left).toBe(0);
        expect(getComputedStyle(row).borderRadius).toBe("0px");
        expect(getComputedStyle(menu.querySelector('[role="none"]')!).paddingTop).toBe("20px");
    });

    it("centers the icon on the first line of a label that wraps", async () => {
        const menu = await renderMenu([
            item("Photo or video", ImageIcon),
            item("Attach a file from this device or from one of your connected storage accounts", AttachmentIcon),
        ]);
        const [single, wrapped] = rows(menu);
        const label = wrapped.querySelector("span")!;
        const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
        const icon = wrapped.querySelector("svg")!.getBoundingClientRect();

        expect(label.getBoundingClientRect().height).toBeGreaterThanOrEqual(2 * lineHeight);
        expect(icon.top + icon.height / 2).toBe(label.getBoundingClientRect().top + lineHeight / 2);
        // A label on one line still has its icon in the middle of the 40px row
        const singleIcon = single.querySelector("svg")!.getBoundingClientRect();
        const singleRow = single.getBoundingClientRect();
        expect(singleIcon.top + singleIcon.height / 2).toBe(singleRow.top + singleRow.height / 2);
    });

    it("shows no chevron on a hovered item, which opens no submenu, as in Telegram", async () => {
        const menu = await renderMenu([item("Photo or video", ImageIcon), item("Poll", PollsIcon)]);
        const poll = rows(menu)[1];
        await userEvent.hover(poll);

        const chevron = poll.querySelector<SVGSVGElement>(":scope > svg:last-child")!;
        expect(chevron).not.toBeVisible();
    });
});
