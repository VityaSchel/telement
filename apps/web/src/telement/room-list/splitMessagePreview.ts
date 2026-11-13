/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { EventType, M_POLL_START, type MatrixEvent, MsgType, RelationType } from "matrix-js-sdk/src/matrix";

import { _t } from "../../languageHandler";
import { type MessagePreview, MessagePreviewStore } from "../../stores/message-preview";
import { getSenderName, isSelf, shouldPrefixMessagesIn } from "../../stores/message-preview/previews/utils";
import { type TagID } from "../../stores/room-list-v3/skip-list/tag";

/** A room's message preview, with the sender apart so the room list can show the name in its own color. */
export interface MessagePreviewParts {
    /** The preview's text */
    text: string;
    /** Who sent the message, when the room list shows it before the text: their name, or "You" */
    sender?: string;
}

/** The previews that Element prefixes with the sender's name: stickers, polls and messages other than emotes. */
function hasSenderPrefix(event: MatrixEvent): boolean {
    switch (event.getType()) {
        case EventType.RoomMessage: {
            const content = event.isRelation(RelationType.Replace)
                ? event.getContent()["m.new_content"]
                : event.getContent();
            return content?.msgtype !== MsgType.Emote;
        }
        case EventType.Sticker:
        case M_POLL_START.name:
        case M_POLL_START.altName:
            return true;
        default:
            return false;
    }
}

/**
 * Splits a room's message preview into its text and its sender, as Telegram shows them: "Sender:" before messages in
 * group rooms, "You:" before the user's own, nothing in a one-to-one chat. Emotes, calls and reactions keep Element's
 * whole sentence, which already names who did them.
 * @param preview - the preview from the message preview store
 * @param tagId - the tag the preview was asked for, which tells a one-to-one chat apart
 */
export function splitMessagePreview(preview: MessagePreview, tagId: TagID): MessagePreviewParts {
    const { event } = preview;
    if (!hasSenderPrefix(event)) return { text: preview.text };

    // The store's text carries the prefix, also in one-to-one chats; this one never does
    const text = MessagePreviewStore.instance.generatePreviewForEvent(event);
    const roomId = event.getRoomId();
    if (!roomId || !shouldPrefixMessagesIn(roomId, tagId)) return { text };
    return { text, sender: isSelf(event) ? _t("telement|room_list|you") : getSenderName(event) };
}
