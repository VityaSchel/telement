/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { set } from "lodash";
import { KEY_SEPARATOR, registerTranslations } from "@element-hq/web-shared-components";
import { type Translation } from "matrix-web-i18n";

// Not named like this module, which webpack would then load in its place (webpackResolution.test.ts)
import englishOverrides from "./overrides.en.json";

/** Telement's English for one upstream translation key. */
export interface EnglishOverride {
    /**
     * Upstream's English when the override was written. englishOverrides.test.ts fails once upstream's en_EN.json says
     * something else, so that an upstream change to the string is reviewed rather than hidden by the override.
     */
    upstream: Translation;
    /** The English Telement shows instead: sentence case, wording or punctuation. */
    telement: Translation;
}

/**
 * Telement's English for upstream translation keys, keyed by translation key. They live here rather than in
 * en_EN.json because every upstream merge takes upstream's en_EN.json as it is.
 */
export const ENGLISH_OVERRIDES: Readonly<Record<string, EnglishOverride>> = englishOverrides;

/**
 * Registers {@link ENGLISH_OVERRIDES} over the English strings, for apps/web and shared-components alike.
 * Registering en_EN.json again brings back upstream's text, so call this after every registration of English.
 * Other languages keep their own translations; they only show these texts where they fall back to English.
 */
export function registerEnglishOverrides(): void {
    const translations = {};
    for (const [key, { telement }] of Object.entries(ENGLISH_OVERRIDES)) {
        set(translations, key.split(KEY_SEPARATOR), telement);
    }
    registerTranslations("en", translations);
}
