/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import React, { type JSX } from "react";
import { render, screen, waitFor } from "@test-utils";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { userEvent as browserUserEvent } from "vitest/browser";

import { RoomListItemMoreOptionsMenu, MoreOptionContent } from "./RoomListItemMoreOptionsMenu";
import { useMockedViewModel } from "../../../../core/viewmodel";
import type { RoomListItemViewSnapshot } from "./RoomListItemView";
import { defaultSnapshot } from "./default-snapshot";
import { mockedActions as mockCallbacks } from "./mocked-actions";

/** The colour a token resolves to in the current theme. */
function colourOf(token: string): string {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
}

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

    it("should have the size of the message menu, with corners concentric with the item highlights", async () => {
        const user = userEvent.setup();
        renderMenu({ canMarkAsRead: true, canMarkAsUnread: false, showNotificationMenu: true });

        await user.click(screen.getByRole("button", { name: "More Options" }));
        const menu = screen.getByRole("menu", { name: "More Options" });
        const items = Array.from(menu.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
        expect(items.map((item) => item.textContent)).toEqual([
            "Mark as read",
            "Pin",
            "Low priority",
            "Notifications",
            "Invite",
            "Copy link",
            "Leave room",
        ]);
        const menuRect = menu.getBoundingClientRect();

        // The menu's radius is an item highlight's radius plus the menu padding that insets the items
        expect(getComputedStyle(menu).borderRadius).toBe("12px");
        expect(items[0].getBoundingClientRect().top - menuRect.top).toBe(4);
        expect(menuRect.bottom - items[items.length - 1].getBoundingClientRect().bottom).toBe(4);
        for (const item of items) {
            const rect = item.getBoundingClientRect();
            expect(getComputedStyle(item).borderRadius).toBe("8px");
            expect(rect.left - menuRect.left).toBe(4);
            expect(menuRect.right - rect.right).toBe(4);
            // The message menu's items: 15px regular text on a 22.5px line with 8px above and below
            expect(rect.height).toBe(38.5);
        }

        const markAsRead = screen.getByRole("menuitem", { name: "Mark as read" });
        const icon = markAsRead.querySelector("svg")!;
        const label = screen.getByText("Mark as read");
        expect(icon.getBoundingClientRect().width).toBe(16);
        expect(icon.getBoundingClientRect().height).toBe(16);
        expect(icon.getBoundingClientRect().left - markAsRead.getBoundingClientRect().left).toBe(8);
        expect(label.getBoundingClientRect().left - icon.getBoundingClientRect().right).toBe(14);
        expect(getComputedStyle(label).fontSize).toBe("15px");
        expect(getComputedStyle(label).fontWeight).toBe("400");

        // Separators span the menu padding and keep the item highlights that padding away
        const separator = screen.getAllByRole("separator")[0];
        const separatorRect = separator.getBoundingClientRect();
        expect(separatorRect.left - menuRect.left).toBe(4);
        expect(separatorRect.top - separator.previousElementSibling!.getBoundingClientRect().bottom).toBe(4);
        expect(separator.nextElementSibling!.getBoundingClientRect().top - separatorRect.bottom).toBe(4);
    });

    it("should centre the icons, the Notifications chevron and the Low priority toggle on their labels", async () => {
        const user = userEvent.setup();
        renderMenu({ canMarkAsRead: true, canMarkAsUnread: false, showNotificationMenu: true });

        await user.click(screen.getByRole("button", { name: "More Options" }));
        const menu = screen.getByRole("menu", { name: "More Options" });
        const centreOf = (element: Element): number => {
            const rect = element.getBoundingClientRect();
            return rect.top + rect.height / 2;
        };

        for (const item of menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')) {
            const label = item.querySelector("span")!;
            const others = Array.from(item.children).filter((child) => child !== label);
            // The icon, then the chevron or the toggle where there is one
            expect(others.length).toBeGreaterThanOrEqual(1);
            for (const other of others) {
                expect(Math.abs(centreOf(other) - centreOf(label)), `${item.textContent}: ${other.tagName}`).toBe(0);
            }
            expect(centreOf(label)).toBe(centreOf(item));
        }
    });

    it("should show a single separator before Leave room in a DM, which can't be invited to nor linked", async () => {
        const user = userEvent.setup();
        renderMenu({ canInvite: false, canCopyRoomLink: false, showNotificationMenu: true });

        await user.click(screen.getByRole("button", { name: "More Options" }));
        const separators = screen.getAllByRole("separator");
        expect(separators).toHaveLength(1);
        expect(separators[0].previousElementSibling).toHaveAccessibleName("Notifications");
        expect(separators[0].nextElementSibling).toHaveAccessibleName("Leave room");
    });

    it.each([
        ["Invite", { canInvite: true, canCopyRoomLink: false }],
        ["Copy link", { canInvite: false, canCopyRoomLink: true }],
    ])("should set %s apart with a separator on each side", async (name, overrides) => {
        const user = userEvent.setup();
        renderMenu(overrides);

        await user.click(screen.getByRole("button", { name: "More Options" }));
        const separators = screen.getAllByRole("separator");
        expect(separators).toHaveLength(2);
        expect(separators[0].nextElementSibling).toHaveAccessibleName(name);
        expect(separators[1].previousElementSibling).toHaveAccessibleName(name);
    });

    it("should be as narrow as its items allow, down to the message menu's width", async () => {
        const user = userEvent.setup();
        renderMenu({ canChangeSection: false, canInvite: false, canCopyRoomLink: false });

        await user.click(screen.getByRole("button", { name: "More Options" }));
        const width = screen.getByRole("menu", { name: "More Options" }).getBoundingClientRect().width;
        // Compound's items are at least 200px wide, which made this menu 208px wide
        expect(width).toBeLessThan(208);
        // The message menu is at least 146px wide inside its padding of 4px on each side
        expect(width).toBeGreaterThanOrEqual(154);
    });

    it("should highlight an item focused with the keyboard as on hover, like the message menu", async () => {
        renderMenu({ canMarkAsRead: true, canMarkAsUnread: false });

        await browserUserEvent.click(screen.getByRole("button", { name: "More Options" }));
        const markAsRead = screen.getByRole("menuitem", { name: "Mark as read" });
        const leaveRoom = screen.getByRole("menuitem", { name: "Leave room" });
        const pin = screen.getByRole("menuitem", { name: "Pin" });
        const restingBackground = getComputedStyle(pin).backgroundColor;

        await browserUserEvent.keyboard("{ArrowDown}");
        await waitFor(() => expect(markAsRead).toHaveFocus());
        expect(markAsRead.matches(":focus-visible")).toBe(true);
        expect(getComputedStyle(markAsRead).backgroundColor).toBe(colourOf("--cpd-color-bg-action-secondary-hovered"));
        expect(getComputedStyle(markAsRead).backgroundColor).not.toBe(restingBackground);

        await browserUserEvent.keyboard("{End}");
        await waitFor(() => expect(leaveRoom).toHaveFocus());
        expect(getComputedStyle(leaveRoom).backgroundColor).toBe(colourOf("--cpd-color-bg-critical-subtle"));
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
