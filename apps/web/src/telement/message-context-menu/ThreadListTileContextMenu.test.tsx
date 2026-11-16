/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "test-utils-rtl";

import { ThreadListTileContextMenu } from "./ThreadListTileContextMenu";

describe("ThreadListTileContextMenu", () => {
    it("shows the thread in the room or copies its link, then closes", () => {
        const onViewInRoom = vi.fn();
        const onCopyLink = vi.fn();
        const onFinished = vi.fn();
        render(
            <ThreadListTileContextMenu
                left={0}
                top={0}
                onViewInRoom={onViewInRoom}
                onCopyLink={onCopyLink}
                onFinished={onFinished}
            />,
        );

        fireEvent.click(screen.getByRole("menuitem", { name: "View in room" }));
        expect(onViewInRoom).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole("menuitem", { name: "Copy link to thread" }));
        expect(onCopyLink).toHaveBeenCalledTimes(1);
        expect(onFinished).toHaveBeenCalledTimes(2);
    });

    it("leaves out copying the link when the tile can't make one", () => {
        render(<ThreadListTileContextMenu left={0} top={0} onViewInRoom={vi.fn()} onFinished={vi.fn()} />);

        expect(screen.queryByRole("menuitem", { name: "Copy link to thread" })).toBeNull();
    });
});
