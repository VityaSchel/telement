/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { SyncState } from "matrix-js-sdk/src/matrix";
import { type RoomListSyncStatus } from "@element-hq/web-shared-components";

/**
 * What the room list header says in place of its title for a sync state, as Telegram's chat list does: "Updating…"
 * while the client catches up with the server, and "Waiting for network…" while it can't reach it.
 *
 * - Prepared: the rooms come from the last session's cache and no sync with the server has finished yet (Element
 *   showed a spinner under the timeline until then).
 * - Reconnecting: a sync failed and the client is checking whether the server is reachable.
 * - Catchup: the server is reachable again after an error, and the client is catching up.
 * - Error: syncs keep failing, or the server can't be reached.
 *
 * @param syncState - The client's sync state
 * @returns The status to show, or undefined once the room list is up to date
 */
export function getRoomListSyncStatus(syncState: SyncState | null): RoomListSyncStatus | undefined {
    switch (syncState) {
        case SyncState.Prepared:
        case SyncState.Reconnecting:
        case SyncState.Catchup:
            return "updating";
        case SyncState.Error:
            return "waiting_for_network";
        default:
            return undefined;
    }
}
