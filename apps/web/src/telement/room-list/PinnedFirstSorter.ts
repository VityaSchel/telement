/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import type { Room } from "matrix-js-sdk/src/matrix";
import type { Sorter, SortingAlgorithm } from "../../stores/room-list-v3/skip-list/sorters";
import { isPinnedRoom } from "./isPinnedRoom";

/**
 * Sorts pinned rooms above all other rooms. Both groups keep the order of the given sorter.
 */
export class PinnedFirstSorter implements Sorter {
    /**
     * @param sorter The sorter that orders the pinned rooms among themselves, and the other rooms among themselves.
     */
    public constructor(private readonly sorter: Sorter) {}

    public sort(rooms: Room[]): Room[] {
        const pinnedRooms: Room[] = [];
        const otherRooms: Room[] = [];
        for (const room of rooms) {
            if (isPinnedRoom(room)) pinnedRooms.push(room);
            else otherRooms.push(room);
        }
        return [...this.sorter.sort(pinnedRooms), ...this.sorter.sort(otherRooms)];
    }

    public comparator(roomA: Room, roomB: Room): number {
        const pinnedOrder = Number(isPinnedRoom(roomB)) - Number(isPinnedRoom(roomA));
        return pinnedOrder || this.sorter.comparator(roomA, roomB);
    }

    public get type(): SortingAlgorithm {
        return this.sorter.type;
    }
}
