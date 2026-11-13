/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX } from "react";
import { render, screen } from "@test-utils";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { RoomListItemMoreOptionsMenu, MoreOptionContent } from "./RoomListItemMoreOptionsMenu";
import { useMockedViewModel } from "../../../../core/viewmodel";
import type { RoomListItemViewSnapshot } from "./RoomListItemView";
import { defaultSnapshot } from "./default-snapshot";
import { mockedActions as mockCallbacks } from "./mocked-actions";

describe("<RoomListItemMoreOptionsMenu />", () => {
    const renderMenu = (overrides: Partial<RoomListItemViewSnapshot> = {}): ReturnType<typeof render> => {
        const TestComponent = (): JSX.Element => {
            const vm = useMockedViewModel(
                {
                    ...defaultSnapshot,
                    showMoreOptionsMenu: true,
                    showNotificationMenu: false,
                    ...overrides,
                } as RoomListItemViewSnapshot,
                mockCallbacks,
            );
            return <RoomListItemMoreOptionsMenu vm={vm} />;
        };
        return render(<TestComponent />);
    };

    it("should render the more options button", () => {
        renderMenu();
        expect(screen.getByRole("button", { name: "More Options" })).toBeInTheDocument();
    });

    it("should open menu when clicked", async () => {
        const user = userEvent.setup();
        renderMenu();

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("should show mark as read option when canMarkAsRead is true", async () => {
        const user = userEvent.setup();
        renderMenu({ canMarkAsRead: true });

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        expect(screen.getByRole("menuitem", { name: "Mark as read" })).toBeInTheDocument();
    });

    it("should not show mark as read option when canMarkAsRead is false", async () => {
        const user = userEvent.setup();
        renderMenu({ canMarkAsRead: false });

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        expect(screen.queryByRole("menuitem", { name: "Mark as read" })).not.toBeInTheDocument();
    });

    it("should call onMarkAsRead when mark as read clicked", async () => {
        const user = userEvent.setup();
        renderMenu({ canMarkAsRead: true });

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        const markAsReadOption = screen.getByRole("menuitem", { name: "Mark as read" });
        await user.click(markAsReadOption);

        expect(mockCallbacks.onMarkAsRead).toHaveBeenCalled();
    });

    it("should show mark as unread option when canMarkAsUnread is true", async () => {
        const user = userEvent.setup();
        renderMenu({ canMarkAsUnread: true });

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        expect(screen.getByRole("menuitem", { name: "Mark as unread" })).toBeInTheDocument();
    });

    it("should call onMarkAsUnread when mark as unread clicked", async () => {
        const user = userEvent.setup();
        renderMenu({ canMarkAsUnread: true });

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        const markAsUnreadOption = screen.getByRole("menuitem", { name: "Mark as unread" });
        await user.click(markAsUnreadOption);

        expect(mockCallbacks.onMarkAsUnread).toHaveBeenCalled();
    });

    it("should offer to pin a room that isn't pinned and call onToggleFavorite", async () => {
        vi.mocked(mockCallbacks.onToggleFavorite).mockClear();
        const user = userEvent.setup();
        renderMenu({ isFavourite: false });

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        expect(screen.queryByRole("menuitem", { name: "Unpin" })).not.toBeInTheDocument();
        expect(screen.queryByRole("menuitemcheckbox", { name: /pin/i })).not.toBeInTheDocument();

        await user.click(screen.getByRole("menuitem", { name: "Pin" }));
        expect(mockCallbacks.onToggleFavorite).toHaveBeenCalled();
        // Like other actions, pinning closes the menu
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("should offer to unpin a pinned room and call onToggleFavorite", async () => {
        vi.mocked(mockCallbacks.onToggleFavorite).mockClear();
        const user = userEvent.setup();
        renderMenu({ isFavourite: true });

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        expect(screen.queryByRole("menuitem", { name: "Pin" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("menuitem", { name: "Unpin" }));
        expect(mockCallbacks.onToggleFavorite).toHaveBeenCalled();
    });

    it("should show low priority option and call onToggleLowPriority", async () => {
        const user = userEvent.setup();
        renderMenu({ isLowPriority: false });

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        const lowPriorityOption = screen.getByRole("menuitemcheckbox", { name: "Low priority" });
        expect(lowPriorityOption).toBeInTheDocument();
        expect(lowPriorityOption).toHaveAttribute("aria-checked", "false");

        await user.click(lowPriorityOption);
        expect(mockCallbacks.onToggleLowPriority).toHaveBeenCalled();
    });

    it("should show invite option when canInvite is true", async () => {
        const user = userEvent.setup();
        renderMenu({ canInvite: true });

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        expect(screen.getByRole("menuitem", { name: "Invite" })).toBeInTheDocument();
    });

    it("should call onInvite when invite clicked", async () => {
        const user = userEvent.setup();
        renderMenu({ canInvite: true });

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        const inviteOption = screen.getByRole("menuitem", { name: "Invite" });
        await user.click(inviteOption);

        expect(mockCallbacks.onInvite).toHaveBeenCalled();
    });

    it("should show copy link option when canCopyRoomLink is true", async () => {
        const user = userEvent.setup();
        renderMenu({ canCopyRoomLink: true });

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        expect(screen.getByRole("menuitem", { name: "Copy link" })).toBeInTheDocument();
    });

    it("should call onCopyRoomLink when copy link clicked", async () => {
        const user = userEvent.setup();
        renderMenu({ canCopyRoomLink: true });

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        const copyLinkOption = screen.getByRole("menuitem", { name: "Copy link" });
        await user.click(copyLinkOption);

        expect(mockCallbacks.onCopyRoomLink).toHaveBeenCalled();
    });

    it("should show leave room option", async () => {
        const user = userEvent.setup();
        renderMenu();

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        expect(screen.getByRole("menuitem", { name: "Leave room" })).toBeInTheDocument();
    });

    it("should call onLeaveRoom when leave room clicked", async () => {
        const user = userEvent.setup();
        renderMenu();

        const button = screen.getByRole("button", { name: "More Options" });
        await user.click(button);

        const leaveRoomOption = screen.getByRole("menuitem", { name: "Leave room" });
        await user.click(leaveRoomOption);

        expect(mockCallbacks.onLeaveRoom).toHaveBeenCalled();
    });

    it("should hide the favourite and low priority entries when the room cannot change section", () => {
        const TestComponent = (): JSX.Element => {
            const vm = useMockedViewModel({ ...defaultSnapshot, canChangeSection: false }, mockCallbacks);
            return <MoreOptionContent vm={vm} />;
        };
        render(<TestComponent />);

        // A room with a pending invitation can't be marked as favourite or low priority
        expect(screen.queryByRole("menuitem", { name: "Pin" })).not.toBeInTheDocument();
        expect(screen.queryByRole("menuitemcheckbox", { name: "Low priority" })).not.toBeInTheDocument();
        // The remaining entries are unaffected
        expect(screen.getByRole("menuitem", { name: "Leave room" })).toBeInTheDocument();
    });
});
