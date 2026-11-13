/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkMessage, stubClient } from "test-utils";

import type { Room } from "matrix-js-sdk/src/matrix";
import type { RoomNotificationState } from "../../stores/notifications/RoomNotificationState";
import { PinnedFirstSorter } from "./PinnedFirstSorter";
import { isPinnedRoom } from "./isPinnedRoom";
import { RecencySorter } from "../../stores/room-list-v3/skip-list/sorters/RecencySorter";
import { AlphabeticSorter } from "../../stores/room-list-v3/skip-list/sorters/AlphabeticSorter";
import { SortingAlgorithm } from "../../stores/room-list-v3/skip-list/sorters";
import { RoomSkipList } from "../../stores/room-list-v3/skip-list/RoomSkipList";
import { getMockedRooms } from "../../stores/room-list-v3/skip-list/__mocks__";
import { DefaultTagID } from "../../stores/room-list-v3/skip-list/tag";
import { RoomNotificationStateStore } from "../../stores/notifications/RoomNotificationStateStore";
import { SDKContextClass } from "../../contexts/SDKContextClass";
import { MetaSpace } from "../../stores/spaces";

describe("PinnedFirstSorter", () => {
    let rooms: Room[];
    let mutedRooms: Room[];

    function pin(...indices: number[]): void {
        for (const i of indices) rooms[i].tags = { [DefaultTagID.Favourite]: { order: 0.5 } };
    }

    function unpin(...indices: number[]): void {
        for (const i of indices) rooms[i].tags = {};
    }

    function sendMessage(room: Room, ts: number): void {
        const event = mkMessage({ room: room.roomId, user: "@foo:matrix.org", ts, event: true });
        vi.spyOn(room.getLiveTimeline(), "getEvents").mockReturnValue([event]);
    }

    beforeEach(() => {
        rooms = getMockedRooms(stubClient(), 20);
        mutedRooms = [];
        vi.spyOn(RoomNotificationStateStore.instance, "getRoomState").mockImplementation(
            (room) => ({ muted: mutedRooms.includes(room) }) as unknown as RoomNotificationState,
        );
        vi.spyOn(SDKContextClass.instance.spaceStore, "activeSpace", "get").mockReturnValue(MetaSpace.Home);
        vi.spyOn(SDKContextClass.instance.spaceStore, "isRoomInSpace").mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("puts pinned rooms first, each group in recency order", () => {
        pin(3, 15, 7);
        const sorter = new PinnedFirstSorter(new RecencySorter("@me:matrix.org"));

        const sortedIds = sorter.sort(rooms).map((room) => room.roomId);

        // The mocked rooms are more recent the higher their index
        const otherIds = rooms
            .filter((_room, i) => ![3, 7, 15].includes(i))
            .reverse()
            .map((room) => room.roomId);
        expect(sortedIds).toEqual([rooms[15].roomId, rooms[7].roomId, rooms[3].roomId, ...otherIds]);
    });

    it("puts pinned rooms first in alphabetic order too", () => {
        pin(12, 2);
        const sorter = new PinnedFirstSorter(new AlphabeticSorter());

        const sorted = sorter.sort(rooms);

        // "Foo Room 12" sorts before "Foo Room 2"
        expect(sorted.slice(0, 2)).toEqual([rooms[12], rooms[2]]);
        expect(sorted.slice(2)).toEqual(new AlphabeticSorter().sort(rooms.filter((room) => !isPinnedRoom(room))));
    });

    it("sorts a muted pinned room below the other pinned rooms but above the unpinned rooms", () => {
        pin(4, 9);
        mutedRooms = [rooms[9]];
        const sorter = new PinnedFirstSorter(new RecencySorter("@me:matrix.org"));

        const sorted = sorter.sort(rooms);

        expect(sorted.slice(0, 3)).toEqual([rooms[4], rooms[9], rooms[19]]);
    });

    it("has a comparator that agrees with sort", () => {
        pin(1, 10, 18);
        mutedRooms = [rooms[10], rooms[5]];
        const sorter = new PinnedFirstSorter(new RecencySorter("@me:matrix.org"));

        expect([...rooms].sort((a, b) => sorter.comparator(a, b))).toEqual(sorter.sort(rooms));
    });

    it("reports the sorting algorithm of the sorter it wraps", () => {
        expect(new PinnedFirstSorter(new AlphabeticSorter()).type).toBe(SortingAlgorithm.Alphabetic);
        expect(new PinnedFirstSorter(new RecencySorter("@me:matrix.org")).type).toBe(SortingAlgorithm.Recency);
    });

    it("keeps a room skip list in order as rooms are pinned, unpinned and get new messages", () => {
        const sorter = new PinnedFirstSorter(new RecencySorter("@me:matrix.org"));
        const skipList = new RoomSkipList(sorter);
        pin(0, 6);
        skipList.seed(rooms);
        expect([...skipList]).toEqual(sorter.sort(rooms));

        pin(19, 2);
        skipList.reInsertRoom(rooms[19]);
        skipList.reInsertRoom(rooms[2]);
        expect([...skipList].slice(0, 4)).toEqual([rooms[19], rooms[6], rooms[2], rooms[0]]);

        sendMessage(rooms[11], 1000);
        skipList.reInsertRoom(rooms[11]);
        expect([...skipList][4]).toBe(rooms[11]);

        sendMessage(rooms[0], 1001);
        skipList.reInsertRoom(rooms[0]);
        expect([...skipList][0]).toBe(rooms[0]);

        unpin(0);
        skipList.reInsertRoom(rooms[0]);
        expect([...skipList].slice(0, 4)).toEqual([rooms[19], rooms[6], rooms[2], rooms[0]]);

        expect([...skipList]).toEqual(sorter.sort(rooms));
    });
});
