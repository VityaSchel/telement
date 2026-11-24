/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { act, render, screen } from "test-utils-rtl";
import { flushPromises } from "test-utils";
import userEvent from "@testing-library/user-event";

import SpellCheckLanguagesDropdown from "./SpellCheckLanguagesDropdown";
import PlatformPeg from "../../../PlatformPeg";

describe("<SpellCheckLanguagesDropdown />", () => {
    it("renders as expected", async () => {
        const platform: any = {
            getAvailableSpellCheckLanguages: vi.fn().mockResolvedValue(["en", "de", "qq"]),
            supportsSetting: vi.fn(),
        };
        PlatformPeg.set(platform);

        const { asFragment } = render(
            <SpellCheckLanguagesDropdown
                className="mx_GeneralUserSettingsTab_spellCheckLanguageInput"
                value="en"
                onOptionChange={vi.fn()}
            />,
        );
        await act(flushPromises);
        expect(asFragment()).toMatchSnapshot();
    });

    it("is there from the first render, with English until the platform has listed its languages", async () => {
        const languages = Promise.withResolvers<string[]>();
        PlatformPeg.set({
            getAvailableSpellCheckLanguages: () => languages.promise,
            supportsSetting: vi.fn(),
            overrideBrowserShortcuts: () => false,
        } as any);
        render(<SpellCheckLanguagesDropdown className="" value="" onOptionChange={vi.fn()} />);

        expect(screen.queryByLabelText("Loading…")).toBeNull();
        const dropdown = screen.getByRole("button");
        await userEvent.click(dropdown);
        expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["English"]);

        await act(async () => {
            languages.resolve(["en", "de"]);
            await flushPromises();
        });
        expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["German", "English"]);
    });
});
