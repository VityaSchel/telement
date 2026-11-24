/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { KEY_SEPARATOR } from "@element-hq/web-shared-components";

import webStrings from "../../i18n/strings/en_EN.json";
// shared-components doesn't export its strings file
// oxlint-disable-next-line no-restricted-imports
import sharedComponentsStrings from "../../../../../packages/shared-components/src/i18n/strings/en_EN.json";
import { ENGLISH_OVERRIDES } from "./englishOverrides";

/** Every English text of a strings file by its key, plural forms included. */
function texts(strings: object, prefix = ""): [string, string][] {
    return Object.entries(strings).flatMap(([key, value]) =>
        typeof value === "string" ? [[prefix + key, value]] : texts(value, `${prefix}${key}${KEY_SEPARATOR}`),
    );
}

describe("the English of media devices", () => {
    it("calls them microphone, speaker and camera everywhere", () => {
        const english = new Map([...texts(webStrings), ...texts(sharedComponentsStrings)]);
        for (const [key, { telement }] of Object.entries(ENGLISH_OVERRIDES)) {
            for (const [formKey, text] of texts({ [key]: telement })) english.set(formKey, text);
        }

        const others = /webcam|audio (in|out)put|video (in|out)put|microphone input|(in|out)put device/i;
        expect([...english].filter(([, text]) => others.test(text))).toEqual([]);
    });
});
