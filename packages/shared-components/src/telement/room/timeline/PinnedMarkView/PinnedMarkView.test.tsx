/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { describe, expect, it } from "vitest";

import { render, screen } from "@test-utils";
import { PinnedMarkView } from "./PinnedMarkView";

describe("PinnedMarkView", () => {
    it("names the pinned message for screen readers", () => {
        render(<PinnedMarkView />);

        expect(screen.getByRole("img", { name: "Pinned message" })).toBeInTheDocument();
    });

    it("draws the pin in a 12px box, filling it", () => {
        render(<PinnedMarkView />);
        const mark = screen.getByRole("img");
        const pin = mark.querySelector("svg")!;

        expect([mark.getBoundingClientRect().width, mark.getBoundingClientRect().height]).toEqual([12, 12]);
        expect([pin.clientWidth, pin.clientHeight]).toEqual([12, 12]);
    });

    it.each([
        ["ltr", "matrix(0.707107, 0.707107, -0.707107, 0.707107, 0, 0)"],
        ["rtl", "matrix(0.707107, -0.707107, 0.707107, 0.707107, 0, 0)"],
    ])("tilts the pin towards the text after it in %s, as the room list does", (dir, transform) => {
        render(
            <div dir={dir}>
                <PinnedMarkView />
            </div>,
        );

        expect(getComputedStyle(screen.getByRole("img").querySelector("svg")!).transform).toBe(transform);
    });

    it("takes the color of the text around it, as the time's color where it comes before the time", () => {
        render(
            <span style={{ color: "rgb(1, 2, 3)" }}>
                <PinnedMarkView />
            </span>,
        );

        expect(getComputedStyle(screen.getByRole("img").querySelector("svg")!).color).toBe("rgb(1, 2, 3)");
    });
});
