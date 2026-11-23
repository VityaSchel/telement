/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@test-utils";
import { describe, expect, it } from "vitest";
import ThreadsIcon from "@vector-im/compound-design-tokens/assets/web/icons/threads";
// The layout assertions need the real type, color and spacing tokens and Telement's radius tokens
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../tokens.css";

import * as stories from "./EmptyStateView.stories";
import { EmptyStateView } from "./EmptyStateView";

const { Panel, PanelWithActions, Compact } = composeStories(stories);

/** The box the stories put the empty state in */
function area(): DOMRect {
    return document.querySelector<HTMLElement>("[style*='dashed']")!.getBoundingClientRect();
}

/** The tile, the text and the buttons, which the empty state centers as one block */
function block(): DOMRect {
    const parts = [...document.querySelectorAll<HTMLElement>("svg[aria-hidden], p, button")].map((part) =>
        part.getBoundingClientRect(),
    );
    const top = Math.min(...parts.map((part) => part.top));
    const bottom = Math.max(...parts.map((part) => part.bottom));
    const left = Math.min(...parts.map((part) => part.left));
    const right = Math.max(...parts.map((part) => part.right));
    return new DOMRect(left, top, right - left, bottom - top);
}

/** What a color token resolves to, as a computed color */
function tokenColor(token: string): string {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}

function tile(): HTMLElement {
    return document.querySelector<HTMLElement>("svg[aria-hidden]")!;
}

describe("EmptyStateView", () => {
    it("draws the panel size's icon in a 56px tile, then a 20px title and a 15px description in secondary text", () => {
        render(<Panel />);
        const tileStyle = getComputedStyle(tile());
        const title = screen.getByText("Threads help keep your conversations on-topic and easy to track.");
        const description = screen.getByText("Right-click a message and choose “Reply in thread”.");

        expect([tile().getBoundingClientRect().width, tile().getBoundingClientRect().height]).toEqual([56, 56]);
        expect(tileStyle.borderRadius).toBe("8px");
        expect(tileStyle.padding).toBe("12px");
        expect(getComputedStyle(title).fontSize).toBe("20px");
        expect(getComputedStyle(title).fontWeight).toBe("600");
        expect(getComputedStyle(description).fontSize).toBe("15px");
        expect(getComputedStyle(title).color).toBe(tokenColor("--cpd-color-text-primary"));
        expect(getComputedStyle(description).color).toBe(tokenColor("--cpd-color-text-secondary"));
        expect(tileStyle.color).toBe(tokenColor("--cpd-color-icon-secondary"));
        expect(tileStyle.backgroundColor).toBe(tokenColor("--cpd-color-alpha-gray-300"));
    });

    it("puts the title 16px under the tile and the description 8px under the title", () => {
        render(<Panel />);
        const title = screen.getByText(/^Threads help/).getBoundingClientRect();
        const description = screen.getByText(/^Right-click/).getBoundingClientRect();

        expect(title.top - tile().getBoundingClientRect().bottom).toBe(16);
        expect(description.top - title.bottom).toBe(8);
    });

    it.each([
        ["panel", Panel],
        ["panel with buttons", PanelWithActions],
        ["compact", Compact],
    ])("centers the %s empty state in its area, both ways", (_, Story) => {
        render(<Story />);
        const box = area();
        const content = block();

        expect(Math.abs(content.left - box.left - (box.right - content.right))).toBeLessThanOrEqual(1);
        expect(Math.abs(content.top - box.top - (box.bottom - content.bottom))).toBeLessThanOrEqual(1);
    });

    it("stacks the buttons 24px under the text and 16px apart, as wide as each other", () => {
        render(<PanelWithActions />);
        const description = screen.getByText("Add an existing room or create a new one.").getBoundingClientRect();
        const [add, create] = screen.getAllByRole("button").map((button) => button.getBoundingClientRect());

        expect(add.top - description.bottom).toBe(24);
        expect(create.top - add.bottom).toBe(16);
        expect(add.width).toBe(create.width);
        expect(add.left).toBe(create.left);
    });

    it("keeps the text and the buttons to a 360px measure in a wide area", () => {
        render(
            <div style={{ width: 900, height: 400 }}>
                <EmptyStateView
                    Icon={ThreadsIcon}
                    title="No rooms yet"
                    description={"Add an existing room or create a new one. ".repeat(4)}
                >
                    <button type="button">Add existing room</button>
                </EmptyStateView>
            </div>,
        );

        expect(screen.getByText(/^Add an existing room/).getBoundingClientRect().width).toBeLessThanOrEqual(360);
        expect(screen.getByRole("button").getBoundingClientRect().width).toBe(360);
    });

    it("draws the compact size as the tile and a 13px caption 16px under it, without a title", () => {
        render(<Compact />);
        const caption = screen.getByText("You don't have unread threads you've participated in.");

        expect(document.querySelectorAll("p")).toHaveLength(1);
        expect(getComputedStyle(caption).fontSize).toBe("13px");
        expect(getComputedStyle(caption).color).toBe(tokenColor("--cpd-color-text-secondary"));
        expect(caption.getBoundingClientRect().top - tile().getBoundingClientRect().bottom).toBe(16);
        expect(caption.getBoundingClientRect().width).toBeLessThanOrEqual(280);
    });

    it("hides the tile's icon from assistive technology, which reads the text alone", () => {
        render(<Panel />);

        expect(tile()).toHaveAttribute("aria-hidden", "true");
    });
});
