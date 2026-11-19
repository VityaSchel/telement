/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { set } from "lodash";
import { KEY_SEPARATOR, registerTranslations } from "@element-hq/web-shared-components";
import { type Translation } from "matrix-web-i18n";

import sentenceCaseTexts from "./sentenceCase.en.json";

/**
 * Telement's English text for upstream translation keys whose English is in Title Case, keyed by translation key.
 * They live here rather than in en_EN.json because every upstream merge takes upstream's en_EN.json as it is.
 */
export const SENTENCE_CASE_OVERRIDES: Readonly<Record<string, Translation>> = sentenceCaseTexts;

/**
 * Registers {@link SENTENCE_CASE_OVERRIDES} over the English strings, for apps/web and shared-components alike.
 * Registering en_EN.json again brings back upstream's text, so call this after every registration of English.
 * Other languages keep their own translations; they only show these texts where they fall back to English.
 */
export function registerSentenceCaseOverrides(): void {
    const translations = {};
    for (const [key, text] of Object.entries(SENTENCE_CASE_OVERRIDES)) {
        set(translations, key.split(KEY_SEPARATOR), text);
    }
    registerTranslations("en", translations);
}
