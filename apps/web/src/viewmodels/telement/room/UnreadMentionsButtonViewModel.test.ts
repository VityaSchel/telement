/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type MatrixEvent, MatrixEventEvent, type Room, RoomEvent, TypedEventEmitter } from "matrix-js-sdk/src/matrix";

import dispatcher from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import { findUnreadMentions } from "../../../telement/room/findUnreadMentions";
import { UnreadMentionsButtonViewModel } from "./UnreadMentionsButtonViewModel";

vi.mock("../../../telement/room/findUnreadMentions", () => ({ findUnreadMentions: vi.fn() }));

describe("UnreadMentionsButtonViewModel", () => {
    const roomId = "!room:server.org";
    const event = (eventId: string, inRoom = roomId): MatrixEvent =>
        ({ getId: () => eventId, getRoomId: () => inRoom }) as MatrixEvent;
    let client: TypedEventEmitter<string, Record<string, (...args: unknown[]) => void>>;
    let room: typeof client & Room;
    let vm: UnreadMentionsButtonViewModel;

    beforeEach(() => {
        client = new TypedEventEmitter();
        room = Object.assign(new TypedEventEmitter(), { roomId, client }) as unknown as typeof client & Room;
        vi.mocked(findUnreadMentions).mockReturnValue([event("$first"), event("$second"), event("$third")]);
        vi.spyOn(dispatcher, "dispatch").mockImplementation(() => {});
        vm = new UnreadMentionsButtonViewModel({ room });
    });

    afterEach(() => {
        vm.dispose();
        vi.restoreAllMocks();
    });

    const jumpedTo = (): string[] => vi.mocked(dispatcher.dispatch).mock.calls.map(([payload]) => payload.event_id);

    it("counts the room's unread mentions", () => {
        expect(vm.getSnapshot().count).toBe(3);
    });

    it.each([RoomEvent.Timeline, RoomEvent.TimelineReset, RoomEvent.Receipt, RoomEvent.Redaction])(
        "counts them again on %s",
        (roomEvent) => {
            vi.mocked(findUnreadMentions).mockReturnValue([event("$third")]);
            room.emit(roomEvent);

            expect(vm.getSnapshot().count).toBe(1);
        },
    );

    it("counts them again when a message of the room is decrypted, and only then", () => {
        vi.mocked(findUnreadMentions).mockReturnValue([]);
        client.emit(MatrixEventEvent.Decrypted, event("$elsewhere", "!other:server.org"));

        expect(vm.getSnapshot().count).toBe(3);

        client.emit(MatrixEventEvent.Decrypted, event("$here"));

        expect(vm.getSnapshot().count).toBe(0);
    });

    it("jumps to them oldest first, highlighting each, and starts over after the newest", () => {
        vm.onClick();
        vm.onClick();
        vm.onClick();
        vm.onClick();

        expect(jumpedTo()).toEqual(["$first", "$second", "$third", "$first"]);
        expect(dispatcher.dispatch).toHaveBeenCalledWith({
            action: Action.ViewRoom,
            room_id: roomId,
            event_id: "$first",
            highlighted: true,
            scroll_into_view: true,
        });
    });

    it("goes on from the oldest still unread once the one it jumped to is read", () => {
        vm.onClick();
        vm.onClick();
        vi.mocked(findUnreadMentions).mockReturnValue([event("$third")]);
        room.emit(RoomEvent.Receipt);
        vm.onClick();

        expect(jumpedTo()).toEqual(["$first", "$second", "$third"]);
    });

    it("does nothing without unread mentions", () => {
        vi.mocked(findUnreadMentions).mockReturnValue([]);
        room.emit(RoomEvent.Receipt);
        vm.onClick();

        expect(dispatcher.dispatch).not.toHaveBeenCalled();
    });

    it("stops listening when disposed", () => {
        vm.dispose();

        expect(room.listenerCount(RoomEvent.Timeline)).toBe(0);
        expect(client.listenerCount(MatrixEventEvent.Decrypted)).toBe(0);
    });
});
