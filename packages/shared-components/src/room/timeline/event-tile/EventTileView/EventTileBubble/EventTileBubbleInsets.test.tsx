/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "../../../../../telement/tokens.css";
import React from "react";
import { composeStories } from "@storybook/react-vite";
import { render } from "@test-utils";
import { describe, it, expect } from "vitest";

import * as stories from "./EventTileBubble.stories.tsx";
import styles from "./EventTileBubble.module.css";

const { IsCryptoEventBubble } = composeStories(stories);

describe("EventTileBubble insets", () => {
    // The timeline's layouts give their lines 18px (bubble, IRC) or 22px (modern)
    it.each([18, 22])(
        "centers the icon on the title's first line, %ipx tall, even when the title wraps",
        (lineHeight) => {
            for (const width of [600, 160]) {
                const { container, unmount } = render(
                    <div style={{ width, lineHeight: `${lineHeight}px` }}>
                        <IsCryptoEventBubble />
                    </div>,
                );
                const card = container.querySelector(`.${styles.container}`)!;
                const title = card.querySelector(`.${styles.title}`)!.getBoundingClientRect();
                const icon = card.querySelector("svg")!.getBoundingClientRect();

                if (width === 600) expect(title.height).toBe(lineHeight);
                else expect(title.height).toBeGreaterThan(lineHeight);
                expect(icon.top + icon.height / 2).toBe(title.top + lineHeight / 2);
                expect(icon.left - card.getBoundingClientRect().left).toBe(12);
                unmount();
            }
        },
    );

    it.each([
        ["the timeline's card radius", "12px", "12px"],
        ["8px outside the timeline", undefined, "8px"],
    ])("rounds the card by %s", (_name, cardRadius, expected) => {
        const { container } = render(
            <div style={{ ["--MBody-border-radius" as string]: cardRadius }}>
                <IsCryptoEventBubble />
            </div>,
        );

        expect(getComputedStyle(container.querySelector(`.${styles.container}`)!).borderRadius).toBe(expected);
    });
});
