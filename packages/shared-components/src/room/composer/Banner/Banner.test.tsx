/*
 * Copyright (c) 2025 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "../../../telement/tokens.css";
import React from "react";
import { render } from "@test-utils";
import { describe, it, expect } from "vitest";
import { composeStories } from "@storybook/react-vite";

import * as stories from "./Banner.stories.tsx";

const { Default, Info, Success, WithAction, WithAvatarImage, Critical } = composeStories(stories);

describe("AvatarWithDetails", () => {
    it("renders a default banner", () => {
        const { container } = render(<Default />);
        expect(container).toMatchSnapshot();
    });
    it("renders a info banner", () => {
        const { container } = render(<Info />);
        expect(container).toMatchSnapshot();
    });
    it("renders a success banner", () => {
        const { container } = render(<Success />);
        expect(container).toMatchSnapshot();
    });
    it("renders a critical banner", () => {
        const { container } = render(<Critical />);
        expect(container).toMatchSnapshot();
    });
    it("renders a banner with an action", () => {
        const { container } = render(<WithAction />);
        expect(container).toMatchSnapshot();
    });
    it("renders a banner with an avatar iamge", () => {
        const { container } = render(<WithAvatarImage />);
        expect(container).toMatchSnapshot();
    });

    it("draws an info banner's border and icon in the accent, the app's only blue", () => {
        const { container } = render(<Info />);
        const banner = container.querySelector<HTMLElement>("[data-type='info']")!;
        const probe = document.createElement("span");
        probe.style.color = "var(--tl-accent-900)";
        banner.append(probe);
        const accent = getComputedStyle(probe).color;

        expect(getComputedStyle(banner).borderTopColor).toBe(accent);
        expect(getComputedStyle(banner.querySelector("svg")!).color).toBe(accent);
    });
});
