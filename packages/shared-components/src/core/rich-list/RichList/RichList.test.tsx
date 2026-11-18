/*
 * Copyright 2025 New Vector Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import { composeStories } from "@storybook/react-vite";
import { render } from "@test-utils";
import React from "react";
import { describe, it, expect } from "vitest";

import * as stories from "./RichList.stories";

const { Default, Empty } = composeStories(stories);

describe("RichItem", () => {
    it("renders the list", () => {
        const { container } = render(<Default />);
        expect(container).toMatchSnapshot();
    });

    it("renders the list with isEmpty=true", () => {
        const { container } = render(<Empty />);
        expect(container).toMatchSnapshot();
    });

    it("starts its title where the items start their content, 8px in", () => {
        const { getByText, container } = render(<Default />);
        const list = container.querySelector("[class*='richList']")!.getBoundingClientRect();
        const avatar = container.querySelector("li [class*='avatar']")!.getBoundingClientRect();

        expect(getComputedStyle(getByText("Rich List Title")).paddingInlineStart).toBe("8px");
        expect(avatar.left - list.left).toBe(8);
    });

    it("starts the empty state where the title starts", () => {
        const { getByText } = render(<Empty />);

        expect(getComputedStyle(getByText("No items available")).marginInlineStart).toBe("8px");
    });
});
