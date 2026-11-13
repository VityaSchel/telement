/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { type Room } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { DefaultTagID, type TagID } from "../../stores/room-list-v3/skip-list/tag";
import RoomListActions from "../../actions/RoomListActions";
import dis from "../../dispatcher/dispatcher";

/**
 * Toggle the favourite or low priority tag of a room. A room can't be both, so applying one
 * atomically replaces the other.
 * @param room The room to tag
 * @param tagId The tag to invert
 */
export function tagRoom(room: Room, tagId: TagID): void {
    if (tagId !== DefaultTagID.Favourite && tagId !== DefaultTagID.LowPriority) {
        logger.warn(`Unexpected tag ${tagId} applied to ${room.roomId}`);
        return;
    }

    // Find the favourite or low priority tag currently applied, at most one exists
    const currentTag = Object.keys(room.tags).find(
        (tag) => tag === DefaultTagID.Favourite || tag === DefaultTagID.LowPriority,
    );

    const removeTag = currentTag ?? null;
    const addTag = currentTag === tagId ? null : tagId;
    dis.dispatch(RoomListActions.tagRoom(room.client, room, removeTag, addTag));
}
