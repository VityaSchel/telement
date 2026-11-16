/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { EventStatus, type MatrixEvent, type Room } from "matrix-js-sdk/src/matrix";
import { type RoomListItemLastMessageState } from "@element-hq/web-shared-components";

/**
 * The check shown before the time of a room whose last message is the user's own, as in Telegram: a clock while it
 * is being sent, one check once it is sent, and two once any other member has read it. Undefined for someone else's
 * message, and for one that failed to send, which the room's unsent message warning covers.
 */
export function getLastMessageState(
    room: Room,
    event: MatrixEvent | undefined,
    userId: string,
): RoomListItemLastMessageState | undefined {
    if (!event || event.getSender() !== userId) return undefined;

    switch (event.status) {
        case null:
        case EventStatus.SENT:
            break;
        case EventStatus.NOT_SENT:
        case EventStatus.CANCELLED:
            return undefined;
        default:
            return "sending";
    }

    const readByOthers = room.getUsersReadUpTo(event).some((reader) => reader !== userId);
    return readByOthers ? "read" : "sent";
}
