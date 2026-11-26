/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type Room } from "matrix-js-sdk/src/matrix";

import defaultDispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import { type ViewRoomPayload } from "../../dispatcher/payloads/ViewRoomPayload";
import RightPanelStore from "../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../../stores/right-panel/RightPanelStorePhases";

/**
 * Opens a space's home with the space's own room info (its topic, settings and Report room) in the right panel beside
 * it, from any room. The space menus' Space info item does this.
 * @param space - The space to show.
 */
export function showSpaceInfo(space: Room): void {
    defaultDispatcher.dispatch<ViewRoomPayload>({
        action: Action.ViewRoom,
        room_id: space.roomId,
    });
    RightPanelStore.instance.setCard({ phase: RightPanelPhases.RoomSummary }, true, space.roomId);
}
