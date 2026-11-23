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

import * as stories from "./ImageBodyView.stories.tsx";

const { Default, LoadingWithSpinner, LoadingWithProgress, LoadingWithProgressOverBlurhash } = composeStories(stories);

/** The color a Compound token resolves to inside `parent`. */
function tokenColor(token: string, parent: Element): string {
    const probe = document.createElement("span");
    probe.style.backgroundColor = `var(${token})`;
    parent.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
}

describe("A picture's placeholder while it loads", () => {
    it.each(["cpd-theme-light", "cpd-theme-dark"])(
        "is a box in a bubble's gray in %s, set apart from the page, clipped to the picture's corners",
        (theme) => {
            render(
                <div className={theme} style={{ backgroundColor: "var(--cpd-color-bg-canvas-default)" }}>
                    <LoadingWithSpinner />
                </div>,
            );
            const page = document.querySelector(`.${theme}`)!;
            const placeholder = screen.getByRole("progressbar").parentElement!;
            const frame = placeholder.parentElement!;

            expect(getComputedStyle(placeholder).backgroundColor).toBe(
                tokenColor("--cpd-color-bg-subtle-secondary", page),
            );
            expect(getComputedStyle(placeholder).backgroundColor).not.toBe(getComputedStyle(page).backgroundColor);
            expect(getComputedStyle(frame).overflow).toBe("hidden");
            expect(parseFloat(getComputedStyle(frame).borderTopLeftRadius)).toBeGreaterThan(0);
        },
    );

    it("draws the download's ring in place of the spinner, in the middle of the box", () => {
        render(<LoadingWithProgress />);

        const ring = screen.getByRole("progressbar", { name: "Downloading" });
        expect(screen.queryByRole("progressbar", { name: "Loading…" })).toBeNull();
        const box = document.querySelector("[class*='placeholder']")!.getBoundingClientRect();
        const button = screen.getByRole("button", { name: "Cancel download" }).getBoundingClientRect();
        expect(button.left + button.width / 2).toBeCloseTo(box.left + box.width / 2, 0);
        expect(button.top + button.height / 2).toBeCloseTo(box.top + box.height / 2, 0);
        expect(ring).toBeVisible();
    });

    it("draws the ring over the blurred preview", () => {
        const { container } = render(<LoadingWithProgressOverBlurhash />);

        expect(container.querySelector("canvas")).not.toBeNull();
        expect(screen.getByRole("button", { name: "Cancel download" })).toBeVisible();
    });

    it("doesn't open the picture while the ring shows, so that the ring can be clicked, but does once it has loaded", () => {
        const { unmount } = render(<LoadingWithProgress />);
        expect(screen.queryByRole("link")).toBeNull();
        unmount();

        render(<Default />);
        expect(screen.getByRole("link")).toBeInTheDocument();
    });
});
