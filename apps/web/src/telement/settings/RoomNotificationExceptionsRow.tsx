/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useCallback, useState } from "react";
import { ClientEvent, type MatrixClient, type Room, RoomEvent } from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";
import { ActionRowView } from "@element-hq/web-shared-components";

import { MatrixClientPeg } from "../../MatrixClientPeg";
import { useEventEmitter } from "../../hooks/useEventEmitter";
import { getRoomNotifsState, RoomNotifState } from "../../RoomNotifs";
import { _t } from "../../languageHandler";
import Modal from "../../Modal";
import { SettingsSubsection } from "../../components/views/settings/shared/SettingsSubsection";
import { RoomNotificationExceptionsDialog } from "./RoomNotificationExceptionsDialog";

/** The joined rooms whose notification level isn't the default, by name. */
export function getNotificationExceptionRooms(client: MatrixClient): Room[] {
    const collator = new Intl.Collator();
    return client
        .getRooms()
        .filter((room) => room.getMyMembership() === KnownMembership.Join && !room.isSpaceRoom())
        .filter((room) => {
            const level = getRoomNotifsState(client, room.roomId);
            return level !== null && level !== RoomNotifState.AllMessages;
        })
        .sort((a, b) => collator.compare(a.name, b.name));
}

/**
 * The rooms with a notification level of their own, kept up to date as push rules change and rooms are joined and
 * left.
 */
function useNotificationExceptionRooms(client: MatrixClient): Room[] {
    const [rooms, setRooms] = useState(() => getNotificationExceptionRooms(client));
    const update = useCallback(() => setRooms(getNotificationExceptionRooms(client)), [client]);
    useEventEmitter(client, ClientEvent.AccountData, update);
    useEventEmitter(client, RoomEvent.MyMembership, update);
    return rooms;
}

/**
 * Telegram's notification exceptions row in the Notifications tab: "Rooms with their own setting" with how many there
 * are and a chevron, alone on a card, opening the list of them (RoomNotificationExceptionsDialog). It shows only
 * while some room has a level of its own.
 */
export function RoomNotificationExceptionsRow(): JSX.Element | null {
    // As the Notifications tab gets it: settings dialogs open outside the client's context
    const rooms = useNotificationExceptionRooms(MatrixClientPeg.safeGet());
    if (rooms.length === 0) return null;

    return (
        <SettingsSubsection>
            <ActionRowView
                kind="default"
                value={String(rooms.length)}
                navigation
                onClick={() => Modal.createDialog(RoomNotificationExceptionsDialog, { rooms })}
            >
                {_t("telement|settings|notification_exceptions")}
            </ActionRowView>
        </SettingsSubsection>
    );
}
