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

import * as stories from "./EventContentBody.stories.tsx";

const { WithHighlight } = composeStories(stories);

describe("Search highlight", () => {
    it("rounds a highlighted word with the inline radius, as text-level elements are", () => {
        render(<WithHighlight />);

        expect(getComputedStyle(screen.getByText("highlighted")).borderRadius).toBe("4px");
    });

    it("takes its radius from --tl-radius-inline", () => {
        render(
            <div style={{ "--tl-radius-inline": "3px" } as React.CSSProperties}>
                <WithHighlight />
            </div>,
        );

        expect(getComputedStyle(screen.getByText("highlighted")).borderRadius).toBe("3px");
    });
});
