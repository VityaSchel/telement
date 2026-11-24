/*
Copyright 2024, 2025 New Vector Ltd.
Copyright 2019-2023 The Matrix.org Foundation C.I.C.
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ChangeEvent, type JSX, useCallback, useEffect, useRef, useState } from "react";
import { SettingsToggleInput } from "@vector-im/compound-web";
import { type EmptyObject } from "matrix-js-sdk/src/matrix";

import { _t, getCurrentLanguage } from "../../../../../languageHandler";
import SettingsStore from "../../../../../settings/SettingsStore";
import Field from "../../../elements/Field";
import { SettingLevel } from "../../../../../settings/SettingLevel";
import SettingsFlag from "../../../elements/SettingsFlag";
import AccessibleButton from "../../../elements/AccessibleButton";
import dis from "../../../../../dispatcher/dispatcher";
import { UserTab } from "../../../dialogs/UserTab";
import { type OpenToTabPayload } from "../../../../../dispatcher/payloads/OpenToTabPayload";
import { Action } from "../../../../../dispatcher/actions";
import SdkConfig from "../../../../../SdkConfig";
import { SettingsSubsection } from "../../shared/SettingsSubsection";
import SettingsTab from "../SettingsTab";
import { SettingsSection } from "../../shared/SettingsSection";
import { getAllLanguagesWithLabels, getLanguageWithLabels } from "../../../../../i18n/utils";
import PlatformPeg from "../../../../../PlatformPeg";
import { IS_MAC } from "../../../../../Keyboard";
import SpellCheckSettings from "../../SpellCheckSettings";
import * as TimezoneHandler from "../../../../../TimezoneHandler";
import { type BooleanSettingKey, type SettingKey } from "../../../../../settings/Settings.tsx";
import SettingsDropdown from "../../../elements/SettingsDropdown.tsx";
import { useLocalStorageState } from "../../../../../hooks/useLocalStorageState";
import { SettingsValueRow } from "../../../../../telement/settings/SettingsValueRow";

interface IState {
    timezone: string | undefined;
    autocompleteDelay: string;
    readMarkerInViewThresholdMs: string;
    readMarkerOutOfViewThresholdMs: string;
}

type Languages = Awaited<ReturnType<typeof getAllLanguagesWithLabels>>;

const LanguageSection: React.FC = () => {
    const [language, setLanguage] = useState(getCurrentLanguage());
    // Telement: until the list is loaded, the current language alone, so that the row shows it from the start
    const [languages, setLanguages] = useState<Languages>(() => [getLanguageWithLabels(language)]);

    useEffect(() => {
        let cancelled = false;
        void getAllLanguagesWithLabels()
            .then((langs) => langs.sort((a, b) => a.labelInTargetLanguage.localeCompare(b.labelInTargetLanguage)))
            .catch((): Languages => [{ value: "en", label: "English", labelInTargetLanguage: "English" }])
            .then((langs) => {
                if (!cancelled) setLanguages(langs);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const onLanguageChange = useCallback(
        (newLanguage: string) => {
            if (language === newLanguage) return;

            void SettingsStore.setValue("language", null, SettingLevel.DEVICE, newLanguage);
            setLanguage(newLanguage);
            const platform = PlatformPeg.get();
            if (platform) {
                platform.setLanguage([newLanguage]);
                platform.reload();
            }
        },
        [language],
    );

    // Telement: a value row, each language in its own name, as the language dropdown listed them. Its menu's filter finds
    // a language by its name in the user's language too, as the dropdown's did
    return (
        <SettingsValueRow
            label={_t("settings|general|application_language")}
            options={languages.map((lang) => ({
                key: lang.value,
                label: lang.labelInTargetLanguage,
                searchTerms: [lang.label],
            }))}
            selectedKey={language}
            onSelect={onLanguageChange}
        />
    );
};

/** What the desktop app says of its spell checker. */
interface SpellCheckState {
    enabled: boolean;
    languages?: string[];
}

/** On, as the desktop app has it until it is turned off (apps/desktop/src/store.ts). */
const DEFAULT_SPELL_CHECK: SpellCheckState = { enabled: true };

