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
import userEvent from "@testing-library/user-event";

import * as stories from "./RoomListToast.stories";

const { UnreadActivity } = composeStories(stories);

describe("<RoomListToast />", () => {
    it("renders UnreadActivity story", () => {
        const { container } = render(<UnreadActivity />);
        expect(container).toMatchSnapshot();
    });

    it("calls onClick when the unread-activity toast is clicked", async () => {
        const user = userEvent.setup();
        render(<UnreadActivity />);
        await user.click(screen.getByRole("button", { name: "Unread messages" }));
        expect(UnreadActivity.args.onClick).toHaveBeenCalled();
    });
});
