/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";

import { isVideoNote } from "./isVideoNote";

describe("isVideoNote", () => {
    it.each([
        ["the unstable MSC4546 key", { "msgtype": "m.video", "org.interferolog.circle": true }, true],
        ["the stable MSC4546 key", { "msgtype": "m.video", "m.circle": true }, true],
        ["no circle key", { msgtype: "m.video" }, false],
        ["a circle key that is not true", { "msgtype": "m.video", "org.interferolog.circle": "true" }, false],
        [
            "mautrix-telegram's round message flag",
            { msgtype: "m.video", info: { "fi.mau.telegram.round_message": true } },
            false,
        ],
        ["a circle key on a non-video message", { "msgtype": "m.image", "org.interferolog.circle": true }, false],
    ])("with %s returns %s", (_name, content, expected) => {
        expect(isVideoNote(content)).toBe(expected);
    });
});
