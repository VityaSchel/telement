/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { _t } from "../../languageHandler";
import SettingsStore from "../../settings/SettingsStore";
import { type SettingsSearchTarget } from "../../viewmodels/telement/settings/SettingsSearchViewModel";
import { SETTINGS_SEARCH_INDEX } from "./settingsSearchIndex";

/** A tab of the user settings, as the dialog lists it. */
interface SettingsSearchTab {
    id: string;
    label: TranslationKey;
}

/**
 * What search in the user settings can open, in the current language: each tab the dialog shows, then the groups and
 * settings of the search index on those tabs.
 */
export function getSettingsSearchTargets(tabs: SettingsSearchTab[]): SettingsSearchTarget[] {
    const tabNames = new Map(tabs.map((tab) => [tab.id, _t(tab.label)]));
    const targets: SettingsSearchTarget[] = tabs.map((tab) => ({ tabId: tab.id, path: [_t(tab.label)] }));

    for (const entry of SETTINGS_SEARCH_INDEX) {
        const tabName = tabNames.get(entry.tab);
        if (!tabName) continue;

        const group = entry.group ? _t(entry.group) : undefined;
        let label: string | undefined;
        if (entry.setting) {
            label = SettingsStore.getDisplayName(entry.setting) ?? undefined;
            if (!label) continue;
        } else if (entry.label) {
            label = _t(entry.label);
        }

        const path = [tabName, group, label].filter((part): part is string => !!part);
        targets.push({ tabId: entry.tab, path, group, label });
    }
    return targets;
}
