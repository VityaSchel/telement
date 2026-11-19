/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// The computed styles need Compound's typography, which turns the alternates on, and Telement's tokens
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "./tokens.css";
import React from "react";
import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@test-utils";
import { describe, expect, it } from "vitest";

import * as userMenuStories from "../menus/UserMenu/UserMenu.stories.tsx";
import * as richItemStories from "../core/rich-list/RichItem/RichItem.stories.tsx";
import * as disambiguatedProfileStories from "../room/timeline/event-tile/EventTileView/DisambiguatedProfile/DisambiguatedProfile.stories.tsx";

const { Open } = composeStories(userMenuStories);
const { Default: RichItemDefault } = composeStories(richItemStories);
const { WithMxid } = composeStories(disambiguatedProfileStories);

/** Without Inter's contextual alternates, which would draw an "x" between digits as a multiplication sign. */
const AS_TYPED = `"calt" 0, "kern", "liga"`;

describe("Identifiers in shared components", () => {
    it("draws the user menu's Matrix ID as typed", async () => {
        render(<Open />);

        expect(getComputedStyle(await screen.findByTestId("userId")).fontFeatureSettings).toBe(AS_TYPED);
    });

    it("draws a listed person's ID as typed", () => {
        render(<RichItemDefault description="@alice1x2:example.org" />);

        expect(getComputedStyle(screen.getByText("@alice1x2:example.org")).fontFeatureSettings).toBe(AS_TYPED);
    });

    it("draws the Matrix ID that tells two people of the same name apart as typed", () => {
        const { container } = render(<WithMxid />);

        expect(getComputedStyle(container.querySelector(".mx_DisambiguatedProfile_mxid")!).fontFeatureSettings).toBe(
            AS_TYPED,
        );
    });
});
