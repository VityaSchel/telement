/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../../telement/tokens.css";
import React from "react";
import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@test-utils";
import { describe, it, expect, onTestFinished } from "vitest";
import { userEvent } from "vitest/browser";
import interMediumUrl from "@fontsource/inter/files/inter-latin-500-normal.woff2?url";

import * as stories from "./DateSeparatorView.stories";

const { Default, WithJumpToDatePicker, LongLocalizedLabel } = composeStories(stories);

/** What a color token resolves to, as a computed color. */
function tokenColor(token: string): string {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}

/** The boxes of the element's text, one per line. */
function textLines(element: Element): DOMRect[] {
    const range = document.createRange();
    range.selectNodeContents(element);
    return [...range.getClientRects()];
}

const middle = (box: DOMRect): number => box.top + box.height / 2;

// Text is measured to the half pixel, so with the app's font rather than whatever the system falls back to
async function loadInterMedium(): Promise<void> {
    const inter = await new FontFace("Inter", `url(${interMediumUrl})`, { weight: "500" }).load();
    document.fonts.add(inter);
    onTestFinished(() => {
        document.fonts.delete(inter);
    });
}

describe("Date separator pill", () => {
    it("shows the date in a pill centered on the timeline, without lines beside it", () => {
        render(
            <div style={{ width: "600px" }}>
                <Default />
            </div>,
        );

        const separator = screen.getByRole("separator", { name: "Today" });
        expect(separator.querySelector("hr")).toBeNull();
        expect(getComputedStyle(separator).marginBlock).toBe("8px");

        const pill = screen.getByText("Today").parentElement!;
        const box = pill.getBoundingClientRect();
        const row = separator.getBoundingClientRect();
        expect(box.height).toBe(24);
        expect(parseFloat(getComputedStyle(pill).borderTopLeftRadius)).toBeGreaterThanOrEqual(12);
        expect(box.left - row.left).toBeCloseTo(row.right - box.right, 1);
        expect(getComputedStyle(pill).backgroundColor).toBe(tokenColor("--cpd-color-bg-badge-secondary"));
        expect(getComputedStyle(pill).color).toBe(tokenColor("--cpd-color-text-primary"));
    });

    it("sets the date in small medium-weight text, 8px from the pill's ends and centered to the half pixel", async () => {
        await loadInterMedium();
        render(<Default />);

        const label = screen.getByText("Today");
        const pill = label.parentElement!.getBoundingClientRect();
        const [text] = textLines(label);
        expect(getComputedStyle(label).fontSize).toBe("13px");
        expect(getComputedStyle(label).fontWeight).toBe("500");
        expect(text.left - pill.left).toBeCloseTo(8, 1);
        expect(pill.right - text.right).toBeCloseTo(8, 1);
        expect(Math.abs(middle(text) - middle(pill))).toBeLessThanOrEqual(0.25);
    });

    it("makes the pill the jump-to-date menu's trigger, its chevron 4px from the pill's end and on the middle of the date's lowercase letters", async () => {
        await loadInterMedium();
        render(<WithJumpToDatePicker />);

        const trigger = screen.getByRole("button", { name: "Scroll to date" });
        const pill = trigger.getBoundingClientRect();
        const chevron = trigger.querySelector("svg")!.getBoundingClientRect();
        const label = screen.getByText("Today");
        const [text] = textLines(label);
        // A box with no height on the date's baseline, and one as tall as its lowercase letters
        label.insertAdjacentHTML("beforeend", '<span style="display: inline-block; width: 0; height: 0"></span>');
        const baseline = label.lastElementChild!.getBoundingClientRect().top;
        label.insertAdjacentHTML("beforeend", '<span style="position: absolute; height: 1ex"></span>');
        const xHeight = label.lastElementChild!.getBoundingClientRect().height;
        expect(pill.height).toBe(24);
        expect(parseFloat(getComputedStyle(trigger).borderTopLeftRadius)).toBeGreaterThanOrEqual(12);
        expect(chevron.height).toBe(16);
        expect(Math.abs(middle(chevron) - (baseline - xHeight / 2))).toBeLessThanOrEqual(0.5);
        expect(pill.right - chevron.right).toBe(4);
        expect(text.left - pill.left).toBeCloseTo(8, 1);
        expect(Math.abs(middle(text) - middle(pill))).toBeLessThanOrEqual(0.25);

        await userEvent.click(trigger);
        await expect(screen.findByTestId("jump-to-date-last-week")).resolves.toBeInTheDocument();
    });

    it("wraps a long date inside the pill rather than past the timeline's edge", async () => {
        await loadInterMedium();
        render(
            <div style={{ width: "320px" }}>
                <LongLocalizedLabel />
            </div>,
        );

        const label = screen.getByRole("heading", { hidden: true });
        const pill = label.parentElement!.getBoundingClientRect();
        const row = screen.getByRole("separator").getBoundingClientRect();
        const lines = textLines(label);
        expect(new Set(lines.map((line) => line.top)).size).toBeGreaterThan(1);
        expect(pill.left).toBeGreaterThanOrEqual(row.left);
        expect(pill.right).toBeLessThanOrEqual(row.right);
        for (const line of lines) {
            expect(line.left - pill.left).toBeGreaterThanOrEqual(8 - 0.01);
            expect(pill.right - line.right).toBeGreaterThanOrEqual(8 - 0.01);
        }
        expect(lines[0].top - pill.top).toBeCloseTo(4, 0);
        expect(pill.bottom - lines[lines.length - 1].bottom).toBeCloseTo(4, 0);
    });

    it("rounds a wrapped date as much as a one-line pill, so it becomes a rounded box rather than a stadium", () => {
        render(
            <div style={{ width: "320px" }}>
                <LongLocalizedLabel />
            </div>,
        );

        const pill = screen.getByRole("heading", { hidden: true }).parentElement!;
        expect(pill.getBoundingClientRect().height).toBeGreaterThan(24);
        expect(getComputedStyle(pill).borderTopLeftRadius).toBe("12px");
    });
});
