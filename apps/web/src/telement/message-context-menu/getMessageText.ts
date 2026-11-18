/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { EventType, type MatrixEvent, MsgType } from "matrix-js-sdk/src/matrix";

import { stripPlainReply } from "../../utils/Reply";

const TEXT_MESSAGE_TYPES = new Set<string>([MsgType.Text, MsgType.Notice, MsgType.Emote]);
const FILE_MESSAGE_TYPES = new Set<string>([MsgType.Image, MsgType.Video, MsgType.Audio, MsgType.File]);

/**
 * The plain text of a message, or of a file's caption, which the message menu's "Copy text" copies. Undefined for other
 * events and for a file without a caption, whose body is only its name.
 */
export function getMessageText(mxEvent: MatrixEvent): string | undefined {
    if (mxEvent.isRedacted() || mxEvent.getType() !== EventType.RoomMessage) return undefined;

    const { msgtype, body, filename } = mxEvent.getContent();
    if (typeof msgtype !== "string" || typeof body !== "string") return undefined;
    const isCaption = FILE_MESSAGE_TYPES.has(msgtype) && typeof filename === "string" && filename !== body;
    if (!TEXT_MESSAGE_TYPES.has(msgtype) && !isCaption) return undefined;

    // Older clients quote the message replied to at the start of a reply's body, but never in an edit's text, which the
    // message then shows whole (TextualBodyFactory)
    const text = mxEvent.replyEventId && !mxEvent.replacingEvent() ? stripPlainReply(body) : body;
    return text.trim() ? text : undefined;
}
