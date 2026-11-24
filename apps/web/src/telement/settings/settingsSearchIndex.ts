/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { UserTab } from "../../components/views/dialogs/UserTab";
import { type SettingKey } from "../../settings/Settings";

/**
 * A place in the user settings that search can open: a group, or a setting in it. The label is the setting's as the
 * tab shows it, from a translation key or a setting's display name, so search finds it in the user's language.
 */
interface SettingsSearchEntry {
    /** The tab it is on. */
    tab: UserTab;
    /** The label of its group, as the tab shows it above the group's card. */
    group?: TranslationKey;
    /** The setting's label, or nothing for the group itself. */
    label?: TranslationKey;
    /** A setting whose display name is its label. */
    setting?: SettingKey;
}

/** Entries for each of a group's settings named by their display names. */
function settings(tab: UserTab, group: TranslationKey | undefined, names: SettingKey[]): SettingsSearchEntry[] {
    return names.map((setting) => ({ tab, group, setting }));
}

/**
 * What search in the user settings finds, besides the tabs themselves: the groups and the settings people look for,
 * declared here rather than read from the tabs, which only render while open. `settingsSearchIndex.test.tsx` renders
 * the tabs and fails when a label here no longer shows on its tab.
 */
export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] = [
    { tab: UserTab.Account, group: "common|profile" },
    { tab: UserTab.Account, group: "common|profile", label: "settings|general|display_name" },
    { tab: UserTab.Account, group: "common|profile", label: "action|sign_out" },
    { tab: UserTab.Account, group: "settings|general|account_section" },
    { tab: UserTab.Account, group: "settings|general|emails_heading" },
    { tab: UserTab.Account, group: "settings|general|msisdns_heading" },
    { tab: UserTab.Account, label: "settings|general|deactivate_section" },

    { tab: UserTab.Notifications, label: "settings|notifications|enable_notifications_account" },
    ...settings(UserTab.Notifications, undefined, [
        "deviceNotificationsEnabled",
        "notificationsEnabled",
        "notificationBodyEnabled",
        "audioNotificationsEnabled",
    ]),
    { tab: UserTab.Notifications, label: "telement|settings|notification_exceptions" },
    { tab: UserTab.Notifications, group: "notifications|class_global" },
    { tab: UserTab.Notifications, group: "notifications|mentions_keywords" },
    { tab: UserTab.Notifications, group: "notifications|class_other" },
    { tab: UserTab.Notifications, label: "notifications|mark_all_read" },

    { tab: UserTab.Appearance, group: "common|theme" },
    { tab: UserTab.Appearance, group: "common|message_layout" },
    { tab: UserTab.Appearance, label: "settings|appearance|font_size" },
    { tab: UserTab.Appearance, group: "settings|appearance|timeline_image_size" },

    { tab: UserTab.Sidebar, group: "settings|sidebar|metaspaces_subsection" },
    { tab: UserTab.Sidebar, group: "settings|sidebar|metaspaces_subsection", label: "common|home" },
    {
        tab: UserTab.Sidebar,
        group: "settings|sidebar|metaspaces_subsection",
        label: "settings|sidebar|metaspaces_home_all_rooms",
    },
    {
        tab: UserTab.Sidebar,
        group: "settings|sidebar|metaspaces_subsection",
        label: "settings|sidebar|metaspaces_orphans",
    },

    { tab: UserTab.Preferences, group: "settings|general|language_section" },
    {
        tab: UserTab.Preferences,
        group: "settings|general|language_section",
        label: "settings|general|application_language",
    },
    ...settings(UserTab.Preferences, "settings|preferences|keyboard_heading", [
        "ctrlFForSearch",
        "MessageComposerInput.ctrlEnterToSend",
    ]),
    {
        tab: UserTab.Preferences,
        group: "settings|preferences|time_heading",
        label: "settings|preferences|user_timezone",
    },
    ...settings(UserTab.Preferences, "settings|preferences|time_heading", ["showTwelveHourTimestamps"]),
    ...settings(UserTab.Preferences, "settings|preferences|composer_heading", [
        "MessageComposerInput.autoReplaceEmoji",
        "MessageComposerInput.useMarkdown",
        "MessageComposerInput.suggestEmoji",
        "MessageComposerInput.surroundWith",
        "MessageComposerInput.insertTrailingColon",
    ]),
    ...settings(UserTab.Preferences, "settings|preferences|code_blocks_heading", [
        "enableSyntaxHighlightLanguageDetection",
        "expandCodeByDefault",
        "showCodeLineNumbers",
    ]),
    ...settings(UserTab.Preferences, "settings|preferences|link_previews_heading", [
        "urlPreviewsEnabled",
        "urlPreviewsEnabled_e2ee",
    ]),
    ...settings(UserTab.Preferences, "settings|preferences|media_heading", ["autoplayGifs", "autoplayVideo"]),
    ...settings(UserTab.Preferences, "common|timeline", [
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
    ]),
    ...settings(UserTab.Preferences, "settings|preferences|room_directory_heading", [
        "SpotlightSearch.showNsfwPublicRooms",
    ]),
    ...settings(UserTab.Preferences, "common|advanced", ["promptBeforeInviteUnknownUsers"]),
    { tab: UserTab.Preferences, group: "common|advanced", label: "settings|preferences|autocomplete_delay" },

    { tab: UserTab.Voice, group: "common|microphone" },
    { tab: UserTab.Voice, group: "common|microphone", label: "settings|voip|voice_agc" },
    { tab: UserTab.Voice, group: "common|microphone", label: "settings|voip|noise_suppression" },
    { tab: UserTab.Voice, group: "common|microphone", label: "settings|voip|echo_cancellation" },
    { tab: UserTab.Voice, group: "settings|voip|audio_output" },
    { tab: UserTab.Voice, group: "common|camera" },
    ...settings(UserTab.Voice, "common|camera", ["VideoView.flipVideoHorizontally"]),
    { tab: UserTab.Voice, group: "keyboard|category_calls" },
    ...settings(UserTab.Voice, "keyboard|category_calls", ["enableLegacyCallsVoip", "webRtcAllowPeerToPeer"]),

    { tab: UserTab.Security, group: "common|presence" },
    ...settings(UserTab.Security, "common|presence", [
        "sendReadReceipts",
        "sendTypingNotifications",
        "userTimezonePublish",
    ]),
    { tab: UserTab.Security, group: "common|moderation_and_safety" },
    { tab: UserTab.Security, group: "settings|media_preview|media_preview_label" },
    { tab: UserTab.Security, group: "settings|security|message_search_section" },
    { tab: UserTab.Security, group: "settings|security|ignore_users_section" },

    { tab: UserTab.Encryption, group: "settings|encryption|recovery|title" },
    { tab: UserTab.Encryption, label: "settings|encryption|key_storage|title" },
    { tab: UserTab.Encryption, group: "settings|encryption|advanced|title" },

    { tab: UserTab.SessionManager, group: "settings|sessions|current_session" },
    { tab: UserTab.SessionManager, group: "settings|sessions|other_sessions_heading" },

    { tab: UserTab.Help, group: "common|faq" },
    { tab: UserTab.Help, group: "setting|help_about|versions" },
    { tab: UserTab.Help, group: "setting|help_about|versions", label: "update|check_action" },
    { tab: UserTab.Help, group: "common|advanced", label: "setting|help_about|clear_cache_reload" },
];
