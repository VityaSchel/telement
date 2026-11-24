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
// The layout assertions need the real spacing tokens and Telement's tokens
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../tokens.css";

import * as stories from "./ActionRowView.stories";
import { ActionRowView } from "./ActionRowView";

const { Critical, CriticalWithIcon, Accent, AccentWithStatus, Disabled, Navigation, Disclosure, DisclosureExpanded } =
    composeStories(stories);

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

/** The card the stories put the row on. */
function card(row: HTMLElement): DOMRect {
    return row.parentElement!.getBoundingClientRect();
}

describe("ActionRowView", () => {
    it("is a plain button that does what it says", async () => {
        const onClick = vi.fn();
        render(<ActionRowView onClick={onClick}>Mark all as read</ActionRowView>);
        const row = screen.getByRole("button", { name: "Mark all as read" });

        await userEvent.click(row);

        expect(row).toHaveAttribute("type", "button");
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("draws a red 44px text row alone on its card, its fill 4px from the card's edges and its text on the content edge", () => {
        render(<Critical />);
        const row = screen.getByRole("button", { name: "Leave room" });
        const box = row.getBoundingClientRect();
        const cardBox = card(row);
        const style = getComputedStyle(row);

        expect(box.height).toBe(44);
        expect([box.left - cardBox.left, cardBox.right - box.right]).toEqual([4, 4]);
        expect([box.top - cardBox.top, cardBox.bottom - box.bottom]).toEqual([4, 4]);
        // A card holding only the row is as tall as the row and its 4px insets
        expect(cardBox.height).toBe(52);
        expect(textBox(screen.getByText("Leave room")).left - cardBox.left).toBe(16);
        expect([style.color, style.fontSize, style.fontWeight]).toEqual([
            tokenColor("--cpd-color-text-critical-primary"),
            "15px",
            "400",
        ]);
        expect(getComputedStyle(screen.getByText("Leave room")).fontWeight).toBe("600");
        expect([style.backgroundColor, style.borderTopStyle, style.borderTopLeftRadius]).toEqual([
            "rgba(0, 0, 0, 0)",
            "none",
            "8px",
        ]);
    });

    it("fills a red row with the menus' red hover and pressed fills", async () => {
        render(<Critical />);
        const row = screen.getByRole("button");

        await pointer.hover(row);
        expect(getComputedStyle(row).backgroundColor).toBe(
            tokenColor("--tl-color-bg-menu-critical-hovered", "backgroundColor"),
        );
    });

    it("draws any other action in the accent, with the row hover gray", async () => {
        render(<Accent />);
        const row = screen.getByRole("button", { name: "Mark all as read" });

        expect(getComputedStyle(row).color).toBe(tokenColor("--cpd-color-text-action-accent"));
        expect(getComputedStyle(screen.getByText("Mark all as read")).fontWeight).toBe("600");
        await pointer.hover(row);
        expect(getComputedStyle(row).backgroundColor).toBe(
            tokenColor("--cpd-color-bg-action-secondary-hovered", "backgroundColor"),
        );
    });

    it("puts a 20px icon on the content edge before the label", () => {
        render(<CriticalWithIcon />);
        const row = screen.getByRole("button", { name: "Remove this device" });
        const icon = row.querySelector("svg")!.getBoundingClientRect();
        const label = textBox(screen.getByText("Remove this device"));

        expect([icon.width, icon.height]).toEqual([20, 20]);
        expect(icon.left - card(row).left).toBe(16);
        expect(label.left - icon.right).toBe(12);
        const box = row.getBoundingClientRect();
        expect(icon.top + icon.height / 2).toBe(box.top + box.height / 2);
    });

    it("shows a status at the row's end in secondary text", () => {
        render(<AccentWithStatus />);
        const row = screen.getByRole("button");
        const status = screen.getByText("No update available.");

        expect(getComputedStyle(status).color).toBe(tokenColor("--cpd-color-text-secondary"));
        expect(getComputedStyle(status).fontWeight).toBe("400");
        expect(card(row).right - status.getBoundingClientRect().right).toBe(16);
    });

    it("draws a disabled row in the disabled color without a fill when hovered", async () => {
        render(<Disabled />);
        const row = screen.getByRole("button");

        expect(row).toBeDisabled();
        expect(getComputedStyle(row).color).toBe(tokenColor("--cpd-color-text-disabled"));
        await pointer.hover(row);
        expect(getComputedStyle(row).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    });

    it("draws a row that opens a list in the text color, with its count and a chevron ending on the content edge", () => {
        render(<Navigation />);
        const row = screen.getByRole("button", { name: "Rooms with their own setting 3" });
        const glyph = row.querySelector("svg path")!.getBoundingClientRect();
        const count = screen.getByText("3");

        expect(getComputedStyle(row).color).toBe(tokenColor("--cpd-color-text-primary"));
        expect(getComputedStyle(screen.getByText("Rooms with their own setting")).fontWeight).toBe("400");
        expect(card(row).right - glyph.right).toBeCloseTo(16, 0);
        expect(row.querySelector("svg")!.getBoundingClientRect().left - count.getBoundingClientRect().right).toBe(4);
    });

    it("draws a row that shows more under it with a chevron that points down, and up while it does, ending on the edge", () => {
        /** Where the chevron's tip is in its box, measured from the top: below its middle when it points down. */
        const tip = (row: HTMLElement): number => {
            const icon = row.querySelector("svg")!;
            const glyph = icon.querySelector("path")!;
            const points = Array.from({ length: 100 }, (_, i) =>
                glyph.getPointAtLength((glyph.getTotalLength() * i) / 100),
            );
            // The glyph's points nearest to its middle are the tip's
            const middle = points.filter(({ x }) => Math.abs(x - 12) < 0.5).map(({ y }) => y);
            return middle.reduce((sum, y) => sum + y, 0) / middle.length;
        };

        const { unmount } = render(<Disclosure />);
        const collapsed = screen.getByRole("button", { name: "Access token", expanded: false });
        expect(tip(collapsed)).toBeGreaterThan(12.5);
        expect(card(collapsed).right - collapsed.querySelector("svg path")!.getBoundingClientRect().right).toBeCloseTo(
            16,
            0,
        );
        expect(getComputedStyle(collapsed).color).toBe(tokenColor("--cpd-color-text-primary"));
        unmount();

        render(<DisclosureExpanded />);
        const expanded = screen.getByRole("button", { name: "Access token", expanded: true });
        expect(tip(expanded)).toBeLessThan(11.5);
        expect(card(expanded).right - expanded.querySelector("svg path")!.getBoundingClientRect().right).toBeCloseTo(
            16,
            0,
        );
    });
});
