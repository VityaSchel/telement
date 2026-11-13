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
import { describe, it, expect, onTestFinished } from "vitest";
import { userEvent } from "vitest/browser";
import interRegularUrl from "@fontsource/inter/files/inter-latin-400-normal.woff2?url";

import * as stories from "./ReactionsRow.stories.tsx";
import * as buttonStories from "../ReactionsRowButton/ReactionsRowButton.stories.tsx";

const { Default } = composeStories(stories);
const { Default: Reaction } = composeStories(buttonStories);

/** A custom emoji's picture. */
const PICTURE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#0dbd8b"/></svg>')}`;

/** The timeline's text style, which the reactions row inherits in the app. */
const TIMELINE_FONT = { font: "var(--cpd-font-body-md-regular)" };

const middle = (box: DOMRect): number => box.top + box.height / 2;

// The text's line is placed to the half pixel, so with the app's font rather than whatever the system falls back to
async function loadInter(): Promise<void> {
    const inter = await new FontFace("Inter", `url(${interRegularUrl})`, { weight: "400" }).load();
    document.fonts.add(inter);
    onTestFinished(() => {
        document.fonts.delete(inter);
    });
}

function chips(): HTMLElement[] {
    return screen.getAllByRole("button", { name: /reactions for/ });
}

function addReactionButton(): HTMLElement {
    return screen.getByRole("button", { name: "Add reaction" });
}

/** What a color token resolves to, as a computed color. */
function tokenColor(token: string): string {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}

/** The box of the element's text, without its padding. */
function textBox(element: Element): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect();
}

/** Moves the focus with Tab until it reaches `target`, so that it shows as focused from the keyboard. */
async function tabTo(target: HTMLElement): Promise<void> {
    for (let i = 0; i < 10 && document.activeElement !== target; i++) await userEvent.tab();
    expect(target).toHaveFocus();
}

describe("Reactions row shape", () => {
    it("draws each reaction as a 24px pill with its content 8px from either end, the border included", () => {
        render(<Default />);

        for (const chip of chips()) {
            const box = chip.getBoundingClientRect();
            expect(box.height).toBe(24);
            expect(parseFloat(getComputedStyle(chip).borderTopLeftRadius)).toBeGreaterThanOrEqual(box.height / 2);

            const [emoji, count] = chip.querySelectorAll("span");
            expect(emoji.getBoundingClientRect().left - box.left).toBe(8);
            expect(box.right - count.getBoundingClientRect().right).toBeCloseTo(8, 1);
        }
    });

    it("keeps the content 8px from either end and the emoji 4px from the count in a right-to-left layout", () => {
        render(
            <div dir="rtl">
                <Default />
            </div>,
        );

        for (const chip of chips()) {
            const box = chip.getBoundingClientRect();
            const [emoji, count] = [...chip.querySelectorAll("span")].map(textBox);
            expect(box.right - emoji.right).toBeCloseTo(8, 1);
            expect(emoji.left - count.right).toBeCloseTo(4, 1);
            expect(count.left - box.left).toBeCloseTo(8, 1);
        }
    });

    it("puts the line of each emoji and count in the middle of the chip, at the timeline's font size", async () => {
        await loadInter();
        render(
            <div style={TIMELINE_FONT}>
                <Default />
            </div>,
        );

        for (const chip of chips()) {
            const chipMiddle = middle(chip.getBoundingClientRect());
            for (const part of chip.querySelectorAll("span")) {
                expect(middle(part.getBoundingClientRect())).toBeCloseTo(chipMiddle, 1);
            }
        }
    });

    it("centers a custom emoji's picture on the chip, which is as tall as the others", async () => {
        await loadInter();
        render(
            <div style={TIMELINE_FONT}>
                <Reaction content={undefined} imageSrc={PICTURE} imageAlt=":party:" tooltipOpen={false} />
            </div>,
        );

        const chip = screen.getByRole("button").getBoundingClientRect();
        const picture = screen.getByRole("img", { hidden: true }).getBoundingClientRect();
        expect(chip.height).toBe(24);
        expect(Math.abs(middle(picture) - middle(chip))).toBeLessThanOrEqual(0.5);
    });

    it("makes the add-reaction button a 24px circle like the pills beside it, not a square", () => {
        render(<Default />);

        const button = addReactionButton();
        const box = button.getBoundingClientRect();
        expect(box.width).toBe(24);
        expect(box.height).toBe(24);
        expect(parseFloat(getComputedStyle(button).borderTopLeftRadius)).toBeGreaterThanOrEqual(12);
    });

    it.each([
        ["a reaction", (): HTMLElement => chips()[0]],
        ["the add-reaction button", addReactionButton],
    ])("rings %s focused from the keyboard with Compound's focus ring, around its pill", async (_, target) => {
        render(<Default />);
        const control = target();
        await tabTo(control);

        const style = getComputedStyle(control);
        expect(control.matches(":focus-visible")).toBe(true);
        expect(style.outlineStyle).toBe("solid");
        expect(style.outlineWidth).toBe("2px");
        expect(style.outlineOffset).toBe("1px");
        expect(style.outlineColor).toBe(tokenColor("--cpd-color-border-focused"));
    });
});
