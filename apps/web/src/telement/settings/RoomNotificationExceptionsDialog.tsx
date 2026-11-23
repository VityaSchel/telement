/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { type Room } from "matrix-js-sdk/src/matrix";
import { ValueRowList } from "@element-hq/web-shared-components";

import BaseDialog from "../../components/views/dialogs/BaseDialog";
import { _t } from "../../languageHandler";
import { RoomNotifState } from "../../RoomNotifs";
import { useNotificationState } from "../../hooks/useRoomNotificationState";
import { avatarUrlForRoom } from "../../Avatar";
import { SettingsValueRow } from "./SettingsValueRow";

/** The levels a room's notifications can be set to, as its settings and the room list's menu offer them. */
function notificationLevels(): { key: RoomNotifState; label: string }[] {
    return [
        { key: RoomNotifState.AllMessages, label: _t("notifications|default") },
        { key: RoomNotifState.AllMessagesLoud, label: _t("notifications|all_messages") },
        { key: RoomNotifState.MentionsOnly, label: _t("notifications|mentions_keywords") },
        { key: RoomNotifState.Mute, label: _t("common|mute") },
    ];
}

/** A room with its notification level as a value row, changed in place as in the room's settings. */
function RoomNotificationExceptionRow({ room }: Readonly<{ room: Room }>): JSX.Element {
    const [level, setLevel] = useNotificationState(room);
    return (
        <SettingsValueRow
            label={room.name}
            avatar={{ id: room.roomId, name: room.name, src: avatarUrlForRoom(room, 36, 36, "crop") ?? undefined }}
            options={notificationLevels()}
            selectedKey={level}
            onSelect={(key) => setLevel(key as RoomNotifState)}
        />
    );
}

interface RoomNotificationExceptionsDialogProps {
    /** The rooms whose notification level isn't the default, which stay listed while the dialog is open. */
    rooms: Room[];
    onFinished(): void;
}

/**
 * Telegram's notification exceptions: the rooms with a notification level of their own (muted, mentions only, all
 * messages), each with its level as a value at the end, so that a muted room can be found again. A room set back to
 * the default stays in the list until the dialog closes, so that the list doesn't move under the pointer.
 */
export function RoomNotificationExceptionsDialog({
    rooms,
    onFinished,
}: Readonly<RoomNotificationExceptionsDialogProps>): JSX.Element {
    return (
        <BaseDialog
            className="mx_RoomNotificationExceptionsDialog"
            title={_t("telement|settings|notification_exceptions")}
            onFinished={onFinished}
        >
            <ValueRowList>
                {rooms.map((room) => (
                    <RoomNotificationExceptionRow key={room.roomId} room={room} />
                ))}
            </ValueRowList>
        </BaseDialog>
    );
}
