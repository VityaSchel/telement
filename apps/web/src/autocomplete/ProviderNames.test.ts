/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { mkStubRoom, stubClient } from "test-utils";

import CommandProvider from "./CommandProvider";
import EmojiProvider from "./EmojiProvider";
import NotifProvider from "./NotifProvider";
import RoomProvider from "./RoomProvider";
import UserProvider from "./UserProvider";
import { _t } from "../languageHandler";

describe("Autocomplete providers' names", () => {
    stubClient();
    const room = mkStubRoom("!room:example.org", "Room", undefined);

    // Each name heads its provider's section, which starts on its rows' edge only without an emoji before it
    it.each([
        ["commands", () => new CommandProvider(room), "composer|autocomplete|command_description"],
        ["emoji", () => new EmojiProvider(room), "common|emoji"],
        ["room notifications", () => new NotifProvider(room), "composer|autocomplete|notification_description"],
        ["rooms", () => new RoomProvider(room), "common|rooms"],
        ["users", () => new UserProvider(room), "composer|autocomplete|user_description"],
    ] as const)("names the %s section in plain words, without an emoji before them", (_name, create, key) => {
        expect(create().getName()).toBe(_t(key));
    });
});
