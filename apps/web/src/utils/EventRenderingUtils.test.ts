/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { EventType, MsgType } from "matrix-js-sdk/src/matrix";
import { beforeEach, describe, expect, it } from "vitest";
import { makePollStartEvent, mkEvent, stubClient } from "test-utils";

import { getEventDisplayInfo } from "./EventRenderingUtils";
import type { MatrixClient } from "matrix-js-sdk/src/matrix";

describe("getEventDisplayInfo", () => {
    let client: MatrixClient;

    beforeEach(() => {
        client = stubClient();
    });

    it("draws a poll in a bubble, as in Telegram", () => {
        const poll = makePollStartEvent("Where should we have the team lunch?", "@alice:example.org");

        expect(getEventDisplayInfo(client, poll, false, false, null).noBubbleEvent).toBe(false);
    });

    it("still draws an emote without a bubble", () => {
        const emote = mkEvent({
            event: true,
            type: EventType.RoomMessage,
            room: "!room:example.org",
            user: "@alice:example.org",
            content: { msgtype: MsgType.Emote, body: "waves" },
        });

        expect(getEventDisplayInfo(client, emote, false, false, null).noBubbleEvent).toBe(true);
    });
});
