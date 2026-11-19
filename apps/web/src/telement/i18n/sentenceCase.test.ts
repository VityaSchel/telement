/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import fetchMock from "@fetch-mock/vitest";
import { get, merge } from "lodash";
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
import { SENTENCE_CASE_OVERRIDES } from "./sentenceCase";

const upstreamEnglish = merge({}, webStrings, sharedComponentsStrings);

function forms(translation: Translation): Record<string, string> {
    return typeof translation === "string" ? { "": translation } : (translation as Record<string, string>);
}

/** The %(name)s placeholders and the <tag> markup of a text, sorted. */
function substitutions(text: string): string[] {
    return [...text.matchAll(/%\([^)]+\)s|<[^>]+>/g)].map(([match]) => match).sort();
}

/** The words of a text, ignoring letter case and whether words are joined by a space or a hyphen. */
function wording(text: string): string {
    return text.toLowerCase().replace(/[\s-]+/g, " ");
}

function findProblems(key: string, override: Translation): string[] {
    if (key.startsWith("telement|")) return [`${key}: is Telement's own key, change its text in en_EN.json instead`];

    const upstream: Translation | undefined = get(upstreamEnglish, key.split(KEY_SEPARATOR));
    if (upstream === undefined) return [`${key}: no longer in upstream's en_EN.json`];

    const upstreamForms = forms(upstream);
    const overrideForms = forms(override);
    if (Object.keys(upstreamForms).sort().join() !== Object.keys(overrideForms).sort().join()) {
        return [`${key}: has plural forms ${JSON.stringify(Object.keys(upstreamForms))} upstream`];
    }

    const problems: string[] = [];
    for (const [form, text] of Object.entries(overrideForms)) {
        const upstreamText = upstreamForms[form];
        if (substitutions(text).join() !== substitutions(upstreamText).join()) {
            problems.push(`${key}: placeholders or tags differ from upstream's "${upstreamText}"`);
        } else if (wording(text) !== wording(upstreamText)) {
            problems.push(`${key}: changes more than letter case of upstream's "${upstreamText}"`);
        } else if (/^\p{Lu}/u.test(upstreamText) && !/^\p{Lu}/u.test(text)) {
            problems.push(`${key}: starts "${text}" with a lower case letter`);
        }
    }
    if (JSON.stringify(upstreamForms) === JSON.stringify(overrideForms)) {
        problems.push(`${key}: upstream already says ${JSON.stringify(upstream)}, remove the override`);
    }
    return problems;
}

describe("SENTENCE_CASE_OVERRIDES", () => {
    // An upstream merge that renames, rewords or removes a string makes its override stale
    it("only changes the letter case of strings upstream still has", () => {
        const problems = Object.entries(SENTENCE_CASE_OVERRIDES).flatMap(([key, text]) => findProblems(key, text));
        expect(problems).toEqual([]);
    });

    it("explains what is wrong with an override", () => {
        expect(findProblems("room_settings|security|title", "Security & privacy")).toEqual([]);
        expect(findProblems("room_settings|security|gone", "Gone")).toEqual([
            "room_settings|security|gone: no longer in upstream's en_EN.json",
        ]);
        expect(findProblems("room_settings|security|title", "Privacy & security")).toEqual([
            `room_settings|security|title: changes more than letter case of upstream's "Security & Privacy"`,
        ]);
        expect(findProblems("room_settings|security|title", "security & privacy")).toEqual([
            `room_settings|security|title: starts "security & privacy" with a lower case letter`,
        ]);
        expect(findProblems("member_list|count", { one: "%(n)s member", other: "%(count)s members" })).toEqual([
            `member_list|count: placeholders or tags differ from upstream's "%(count)s Member"`,
        ]);
        expect(findProblems("member_list|count", "%(count)s members")).toEqual([
            `member_list|count: has plural forms ["one","other"] upstream`,
        ]);
        expect(findProblems("common|rooms", "Rooms")).toEqual([
            `common|rooms: upstream already says "Rooms", remove the override`,
        ]);
        expect(findProblems("telement|room_list|you", "you")).toEqual([
            "telement|room_list|you: is Telement's own key, change its text in en_EN.json instead",
        ]);
    });
});

describe("registerSentenceCaseOverrides", () => {
    afterEach(async () => {
        SdkConfig.reset();
        await setLanguage("en");
    });

    it("shows the sentence case text in English", async () => {
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

    it("leaves the translations of other languages alone", async () => {
        await setLanguage("de");
        expect(_t("room_settings|security|title")).toBe(webStringsDe.room_settings.security.title);
        expect(_t("member_list|count", { count: 2 })).toBe("2 Mitglieder");
    });

    it("shows the sentence case text where a language falls back to English", async () => {
        // The test setup shows a missing string as part of its key, which would stop the fallback to English
        setMissingEntryGenerator((key) => `missing translation: ${key}`);
        try {
            await setLanguage("lv");
            expect(_t("room_settings|security|title")).toBe("Security & privacy");
        } finally {
            setMissingEntryGenerator((key) => key.split("|", 2)[1]);
        }
    });

    it("keeps the sentence case text after switching to another language and back", async () => {
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
