/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { describe, expect, it } from "vitest";
import { composeStories } from "@storybook/react-vite";
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "../../../tokens.css";

import { act, render, screen } from "@test-utils";
import { BaseViewModel } from "../../../../core/viewmodel/BaseViewModel";
import { FloatingDateView, type FloatingDateViewModel, type FloatingDateViewSnapshot } from "./FloatingDateView";
import * as stories from "./FloatingDateView.stories";

const { Visible, Hidden } = composeStories(stories);

class TestFloatingDateViewModel
    extends BaseViewModel<FloatingDateViewSnapshot, undefined>
    implements FloatingDateViewModel
{
    public constructor(snapshot: FloatingDateViewSnapshot) {
        super(undefined, snapshot);
    }

    public update(snapshot: Partial<FloatingDateViewSnapshot>): void {
        this.snapshot.merge(snapshot);
    }
}

describe("FloatingDateView", () => {
    it("draws the timeline's date pill 8px under the top of the timeline, centered on its content", () => {
        const { container } = render(<Visible />);
        const floating = screen.getByTestId("floating-date");
        const pill = floating.querySelector("h2")!.parentElement!;
        const timeline = container.firstElementChild!.getBoundingClientRect();
        const box = pill.getBoundingClientRect();

        expect(getComputedStyle(floating).opacity).toBe("1");
        expect(box.top - timeline.top).toBe(8);
        expect(box.height).toBe(24);
        expect(Math.abs((box.left + box.right) / 2 - (timeline.left + timeline.right) / 2)).toBeLessThanOrEqual(0.5);
        expect(getComputedStyle(pill).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    });

    it("keeps out of the way of screen readers and the pointer", () => {
        render(<Visible />);
        const floating = screen.getByTestId("floating-date");

        expect(floating).toHaveAttribute("aria-hidden", "true");
        expect(getComputedStyle(floating).pointerEvents).toBe("none");
        expect(screen.queryByRole("separator")).toBeNull();
    });

    it("is transparent while hidden, without a fade when motion is reduced", () => {
        render(<Hidden />);
        const floating = screen.getByTestId("floating-date");

        expect(getComputedStyle(floating).opacity).toBe("0");
        // The test browser asks for reduced motion
        expect(getComputedStyle(floating).transitionDuration).toBe("0s");
    });

    it("centers the pill on the timeline's content, leaving out its scrollbar", () => {
        const vm = new TestFloatingDateViewModel({ label: "Yesterday", visible: true, endInset: 40 });
        const { container } = render(
            <div style={{ position: "relative", width: 480, height: 120 }}>
                <FloatingDateView vm={vm} />
            </div>,
        );
        const box = screen.getByText("Yesterday").getBoundingClientRect();
        const timeline = container.firstElementChild!.getBoundingClientRect();

        expect(Math.abs((box.left + box.right) / 2 - (timeline.left + 440 / 2))).toBeLessThanOrEqual(0.5);
    });

    it("follows its view model's date and visibility", () => {
        const vm = new TestFloatingDateViewModel({ label: "Monday", visible: true, endInset: 0 });
        render(<FloatingDateView vm={vm} />);
        expect(screen.getByText("Monday")).toBeInTheDocument();

        act(() => vm.update({ label: "Today", visible: false }));

        expect(screen.getByText("Today")).toBeInTheDocument();
        expect(getComputedStyle(screen.getByTestId("floating-date")).opacity).toBe("0");
    });
});
