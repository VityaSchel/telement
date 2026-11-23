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
import { userEvent } from "vitest/browser";

import * as stories from "./ThreadSummary.stories";

const { Default, Open } = composeStories(stories);

/** What a color token resolves to inside `scope`, as a computed color. */
function tokenColor(token: string, scope: Element): string {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    scope.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}

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

describe("Thread summary's chevron", () => {
    it.each(["cpd-theme-light", "cpd-theme-dark"])(
        "fades the text into the card's own fill in %s, rather than the page's, which would show as a patch behind it",
        (theme) => {
            render(
                <div className={theme}>
                    <Default />
                </div>,
            );
            const summary = screen.getByRole("button");
            const chevron = summary.querySelector<HTMLElement>("[class*='chevron']")!;
            const fill = getComputedStyle(summary).backgroundColor;

            expect(getComputedStyle(chevron).backgroundImage).toBe(
                `linear-gradient(270deg, ${fill} 50%, rgba(0, 0, 0, 0) 100%)`,
            );
        },
    );
});

describe("The summary of the thread open beside the timeline", () => {
    it.each(["cpd-theme-light", "cpd-theme-dark", "cpd-theme-light-hc", "cpd-theme-dark-hc"])(
        "is drawn as selected in %s: a 2px accent border, and its count and icon in the accent",
        (theme) => {
            render(
                <div className={theme}>
                    <Open />
                </div>,
            );
            const summary = screen.getByRole("button");
            const style = getComputedStyle(summary);
            const accent = tokenColor("--cpd-color-border-accent-primary", summary);
            const count = summary.querySelector("[class*='repliesAmount']")!;
            const icon = summary.querySelector("svg")!;

            expect(style.borderTopColor).toBe(accent);
            expect(style.boxShadow).toBe(`${accent} 0px 0px 0px 1px inset`);
            expect(getComputedStyle(count).color).toBe(tokenColor("--cpd-color-text-action-accent", summary));
            expect(getComputedStyle(icon).color).toBe(tokenColor("--cpd-color-text-action-accent", summary));
            // The ring is inside its border, so it is still a 40px row
            expect(summary.getBoundingClientRect().height).toBe(40);
        },
    );

    it("keeps its accent border while hovered", async () => {
        render(<Open />);
        const summary = screen.getByRole("button");
        await userEvent.hover(summary);

        expect(getComputedStyle(summary).borderTopColor).toBe(tokenColor("--cpd-color-border-accent-primary", summary));
    });
});