const SpellCheckSection: React.FC = () => {
    // Telement: what the desktop app last said, so that the toggle and the languages are shown as they are from the
    // start, rather than off and without languages until it has answered
    const [spellCheck, setSpellCheck] = useLocalStorageState("spell_check", DEFAULT_SPELL_CHECK);
    const changed = useRef(false);

    useEffect(() => {
        const plaf = PlatformPeg.get();
        if (!plaf?.supportsSpellCheckSettings()) return;

        (async () => {
            const [enabled, languages] = await Promise.all([
                plaf.getSpellCheckEnabled(),
                plaf.getSpellCheckLanguages(),
            ]);
            // An answer from before the user changed something here
            if (changed.current) return;
            setSpellCheck({ enabled, languages: languages || undefined });
        })();
    }, [setSpellCheck]);

    const onSpellCheckEnabledChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const enabled = e.target.checked;
            changed.current = true;
            setSpellCheck({ ...spellCheck, enabled });
            PlatformPeg.get()?.setSpellCheckEnabled(enabled);
        },
        [spellCheck, setSpellCheck],
    );

    const onSpellCheckLanguagesChange = useCallback(
        (languages: string[]): void => {
            changed.current = true;
            setSpellCheck({ ...spellCheck, languages });
            PlatformPeg.get()?.setSpellCheckLanguages(languages);
        },
        [spellCheck, setSpellCheck],
    );

    if (!PlatformPeg.get()?.supportsSpellCheckSettings()) return null;

    return (
        <>
            <SettingsToggleInput
                name="allow_spellcheck"
                label={_t("settings|general|allow_spellcheck")}
                onChange={onSpellCheckEnabledChange}
                checked={spellCheck.enabled}
            />
            {spellCheck.enabled && spellCheck.languages !== undefined && !IS_MAC && (
                <SpellCheckSettings languages={spellCheck.languages} onLanguagesChange={onSpellCheckLanguagesChange} />
            )}
        </>
    );
};

export default class PreferencesUserSettingsTab extends React.Component<EmptyObject, IState> {
    // Telement: previews are always on and sections always off, so the section only shows if a setting is added here
    private static ROOM_LIST_SETTINGS: BooleanSettingKey[] = [];

    // Telement: sending with Ctrl/Cmd + Enter is a shortcut too, so it is here rather than under Composer
    private static KEYBINDINGS_SETTINGS: BooleanSettingKey[] = [
        "ctrlFForSearch",
        "MessageComposerInput.ctrlEnterToSend",
    ];

    private static COMPOSER_SETTINGS: BooleanSettingKey[] = [
        "MessageComposerInput.autoReplaceEmoji",
        "MessageComposerInput.useMarkdown",
        "MessageComposerInput.suggestEmoji",
        "MessageComposerInput.surroundWith",
        "MessageComposerInput.insertTrailingColon",
    ];

    private static TIME_SETTINGS: BooleanSettingKey[] = ["showTwelveHourTimestamps"];

    private static CODE_BLOCKS_SETTINGS: BooleanSettingKey[] = [
        "enableSyntaxHighlightLanguageDetection",
        "expandCodeByDefault",
        "showCodeLineNumbers",
    ];

    private static IMAGES_AND_VIDEOS_SETTINGS: BooleanSettingKey[] = ["autoplayGifs", "autoplayVideo"];

    private static TIMELINE_SETTINGS: BooleanSettingKey[] = [
        "showTypingNotifications",
        "showRedactions",
        "showReadReceipts",
        "showJoinLeaves",
        "showDisplaynameChanges",
        "showChatEffects",
        "showAvatarChanges",
        "Pill.shouldShowPillAvatar",
        "TextualBody.enableBigEmoji",
        "scrollToBottomOnMessageSent",
        "useOnlyCurrentProfiles",
    ];

    private static ROOM_DIRECTORY_SETTINGS: BooleanSettingKey[] = ["SpotlightSearch.showNsfwPublicRooms"];

    private static GENERAL_SETTINGS: BooleanSettingKey[] = [
        "promptBeforeInviteUnknownUsers",
        // Start automatically after startup (electron-only)
        // Autocomplete delay (niche text box)
    ];

    /** Telement: the desktop app's settings, which are together under Start-up and window behaviour. */
    private static DESKTOP_SETTINGS: SettingKey[] = [
        "Electron.autoLaunch",
        "Electron.showTrayIcon",
        "Electron.enableHardwareAcceleration",
        "Electron.enableContentProtection",
        "Electron.alwaysShowMenuBar",
        "Electron.warnBeforeExit",
    ];

