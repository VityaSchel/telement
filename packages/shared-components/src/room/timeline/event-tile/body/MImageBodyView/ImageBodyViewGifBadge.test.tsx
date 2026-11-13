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
import interMediumUrl from "@fontsource/inter/files/inter-latin-500-normal.woff2?url";

import * as stories from "./ImageBodyView.stories.tsx";

const { AnimatedPreview } = composeStories(stories);

// Text is measured to the half pixel, so with the app's font rather than whatever the system falls back to
async function loadInterMedium(): Promise<void> {
    const inter = await new FontFace("Inter", `url(${interMediumUrl})`, { weight: "500" }).load();
    document.fonts.add(inter);
    onTestFinished(() => {
        document.fonts.delete(inter);
    });
}

describe("GIF badge", () => {
    it("is a pill 8px from the picture's top and start, like a video's duration", () => {
        render(<AnimatedPreview />);

        const badge = screen.getByText("GIF");
        const box = badge.getBoundingClientRect();
        const picture = screen.getByRole("img").getBoundingClientRect();
        const style = getComputedStyle(badge);
        expect(box.top - picture.top).toBe(8);
        expect(box.left - picture.left).toBe(8);
        expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThanOrEqual(box.height / 2);
        expect(style.padding).toBe("2px 8px");
        expect(style.borderTopWidth).toBe("0px");
        expect(style.fontSize).toBe("11px");
        expect(style.fontWeight).toBe("500");
    });

    it("is 20px tall, on the grid, with its text centered", async () => {
        await loadInterMedium();
        render(<AnimatedPreview />);

        const badge = screen.getByText("GIF");
        const box = badge.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(badge);
        const text = range.getBoundingClientRect();
        expect(box.height).toBe(20);
        expect(text.top - box.top).toBe(box.bottom - text.bottom);
    });
});
