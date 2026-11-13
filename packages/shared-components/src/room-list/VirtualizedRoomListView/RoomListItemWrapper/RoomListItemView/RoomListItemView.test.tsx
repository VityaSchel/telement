/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../../../telement/tokens.css";
import React from "react";
import { render, screen, waitFor } from "@test-utils";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import { describe, it, expect } from "vitest";

import * as stories from "./RoomListItemView.stories";
import styles from "./RoomListItemView.module.css";

const {
    Default,
    Selected,
    Bold,
    WithNotification,
    WithMention,
    WithVoiceCall,
    WithVideoCall,
    Invitation,
    UnsentMessage,
    NoMessagePreview,
    WithHoverMenu,
    WithoutHoverMenu,
    Muted,
    MutedWithNotification,
    MutedWithLongName,
    Pinned,
    PinnedWithNotification,
    PinnedAndMuted,
} = composeStories(stories);

describe("<RoomListItemView />", () => {
    it("renders Default story", () => {
        const { container } = render(<Default />);
        expect(container).toMatchSnapshot();
    });

    it("renders Selected story", () => {
        const { container } = render(<Selected />);
        expect(container).toMatchSnapshot();
    });

    it("should round the selected room's marker at both ends and the row's highlight as a row", () => {
        render(<Selected />);
        const container = screen.getByRole("option").querySelector(`.${styles.container}`)!;
        const marker = getComputedStyle(container, "::before");

        expect(marker.width).toBe("4px");
        for (const radius of [
            marker.borderTopLeftRadius,
            marker.borderTopRightRadius,
            marker.borderBottomRightRadius,
            marker.borderBottomLeftRadius,
        ]) {
            expect(parseFloat(radius)).toBeGreaterThanOrEqual(parseFloat(marker.width) / 2);
        }
        expect(getComputedStyle(container).borderRadius).toBe("8px");
    });

    it("renders Bold story", () => {
        const { container } = render(<Bold />);
        expect(container).toMatchSnapshot();
    });

    it("renders WithNotification story", () => {
        const { container } = render(<WithNotification />);
        expect(container).toMatchSnapshot();
    });

    it("renders WithMention story", () => {
        const { container } = render(<WithMention />);
        expect(container).toMatchSnapshot();
    });

    it("renders WithVoiceCall story", () => {
        const { container } = render(<WithVoiceCall />);
        expect(container).toMatchSnapshot();
    });

    it("renders WithVideoCall story", () => {
        const { container } = render(<WithVideoCall />);
        expect(container).toMatchSnapshot();
    });

    it("renders Invitation story", () => {
        const { container } = render(<Invitation />);
        expect(container).toMatchSnapshot();
    });

    it("renders UnsentMessage story", () => {
        const { container } = render(<UnsentMessage />);
        expect(container).toMatchSnapshot();
    });

    it("renders NoMessagePreview story", () => {
        const { container } = render(<NoMessagePreview />);
        expect(container).toMatchSnapshot();
    });

    it("renders WithHoverMenu story", () => {
        const { container } = render(<WithHoverMenu />);
        expect(container).toMatchSnapshot();
    });

    it("renders Pinned story", () => {
        const { container } = render(<Pinned />);
        expect(container).toMatchSnapshot();
    });

    it("should show a pin for a pinned room", () => {
        render(<Pinned />);
        expect(screen.getByTestId("pinned-icon")).toBeInTheDocument();
    });

    it("should show a smaller, tilted pin, like Telegram", () => {
        render(<Pinned />);
        const pin = screen.getByTestId("pinned-icon");
        expect(pin).toHaveClass(styles.pinnedIcon);
        expect(pin).toHaveAttribute("width", "16px");
        expect(pin).toHaveAttribute("height", "16px");
        // rotate(45deg) as a matrix: cos and sin of 45° are both about 0.707
        expect(getComputedStyle(pin).transform).toMatch(
            /^matrix\(0\.707\d*, 0\.707\d*, -0\.707\d*, 0\.707\d*, 0, 0\)$/,
        );
    });

    it("renders Muted story", () => {
        const { container } = render(<Muted />);
        expect(container).toMatchSnapshot();
    });

    it("renders MutedWithNotification story", () => {
        const { container } = render(<MutedWithNotification />);
        expect(container).toMatchSnapshot();
    });

    it("should show the unread count of a muted room and its bell after its name", () => {
        render(<MutedWithNotification />);
        expect(screen.getByTestId("notification-decoration")).toHaveTextContent("3");
        expect(screen.getByTestId("room-name").nextElementSibling).toBe(screen.getByTestId("muted-icon"));
        expect(screen.getByRole("option")).toHaveAccessibleName("Open room General with 3 unread messages.");
    });

    it("should show the bell of a muted room right after its name, outside the notification decoration", () => {
        render(<Muted />);
        const bell = screen.getByTestId("muted-icon");
        expect(screen.getByTestId("room-name").nextElementSibling).toBe(bell);
        expect(screen.queryByTestId("notification-decoration")).toBeNull();
    });

    it("should not show a bell for a room that isn't muted", () => {
        render(<Default />);
        expect(screen.queryByTestId("muted-icon")).toBeNull();
    });

    it("should keep the bell of a muted room visible when its name is truncated", () => {
        render(<MutedWithLongName />);
        const name = screen.getByTestId("room-name");
        const bell = screen.getByTestId("muted-icon");

        expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
        expect(bell.getBoundingClientRect().width).toBe(16);
        expect(bell.getBoundingClientRect().left).toBeGreaterThanOrEqual(name.getBoundingClientRect().right);
        expect(bell.getBoundingClientRect().right).toBeLessThanOrEqual(
            name.parentElement!.getBoundingClientRect().right,
        );
    });

    it("should keep the bell of a muted room visible while the hover menu is shown", () => {
        // isFocused focuses the row via the keyboard on mount, which shows the hover menu as hovering does
        const { container } = render(<Muted isFocused={true} />);
        expect(container.querySelector('[aria-label="More Options"]')).toBeVisible();
        expect(screen.getByTestId("muted-icon")).toBeVisible();
    });

    it.each([
        ["Muted", Muted],
        ["MutedWithLongName", MutedWithLongName],
        ["PinnedAndMuted", PinnedAndMuted],
    ])("should show the %s story's notification options in the muted state, as the app does", async (_, Story) => {
        const user = userEvent.setup();
        // isFocused reveals the hover menu, which holds the notification options
        render(<Story isFocused={true} />);

        await user.click(screen.getByRole("button", { name: "More Options" }));
        await user.click(screen.getByRole("menuitem", { name: "Notifications" }));
        expect(await screen.findByRole("menuitemradio", { name: "Mute room" })).toHaveAttribute("aria-checked", "true");
    });

    it("should only show the more options button on hover, with the notification options inside it", () => {
        render(<WithHoverMenu isFocused={true} />);
        expect(screen.getByRole("button", { name: "More Options" })).toBeVisible();
        expect(screen.queryByRole("button", { name: "Notification options" })).toBeNull();
    });

    it("should offer the notification options in the right-click menu", async () => {
        const user = userEvent.setup();
        render(<Default />);

        await user.pointer({ keys: "[MouseRight]", target: screen.getByRole("option") });
        const item = await screen.findByRole("menuitem", { name: "Notifications" });
        expect(item).toHaveAttribute("aria-haspopup", "menu");

        item.focus();
        await user.keyboard("{ArrowRight}");
        expect(await screen.findByRole("menuitemradio", { name: "Match default settings" })).toHaveAttribute(
            "aria-checked",
            "true",
        );
        await waitFor(() =>
            expect(screen.getByRole("menuitemradio", { name: "Match default settings" })).toHaveFocus(),
        );
        await user.keyboard("{ArrowDown}{ArrowDown}");
        expect(screen.getByRole("menuitemradio", { name: "Mentions and keywords" })).toHaveFocus();
        await user.keyboard("{Enter}");
        expect(Default.args.onSetRoomNotifState).toHaveBeenCalledWith("mentions_only");
    });

    it("should not show a pin for a room that isn't pinned", () => {
        render(<Default />);
        expect(screen.queryByTestId("pinned-icon")).toBeNull();
    });

    it("should show the notification decoration instead of the pin of a pinned room", () => {
        render(<PinnedWithNotification />);
        expect(screen.getByTestId("notification-decoration")).toBeInTheDocument();
        expect(screen.queryByTestId("pinned-icon")).toBeNull();
    });

    it("should show the bell of a muted pinned room next to its name and the pin at the end", () => {
        render(<PinnedAndMuted />);
        expect(screen.getByTestId("room-name").nextElementSibling).toBe(screen.getByTestId("muted-icon"));
        expect(screen.getByTestId("pinned-icon").parentElement).toHaveClass(styles.notificationDecoration);
        expect(screen.queryByTestId("notification-decoration")).toBeNull();
    });

    it("should show the notification decoration and the pin on the message preview line", () => {
        const { unmount } = render(<WithNotification />);
        expect(screen.getByTestId("notification-decoration").parentElement).toHaveClass(styles.onMessagePreviewLine);
        unmount();

        render(<Pinned />);
        expect(screen.getByTestId("pinned-icon").parentElement).toHaveClass(styles.onMessagePreviewLine);
    });

    it("should centre the pin of a pinned room without a message preview", () => {
        render(<NoMessagePreview isFavourite={true} />);
        expect(screen.getByTestId("pinned-icon").parentElement).not.toHaveClass(styles.onMessagePreviewLine);
    });

    it("should describe a pinned room as pinned to assistive technologies", () => {
        render(<PinnedWithNotification />);
        const item = screen.getByRole("option", { name: "Open room General with 3 unread messages." });
        expect(item).toHaveAccessibleDescription("Pinned");
    });

    it("should not describe a room that isn't pinned as pinned", () => {
        render(<Default />);
        expect(screen.getByRole("option")).not.toHaveAttribute("aria-describedby");
        expect(screen.queryByText("Pinned")).toBeNull();
    });

    it("should not show a pin for a pinned room with a call", () => {
        render(
            <Pinned
                notification={{ ...Pinned.args.notification!, hasAnyNotificationOrActivity: false, callType: "video" }}
            />,
        );
        expect(screen.queryByTestId("pinned-icon")).toBeNull();
    });

    it("should call onOpenRoom when clicked", async () => {
        const user = userEvent.setup();
        render(<Default />);

        await user.click(screen.getByRole("option"));
        expect(Default.args.onOpenRoom).toHaveBeenCalled();
    });

    it("should have aria-selected true when selected", () => {
        render(<Selected />);
        expect(screen.getByRole("option")).toHaveAttribute("aria-selected", "true");
    });

    it("should have aria-selected false when not selected", () => {
        render(<Default />);
        expect(screen.getByRole("option")).toHaveAttribute("aria-selected", "false");
    });

    it("should have tabIndex -1 when not focused", () => {
        render(<Default />);
        expect(screen.getByRole("option")).toHaveAttribute("tabIndex", "-1");
    });

    it("should call onFocus when focused", () => {
        render(<Default />);
        screen.getByRole("option").focus();
        expect(Default.args.onFocus).toHaveBeenCalled();
    });

    it("should display notification decoration when present", () => {
        render(<WithNotification />);
        expect(screen.getByTestId("notification-decoration")).toBeInTheDocument();
    });

    it("should hide notification decoration when not present", () => {
        render(<Default />);
        expect(screen.queryByTestId("notification-decoration")).toBeNull();
    });

    it("should show hover menu when showMoreOptionsMenu is true", () => {
        const { container } = render(<WithHoverMenu />);
        expect(container.querySelector('[aria-label="More Options"]')).not.toBeNull();
    });

    it("should hide hover menu when showMoreOptionsMenu is false", () => {
        const { container } = render(<WithoutHoverMenu />);
        expect(container.querySelector('[aria-label="More Options"]')).toBeNull();
    });

    it("reveals the hover menu on keyboard focus and clears it when focus leaves", async () => {
        // isFocused focuses the row via the keyboard on mount, so the hover menu is revealed.
        const { container } = render(<WithHoverMenu isFocused={true} />);
        const option = screen.getByRole("option");
        const moreButton = container.querySelector('[aria-label="More Options"]');

        expect(option.className).toMatch(/keyboardActive/);
        expect(moreButton).toBeVisible();

        // Focus leaving the row hides the menu again.
        option.blur();
        await waitFor(() => expect(option.className).not.toMatch(/keyboardActive/));
        expect(moreButton).not.toBeVisible();
    });
});
