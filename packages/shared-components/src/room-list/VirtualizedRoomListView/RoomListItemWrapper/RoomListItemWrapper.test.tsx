/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import { render, screen } from "@test-utils";
import { composeStories } from "@storybook/react-vite";
import { describe, it, expect } from "vitest";

import * as stories from "./RoomListItemWrapper.stories";

const { FlatList } = composeStories(stories);

describe("<RoomListItemWrapper />", () => {
    it("renders the room as an option of the room list", () => {
        render(<FlatList roomIndex={2} roomCount={10} />);

        const option = screen.getByRole("option", { name: /Room name/ });
        expect(option).toHaveAttribute("aria-posinset", "3");
        expect(option).toHaveAttribute("aria-setsize", "10");
    });
});
