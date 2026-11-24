/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "test-utils-rtl";
import {
    getMockClientWithEventEmitter,
    mockClientMethodsServer,
    mockClientMethodsUser,
    mockPlatformPeg,
} from "test-utils";

import { _t } from "../../languageHandler";
import SettingsStore from "../../settings/SettingsStore";
import MatrixClientBackedController from "../../settings/controllers/MatrixClientBackedController";
import { UserTab } from "../../components/views/dialogs/UserTab";
import PreferencesUserSettingsTab from "../../components/views/settings/tabs/user/PreferencesUserSettingsTab";
import SidebarUserSettingsTab from "../../components/views/settings/tabs/user/SidebarUserSettingsTab";
import VoiceUserSettingsTab from "../../components/views/settings/tabs/user/VoiceUserSettingsTab";
import { SETTINGS_SEARCH_INDEX } from "./settingsSearchIndex";
import { getSettingsSearchTargets } from "./settingsSearchTargets";
import { findSetting } from "./revealSetting";

describe("SETTINGS_SEARCH_INDEX", () => {
    it("names only strings and settings that exist", () => {
        const missing = SETTINGS_SEARCH_INDEX.flatMap((entry) => [
            ...[entry.group, entry.label].filter((key): key is TranslationKey => !!key && _t(key) === key),
            ...(entry.setting && !SettingsStore.getDisplayName(entry.setting) ? [entry.setting] : []),
        ]);

        expect(missing).toEqual([]);
        expect(SETTINGS_SEARCH_INDEX.filter((entry) => !entry.label && !entry.group && !entry.setting)).toEqual([]);
    });

    describe("on the tabs it names", () => {
        beforeEach(() => {
            mockPlatformPeg();
            MatrixClientBackedController.matrixClient = getMockClientWithEventEmitter({
                ...mockClientMethodsServer(),
                ...mockClientMethodsUser(),
            });
        });

        it.each([
            [UserTab.Preferences, PreferencesUserSettingsTab],
            [UserTab.Sidebar, SidebarUserSettingsTab],
            [UserTab.Voice, VoiceUserSettingsTab],
        ])("finds each place on the %s tab", (tab, Tab: React.ComponentType) => {
            const { container } = render(<Tab />);
            const targets = getSettingsSearchTargets([{ id: tab, label: "common|preferences" }]).slice(1);

            expect(targets.length).toBeGreaterThan(0);
            const notFound = targets.filter((target) => !findSetting(container, target.group, target.label));
            expect(notFound.map((target) => target.path.join(" › "))).toEqual([]);
        });
    });
});

describe("getSettingsSearchTargets", () => {
    it("lists the tabs, then the places on them, each with its path from the tab's name", () => {
        const targets = getSettingsSearchTargets([
            { id: UserTab.Appearance, label: "common|appearance" },
            { id: UserTab.Preferences, label: "common|preferences" },
        ]);

        expect(targets.slice(0, 2).map((target) => target.path)).toEqual([["Appearance"], ["Preferences"]]);
        expect(targets).toContainEqual({
            tabId: UserTab.Appearance,
            path: ["Appearance", "Font size"],
            group: undefined,
            label: "Font size",
        });
        expect(targets).toContainEqual({
            tabId: UserTab.Preferences,
            path: ["Preferences", "Composer", "Enable Markdown"],
            group: "Composer",
            label: "Enable Markdown",
        });
        // Only the tabs the dialog shows
        expect(targets.some((target) => target.tabId === UserTab.Voice)).toBe(false);
    });
});
