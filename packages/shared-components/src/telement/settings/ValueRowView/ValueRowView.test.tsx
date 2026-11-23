/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { composeStories } from "@storybook/react-vite";
import userEvent from "@testing-library/user-event";
import { userEvent as pointer } from "vitest/browser";
import { render, screen } from "@test-utils";
import { describe, expect, it, vi } from "vitest";
// The layout assertions need the real spacing tokens, Compound's menus and Telement's tokens
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../tokens.css";

import * as stories from "./ValueRowView.stories";
import { ValueRowList, ValueRowView, type ValueRowViewActions, type ValueRowViewSnapshot } from "./ValueRowView";
import { MockViewModel } from "../../../core/viewmodel/MockViewModel";
import { SettingsStoryCard as Card } from "../SettingsStoryCard";

const { Default, Disabled, CustomValue, EditingCustomValue, Person, LongValue, List } = composeStories(stories);

/** A view model of the row with mocked actions. */
function rowViewModel(
    snapshot: Partial<ValueRowViewSnapshot> = {},
): MockViewModel<ValueRowViewSnapshot> & ValueRowViewActions {
    const vm = new MockViewModel<ValueRowViewSnapshot>({
        label: "Send messages",
        value: "Default",
        options: [
            { key: "0", label: "Default" },
            { key: "50", label: "Moderator" },
        ],
        selectedKey: "0",
        disabled: false,
        ...snapshot,
    });
    return Object.assign(vm, {
        select: vi.fn(),
        startCustom: vi.fn(),
        setCustomValue: vi.fn(),
        commitCustom: vi.fn(),
        cancelCustom: vi.fn(),
    });
}

/** What a color token resolves to in the document. */
function tokenColor(token: string, property: "color" | "backgroundColor" = "color"): string {
    const probe = document.createElement("div");
    probe.style[property] = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe)[property];
    probe.remove();
    return color;
}

/** Where the text of an element is drawn. */
function textBox(element: Element): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect();
}

const card = (): DOMRect => screen.getByTestId("card").getBoundingClientRect();

