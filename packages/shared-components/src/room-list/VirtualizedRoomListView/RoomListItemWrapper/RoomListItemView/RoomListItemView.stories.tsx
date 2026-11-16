/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX, useEffect } from "react";
import { fn } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
    type Room,
    RoomListItemView,
    type RoomListItemViewSnapshot,
    type RoomListItemViewActions,
} from "./RoomListItemView";
import { useMockedViewModel } from "../../../../core/viewmodel";
import { withViewDocs } from "../../../../../.storybook/withViewDocs";
import { defaultSnapshot } from "./default-snapshot";
import { renderAvatar } from "../../../story-mocks";
import { mockedActions } from "./mocked-actions";
import { RoomNotifState } from "./RoomNotifs";

type RoomListItemProps = RoomListItemViewSnapshot &
    RoomListItemViewActions & {
        isSelected: boolean;
        isFocused: boolean;
        onFocus: (room: Room, e: React.FocusEvent) => void;
        renderAvatar: (room: Room) => React.ReactElement;
    };

// Wrapper component that creates a mocked ViewModel
const RoomListItemWrapperImpl = ({
    onOpenRoom,
    onMarkAsRead,
    onMarkAsUnread,
    onToggleFavorite,
    onToggleLowPriority,
    onInvite,
    onCopyRoomLink,
    onLeaveRoom,
    onSetRoomNotifState,
    isSelected,
    isFocused,
    onFocus,
    renderAvatar: renderAvatarProp,
    ...rest
}: RoomListItemProps): JSX.Element => {
    const vm = useMockedViewModel(rest, {
        onOpenRoom,
        onMarkAsRead,
        onMarkAsUnread,
        onToggleFavorite,
        onToggleLowPriority,
        onInvite,
        onCopyRoomLink,
        onLeaveRoom,
        onSetRoomNotifState,
    });
    return (
        <RoomListItemView
            vm={vm}
            isSelected={isSelected}
            isFocused={isFocused}
            onFocus={onFocus}
            renderAvatar={renderAvatarProp}
            role="option"
        />
    );
};
const RoomListItemWrapper = withViewDocs(RoomListItemWrapperImpl, RoomListItemView);

const meta = {
    title: "Room List/RoomListItemView",
    component: RoomListItemWrapper,
    tags: ["autodocs"],
    decorators: [
        (Story) => (
            <div role="listbox" aria-label="Room list" style={{ width: "320px", padding: "8px" }}>
                <Story />
            </div>
        ),
    ],
    args: {
        ...defaultSnapshot,
        ...mockedActions,
        isSelected: false,
        isFocused: false,
        onFocus: fn(),
        renderAvatar,
    },
    parameters: {
        design: {
            type: "figma",
            url: "https://www.figma.com/design/rTaQE2nIUSLav4Tg3nozq7/Compound-Web-Components?node-id=10800-21153&t=gFDc2D7TMEffSSCo-0",
        },
    },
} satisfies Meta<typeof RoomListItemWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongContent: Story = {
    args: {
        name: "Loooooooooooooooooooooooooooooooooooooong name",
        messagePreview:
            "Has anyone tried the new release? The room list looks very different now, with two lines of preview",
    },
};

export const DirectMessage: Story = {
    args: {
        name: "Alice",
        messagePreviewSender: undefined,
    },
};

export const OwnMessage: Story = {
    args: {
        messagePreview: "Pushed the room list spec",
        messagePreviewSender: "You",
    },
};

export const Typing: Story = {
    args: {
        typing: "Alice is typing …",
    },
};

export const Draft: Story = {
    args: {
        draft: "Let's meet at the station at nine",
    },
};

/** The open room's draft is in its composer, so the row shows the last message */
export const SelectedWithDraft: Story = {
    args: {
        isSelected: true,
        draft: "Let's meet at the station at nine",
    },
};

export const OwnMessageSending: Story = {
    args: {
        messagePreview: "Pushed the room list spec",
        messagePreviewSender: "You",
        lastMessageState: "sending",
    },
};

export const OwnMessageSent: Story = {
    args: {
        messagePreview: "Pushed the room list spec",
        messagePreviewSender: "You",
        lastMessageState: "sent",
    },
};

export const OwnMessageRead: Story = {
    args: {
        messagePreview: "Pushed the room list spec",
        messagePreviewSender: "You",
        lastMessageState: "read",
    },
};

export const SelectedOwnMessageRead: Story = {
    args: {
        isSelected: true,
        messagePreview: "Pushed the room list spec",
        messagePreviewSender: "You",
        lastMessageState: "read",
    },
};

export const Selected: Story = {
    args: {
        isSelected: true,
    },
};

export const SelectedWithNotification: Story = {
    args: {
        isSelected: true,
        notification: {
            hasAnyNotificationOrActivity: true,
            isUnsentMessage: false,
            invited: false,
            isMention: true,
            isActivityNotification: false,
            isNotification: false,
            hasUnreadCount: true,
            count: 2,
            muted: true,
        },
        roomNotifState: RoomNotifState.Mute,
    },
};

