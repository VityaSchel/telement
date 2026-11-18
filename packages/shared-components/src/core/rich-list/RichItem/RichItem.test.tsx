/*
 * Copyright 2025 New Vector Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "../../../telement/tokens.css";
import { composeStories } from "@storybook/react-vite";
import { render } from "@test-utils";
import React from "react";
import { describe, it, vi, beforeAll, expect } from "vitest";
import { userEvent } from "vitest/browser";

import * as stories from "./RichItem.stories";

const { Default, Selected, WithoutTimestamp, Separator } = composeStories(stories);

describe("RichItem", () => {
    beforeAll(() => {
        vi.useFakeTimers().setSystemTime(new Date("2025-08-01T12:00:00Z"));
    });

    it("renders the item in default state", () => {
        const { container } = render(<Default />);
        expect(container).toMatchSnapshot();
    });

    it("renders the item in selected state", () => {
        const { container } = render(<Selected />);
        expect(container).toMatchSnapshot();
    });

    it.each([
        ["cpd-theme-light", "rgb(36, 129, 204)"],
        ["cpd-theme-dark", "rgb(1, 131, 211)"],
    ])("draws the selected item's check in white on the accent fill in %s", (theme, fill) => {
        const { container } = render(
            <div className={theme}>
                <Selected />
            </div>,
        );
        const checkmark = container.querySelector<HTMLElement>("[class*='checkmark']")!;

        expect(getComputedStyle(checkmark).backgroundColor).toBe(fill);
        expect(getComputedStyle(checkmark.querySelector("svg")!).color).toBe("rgb(255, 255, 255)");
    });

    it("renders the item without timestamp", () => {
        const { container } = render(<WithoutTimestamp />);
        expect(container).toMatchSnapshot();
    });

    it("holds its avatar 8px inside the row, with no divider between rows", () => {
        const { container } = render(<Separator />);
        const [first, second] = [...container.querySelectorAll<HTMLElement>("li")];
        const avatar = first.querySelector("[class*='avatar']")!;

        expect(avatar.getBoundingClientRect().left - first.getBoundingClientRect().left).toBe(8);
        expect(getComputedStyle(first).padding).toBe("8px");
        expect(getComputedStyle(first).borderBottomStyle).toBe("none");
        expect(second.getBoundingClientRect().top).toBe(first.getBoundingClientRect().bottom);
    });

    it("rounds the focused row's highlight as rows are rounded", () => {
        const { container } = render(<Default />);
        const item = container.querySelector<HTMLElement>("li")!;
        item.focus();

        expect(getComputedStyle(item).borderTopLeftRadius).toBe("8px");
    });

    it("is the Forward dialog's 52px row: a 36px avatar 8px from its start, top and bottom by a 15px name over a 13px ID", () => {
        const { container, getByText } = render(<WithoutTimestamp />);
        const item = container.querySelector<HTMLElement>("li")!.getBoundingClientRect();
        const avatar = container.querySelector("li [class*='avatar']")!.getBoundingClientRect();
        const title = getByText("Rich Item Title");
        const description = getByText("This is a description of the rich item.");

        expect(item.height).toBe(52);
        expect([avatar.width, avatar.left - item.left, avatar.top - item.top, item.bottom - avatar.bottom]).toEqual([
            36, 8, 8, 8,
        ]);
        expect([getComputedStyle(title).fontSize, getComputedStyle(title).fontWeight]).toEqual(["15px", "400"]);
        expect(getComputedStyle(title).color).toBe(tokenColor("--cpd-color-text-primary"));
        expect(getComputedStyle(description).fontSize).toBe("13px");
        expect(getComputedStyle(description).color).toBe(tokenColor("--cpd-color-text-secondary"));
        expect(description.getBoundingClientRect().top).toBeGreaterThanOrEqual(title.getBoundingClientRect().bottom);
    });

    it("draws the selected item's check as large as the avatar it stands in for", () => {
        const { container } = render(<Selected />);
        const checkmark = container.querySelector("[class*='checkmark']")!.getBoundingClientRect();

        expect([checkmark.width, checkmark.height]).toEqual([36, 36]);
    });

    it("fills a hovered row with the one hover fill and the row the keyboard selects with the pressed fill", async () => {
        const { container } = render(<Separator />);
        const [first, second] = [...container.querySelectorAll<HTMLElement>("li")];

        await userEvent.hover(first);
        expect(getComputedStyle(first).backgroundColor).toBe(tokenColor("--cpd-color-bg-action-secondary-hovered"));

        second.focus();
        expect(getComputedStyle(second).backgroundColor).toBe(tokenColor("--cpd-color-bg-action-secondary-pressed"));
        expect(getComputedStyle(second).backgroundColor).not.toBe(getComputedStyle(first).backgroundColor);
    });
});

/** What a color token resolves to, as a computed color. */
function tokenColor(token: string): string {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}
