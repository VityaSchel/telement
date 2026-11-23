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
import {
    Menu,
    MenuItem,
    MenuScrollArea,
    MenuTitle,
    RadioMenuItem,
    Separator,
    TooltipProvider,
} from "@vector-im/compound-web";
import { AttachmentIcon, CheckIcon, ImageIcon, PollsIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
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

/**
 * Renders an open Compound menu with real Compound components, so the hashed class names are compound-web's. With
 * `title`, the menu shows its title above the children, as the space menu does.
 */
async function renderMenu(children: ReactNode[], title?: string): Promise<HTMLElement> {
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
                    title: title ?? "Attachment",
                    showTitle: title !== undefined,
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

    it("insets the items 4px from the menu's edge as 32px rows, rounded concentrically with its corners", async () => {
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
            expect(rect.height).toBe(32);
            expect(getComputedStyle(row).borderRadius).toBe("8px");
            // What the item holds starts 16px from the menu's edge, as in Compound: a 16px icon centered on the row,
            // with the label in regular text 10px after it
            const icon = row.querySelector("svg")!.getBoundingClientRect();
            expect(icon.left - edge.left).toBe(16);
            expect(icon.width).toBe(16);
            expect(icon.height).toBe(16);
            expect(icon.top - rect.top).toBe(8);
            expect(rect.bottom - icon.bottom).toBe(8);
            const label = row.querySelector("span")!;
            expect(label.getBoundingClientRect().left - icon.right).toBe(10);
            expect(getComputedStyle(label).fontWeight).toBe("400");
        }
        // One row after another, with no gap
        const tops = items.map((row) => row.getBoundingClientRect().top);
        expect(tops).toEqual(items.map((_, index) => tops[0] + 32 * index));
    });

    it("lays out a group of items under something else, such as a search pill, the same way", async () => {
        const menu = await renderMenu([
            createElement("div", { key: "search", role: "menuitem" }, createElement("input")),
            createElement(MenuScrollArea, { key: "choices", role: "group" }, [
                item("Africa/Abidjan"),
                item("Asia/Tokyo"),
            ]),
        ]);
        const edge = menu.getBoundingClientRect();
        const group = menu.querySelector('[role="group"]')!.getBoundingClientRect();
        const items = [...menu.querySelectorAll<HTMLElement>('[role="group"] > [role="menuitem"]')];
        const [first, second] = items.map((row) => row.getBoundingClientRect());

        expect([first.top - group.top, first.left - edge.left, edge.right - first.right]).toEqual([4, 4, 4]);
        expect([first.height, second.height, second.top - first.bottom]).toEqual([32, 32, 0]);
        expect(getComputedStyle(items[0]).borderRadius).toBe("8px");
        const label = items[0].querySelector("span")!;
        expect(label.getBoundingClientRect().left - edge.left).toBe(16);
        expect(getComputedStyle(label).fontWeight).toBe("400");
    });

    it("spans the item highlights with separators, 2px above and below", async () => {
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
        expect(separator.top - above.bottom).toBe(2);
        expect(below.top - separator.bottom).toBe(2);
    });

    // The sort menu puts a title of its own first, the space menu shows the menu's
    it.each([
        ["a title item", false],
        ["the menu's own title", true],
    ])("puts %s in a 32px row like the items, its text where the items' content starts", async (_, ownTitle) => {
        const options = [item("Latest activity"), item("A-Z")];
        const menu = ownTitle
            ? await renderMenu(options, "Studio")
            : await renderMenu([createElement(MenuTitle, { key: "title", title: "Sort" }), ...options]);
        const edge = menu.getBoundingClientRect();
        const title = menu.querySelector("h3")!;
        const text = document.createRange();
        text.selectNodeContents(title);
        const titleBox = title.getBoundingClientRect();
        const style = getComputedStyle(title);

        // Inset from the menu's top as the items are, and as tall as them with its line, which spans the item
        // highlights like a separator, 2px above the first item
        expect(titleBox.top - edge.top).toBe(4);
        expect(titleBox.height).toBe(32);
        expect(titleBox.left - edge.left).toBe(4);
        expect(edge.right - titleBox.right).toBe(4);
        expect(style.borderBottomWidth).toBe("1px");
        expect(rows(menu)[0].getBoundingClientRect().top - titleBox.bottom).toBe(2);
        // Its line of text in the middle of the row above the line
        expect(style.paddingTop).toBe(style.paddingBottom);
        expect(text.getBoundingClientRect().left - edge.left).toBe(16);
    });

    it("centers radios on their rows, 16px from the menu's edge", async () => {
        const menu = await renderMenu([
            createElement(RadioMenuItem, { key: "a", label: "Activity", checked: true, onSelect: () => {} }),
            createElement(RadioMenuItem, { key: "b", label: "A-Z", checked: false, onSelect: () => {} }),
        ]);
        const edge = menu.getBoundingClientRect();
        for (const row of rows(menu)) {
            const rect = row.getBoundingClientRect();
            const radio = row.querySelector(":scope > div")!.getBoundingClientRect();
            expect(rect.height).toBe(32);
            expect(radio.top + radio.height / 2).toBe(rect.top + rect.height / 2);
            expect(radio.left - edge.left).toBe(16);
        }
    });

    it("marks the chosen option with a check at its end, 16px from the menu's edge, as Telegram does", async () => {
        // The sort menu's options (OptionMenuView), which are radio items without the radio
        const option = (label: string, checked: boolean): ReactNode =>
            createElement(
                MenuItem,
                {
                    "key": label,
                    "role": "menuitemradio",
                    "aria-checked": checked,
                    label,
                    "onSelect": () => {},
                    "hideChevron": true,
                },
                checked ? createElement(CheckIcon, { width: 16, height: 16 }) : null,
            );
        const menu = await renderMenu([option("Latest activity", true), option("A-Z", false)]);
        const edge = menu.getBoundingClientRect();
        const [chosen, other] = rows(menu);

        for (const row of [chosen, other]) {
            expect(row.getBoundingClientRect().height).toBe(32);
            // The labels start on the 16px edge, as those of other items without an icon
            expect(row.querySelector("span")!.getBoundingClientRect().left - edge.left).toBe(16);
        }
        const rowBox = chosen.getBoundingClientRect();
        const check = chosen.querySelector("svg")!.getBoundingClientRect();
        expect(edge.right - check.right).toBe(16);
        expect(check.top + check.height / 2).toBe(rowBox.top + rowBox.height / 2);
        expect(other.querySelector("svg")).toBeNull();
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

    it("draws no ring or highlight for the focus Radix gives the item under the mouse", async () => {
        const menu = await renderMenu([item("Photo or video", ImageIcon), item("File", AttachmentIcon)]);
        const file = rows(menu)[1];
        await userEvent.keyboard("{Shift}");
        file.focus();
        const rest = getComputedStyle(rows(menu)[0]).backgroundColor;

        // what-input, which the app loads, marks the mouse in use; Chrome still takes the focus for the keyboard's
        document.documentElement.dataset.whatintent = "mouse";
        expect(file.matches(":focus-visible")).toBe(true);
        expect(getComputedStyle(file).outlineStyle).toBe("none");
        expect(getComputedStyle(file).backgroundColor).toBe(rest);
        delete document.documentElement.dataset.whatintent;
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
        // A label on one line still has its icon in the middle of the 32px row
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

    it("fills a hovered destructive item in the menus' red, whose first step barely shows on white", async () => {
        const menu = await renderMenu([
            item("Photo or video", ImageIcon),
            createElement(MenuItem, { key: "Delete", label: "Delete", kind: "critical", onSelect: () => {} }),
        ]);
        const remove = rows(menu)[1];
        const probe = document.createElement("div");
        probe.style.color = "var(--cpd-color-red-300)";
        menu.append(probe);
        const red = getComputedStyle(probe).color;
        probe.remove();

        await userEvent.hover(remove);
        expect(getComputedStyle(remove).backgroundColor).toBe(red);
    });
});
