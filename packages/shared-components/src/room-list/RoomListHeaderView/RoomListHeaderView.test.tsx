/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { composeStories } from "@storybook/react-vite";
import { render } from "@test-utils";
import { describe, it, expect } from "vitest";
import React from "react";

import * as stories from "./RoomListHeaderView.stories";

const { Default, NoSpaceMenu, NoComposeMenu } = composeStories(stories);

describe("RoomListHeaderView", () => {
    it("renders the default state", () => {
        const { container } = render(<Default />);
        expect(container).toMatchSnapshot();
    });

    it("renders without space menu", () => {
        const { container } = render(<NoSpaceMenu />);
        expect(container).toMatchSnapshot();
    });

    it("renders a start chat button instead of the compose menu when rooms can't be created", () => {
        const { getByRole } = render(<NoComposeMenu />);
        getByRole("button", { name: "Start chat" }).click();
        expect(NoComposeMenu.args?.createChatRoom).toHaveBeenCalled();
    });
});
