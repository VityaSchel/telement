/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";

import { AudioPlaceholderViewModel } from "./AudioPlaceholderViewModel";

describe("AudioPlaceholderViewModel", () => {
    it("shows the player as the message describes it, nothing played yet, while its file downloads", () => {
        const mxEvent = new MatrixEvent({
            type: "m.room.message",
            content: {
                msgtype: "m.audio",
                body: "Listen to this",
                filename: "song.ogg",
                info: { size: 2048, duration: 61500 },
            },
        });

        expect(new AudioPlaceholderViewModel({ mxEvent }).getSnapshot()).toEqual({
            playbackState: "decoding",
            mediaName: "song.ogg",
            sizeBytes: 2048,
            durationSeconds: 61.5,
            playedSeconds: 0,
            percentComplete: 0,
            error: false,
        });
    });

    it("has no length for a message that doesn't say", () => {
        const mxEvent = new MatrixEvent({ type: "m.room.message", content: { msgtype: "m.audio", body: "a.ogg" } });

        expect(new AudioPlaceholderViewModel({ mxEvent }).getSnapshot().durationSeconds).toBe(0);
    });
});
