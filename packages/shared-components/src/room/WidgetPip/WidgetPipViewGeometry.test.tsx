/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../telement/tokens.css";
import React from "react";
import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@test-utils";
import { describe, it, expect } from "vitest";

import * as stories from "./WidgetPipView.stories.tsx";

const { Default } = composeStories(stories);

describe("WidgetPipView geometry", () => {
    it("rounds the widget as media and the window concentrically around it, its padding and border included", () => {
        render(<Default />);
        const container = screen.getByTestId("widget-pip-container");
        const widget = container.lastElementChild!;
        const outer = container.getBoundingClientRect();
        const inner = widget.getBoundingClientRect();
        const style = getComputedStyle(container);

        expect(getComputedStyle(widget).borderRadius).toBe("12px");
        const inset = inner.left - outer.left;
        expect(inset).toBe(parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth));
        expect(outer.bottom - inner.bottom).toBe(inset);
        expect(style.borderRadius).toBe(`${12 + inset}px`);
    });

    it("sizes the back button as a 36px control with a 24px icon, like the right panel card's", () => {
        render(<Default />);
        const button = screen.getByRole("button", { name: "Back" });
        const box = button.getBoundingClientRect();
        const icon = button.querySelector("svg")!.getBoundingClientRect();

        expect([box.width, box.height]).toEqual([36, 36]);
        expect([icon.width, icon.height]).toEqual([24, 24]);
        expect([icon.left - box.left, icon.top - box.top]).toEqual([6, 6]);
    });
});