describe("ValueRowView", () => {
    it("shows the label and the value, and opens a menu of the choices with the chosen one checked", async () => {
        render(<Default />);
        const row = screen.getByRole("button", { name: "Send messages Default" });

        await userEvent.click(row);

        const items = screen.getAllByRole("menuitemradio");
        expect(items.map((item) => item.textContent)).toEqual(["Default", "Moderator", "Admin"]);
        expect(items.map((item) => item.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
        // The check ends the chosen item, after its label
        expect(items[0].lastElementChild?.tagName).toBe("svg");
        expect(items[1].querySelector("svg")).toBeNull();
        expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("chooses an option", async () => {
        const vm = rowViewModel();
        render(<ValueRowView vm={vm} />);

        await userEvent.click(screen.getByRole("button"));
        await userEvent.click(screen.getByRole("menuitemradio", { name: "Moderator" }));

        expect(vm.select).toHaveBeenCalledWith("50");
        expect(screen.queryByRole("menu")).toBeNull();
    });

    it("offers a value of one's own last, checked while no option is chosen", async () => {
        render(<CustomValue />);

        await userEvent.click(screen.getByRole("button", { name: "Remove users 75" }));

        const custom = screen.getByRole("menuitemradio", { name: "Custom…" });
        expect(screen.getAllByRole("menuitemradio").at(-1)).toBe(custom);
        expect(custom).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("menuitemradio", { name: "Default" })).toHaveAttribute("aria-checked", "false");
    });

    it("starts typing a value of one's own when the custom item is chosen", async () => {
        const vm = rowViewModel({ customLabel: "Custom…" });
        render(<ValueRowView vm={vm} />);

        await userEvent.click(screen.getByRole("button"));
        await userEvent.click(screen.getByRole("menuitemradio", { name: "Custom…" }));

        expect(vm.startCustom).toHaveBeenCalled();
    });

    it("replaces the value with a focused field, applying it on Enter", async () => {
        const vm = rowViewModel({ customLabel: "Custom…", customValue: "75" });
        render(<ValueRowView vm={vm} />);
        const field = screen.getByRole("spinbutton", { name: "Send messages" });

        await vi.waitFor(() => expect(field).toHaveFocus());
        expect(field).toHaveValue(75);
        expect(screen.queryByRole("button")).toBeNull();

        await userEvent.type(field, "1");
        expect(vm.setCustomValue).toHaveBeenLastCalledWith("751");

        await userEvent.keyboard("{Enter}");
        expect(vm.commitCustom).toHaveBeenCalledTimes(1);
        expect(vm.cancelCustom).not.toHaveBeenCalled();
    });

    it("leaves the field without applying it on Escape, which goes no further", async () => {
        const vm = rowViewModel({ customLabel: "Custom…", customValue: "75" });
        const onKeyDown = vi.fn();
        render(
            <div onKeyDown={onKeyDown}>
                <ValueRowView vm={vm} />
            </div>,
        );
        const field = screen.getByRole("spinbutton");
        await vi.waitFor(() => expect(field).toHaveFocus());

        await userEvent.keyboard("{Escape}");
        field.blur();

        expect(vm.cancelCustom).toHaveBeenCalledTimes(1);
        expect(vm.commitCustom).not.toHaveBeenCalled();
        expect(onKeyDown).not.toHaveBeenCalled();
    });

    it("shows a value that can't be changed without a chevron or a menu", async () => {
        render(<Disabled />);

        expect(screen.queryByRole("button")).toBeNull();
        expect(screen.getByText("Change permissions").closest("[aria-disabled]")).toHaveTextContent(
            "Change permissionsAdmin",
        );
        expect(document.querySelector("svg")).toBeNull();
    });

    it("draws a 44px row on the card's content edge, its fill 4px from the card's edges", () => {
        render(<Default />);
        const row = screen.getByRole("button").getBoundingClientRect();
        const style = getComputedStyle(screen.getByRole("button"));

        expect(row.height).toBe(44);
        expect([row.left - card().left, card().right - row.right, row.top - card().top]).toEqual([4, 4, 4]);
        expect(style.borderTopLeftRadius).toBe("8px");
        expect(textBox(screen.getByText("Send messages")).left - card().left).toBe(16);
    });

    it("writes the label in 15px primary text and the value in secondary text, the chevron 4px after it", () => {
        render(<Default />);
        const label = screen.getByText("Send messages", { selector: "span" });
        const value = screen.getByText("Default", { selector: "span" });
        const chevron = screen.getByRole("button").querySelector("svg")!;

        expect(getComputedStyle(label).fontSize).toBe("15px");
        expect(getComputedStyle(label).color).toBe(tokenColor("--cpd-color-text-primary"));
        expect(getComputedStyle(value).color).toBe(tokenColor("--cpd-color-text-secondary"));
        expect(chevron.getBoundingClientRect().left - value.getBoundingClientRect().right).toBe(4);
        expect(chevron.getBoundingClientRect().width).toBe(16);
    });

    it("ends the drawn chevron on the content edge, centered on the row", () => {
        render(<Default />);
        const row = screen.getByRole("button").getBoundingClientRect();
        const glyph = screen.getByRole("button").querySelector("svg path")!.getBoundingClientRect();

        expect(card().right - glyph.right).toBeCloseTo(16, 0);
        expect(glyph.top + glyph.height / 2).toBeCloseTo(row.top + row.height / 2, 0);
    });

    it("fills the row in the row hover gray while hovered and while its menu is open", async () => {
        render(<Default />);
        const row = screen.getByRole("button");

        expect(getComputedStyle(row).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        await pointer.hover(row);
        expect(getComputedStyle(row).backgroundColor).toBe(
            tokenColor("--cpd-color-bg-action-secondary-hovered", "backgroundColor"),
        );
        await userEvent.click(row);
        await pointer.hover(screen.getByRole("menuitemradio", { name: "Admin" }));
        expect(getComputedStyle(row).backgroundColor).toBe(
            tokenColor("--cpd-color-bg-action-secondary-pressed", "backgroundColor"),
        );
    });

    it("draws a person as a 52px two-line row, the 36px avatar on the content edge 8px from its top and bottom", () => {
        render(<Person />);
        const row = screen.getByRole("button").getBoundingClientRect();
        const avatar = screen.getByRole("button").querySelector("[data-type]")!.getBoundingClientRect();
        expect(screen.getByRole("button")).toHaveAccessibleName("BotBob @bot_0002:localhost Moderator");
        const id = screen.getByText("@bot_0002:localhost");

        expect(row.height).toBe(52);
        expect([avatar.width, avatar.height]).toEqual([36, 36]);
        expect([avatar.top - row.top, row.bottom - avatar.bottom]).toEqual([8, 8]);
        expect(avatar.left - card().left).toBe(16);
        expect(getComputedStyle(id).fontSize).toBe("13px");
        expect(getComputedStyle(id).color).toBe(tokenColor("--cpd-color-text-secondary"));
        expect(getComputedStyle(id).fontFeatureSettings).toContain('"calt" 0');
    });

    it("cuts a long value short before it takes more than half the row", () => {
        render(<LongValue />);
        const row = screen.getByRole("button").getBoundingClientRect();
        const value = screen.getAllByText(/MacBook Pro Speakers/)[0];

        expect(value.getBoundingClientRect().width).toBeLessThan(row.width / 2);
        expect(getComputedStyle(value).textOverflow).toBe("ellipsis");
    });

    it("puts rows of a list one under another without gaps, a card holding only them 4px around them", () => {
        render(<List />);
        const rows = screen.getAllByRole("button").map((row) => row.getBoundingClientRect());

        expect(rows[1].top).toBe(rows[0].bottom);
        expect(rows[2].top).toBe(rows[1].bottom);
        expect(rows[0].top - card().top).toBe(4);
        expect(card().bottom - rows[2].bottom).toBe(4);
    });

    it("keeps the card's gap between a list and what comes before it", () => {
        render(
            <Card>
                <div data-testid="field" style={{ height: 36 }} />
                <ValueRowList>
                    <ValueRowView vm={rowViewModel()} />
                    <ValueRowView vm={rowViewModel({ label: "Invite users" })} />
                </ValueRowList>
            </Card>,
        );
        const field = screen.getByTestId("field").getBoundingClientRect();
        const [first, second] = screen.getAllByRole("button").map((row) => row.getBoundingClientRect());

        expect(first.top - field.bottom).toBe(16);
        expect(second.top).toBe(first.bottom);
        expect(card().bottom - second.bottom).toBe(4);
    });

    it("puts the field for a value of one's own on the content edge, 36px tall, keeping the row 44px", () => {
        render(<EditingCustomValue />);
        const field = screen.getByRole("spinbutton");
        const box = field.getBoundingClientRect();
        const row = field.parentElement!.getBoundingClientRect();
        const style = getComputedStyle(field);

        expect(row.height).toBe(44);
        expect(box.height).toBe(36);
        expect([box.top - row.top, card().right - box.right]).toEqual([4, 16]);
        expect([style.borderTopWidth, style.borderTopLeftRadius, style.fontSize]).toEqual(["1px", "8px", "15px"]);
        expect(parseFloat(style.paddingInlineEnd) + 1).toBe(12);
    });

    it("mirrors in right-to-left text, the value and the chevron at the left", () => {
        render(
            <div dir="rtl">
                <Default />
            </div>,
        );
        const glyph = screen.getByRole("button").querySelector("svg path")!.getBoundingClientRect();

        expect(textBox(screen.getByText("Send messages")).right).toBeCloseTo(card().right - 16, 0);
        expect(glyph.left - card().left).toBeCloseTo(16, 0);
    });
});
