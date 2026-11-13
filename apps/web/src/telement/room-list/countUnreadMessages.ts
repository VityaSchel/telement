/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { PushProcessor } from "matrix-js-sdk/src/pushprocessor";
import type { IPushRules, MatrixClient, Room } from "matrix-js-sdk/src/matrix";

import shouldHideEvent from "../../shouldHideEvent";
import { eventTriggersUnreadCount } from "../../Unread";
import { isRuleRoomMuteRuleForRoomId } from "../../RoomNotifs";

/**
 * The unread messages of a room, as counted by {@link countUnreadMessages}.
 */
export interface UnreadMessages {
    /** How many messages the user hasn't read */
    count: number;
    /** Whether one of them is a mention that Element would highlight if the room weren't muted */
    mentionsMe: boolean;
}

/**
 * Counts the messages in a room's main timeline that the user hasn't read: those after their read receipt and after
 * the last message they sent. A muted room's push rule gives it no notification count and no mentions, so the room
 * list counts its unread messages here, as Telegram shows them for a muted chat. A message is a mention when the
 * user's push rules, applied as if the room weren't muted, highlight it, so mentions follow the user's Element
 * notification settings. Only the loaded part of the timeline is counted.
 */
export function countUnreadMessages(room: Room): UnreadMessages {
    const myUserId = room.client.getSafeUserId();
    const readUpToId = room.getEventReadUpTo(myUserId);
    const events = room.getLiveTimeline().getEvents();
    const unmutedPushProcessor = createUnmutedPushProcessor(room);

    const unread: UnreadMessages = { count: 0, mentionsMe: false };
    for (let index = events.length - 1; index >= 0; index--) {
        const event = events[index];
        if (event.getId() === readUpToId || event.getSender() === myUserId) break;
        if (shouldHideEvent(event) || !eventTriggersUnreadCount(room.client, event)) continue;

        unread.count++;
        unread.mentionsMe ||= Boolean(unmutedPushProcessor.actionsForEvent(event).tweaks?.highlight);
    }
    return unread;
}

/**
 * Creates a push processor that applies the user's push rules without the room's mute rule.
 */
function createUnmutedPushProcessor(room: Room): PushProcessor {
    const { client, roomId } = room;
    const pushRules: IPushRules | undefined = client.pushRules && {
        ...client.pushRules,
        global: {
            ...client.pushRules.global,
            override: client.pushRules.global.override?.filter((rule) => !isRuleRoomMuteRuleForRoomId(roomId, rule)),
        },
    };
    // A PushProcessor only evaluates its client's rules, so it gets a client that inherits everything but the rules.
    const clientWithoutMuteRule: MatrixClient = Object.create(client, { pushRules: { value: pushRules } });
    return new PushProcessor(clientWithoutMuteRule);
}
