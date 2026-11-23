/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { EventType, MatrixEvent, MsgType } from "matrix-js-sdk/src/matrix";

import { findReplyTarget, replyWalkEventId } from "./replyWalk";

const message = (eventId: string): MatrixEvent =>
    new MatrixEvent({
        type: EventType.RoomMessage,
        event_id: eventId,
        room_id: "!room:server",
        sender: "@alice:server",
        content: { msgtype: MsgType.Text, body: eventId },
    });

describe("findReplyTarget", () => {
    const membership = (eventId: string): MatrixEvent =>
        new MatrixEvent({
            type: EventType.RoomMember,
            event_id: eventId,
            room_id: "!room:server",
            sender: "@bob:server",
            state_key: "@bob:server",
            content: { membership: "join" },
        });
    const events = [message("$first"), membership("$joined"), message("$second"), message("$third")];
    const idOf = (event: MatrixEvent | null | undefined): string | null | undefined =>
        event === null || event === undefined ? event : event.getId();

    it("starts from the newest message when nothing is replied to", () => {
        expect(idOf(findReplyTarget(events, undefined, "previous"))).toBe("$third");
    });

    it("walks back through the messages one can reply to, skipping the others", () => {
        expect(idOf(findReplyTarget(events, "$third", "previous"))).toBe("$second");
        expect(idOf(findReplyTarget(events, "$second", "previous"))).toBe("$first");
    });

    it("stays on the oldest message", () => {
        expect(findReplyTarget(events, "$first", "previous")).toBeUndefined();
    });

    it("walks forward, and stops replying past the newest message", () => {
        expect(idOf(findReplyTarget(events, "$first", "next"))).toBe("$second");
        expect(findReplyTarget(events, "$third", "next")).toBeNull();
    });

    it("does nothing going forward when nothing is replied to", () => {
        expect(findReplyTarget(events, undefined, "next")).toBeUndefined();
    });

    it("starts from the newest message when the one replied to isn't in the timeline", () => {
        expect(idOf(findReplyTarget(events, "$elsewhere", "previous"))).toBe("$third");
    });

    it("finds nothing in a timeline without messages", () => {
        expect(findReplyTarget([membership("$joined")], undefined, "previous")).toBeUndefined();
    });
});

describe("replyWalkEventId", () => {
    it("is the message the keys chose, while it is the one replied to", () => {
        const replyToEvent = message("$chosen");

        expect(replyWalkEventId({ replyToEvent, keyboardReplyEventId: "$chosen" })).toBe("$chosen");
        // Chosen another way since, or the reply sent or cancelled
        expect(replyWalkEventId({ replyToEvent, keyboardReplyEventId: "$earlier" })).toBeUndefined();
        expect(replyWalkEventId({ keyboardReplyEventId: "$chosen" })).toBeUndefined();
        expect(replyWalkEventId({ replyToEvent })).toBeUndefined();
        expect(replyWalkEventId({})).toBeUndefined();
    });
});
