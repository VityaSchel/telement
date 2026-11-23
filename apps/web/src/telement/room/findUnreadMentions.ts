/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type MatrixEvent, type Room } from "matrix-js-sdk/src/matrix";

import shouldHideEvent from "../../shouldHideEvent";
import { eventTriggersUnreadCount } from "../../Unread";
import { createUnmutedPushProcessor } from "../room-list/countUnreadMessages";

/**
 * Finds the messages in a room's main timeline that mention the user and that they haven't read, oldest first: those
 * after their read receipt and after the last message they sent, as the room list counts unread messages. A message is
 * a mention when the user's push rules highlight it, applied as if the room weren't muted, so a muted room's mentions
 * are found as the room list's @ shows them. Only the loaded part of the timeline is searched.
 */
export function findUnreadMentions(room: Room): MatrixEvent[] {
    const myUserId = room.client.getSafeUserId();
    const readUpToId = room.getEventReadUpTo(myUserId);
    const events = room.getLiveTimeline().getEvents();
    const pushProcessor = createUnmutedPushProcessor(room);

    const mentions: MatrixEvent[] = [];
    for (let index = events.length - 1; index >= 0; index--) {
        const event = events[index];
        if (event.getId() === readUpToId || event.getSender() === myUserId) break;
        if (shouldHideEvent(event) || !eventTriggersUnreadCount(room.client, event)) continue;
        if (pushProcessor.actionsForEvent(event).tweaks?.highlight) mentions.push(event);
    }
    return mentions.reverse();
}
