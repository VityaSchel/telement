/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";

import { getShouldShowMessageActionBar } from "./EventTileDerivedState";

describe("getShouldShowMessageActionBar", () => {
    const focused = {
        isEditing: false,
        forExport: false,
        showActionBarFromFocus: true,
        actionBarFocused: false,
        hasContextMenu: false,
    };

    it("shows the action bar for keyboard focus", () => {
        expect(getShouldShowMessageActionBar(focused)).toBe(true);
    });

    it("never shows it on a preview that can't be interacted with, such as the Forward dialog's", () => {
        expect(getShouldShowMessageActionBar({ ...focused, inhibitInteraction: true })).toBe(false);
        expect(
            getShouldShowMessageActionBar({
                ...focused,
                showActionBarFromFocus: false,
                actionBarFocused: true,
                inhibitInteraction: true,
            }),
        ).toBe(false);
    });
});
