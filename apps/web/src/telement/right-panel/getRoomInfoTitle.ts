/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type Room } from "matrix-js-sdk/src/matrix";

import { _t } from "../../languageHandler";

/**
 * The name of a room's info pane, which titles the pane and the room header's buttons that open it: "Space info" for a
 * space, "Room info" for any other room.
 * @param room - The room the pane is about.
 */
export function getRoomInfoTitle(room: Room): string {
    return room.isSpaceRoom() ? _t("telement|right_panel|space_info") : _t("right_panel|room_summary_card|title");
}
