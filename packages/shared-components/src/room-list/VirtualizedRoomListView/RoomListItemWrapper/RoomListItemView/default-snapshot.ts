/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { type RoomListItemViewSnapshot } from "./RoomListItemView";
import { RoomNotifState } from "./RoomNotifs";

export const mockRoom = { name: "General" };

export const defaultSnapshot: RoomListItemViewSnapshot = {
    id: "!room:server",
    room: mockRoom,
    name: "General",
    messagePreview: "Hey everyone!",
    messagePreviewSender: "Alice",
    timestamp: "12:41",
    timestampFull: "Fri, Nov 13, 2026, 12:41:08 PM",
    timestampIso: "2026-11-13T12:41:08.000Z",
    notification: {
        hasAnyNotificationOrActivity: false,
        isUnsentMessage: false,
        invited: false,
        isMention: false,
        isActivityNotification: false,
        isNotification: false,
        hasUnreadCount: false,
        count: 0,
        muted: false,
    },
    showMoreOptionsMenu: true,
    showNotificationMenu: true,
    isFavourite: false,
    isLowPriority: false,
    canInvite: true,
    canCopyRoomLink: true,
    canMarkAsRead: false,
    canMarkAsUnread: true,
    roomNotifState: RoomNotifState.AllMessages,
    canChangeSection: true,
};
