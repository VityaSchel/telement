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
import { describe, expect, it } from "vitest";

import * as stories from "./ThreadSummary.stories";

const { Default } = composeStories(stories);

describe("Thread summary insets", () => {
    it("is a 40px row with its icon 8px from the start as from the top and bottom", () => {
        render(<Default />);
        const summary = screen.getByRole("button");
        const row = summary.getBoundingClientRect();
        const icon = summary.querySelector("svg")!.parentElement!.getBoundingClientRect();

        expect(row.height).toBe(40);
        expect(icon.width).toBe(24);
        expect(icon.top - row.top).toBe(8);
        expect(row.bottom - icon.bottom).toBe(8);
        expect(icon.left - row.left).toBe(8);
    });

    it("is rounded with the radius of rows", () => {
        // A radius no other rule gives, so that only the row token can be where it comes from
        document.documentElement.style.setProperty("--tl-radius-row", "6px");
        try {
            render(<Default />);
            expect(getComputedStyle(screen.getByRole("button")).borderRadius).toBe("6px");
        } finally {
            document.documentElement.style.removeProperty("--tl-radius-row");
        }
    });
});
