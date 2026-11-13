/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { Room } from "matrix-js-sdk/src/matrix";
import { getMockClientWithEventEmitter } from "test-utils";

import RoomListActions from "../../actions/RoomListActions";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { DefaultTagID, type TagID } from "../../stores/room-list-v3/skip-list/tag";
import { tagRoom } from "./tagRoom";

describe("tagRoom()", () => {
    const userId = "@alice:server.org";
    const roomId = "!room:server.org";

    const makeRoom = (tags: TagID[] = []): Room => {
        const client = getMockClientWithEventEmitter({
            isGuest: vi.fn(),
        });
        const room = new Room(roomId, client, userId);
        room.tags = Object.fromEntries(tags.map((tag) => [tag, {}]));

        return room;
    };

    beforeEach(() => {
        // stub
        vi.spyOn(defaultDispatcher, "dispatch").mockImplementation(() => {});
        vi.spyOn(RoomListActions, "tagRoom").mockReturnValue({ action: "mocked_tag_room_action", fn: () => {} });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it.each([DefaultTagID.ServerNotice, DefaultTagID.Invite, "u.custom"])("does nothing when applying %s", (tag) => {
        const room = makeRoom();

        tagRoom(room, tag);

        expect(defaultDispatcher.dispatch).not.toHaveBeenCalled();
        expect(RoomListActions.tagRoom).not.toHaveBeenCalled();
    });

    describe("when a room has no favourite or low priority tag", () => {
        it.each([DefaultTagID.Favourite, DefaultTagID.LowPriority])("should tag the room with %s", (tag) => {
            const room = makeRoom();

            tagRoom(room, tag);

            expect(defaultDispatcher.dispatch).toHaveBeenCalled();
            expect(RoomListActions.tagRoom).toHaveBeenCalledWith(
                room.client,
                room,
                null, // remove
                tag, // add
            );
        });

        it("should leave the other tags of the room alone", () => {
            const room = makeRoom(["u.custom"]);

            tagRoom(room, DefaultTagID.Favourite);

            expect(RoomListActions.tagRoom).toHaveBeenCalledWith(
                room.client,
                room,
                null, // remove
                DefaultTagID.Favourite, // add
            );
        });
    });

    describe("when a room is tagged as favourite", () => {
        it("should unfavourite a room", () => {
            const room = makeRoom([DefaultTagID.Favourite]);

            tagRoom(room, DefaultTagID.Favourite);

            expect(defaultDispatcher.dispatch).toHaveBeenCalled();
            expect(RoomListActions.tagRoom).toHaveBeenCalledWith(
                room.client,
                room,
                DefaultTagID.Favourite, // remove
                null, // add
            );
        });

        it("should tag a room low priority", () => {
            const room = makeRoom([DefaultTagID.Favourite]);

            tagRoom(room, DefaultTagID.LowPriority);

            expect(defaultDispatcher.dispatch).toHaveBeenCalled();
            expect(RoomListActions.tagRoom).toHaveBeenCalledWith(
                room.client,
                room,
                DefaultTagID.Favourite, // remove
                DefaultTagID.LowPriority, // add
            );
        });
    });

    describe("when a room is tagged as low priority", () => {
        it("should favourite a room", () => {
            const room = makeRoom([DefaultTagID.LowPriority]);

            tagRoom(room, DefaultTagID.Favourite);

            expect(defaultDispatcher.dispatch).toHaveBeenCalled();
            expect(RoomListActions.tagRoom).toHaveBeenCalledWith(
                room.client,
                room,
                DefaultTagID.LowPriority, // remove
                DefaultTagID.Favourite, // add
            );
        });

        it("should untag a room low priority", () => {
            const room = makeRoom([DefaultTagID.LowPriority]);

            tagRoom(room, DefaultTagID.LowPriority);

            expect(defaultDispatcher.dispatch).toHaveBeenCalled();
            expect(RoomListActions.tagRoom).toHaveBeenCalledWith(
                room.client,
                room,
                DefaultTagID.LowPriority, // remove
                null, // add
            );
        });
    });
});
