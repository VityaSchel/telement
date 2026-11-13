/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import type { Room } from "matrix-js-sdk/src/matrix";
import { DefaultTagID } from "../../stores/room-list-v3/skip-list/tag";

/**
 * Whether the user has pinned the room. A pinned room is a room with Matrix's favourite tag.
 */
export function isPinnedRoom(room: Room): boolean {
    return Boolean(room.tags[DefaultTagID.Favourite]);
}