export const WithNotification: Story = {
    args: {
        notification: {
            hasAnyNotificationOrActivity: true,
            isUnsentMessage: false,
            invited: false,
            isMention: false,
            isActivityNotification: false,
            isNotification: true,
            hasUnreadCount: true,
            count: 3,
            muted: false,
        },
    },
};

export const WithMention: Story = {
    args: {
        notification: {
            hasAnyNotificationOrActivity: true,
            isUnsentMessage: false,
            invited: false,
            isMention: true,
            isActivityNotification: false,
            isNotification: true,
            hasUnreadCount: true,
            count: 1,
            muted: false,
        },
    },
};

export const WithVoiceCall: Story = {
    args: {
        notification: {
            hasAnyNotificationOrActivity: true,
            isUnsentMessage: false,
            invited: false,
            isMention: false,
            isActivityNotification: false,
            isNotification: false,
            hasUnreadCount: false,
            count: 0,
            muted: false,
            callType: "voice",
        },
    },
};

export const WithVideoCall: Story = {
    args: {
        notification: {
            hasAnyNotificationOrActivity: true,
            isUnsentMessage: false,
            invited: false,
            isMention: false,
            isActivityNotification: false,
            isNotification: false,
            hasUnreadCount: false,
            count: 0,
            muted: false,
            callType: "video",
        },
    },
};

export const Invitation: Story = {
    args: {
        name: "Secret Project",
        messagePreview: "Bob invited you",
        notification: {
            hasAnyNotificationOrActivity: true,
            isUnsentMessage: false,
            invited: true,
            isMention: false,
            isActivityNotification: false,
            isNotification: false,
            hasUnreadCount: false,
            count: 0,
            muted: false,
        },
    },
};

export const UnsentMessage: Story = {
    args: {
        messagePreview: "Failed to send message",
        notification: {
            hasAnyNotificationOrActivity: true,
            isUnsentMessage: true,
            invited: false,
            isMention: false,
            isActivityNotification: false,
            isNotification: false,
            hasUnreadCount: false,
            count: 0,
            muted: false,
        },
    },
};

export const NoMessagePreview: Story = {
    args: {
        messagePreview: undefined,
    },
};

export const WithHoverMenu: Story = {
    args: {
        showMoreOptionsMenu: true,
    },
};

export const WithoutHoverMenu: Story = {
    args: {
        showMoreOptionsMenu: false,
    },
};

export const WithLargeFont: Story = {
    args: {
        isSelected: true,
    },
    // Render the story in an iframe to avoid affecting other story
    parameters: {
        docs: {
            story: {
                inline: false,
                iframeHeight: 170,
            },
        },
    },
    decorators: [
        (Story) => {
            useEffect(() => {
                const originalFontSize = getComputedStyle(document.documentElement).fontSize;
                document.documentElement.style.setProperty("font-size", "36px");
                return () => {
                    document.documentElement.style.setProperty("font-size", originalFontSize);
                };
            }, []);
            return <Story />;
        },
    ],
};

export const WithZoom: Story = {
    args: {
        isSelected: true,
    },
    decorators: [
        (Story, context) => (
            <div style={{ zoom: 2 }}>
                <Story />
            </div>
        ),
    ],
};

export const Muted: Story = {
    args: {
        notification: { ...defaultSnapshot.notification, muted: true },
        roomNotifState: RoomNotifState.Mute,
    },
};

export const MutedWithNotification: Story = {
    args: {
        notification: {
            hasAnyNotificationOrActivity: true,
            isUnsentMessage: false,
            invited: false,
            isMention: false,
            isActivityNotification: false,
            isNotification: true,
            hasUnreadCount: true,
            count: 3,
            muted: true,
        },
        roomNotifState: RoomNotifState.Mute,
    },
};

export const MutedWithLongName: Story = {
    args: {
        name: "Loooooooooooooooooooooooooooooooooooooong name",
        notification: { ...defaultSnapshot.notification, muted: true },
        roomNotifState: RoomNotifState.Mute,
    },
};

export const Pinned: Story = {
    args: {
        isFavourite: true,
    },
};

export const PinnedWithNotification: Story = {
    args: {
        isFavourite: true,
        notification: {
            hasAnyNotificationOrActivity: true,
            isUnsentMessage: false,
            invited: false,
            isMention: false,
            isActivityNotification: false,
            isNotification: true,
            hasUnreadCount: true,
            count: 3,
            muted: false,
        },
    },
};

export const PinnedAndMuted: Story = {
    args: {
        isFavourite: true,
        notification: {
            hasAnyNotificationOrActivity: false,
            isUnsentMessage: false,
            invited: false,
            isMention: false,
            isActivityNotification: false,
            isNotification: false,
            hasUnreadCount: false,
            count: 0,
            muted: true,
        },
        roomNotifState: RoomNotifState.Mute,
    },
};

export const WithUserStatus: Story = {
    args: {
        userStatus: {
            emoji: "🌭",
            text: "Hot",
        },
    },
};
