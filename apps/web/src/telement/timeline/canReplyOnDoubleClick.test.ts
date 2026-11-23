/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { EventStatus } from "matrix-js-sdk/src/matrix";
import { mkEvent, mkMessage } from "test-utils";

import { TimelineRenderingType } from "../../contexts/RoomContext";
import { canReplyOnDoubleClick } from "./canReplyOnDoubleClick";

describe("canReplyOnDoubleClick", () => {
    const message = (): ReturnType<typeof mkMessage> =>
        mkMessage({ room: "!room:example.org", user: "@alice:example.org", msg: "Hello", event: true });
    const input = {
        timelineRenderingType: TimelineRenderingType.Room,
        canSendMessages: true,
        isEditing: false,
    };

    it.each([TimelineRenderingType.Room, TimelineRenderingType.Thread])(
        "replies to a message in the %s timeline, where the composer is",
        (timelineRenderingType) => {
            expect(canReplyOnDoubleClick({ ...input, mxEvent: message(), timelineRenderingType })).toBe(true);
        },
    );

    it.each([
        TimelineRenderingType.Search,
        TimelineRenderingType.File,
        TimelineRenderingType.Pinned,
        TimelineRenderingType.ThreadsList,
        TimelineRenderingType.Notification,
    ])("doesn't reply in the %s list, which has no composer", (timelineRenderingType) => {
        expect(canReplyOnDoubleClick({ ...input, mxEvent: message(), timelineRenderingType })).toBe(false);
    });

    it("doesn't reply where the user can't send messages, or to a message being edited", () => {
        expect(canReplyOnDoubleClick({ ...input, mxEvent: message(), canSendMessages: false })).toBe(false);
        expect(canReplyOnDoubleClick({ ...input, mxEvent: message(), isEditing: true })).toBe(false);
    });

    it("doesn't reply to what the message menu offers no Reply for: an unsent message or a state event", () => {
        const unsent = message();
        unsent.setStatus(EventStatus.NOT_SENT);
        const topic = mkEvent({
            type: "m.room.topic",
            room: "!room:example.org",
            user: "@alice:example.org",
            content: { topic: "Plans" },
            skey: "",
            event: true,
        });

        expect(canReplyOnDoubleClick({ ...input, mxEvent: unsent })).toBe(false);
        expect(canReplyOnDoubleClick({ ...input, mxEvent: topic })).toBe(false);
    });
});
