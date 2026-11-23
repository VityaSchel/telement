/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import fetchMock from "@fetch-mock/vitest";
import { get, isEqual, merge } from "lodash";
import { KEY_SEPARATOR, setMissingEntryGenerator } from "@element-hq/web-shared-components";
import { type Translation } from "matrix-web-i18n";

import webStrings from "../../i18n/strings/en_EN.json";
import webStringsDe from "../../i18n/strings/de_DE.json";
// shared-components doesn't export its strings file
// oxlint-disable-next-line no-restricted-imports
import sharedComponentsStrings from "../../../../../packages/shared-components/src/i18n/strings/en_EN.json";
import SdkConfig from "../../SdkConfig";
import { _t } from "../../languageHandler";
import { setLanguage } from "../../i18n/settings";
import { setupTranslationOverridesForTests } from "../../i18n/__mocks__";
import { ENGLISH_OVERRIDES, type EnglishOverride } from "./englishOverrides";

const upstreamEnglish = merge({}, webStrings, sharedComponentsStrings);

function forms(translation: Translation): Record<string, string> {
    return typeof translation === "string" ? { "": translation } : (translation as Record<string, string>);
}

/** The %(name)s placeholders and the <tag> markup of every form of a text. */
function substitutions(translation: Translation): Set<string> {
    const texts = Object.values(forms(translation));
    return new Set(texts.flatMap((text) => [...text.matchAll(/%\([^)]+\)s|<[^>]+>/g)].map(([match]) => match)));
}

function findProblems(key: string, { upstream: recorded, telement }: EnglishOverride): string[] {
    if (key.startsWith("telement|")) return [`${key}: is Telement's own key, change its text in en_EN.json instead`];

    const upstream: Translation | undefined = get(upstreamEnglish, key.split(KEY_SEPARATOR));
    if (upstream === undefined) return [`${key}: no longer in upstream's en_EN.json`];
    if (!isEqual(upstream, recorded)) {
        return [
            `${key}: upstream's English changed from ${JSON.stringify(recorded)} to ${JSON.stringify(upstream)}; ` +
                `check the override against it, then record the new text as "upstream"`,
        ];
    }

    const upstreamForms = forms(upstream);
    const overrideForms = forms(telement);
    if (Object.keys(upstreamForms).sort().join() !== Object.keys(overrideForms).sort().join()) {
        return [`${key}: has plural forms ${JSON.stringify(Object.keys(upstreamForms))} upstream`];
    }

    const problems: string[] = [];
    // The code passes only upstream's placeholders and tags; the override may leave some out but add none
    const upstreamSubstitutions = substitutions(upstream);
    const added = [...substitutions(telement)].filter((substitution) => !upstreamSubstitutions.has(substitution));
    if (added.length > 0) {
        problems.push(`${key}: uses ${added.join(", ")}, which upstream's ${JSON.stringify(upstream)} doesn't have`);
    }
    for (const [form, text] of Object.entries(overrideForms)) {
        if (/^\p{Lu}/u.test(upstreamForms[form]) && !/^\p{Lu}/u.test(text)) {
            problems.push(`${key}: starts "${text}" with a lower case letter`);
        }
    }
    if (isEqual(upstream, telement)) {
        problems.push(`${key}: upstream already says ${JSON.stringify(upstream)}, remove the override`);
    }
    return problems;
}

describe("ENGLISH_OVERRIDES", () => {
    // An upstream merge that renames, rewords or removes a string makes its override stale
    it("only overrides strings upstream still writes as they were when the override was written", () => {
        const problems = Object.entries(ENGLISH_OVERRIDES).flatMap(([key, override]) => findProblems(key, override));
        expect(problems).toEqual([]);
    });

    it("explains what is wrong with an override", () => {
        const security = "room_settings|security|title";
        expect(findProblems(security, { upstream: "Security & Privacy", telement: "Security & privacy" })).toEqual([]);
        expect(findProblems(security, { upstream: "Security & Privacy", telement: "Privacy and security" })).toEqual(
            [],
        );
        expect(findProblems("room_settings|security|gone", { upstream: "Gone", telement: "Gone" })).toEqual([
            "room_settings|security|gone: no longer in upstream's en_EN.json",
        ]);
        expect(findProblems(security, { upstream: "Security", telement: "Security" })).toEqual([
            `room_settings|security|title: upstream's English changed from "Security" to "Security & Privacy"; ` +
                `check the override against it, then record the new text as "upstream"`,
        ]);
        expect(findProblems(security, { upstream: "Security & Privacy", telement: "security & privacy" })).toEqual([
            `room_settings|security|title: starts "security & privacy" with a lower case letter`,
        ]);

        const count = "member_list|count";
        const countUpstream = { one: "%(count)s Member", other: "%(count)s Members" };
        expect(
            findProblems(count, { upstream: countUpstream, telement: { one: "1 member", other: "%(count)s" } }),
        ).toEqual([]);
        expect(
            findProblems(count, {
                upstream: countUpstream,
                telement: { one: "%(n)s member", other: "<b>%(count)s</b>" },
            }),
        ).toEqual([
            `member_list|count: uses %(n)s, <b>, </b>, which upstream's ` +
                `{"one":"%(count)s Member","other":"%(count)s Members"} doesn't have`,
        ]);
        expect(findProblems(count, { upstream: countUpstream, telement: "%(count)s members" })).toEqual([
            `member_list|count: has plural forms ["one","other"] upstream`,
        ]);
        expect(findProblems("common|rooms", { upstream: "Rooms", telement: "Rooms" })).toEqual([
            `common|rooms: upstream already says "Rooms", remove the override`,
        ]);
        expect(findProblems("telement|room_list|you", { upstream: "You", telement: "you" })).toEqual([
            "telement|room_list|you: is Telement's own key, change its text in en_EN.json instead",
        ]);
    });
});

