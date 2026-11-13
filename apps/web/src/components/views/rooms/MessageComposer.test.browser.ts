/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import sharedComponentsStyles from "@element-hq/web-shared-components/dist/element-web-shared-components.css?raw";

import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import commonStyles from "../../../../res/css/_common.pcss?raw";
import accessibleButtonStyles from "../../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import emojiButtonStyles from "../../../../res/css/views/rooms/_EmojiButton.pcss?raw";
import messageComposerStyles from "../../../../res/css/views/rooms/_MessageComposer.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../../test/telement/browserCss";

const ICON = `<svg viewBox="0 0 24 24"><rect width="24" height="24" /></svg>`;

/** The composer's action buttons, as MessageComposer renders them with or without the rich text editor. */
function renderComposerActions(richText: boolean): HTMLElement[] {
    document.body.innerHTML = `
        <div class="mx_MessageComposer${richText ? " mx_MessageComposer_wysiwyg" : ""}">
            <div class="mx_MessageComposer_actions">
                <div class="mx_AccessibleButton mx_MessageComposer_button" role="button" aria-label="Formatting">${ICON}</div>
                <div class="mx_AccessibleButton mx_MessageComposer_button" role="button" aria-label="Emoji">${ICON}</div>
            </div>
        </div>
    `;
    return [...document.querySelectorAll<HTMLElement>(".mx_MessageComposer_button")];
}

let stylesheet: HTMLStyleElement;

describe("MessageComposer button styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundTokens} }
            @layer compound-web { ${compoundStyles} }
            ${sharedComponentsStyles}
            @layer app-web {
                ${toBrowserCss(accessibleButtonStyles, lightTheme)}
                ${toBrowserCss(emojiButtonStyles, commonStyles, lightTheme)}
                ${toBrowserCss(messageComposerStyles, commonStyles, lightTheme)}
            }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it.each([
        ["plain", false],
        ["rich text", true],
    ])("draws the formatting and emoji buttons as 36px circles in the %s composer", (_, richText) => {
        for (const button of renderComposerActions(richText)) {
            const box = button.getBoundingClientRect();
            expect([box.width, box.height]).toEqual([36, 36]);
            expect(cornerRadii(button)).toEqual({ x: 18, y: 18 });
        }
    });
});
