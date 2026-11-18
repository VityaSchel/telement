/*
 * Copyright 2025 New Vector Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "../../../telement/tokens.css";
import { composeStories } from "@storybook/react-vite";
import { render } from "@test-utils";
import React from "react";
import { describe, it, vi, beforeAll, expect } from "vitest";

import * as stories from "./RichItem.stories";

const { Default, Selected, WithoutTimestamp } = composeStories(stories);

describe("RichItem", () => {
    beforeAll(() => {
        vi.useFakeTimers().setSystemTime(new Date("2025-08-01T12:00:00Z"));
    });

    it("renders the item in default state", () => {
        const { container } = render(<Default />);
        expect(container).toMatchSnapshot();
    });

    it("renders the item in selected state", () => {
        const { container } = render(<Selected />);
        expect(container).toMatchSnapshot();
    });

    it.each([
        ["cpd-theme-light", "rgb(36, 129, 204)"],
        ["cpd-theme-dark", "rgb(1, 131, 211)"],
    ])("draws the selected item's check in white on the accent fill in %s", (theme, fill) => {
        const { container } = render(
            <div className={theme}>
                <Selected />
            </div>,
        );
        const checkmark = container.querySelector<HTMLElement>("[class*='checkmark']")!;

        expect(getComputedStyle(checkmark).backgroundColor).toBe(fill);
        expect(getComputedStyle(checkmark.querySelector("svg")!).color).toBe("rgb(255, 255, 255)");
    });

    it("renders the item without timestamp", () => {
        const { container } = render(<WithoutTimestamp />);
        expect(container).toMatchSnapshot();
    });
});
