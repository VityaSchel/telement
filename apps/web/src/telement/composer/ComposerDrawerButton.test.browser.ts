/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import sharedComponentsStyles from "@element-hq/web-shared-components/dist/element-web-shared-components.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../packages/shared-components/src/telement/tokens.css?raw";
import lightTheme from "../../../res/themes/light/css/_light.pcss?raw";
import commonStyles from "../../../res/css/_common.pcss?raw";
import accessibleButtonStyles from "../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import contextualMenuStyles from "../../../res/css/structures/_ContextualMenu.pcss?raw";
import composerDrawerStyles from "../../../res/css/telement/_ComposerDrawer.pcss?raw";
import emojiButtonStyles from "../../../res/css/views/rooms/_EmojiButton.pcss?raw";
import messageComposerStyles from "../../../res/css/views/rooms/_MessageComposer.pcss?raw";
import { toBrowserCss } from "../../test/telement/browserCss";
import { settledStyle, tokenColor } from "../../test/telement/computedStyle";

const ICON = `<svg viewBox="0 0 24 24"><rect width="24" height="24" /></svg>`;

/** The drawer's button as ComposerDrawerButton renders it in the composer, with or without the rich text editor. */
function renderDrawerButton(richText: boolean, open: boolean): HTMLElement {
    document.body.innerHTML = `
        <div class="cpd-theme-light">
            <div class="mx_MessageComposer${richText ? " mx_MessageComposer_wysiwyg" : ""}">
                <div class="mx_MessageComposer_actions">
                    <div class="mx_AccessibleButton mx_MessageComposer_button${open ? " mx_EmojiButton_highlight" : ""}"
                        role="button" tabindex="0" aria-label="Emoji">${ICON}</div>
                </div>
            </div>
        </div>
    `;
    return document.querySelector<HTMLElement>('[aria-label="Emoji"]')!;
}

let stylesheet: HTMLStyleElement;

describe("ComposerDrawerButton styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${telementTokens} }
            @layer compound-web { ${compoundStyles} }
            ${sharedComponentsStyles}
            @layer app-web {
                ${toBrowserCss(accessibleButtonStyles, lightTheme)}
                ${toBrowserCss(emojiButtonStyles, commonStyles, lightTheme)}
                ${toBrowserCss(messageComposerStyles, commonStyles, lightTheme)}
                ${toBrowserCss(contextualMenuStyles, lightTheme)}
                ${composerDrawerStyles}
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
    ])(
        "draws the button's glyph in the accent, with no fill, while its drawer is open in the %s composer",
        (_, richText) => {
            const atRest = renderDrawerButton(richText, false);
            expect(settledStyle(atRest).backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect(getComputedStyle(atRest.querySelector("svg")!).color).toBe(
                tokenColor("--cpd-color-icon-secondary", atRest),
            );

            const open = renderDrawerButton(richText, true);
            expect(settledStyle(open).backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect(getComputedStyle(open.querySelector("svg")!).color).toBe(
                tokenColor("--cpd-color-icon-accent-primary", open),
            );
        },
    );

    it("ends the drawer on the spot ComposerDrawerButton gives it, the end of the button that opened it", () => {
        // ContextMenu's fixed wrapper at the button's end, 8px from the window's, and 8px above the composer's top
        document.body.innerHTML = `
            <div class="mx_ContextualMenu_wrapper" style="right: 8px; bottom: 120px">
                <div class="mx_ContextualMenu mx_ContextualMenu_right mx_ContextualMenu_bottom mx_TelementComposerDrawer_menu">
                    <div style="width: 340px; height: 200px"></div>
                </div>
            </div>
        `;
        const drawer = document.querySelector(".mx_TelementComposerDrawer_menu")!.getBoundingClientRect();
        const viewport = document.documentElement;

        expect({ right: viewport.clientWidth - drawer.right, bottom: viewport.clientHeight - drawer.bottom }).toEqual({
            right: 8,
            bottom: 120,
        });
    });
});
