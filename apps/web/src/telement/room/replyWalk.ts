/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type MatrixEvent } from "matrix-js-sdk/src/matrix";

import { type TimelineRenderingType } from "../../contexts/RoomContext";
import { type ActionPayload } from "../../dispatcher/payloads";
import { isContentActionable } from "../../utils/EventUtils";

/**
 * Asks the room to make the message before or after the one being replied to the reply's target, as Telegram Desktop's
 * Ctrl+Up and Ctrl+Down do in the message field. The composer asks only while it is empty or the keys are already
 * choosing, as with text in it they move the caret.
 */
export const WALK_REPLY_TARGET = "telement_walk_reply_target";

/** The payload of {@link WALK_REPLY_TARGET}. */
export interface WalkReplyTargetPayload extends ActionPayload {
    action: typeof WALK_REPLY_TARGET;
    /** Towards older messages, or newer ones. */
    direction: "previous" | "next";
    /** The timeline whose composer the keys were pressed in. */
    timelineRenderingType: TimelineRenderingType;
}

/**
 * Finds the message to reply to next among the timeline's messages, oldest first, which only takes those one can reply
 * to. Going back starts from the newest message when nothing is replied to yet; going forward past the newest stops
 * replying, which is `null`. `undefined` means there's nothing to do.
 *
 * @param events - The timeline's events, oldest first.
 * @param currentEventId - The message replied to now, if any.
 */
export function findReplyTarget(
    events: MatrixEvent[],
    currentEventId: string | undefined,
    direction: WalkReplyTargetPayload["direction"],
): MatrixEvent | null | undefined {
    const messages = events.filter(isContentActionable);
    const current = messages.findIndex((event) => event.getId() === currentEventId);
    if (direction === "previous") {
        return current === -1 ? messages.at(-1) : messages[current - 1];
    }
    if (current === -1) return undefined;
    return messages[current + 1] ?? null;
}

/**
 * The message the composer's keys chose to reply to, until the reply is sent, cancelled or given another target.
 *
 * @param replyToEvent - The message the composer replies to now, if any.
 * @param keyboardReplyEventId - The message the composer's keys chose last, if any.
 */
export function replyWalkEventId({
    replyToEvent,
    keyboardReplyEventId,
}: {
    replyToEvent?: MatrixEvent;
    keyboardReplyEventId?: string;
}): string | undefined {
    return keyboardReplyEventId === replyToEvent?.getId() ? keyboardReplyEventId : undefined;
}
