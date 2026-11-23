/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import {
    BaseViewModel,
    type UnreadMentionsButtonViewModel as UnreadMentionsButtonViewModelInterface,
    type UnreadMentionsButtonViewSnapshot,
} from "@element-hq/web-shared-components";
import { type MatrixEvent, MatrixEventEvent, type Room, RoomEvent } from "matrix-js-sdk/src/matrix";

import dispatcher from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import { type ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { findUnreadMentions } from "../../../telement/room/findUnreadMentions";

export interface UnreadMentionsButtonViewModelProps {
    /** The room whose timeline the button is over. */
    room: Room;
}

/**
 * View model of the timeline's unread mentions button, as Telegram's: it counts the messages that mention the user and
 * that they haven't read, and each press jumps the timeline to the next of them, oldest first, starting over after the
 * newest. A mention stops counting once it is read, so the button goes once the room is read, as Escape marks it.
 */
export class UnreadMentionsButtonViewModel
    extends BaseViewModel<UnreadMentionsButtonViewSnapshot, UnreadMentionsButtonViewModelProps>
    implements UnreadMentionsButtonViewModelInterface
{
    private mentions: MatrixEvent[] = [];
    private lastJumpedTo?: string;

    public constructor(props: UnreadMentionsButtonViewModelProps) {
        super(props, { count: 0 });
        const { room } = props;
        // New messages, read receipts and redactions change which mentions are unread, and a message only shows
        // whether it mentions the user once it is decrypted
        for (const event of [RoomEvent.Timeline, RoomEvent.TimelineReset, RoomEvent.Receipt, RoomEvent.Redaction]) {
            this.disposables.trackListener(room, event, this.update);
        }
        this.disposables.trackListener(room.client, MatrixEventEvent.Decrypted, this.onDecrypted);
        this.update();
    }

    private readonly update = (): void => {
        this.mentions = findUnreadMentions(this.props.room);
        this.snapshot.merge({ count: this.mentions.length });
    };

    private readonly onDecrypted = (...args: unknown[]): void => {
        const event = args[0] as MatrixEvent;
        if (event.getRoomId() === this.props.room.roomId) this.update();
    };

    /** Jumps to the unread mention after the one it jumped to last, or to the oldest. */
    public onClick = (): void => {
        const last = this.mentions.findIndex((event) => event.getId() === this.lastJumpedTo);
        const next = this.mentions[last + 1] ?? this.mentions[0];
        if (!next) return;

        this.lastJumpedTo = next.getId();
        dispatcher.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: this.props.room.roomId,
            event_id: next.getId(),
            highlighted: true,
            scroll_into_view: true,
        });
    };
}
