/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it, vi } from "vitest";
import { EventStatus, MatrixEvent, type Room } from "matrix-js-sdk/src/matrix";

import { getLastMessageState } from "./getLastMessageState";

const ME = "@me:example.org";

function message(sender: string, status: EventStatus | null = null): MatrixEvent {
    const event = new MatrixEvent({ type: "m.room.message", sender, event_id: "$message", content: { body: "Hi" } });
    event.setStatus(status);
    return event;
}

function roomReadBy(...readers: string[]): Room {
    return { getUsersReadUpTo: vi.fn().mockReturnValue(readers) } as unknown as Room;
}

describe("getLastMessageState", () => {
    it("shows nothing without a message, or for someone else's", () => {
        const room = roomReadBy(ME, "@alice:example.org");

        expect(getLastMessageState(room, undefined, ME)).toBeUndefined();
        expect(getLastMessageState(room, message("@alice:example.org"), ME)).toBeUndefined();
    });

    it.each([EventStatus.ENCRYPTING, EventStatus.QUEUED, EventStatus.SENDING])(
        "shows a clock while the message is %s",
        (status) => {
            expect(getLastMessageState(roomReadBy(ME), message(ME, status), ME)).toBe("sending");
        },
    );

    it.each([EventStatus.NOT_SENT, EventStatus.CANCELLED])("leaves a %s message to the unsent warning", (status) => {
        expect(getLastMessageState(roomReadBy(ME), message(ME, status), ME)).toBeUndefined();
    });

    it.each([null, EventStatus.SENT])("shows one check for a sent message nobody else has read (%s)", (status) => {
        expect(getLastMessageState(roomReadBy(ME), message(ME, status), ME)).toBe("sent");
    });

    it("shows two checks once any other member has read it", () => {
        const event = message(ME);
        const room = roomReadBy(ME, "@bob:example.org");

        expect(getLastMessageState(room, event, ME)).toBe("read");
        expect(room.getUsersReadUpTo).toHaveBeenCalledWith(event);
    });
});
