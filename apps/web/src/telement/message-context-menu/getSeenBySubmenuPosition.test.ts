/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";

import { getSeenBySubmenuPosition, SEEN_BY_SUBMENU_MAX_WIDTH } from "./getSeenBySubmenuPosition";

describe("getSeenBySubmenuPosition", () => {
    const item = { top: 200 };

    it("opens against the menu's end edge where the widest submenu fits, its first row level with the item", () => {
        const menu = { left: 100, right: 340 };

        expect(getSeenBySubmenuPosition(item, menu, 340 + SEEN_BY_SUBMENU_MAX_WIDTH)).toEqual({ top: 196, left: 340 });
    });

    it("opens against the menu's start edge where it would leave the window", () => {
        const menu = { left: 700, right: 940 };

        expect(getSeenBySubmenuPosition(item, menu, 1200)).toEqual({ top: 196, right: 500 });
    });
});
