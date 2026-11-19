/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { EventStatus, type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { type MessageStatus } from "@element-hq/web-shared-components";

import { TimelineRenderingType } from "../../../../contexts/RoomContext";
import { isEligibleForSpecialReceipt } from "./EventTileReceiptState";

/** Inputs for {@link getEventTileMessageStatus}. */
export interface EventTileMessageStatusInput {
    /** The Matrix event rendered by the tile. */
    mxEvent: MatrixEvent;
    /** The current user's ID. */
    ownUserId: string;
    /** Whether the event's room is known locally. */
    hasRoom: boolean;
    /** The send status of the event, or of its edit or removal while that is pending. */
    eventSendStatus?: EventStatus | null;
    /** How many people other than the user have read up to the event or past it. */
    readerCount: number;
    /** The timeline the tile is in. */
    timelineRenderingType: TimelineRenderingType;
}

/**
 * The status Telegram's checks show after the time of the user's own message in the room's and a thread's timeline: a
 * clock while it, or its edit or removal, is being sent, one check once it is sent and two once anyone else has read
 * up to it, the room list's rule. A message that failed to send has an error mark. Undefined for everything else:
 * other people's messages, state events, removed messages, and lists of messages such as search results.
 */
export function getEventTileMessageStatus({
    mxEvent,
    ownUserId,
    hasRoom,
    eventSendStatus,
    readerCount,
    timelineRenderingType,
}: EventTileMessageStatusInput): MessageStatus | undefined {
    if (
        timelineRenderingType !== TimelineRenderingType.Room &&
        timelineRenderingType !== TimelineRenderingType.Thread
    ) {
        return undefined;
    }
    if (!hasRoom || mxEvent.getSender() !== ownUserId || mxEvent.isRedacted()) return undefined;
    if (!isEligibleForSpecialReceipt(mxEvent)) return undefined;

    switch (eventSendStatus) {
        case undefined:
        case null:
        case EventStatus.SENT:
            return readerCount > 0 ? "read" : "sent";
        case EventStatus.NOT_SENT:
            return "failed";
        case EventStatus.CANCELLED:
            return undefined;
        default:
            return "sending";
    }
}