    public constructor(props: EmptyObject) {
        super(props);

        this.state = {
            timezone: TimezoneHandler.getUserTimezone(),
            autocompleteDelay: SettingsStore.getValueAt(SettingLevel.DEVICE, "autocompleteDelay").toString(10),
            readMarkerInViewThresholdMs: SettingsStore.getValueAt(
                SettingLevel.DEVICE,
                "readMarkerInViewThresholdMs",
            ).toString(10),
            readMarkerOutOfViewThresholdMs: SettingsStore.getValueAt(
                SettingLevel.DEVICE,
                "readMarkerOutOfViewThresholdMs",
            ).toString(10),
        };
    }

    private onTimezoneChange = (tz: string): void => {
        this.setState({ timezone: tz });
        void TimezoneHandler.setUserTimezone(tz);
    };

    private onAutocompleteDelayChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ autocompleteDelay: e.target.value });
        void SettingsStore.setValue("autocompleteDelay", null, SettingLevel.DEVICE, e.target.valueAsNumber);
    };

    private onReadMarkerInViewThresholdMs = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ readMarkerInViewThresholdMs: e.target.value });
        void SettingsStore.setValue("readMarkerInViewThresholdMs", null, SettingLevel.DEVICE, e.target.valueAsNumber);
    };

    private onReadMarkerOutOfViewThresholdMs = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ readMarkerOutOfViewThresholdMs: e.target.value });
        void SettingsStore.setValue(
            "readMarkerOutOfViewThresholdMs",
            null,
            SettingLevel.DEVICE,
            e.target.valueAsNumber,
        );
    };

    private renderGroup(settingIds: BooleanSettingKey[], level = SettingLevel.ACCOUNT): JSX.Element {
        return (
            <>
                {settingIds.map((i) => (
                    <SettingsFlag key={i} name={i} level={level} />
                ))}
            </>
        );
    }

    private onKeyboardShortcutsClicked = (): void => {
        dis.dispatch<OpenToTabPayload>({
            action: Action.ViewUserSettings,
            initialTabId: UserTab.Keyboard,
        });
    };

    public render(): React.ReactNode {
        const browserTimezoneLabel: string = _t("settings|preferences|default_timezone", {
            timezone: TimezoneHandler.shortBrowserTimezone(),
        });

        const brand = SdkConfig.get().brand;

        // Always prepend the default option
        const timezones = [
            { key: "", label: browserTimezoneLabel },
            ...TimezoneHandler.getAllTimezones().map((tz) => ({ key: tz, label: tz })),
        ];

        return (
            <SettingsTab data-testid="mx_PreferencesUserSettingsTab">
                <SettingsSection>
                    {/* The heading string is still 'general' from where it was moved, but this section should become 'general' */}
                    {/* Telement: the reload hint is help under the card, like every group's help */}
                    <SettingsSubsection
                        heading={_t("settings|general|language_section")}
                        description={_t("settings|general|application_language_reload_hint")}
                        formWrap
                    >
                        <LanguageSection />
                        <SpellCheckSection />
                    </SettingsSubsection>

                    {/* Telement: with the desktop app's toggles, which were under General, so that its settings are
                        in one group */}
                    {PreferencesUserSettingsTab.DESKTOP_SETTINGS.some((setting) =>
                        SettingsStore.canSetValue(setting, null, SettingLevel.PLATFORM),
                    ) && (
                        <SettingsSubsection
                            heading={_t("settings|preferences|startup_window_behaviour_label")}
                            formWrap
                        >
                            <SettingsDropdown
                                settingKey="Electron.autoLaunch"
                                label={_t("settings|start_automatically|label", { brand })}
                                level={SettingLevel.PLATFORM}
                                hideIfCannotSet
                            />
                            <SettingsFlag name="Electron.showTrayIcon" level={SettingLevel.PLATFORM} hideIfCannotSet />
                            <SettingsFlag
                                name="Electron.enableHardwareAcceleration"
                                level={SettingLevel.PLATFORM}
                                hideIfCannotSet
                                label={_t("settings|preferences|Electron.enableHardwareAcceleration", {
                                    appName: brand,
                                })}
                            />
                            <SettingsFlag
                                name="Electron.enableContentProtection"
                                level={SettingLevel.PLATFORM}
                                hideIfCannotSet
                                label={_t("settings|preferences|Electron.enableContentProtection")}
                            />
                            <SettingsFlag
                                name="Electron.alwaysShowMenuBar"
                                level={SettingLevel.PLATFORM}
                                hideIfCannotSet
                            />
                            <SettingsFlag
                                name="Electron.warnBeforeExit"
                                level={SettingLevel.PLATFORM}
                                hideIfCannotSet
                            />
                        </SettingsSubsection>
                    )}

                    {PreferencesUserSettingsTab.ROOM_LIST_SETTINGS.length > 0 && (
                        <SettingsSubsection heading={_t("settings|preferences|room_list_heading")} formWrap>
                            {this.renderGroup(PreferencesUserSettingsTab.ROOM_LIST_SETTINGS, SettingLevel.ACCOUNT)}
                        </SettingsSubsection>
                    )}

                    <SettingsSubsection
                        heading={_t("settings|preferences|keyboard_heading")}
                        description={_t(
                            "settings|preferences|keyboard_view_shortcuts_button",
                            {},
                            {
                                a: (sub) => (
                                    <AccessibleButton kind="link_inline" onClick={this.onKeyboardShortcutsClicked}>
                                        {sub}
                                    </AccessibleButton>
                                ),
                            },
                        )}
                        formWrap
                    >
                        {this.renderGroup(PreferencesUserSettingsTab.KEYBINDINGS_SETTINGS)}
                    </SettingsSubsection>

                    <SettingsSubsection heading={_t("settings|preferences|time_heading")} formWrap>
                        {/* Telement: a value row, as Telegram lists settings with a value */}
                        <SettingsValueRow
                            label={_t("settings|preferences|user_timezone")}
                            options={timezones}
                            selectedKey={this.state.timezone ?? ""}
                            onSelect={this.onTimezoneChange}
                        />

                        {this.renderGroup(PreferencesUserSettingsTab.TIME_SETTINGS)}
                    </SettingsSubsection>

                    <SettingsSubsection heading={_t("settings|preferences|composer_heading")} formWrap>
                        {this.renderGroup(PreferencesUserSettingsTab.COMPOSER_SETTINGS)}
                    </SettingsSubsection>

                    <SettingsSubsection heading={_t("settings|preferences|code_blocks_heading")} formWrap>
                        {this.renderGroup(PreferencesUserSettingsTab.CODE_BLOCKS_SETTINGS)}
                    </SettingsSubsection>

                    <SettingsSubsection
                        heading={_t("settings|preferences|link_previews_heading")}
                        description={_t("settings|preferences|link_previews_description")}
                        formWrap
                    >
                        <SettingsFlag name="urlPreviewsEnabled" level={SettingLevel.DEVICE} />
                        <SettingsFlag
                            name="urlPreviewsEnabled_e2ee"
                            level={SettingLevel.DEVICE}
                            requires={["urlPreviewsEnabled"]}
                        />
                        {SettingsStore.getValue("feature_msc4095_url_preview_bundle") && (
                            <SettingsFlag
                                name="urlPreviewsEnabled_e2ee_bundled_only"
                                level={SettingLevel.DEVICE}
                                requires={["urlPreviewsEnabled", "urlPreviewsEnabled_e2ee"]}
                            />
                        )}
                    </SettingsSubsection>

                    <SettingsSubsection heading={_t("settings|preferences|media_heading")} formWrap>
                        {this.renderGroup(PreferencesUserSettingsTab.IMAGES_AND_VIDEOS_SETTINGS)}
                    </SettingsSubsection>

                    <SettingsSubsection heading={_t("common|timeline")} formWrap>
                        {this.renderGroup(PreferencesUserSettingsTab.TIMELINE_SETTINGS)}
                    </SettingsSubsection>

                    <SettingsSubsection heading={_t("settings|preferences|room_directory_heading")} formWrap>
                        {this.renderGroup(PreferencesUserSettingsTab.ROOM_DIRECTORY_SETTINGS)}
                    </SettingsSubsection>

                    {/* Telement: "Advanced" rather than "General", as what is left here is for fine tuning */}
                    <SettingsSubsection heading={_t("common|advanced")} stretchContent formWrap>
                        {this.renderGroup(PreferencesUserSettingsTab.GENERAL_SETTINGS)}

                        <Field
                            label={_t("settings|preferences|autocomplete_delay")}
                            type="number"
                            value={this.state.autocompleteDelay}
                            onChange={this.onAutocompleteDelayChange}
                        />
                        <Field
                            label={_t("settings|preferences|rm_lifetime")}
                            type="number"
                            value={this.state.readMarkerInViewThresholdMs}
                            onChange={this.onReadMarkerInViewThresholdMs}
                        />
                        <Field
                            label={_t("settings|preferences|rm_lifetime_offscreen")}
                            type="number"
                            value={this.state.readMarkerOutOfViewThresholdMs}
                            onChange={this.onReadMarkerOutOfViewThresholdMs}
                        />
                    </SettingsSubsection>
                </SettingsSection>
            </SettingsTab>
        );
    }
}
