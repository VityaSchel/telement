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
import { render } from "@test-utils";
import { describe, expect, it } from "vitest";

import styles from "./MediaPreviewComponents.module.css";
import * as textStories from "../MediaPreviewTile/TextPreviewTile.stories";

const { Default: FileCard } = composeStories(textStories);

describe("A file card's icon", () => {
    it("is a 44px square, Telegram's file icon size, with the two lines of text centered beside it", () => {
        // The bubble layout's line height, with which the two lines of text are 37.5px tall
        const { container } = render(
            <div style={{ lineHeight: "18px" }}>
                <FileCard />
            </div>,
        );
        const square = container.querySelector(`.${styles.icon}`)!.getBoundingClientRect();
        const text = container.querySelector(`.${styles.textContent}`)!.getBoundingClientRect();

        expect(square.width).toBe(44);
        expect(square.height).toBe(44);
        expect(text.height).toBeLessThan(44);
        expect(text.top - square.top).toBeCloseTo(square.bottom - text.bottom, 2);
    });

    it("centers a 24px glyph in its square", () => {
        const { container } = render(<FileCard />);
        const square = container.querySelector(`.${styles.icon}`)!.getBoundingClientRect();
        const glyph = container.querySelector(`.${styles.icon} svg`)!.getBoundingClientRect();

        expect(glyph.width).toBe(24);
        expect(glyph.height).toBe(24);
        expect(glyph.left - square.left).toBe(10);
        expect(glyph.top - square.top).toBe(10);
    });
});
