/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { EventStatus, EventType, type MatrixEvent, MsgType } from "matrix-js-sdk/src/matrix";
import { describe, expect, it } from "vitest";
import { mkEvent } from "test-utils";

import { TimelineRenderingType } from "../../../../contexts/RoomContext";
import { getEventTileMessageStatus, type EventTileMessageStatusInput } from "./EventTileMessageStatus";

const ownUserId = "@alice:example.org";

function makeEvent({ type = EventType.RoomMessage, user = ownUserId } = {}): MatrixEvent {
    return mkEvent({
        event: true,
        type,
        room: "!room:example.org",
        user,
        content: { msgtype: MsgType.Text, body: "Hello" },
    });
}

function status(overrides: Partial<EventTileMessageStatusInput> = {}): ReturnType<typeof getEventTileMessageStatus> {
    return getEventTileMessageStatus({
        mxEvent: makeEvent(),
        ownUserId,
        hasRoom: true,
        readerCount: 0,
        timelineRenderingType: TimelineRenderingType.Room,
        ...overrides,
    });
}

describe("getEventTileMessageStatus", () => {
    it("shows one check on every sent message of your own, not only the last", () => {
        expect(status()).toBe("sent");
        expect(status({ eventSendStatus: EventStatus.SENT })).toBe("sent");
    });

    it("shows two checks once anyone else has read up to the message", () => {
        expect(status({ readerCount: 1 })).toBe("read");
    });

    it.each([EventStatus.ENCRYPTING, EventStatus.QUEUED, EventStatus.SENDING])(
        "shows the clock while the message is %s",
        (eventSendStatus) => {
            expect(status({ eventSendStatus, readerCount: 1 })).toBe("sending");
        },
    );

    it("marks a message that failed to send", () => {
        expect(status({ eventSendStatus: EventStatus.NOT_SENT })).toBe("failed");
    });

    it("shows nothing for a cancelled message", () => {
        expect(status({ eventSendStatus: EventStatus.CANCELLED })).toBeUndefined();
    });

    it("shows nothing on other people's messages, which have no receipts in bubbles", () => {
        expect(status({ mxEvent: makeEvent({ user: "@bob:example.org" }), readerCount: 1 })).toBeUndefined();
    });

    it("shows nothing on your own state events, which are informational rows", () => {
        expect(status({ mxEvent: makeEvent({ type: EventType.RoomTopic }) })).toBeUndefined();
    });

    it("shows nothing on a removed message", () => {
        const mxEvent = makeEvent();
        mxEvent.makeRedacted(makeEvent({ type: EventType.RoomRedaction }), { name: "" } as never);

        expect(status({ mxEvent })).toBeUndefined();
    });

    it("shows nothing without the room", () => {
        expect(status({ hasRoom: false })).toBeUndefined();
    });

    it.each([TimelineRenderingType.Thread])("shows the status in the %s timeline", (timelineRenderingType) => {
        expect(status({ timelineRenderingType })).toBe("sent");
    });

    it.each([
        TimelineRenderingType.Search,
        TimelineRenderingType.ThreadsList,
        TimelineRenderingType.Notification,
        TimelineRenderingType.File,
        TimelineRenderingType.Pinned,
    ])("shows nothing in the %s list", (timelineRenderingType) => {
        expect(status({ timelineRenderingType })).toBeUndefined();
    });
});
