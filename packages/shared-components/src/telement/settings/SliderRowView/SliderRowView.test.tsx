/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { composeStories } from "@storybook/react-vite";
import { userEvent } from "vitest/browser";
import { act, render, screen } from "@test-utils";
import { describe, expect, it, vi } from "vitest";
// The layout assertions need the real spacing tokens and Telement's
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "../../tokens.css";

import * as stories from "./SliderRowView.stories";
import { SliderRowView, type SliderRowViewActions, type SliderRowViewSnapshot } from "./SliderRowView";
import { BaseViewModel } from "../../../core/viewmodel/BaseViewModel";
import { SettingsStoryCard as Card } from "../SettingsStoryCard";

const { Default, WithEnds, AtTheStart, AtTheEnd } = composeStories(stories);

/** A view model of the row that shows the steps it is asked to preview, with actions to assert on. */
class TestSliderViewModel extends BaseViewModel<SliderRowViewSnapshot, object> implements SliderRowViewActions {
    public constructor() {
        super({}, { label: "Font size", value: "16 (default)", position: 7, lastPosition: 18 });
    }

    public moveTo(position: number): void {
        this.snapshot.merge({ position, value: `step ${position}` });
    }

    public preview = vi.fn((position: number) => this.moveTo(position));
    public commit = vi.fn();
}

/** What a color token resolves to in the document. */
function tokenColor(token: string): string {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}

function textBox(element: Element): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect();
}

const card = (): DOMRect => screen.getByTestId("card").getBoundingClientRect();
const slider = (): HTMLInputElement => screen.getByRole("slider");

describe("SliderRowView", () => {
    it("is a slider named by its label, at its value", () => {
        render(<Default />);

        expect(screen.getByRole("slider", { name: "Font size" })).toBe(slider());
        expect(slider()).toHaveAttribute("aria-valuetext", "16 (default)");
        expect([slider().min, slider().max, slider().value]).toEqual(["0", "18", "7"]);
        // The value is shown too, but read only once
        expect(screen.getByText("16 (default)")).toHaveAttribute("aria-hidden", "true");
    });

    it("is moved and applied a step at a time by the keyboard", async () => {
        const vm = new TestSliderViewModel();
        render(<SliderRowView vm={vm} />);
        slider().focus();

        await userEvent.keyboard("{ArrowRight}");
        expect(vm.preview).toHaveBeenLastCalledWith(8);
        expect(vm.commit).toHaveBeenLastCalledWith(8);

        await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
        expect(vm.commit).toHaveBeenLastCalledWith(6);

        await userEvent.keyboard("{End}");
        expect(vm.commit).toHaveBeenLastCalledWith(18);

        await userEvent.keyboard("{Home}");
        expect(vm.commit).toHaveBeenLastCalledWith(0);
        expect(slider()).toHaveAttribute("aria-valuetext", "step 0");
    });

    it("shows each step while it is dragged, and applies only the one it is let go at", async () => {
        const vm = new TestSliderViewModel();
        render(
            <Card>
                <SliderRowView vm={vm} />
            </Card>,
        );
        const { width, height } = slider().getBoundingClientRect();
        // The thumb's middle is its 8px radius inside the track's ends
        const at = (position: number): { x: number; y: number } => ({
            x: 8 + ((width - 16) * position) / 18,
            y: height / 2,
        });

        await userEvent.dragAndDrop(slider(), slider(), { sourcePosition: at(7), targetPosition: at(12) });

        expect(vm.preview).toHaveBeenLastCalledWith(12);
        expect(vm.commit).toHaveBeenCalledExactlyOnceWith(12);
        expect(screen.getByText("step 12")).toBeInTheDocument();
    });

    it("applies nothing as the view model moves it", () => {
        const vm = new TestSliderViewModel();
        render(<SliderRowView vm={vm} />);

        act(() => vm.moveTo(3));

        expect(slider().value).toBe("3");
        expect(vm.preview).not.toHaveBeenCalled();
        expect(vm.commit).not.toHaveBeenCalled();
    });

    it("puts the label and the value on the card's 16px edges, 12px under its top, and the slider under them across it", () => {
        render(<Default />);
        const label = screen.getByText("Font size");
        const value = screen.getByText("16 (default)");

        expect(textBox(label).left - card().left).toBe(16);
        expect(card().right - textBox(value).right).toBeCloseTo(16, 1);
        expect(label.getBoundingClientRect().top - card().top).toBe(12);
        expect(getComputedStyle(value).color).toBe(tokenColor("--cpd-color-text-secondary"));

        const range = slider().getBoundingClientRect();
        expect([range.left - card().left, card().right - range.right]).toEqual([16, 16]);
        expect(range.height).toBe(24);
        expect(range.top - label.getBoundingClientRect().bottom).toBe(4);
        expect(card().bottom - range.bottom).toBe(8);
    });

    it("keeps the value in place while its digits change", () => {
        render(<Default />);
        expect(getComputedStyle(screen.getByText("16 (default)")).fontVariantNumeric).toBe("tabular-nums");
    });

    it("puts what it starts and ends at on the edges, 12px from the slider, for the eye alone", () => {
        render(<WithEnds />);
        const [start, end] = screen.getAllByText("A").map((letter) => letter.parentElement!);

        expect(start).toHaveAttribute("aria-hidden", "true");
        expect(start.getBoundingClientRect().left - card().left).toBe(16);
        expect(slider().getBoundingClientRect().left - start.getBoundingClientRect().right).toBe(12);
        expect(end.getBoundingClientRect().left - slider().getBoundingClientRect().right).toBe(12);
        expect(card().right - end.getBoundingClientRect().right).toBe(16);
    });

    it("fills the track up to the thumb", () => {
        const { rerender } = render(<AtTheStart />);
        expect(slider().style.getPropertyValue("--slider-fill")).toBe("0");

        rerender(<AtTheEnd />);
        expect(slider().style.getPropertyValue("--slider-fill")).toBe("1");
    });

    it.each(["ltr", "rtl"] as const)("fills it from the start in %s", (dir) => {
        render(
            <div dir={dir}>
                <Default />
            </div>,
        );
        expect(getComputedStyle(slider()).getPropertyValue("--slider-direction")).toBe(
            dir === "ltr" ? "to right" : "to left",
        );
    });
});
