/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../../../../telement/tokens.css";
import React from "react";
import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@test-utils";
import { describe, it, expect } from "vitest";

import * as stories from "./PinnedMessageBadge.stories.tsx";
import * as reactionsRowStories from "../../reactions/ReactionsRow/ReactionsRow.stories.tsx";

const { Default } = composeStories(stories);
const { Default: ReactionsRow } = composeStories(reactionsRowStories);

/** The badge beside the reactions, as an event's footer lays them out. */
function renderFooter(width?: string): HTMLElement {
    render(
        <div style={{ display: "flex", alignItems: "center", gap: "8px", width }}>
            <Default />
            <ReactionsRow />
        </div>,
    );
    return screen.getByText("Pinned message").closest("div")!;
}

describe("Pinned message badge shape", () => {
    it("is a pill as high as the reaction chips beside it", () => {
        const badge = renderFooter();

        const box = badge.getBoundingClientRect();
        const chip = screen.getAllByRole("button", { name: /reactions for/ })[0].getBoundingClientRect();
        expect(box.height).toBe(24);
        expect(chip.height).toBe(box.height);
        expect(parseFloat(getComputedStyle(badge).borderTopLeftRadius)).toBeGreaterThanOrEqual(box.height / 2);
    });

    it("puts the pin 4px from the badge's top, bottom and start, and ends the label 12px from its end", () => {
        const badge = renderFooter();

        const box = badge.getBoundingClientRect();
        const icon = badge.querySelector("svg")!.getBoundingClientRect();
        expect(icon.height).toBe(16);
        expect(icon.top - box.top).toBe(4);
        expect(box.bottom - icon.bottom).toBe(4);
        expect(icon.left - box.left).toBe(4);

        const range = document.createRange();
        range.selectNodeContents(badge.lastChild!);
        expect(box.right - range.getBoundingClientRect().right).toBeCloseTo(12, 1);
    });

    it("keeps its label on one line inside the badge when the footer is too narrow for both", () => {
        const badge = renderFooter("200px");

        const box = badge.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(badge.lastChild!);
        const lines = [...range.getClientRects()];
        expect(box.height).toBe(24);
        expect(lines).toHaveLength(1);
        expect(lines[0].top).toBeGreaterThanOrEqual(box.top);
        expect(lines[0].bottom).toBeLessThanOrEqual(box.bottom);
        expect(lines[0].right).toBeLessThanOrEqual(box.right);
    });
});
