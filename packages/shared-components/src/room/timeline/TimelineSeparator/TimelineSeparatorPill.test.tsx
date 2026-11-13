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
import interMediumUrl from "@fontsource/inter/files/inter-latin-500-normal.woff2?url";

import * as stories from "./TimelineSeparator.stories";
import * as dateStories from "../DateSeparatorView/DateSeparatorView.stories";

const { WithLateEvent } = composeStories(stories);
const { Default: DateSeparator } = composeStories(dateStories);

const LATE = "Fri, Jan 9, 2026";

/** What a color token resolves to, as a computed color. */
function tokenColor(token: string): string {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}

/** The box of the separator's text. */
function textBox(pill: Element): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(pill);
    return range.getBoundingClientRect();
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

describe("Timeline separator pill", () => {
    it("shows the late event's date in a pill centered on the timeline, without lines beside it", async () => {
        await loadInterMedium();
        render(
            <div style={{ width: "600px" }}>
                <WithLateEvent />
            </div>,
        );

        const separator = screen.getByRole("separator", { name: "Late Event Separator" });
        expect(separator.querySelector("hr")).toBeNull();
        expect(getComputedStyle(separator).marginBlock).toBe("8px");

        const pill = screen.getByText(LATE);
        const box = pill.getBoundingClientRect();
        const row = separator.getBoundingClientRect();
        const text = textBox(pill);
        expect(box.height).toBe(24);
        expect(getComputedStyle(pill).borderTopLeftRadius).toBe("12px");
        expect(box.left - row.left).toBeCloseTo(row.right - box.right, 1);
        expect(getComputedStyle(pill).backgroundColor).toBe(tokenColor("--cpd-color-bg-badge-secondary"));
        expect(getComputedStyle(pill).color).toBe(tokenColor("--cpd-color-text-primary"));
        expect(getComputedStyle(pill).fontSize).toBe("13px");
        expect(getComputedStyle(pill).fontWeight).toBe("500");
        expect(text.left - box.left).toBeCloseTo(8, 1);
        expect(box.right - text.right).toBeCloseTo(8, 1);
        expect(Math.abs(middle(text) - middle(box))).toBeLessThanOrEqual(0.25);
    });

    it("draws the late event's pill as the date separator's", () => {
        render(
            <div style={{ width: "600px" }}>
                <DateSeparator />
                <WithLateEvent />
            </div>,
        );

        const date = screen.getByText("Today");
        const datePill = getComputedStyle(date.parentElement!);
        const latePill = getComputedStyle(screen.getByText(LATE));
        for (const property of [
            "height",
            "paddingTop",
            "paddingInlineStart",
            "borderTopLeftRadius",
            "backgroundColor",
        ] as const) {
            expect({ [property]: latePill[property] }).toEqual({ [property]: datePill[property] });
        }
        for (const property of ["color", "font", "letterSpacing"] as const) {
            expect({ [property]: latePill[property] }).toEqual({ [property]: getComputedStyle(date)[property] });
        }
    });
});
