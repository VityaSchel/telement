/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "../../../../../telement/tokens.css";
import React from "react";
import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@test-utils";
import { describe, it, expect } from "vitest";

import * as stories from "./AudioPlayerView.stories";

const { Default } = composeStories(stories);

describe("AudioPlayerView insets", () => {
    it("insets its contents evenly, 13px from every edge with the 1px border", () => {
        render(<Default />);
        const player = screen.getByRole("region");
        const edge = player.getBoundingClientRect();
        const contents = [...player.children].map((child) => child.getBoundingClientRect());

        expect(Math.min(...contents.map((box) => box.top)) - edge.top).toBe(13);
        expect(Math.min(...contents.map((box) => box.left)) - edge.left).toBe(13);
        expect(edge.right - Math.max(...contents.map((box) => box.right))).toBe(13);
        expect(edge.bottom - Math.max(...contents.map((box) => box.bottom))).toBe(13);
    });

    it.each([
        ["the timeline's card radius", "12px", "12px"],
        ["8px outside the timeline", undefined, "8px"],
    ])("rounds the player by %s", (_name, cardRadius, expected) => {
        render(
            <div style={{ ["--MBody-border-radius" as string]: cardRadius }}>
                <Default />
            </div>,
        );

        expect(getComputedStyle(screen.getByRole("region")).borderRadius).toBe(expected);
    });
});