describe("registerEnglishOverrides", () => {
    afterEach(async () => {
        SdkConfig.reset();
        await setLanguage("en");
    });

    it("shows Telement's text in English", async () => {
        await setLanguage("en");
        expect(_t("room_settings|security|title")).toBe("Security & privacy");
        expect(_t("settings|voip|title")).toBe("Voice & video");
    });

    it("overrides strings from shared-components", async () => {
        const key = "emoji|category_frequently_used";
        expect(get(sharedComponentsStrings, key.split(KEY_SEPARATOR))).toBe("Frequently Used");

        await setLanguage("en");
        expect(_t(key as TranslationKey)).toBe("Frequently used");
    });

    it("keeps placeholders, plural forms and tags", async () => {
        await setLanguage("en");
        expect(_t("member_list|count", { count: 1 })).toBe("1 member");
        expect(_t("member_list|count", { count: 2 })).toBe("2 members");
        expect(_t("setting|help_about|dialog_title", {}, { strong: (sub) => `[${sub}]` })).toBe(
            "[Settings:] Help & about",
        );
    });

    it("changes wording and punctuation in English", async () => {
        await setLanguage("en");
        expect(_t("leave_room_dialog|leave_room_title", { roomName: "Project 11" })).toBe("Leave Project 11?");
        expect(_t("leave_room_dialog|leave_space_title", { spaceName: "Studio" })).toBe("Leave Studio?");
        expect(_t("space|leave_dialog_title", { spaceName: "Studio" })).toBe("Leave Studio?");
        expect(_t("spotlight_dialog|heading_with_query", { query: "zzqqxx" })).toBe("Use “zzqqxx” to search");
        expect(_t("timeline|typing_indicator|one_user", { displayName: "BotBob" })).toBe("BotBob is typing…");
        expect(_t("timeline|typing_indicator|two_users", { names: "Alice", lastPerson: "Bob" })).toBe(
            "Alice and Bob are typing…",
        );
        expect(_t("timeline|typing_indicator|more_users", { names: "Alice, Bob", count: 1 })).toBe(
            "Alice, Bob and one other is typing…",
        );
        expect(_t("timeline|typing_indicator|more_users", { names: "Alice, Bob", count: 2 })).toBe(
            "Alice, Bob and 2 others are typing…",
        );
        // Telegram's name for the room list's item that starts a chat, which also titles the dialog it opens
        expect(_t("action|start_chat" as TranslationKey)).toBe("New message");
        // The Report message dialog's Ignore user is a switch rather than a checkbox, so its description says what it does
        expect(_t("report_content|hide_messages_from_user")).toBe(
            "Hide all current and future messages from this user.",
        );
        // Telement has no bug reporting, so the dialog doesn't ask for a bug report
        expect(_t("room_settings|advanced|upgrade_warning_dialog_report_bug_prompt", { brand: "Telement" })).toBe(
            "This usually only affects how the room is processed on the server.",
        );
        // A value row is named after what it sets, so its label doesn't say to set it
        expect(_t("settings|preferences|user_timezone")).toBe("Time zone");
    });

    it("leaves the translations of other languages alone", async () => {
        await setLanguage("de");
        expect(_t("room_settings|security|title")).toBe(webStringsDe.room_settings.security.title);
        expect(_t("member_list|count", { count: 2 })).toBe("2 Mitglieder");
    });

    it("shows Telement's text where a language falls back to English", async () => {
        // The test setup shows a missing string as part of its key, which would stop the fallback to English
        setMissingEntryGenerator((key) => `missing translation: ${key}`);
        try {
            await setLanguage("lv");
            expect(_t("room_settings|security|title")).toBe("Security & privacy");
        } finally {
            setMissingEntryGenerator((key) => key.split("|", 2)[1]);
        }
    });

    it("keeps Telement's text after switching to another language and back", async () => {
        await setLanguage("de");
        await setLanguage("en");
        expect(_t("room_settings|security|title")).toBe("Security & privacy");
    });

    it("lets the custom translations of a deployment win", async () => {
        try {
            await setupTranslationOverridesForTests({ "room_settings|security|title": { en: "Privacy" } });
            await setLanguage("en");
            expect(_t("room_settings|security|title")).toBe("Privacy");
        } finally {
            fetchMock.removeRoute("i18n-override");
        }
    });
});
