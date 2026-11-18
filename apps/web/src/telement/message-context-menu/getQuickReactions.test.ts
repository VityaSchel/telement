/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, describe, expect, it, vi } from "vitest";

import * as recent from "../../emojipicker/recent";
import { getQuickReactions } from "./getQuickReactions";

vi.mock("../../emojipicker/recent", () => ({ get: vi.fn() }));

describe("getQuickReactions", () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    it("is Telegram's default reactions for a user who hasn't used any emoji", () => {
        vi.mocked(recent.get).mockReturnValue([]);

        expect(getQuickReactions()).toEqual(["👍", "❤️", "🔥", "🥰", "👏", "😁"]);
    });

    it("puts the user's most used emoji first and fills the rest with Telegram's, each once", () => {
        vi.mocked(recent.get).mockReturnValue(["😂", "🔥", "🙏"]);

        expect(getQuickReactions()).toEqual(["😂", "🔥", "🙏", "👍", "❤️", "🥰"]);
        expect(recent.get).toHaveBeenCalledWith(6);
    });

    it("is only the user's own once they have used six emoji", () => {
        vi.mocked(recent.get).mockReturnValue(["😂", "🙏", "🎉", "😢", "🤔", "👀"]);

        expect(getQuickReactions()).toEqual(["😂", "🙏", "🎉", "😢", "🤔", "👀"]);
    });
});
