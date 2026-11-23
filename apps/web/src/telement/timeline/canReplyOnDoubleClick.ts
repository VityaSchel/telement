/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type MatrixEvent } from "matrix-js-sdk/src/matrix";

import { TimelineRenderingType } from "../../contexts/RoomContext";
import { isContentActionable } from "../../utils/EventUtils";

/** What {@link canReplyOnDoubleClick} looks at. */
export interface ReplyOnDoubleClickInput {
    /** The message double-clicked. */
    mxEvent: MatrixEvent;
    /** The timeline it is in. */
    timelineRenderingType: TimelineRenderingType;
    /** Whether the user may send messages in its room. */
    canSendMessages: boolean;
    /** Whether the message is being edited. */
    isEditing: boolean;
}

/**
 * Whether double-clicking the message starts a reply to it: in the room's and a thread's timeline, where the
 * composer is, for a message the message menu offers to reply to.
 */
export function canReplyOnDoubleClick({
    mxEvent,
    timelineRenderingType,
    canSendMessages,
    isEditing,
}: ReplyOnDoubleClickInput): boolean {
    if (
        timelineRenderingType !== TimelineRenderingType.Room &&
        timelineRenderingType !== TimelineRenderingType.Thread
    ) {
        return false;
    }
    return canSendMessages && !isEditing && isContentActionable(mxEvent);
}
