/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import sharedComponentsStyles from "@element-hq/web-shared-components/dist/element-web-shared-components.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import commonStyles from "../../../../res/css/_common.pcss?raw";
import accessibleButtonStyles from "../../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import emojiButtonStyles from "../../../../res/css/views/rooms/_EmojiButton.pcss?raw";
import messageComposerStyles from "../../../../res/css/views/rooms/_MessageComposer.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../../test/telement/browserCss";
import { settledStyle, tokenColor } from "../../../test/telement/computedStyle";

const ICON = `<svg viewBox="0 0 24 24"><rect width="24" height="24" /></svg>`;

/**
 * The composer's action buttons, as MessageComposer renders them with or without the rich text editor. The last one
 * is the send slot, which holds the microphone while the field is empty and Send otherwise.
 */
function renderComposerActions(richText: boolean, theme = "cpd-theme-light", dir = "ltr"): HTMLElement[] {
    document.body.innerHTML = `
        <div class="${theme} mx_MessageComposer${richText ? " mx_MessageComposer_wysiwyg" : ""}" dir="${dir}">
            <div class="mx_MessageComposer_actions">
                <div class="mx_AccessibleButton mx_MessageComposer_button" role="button" aria-label="Formatting">${ICON}</div>
                <div class="mx_AccessibleButton mx_MessageComposer_button" role="button" aria-label="Emoji">${ICON}</div>
                <div class="mx_AccessibleButton mx_MessageComposer_button" role="button" aria-label="Voice Message">${ICON}</div>
                <div class="mx_AccessibleButton mx_MessageComposer_button mx_MessageComposer_sendMessage" role="button" aria-label="Send">${ICON}</div>
            </div>
        </div>
    `;
    return [...document.querySelectorAll<HTMLElement>(".mx_MessageComposer_button")];
}

function lightColor(token: string): string {
    return tokenColor(token, document.querySelector(".cpd-theme-light")!);
}

let stylesheet: HTMLStyleElement;

describe("MessageComposer button styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens {
                ${compoundTokens} ${compoundSemantic} ${compoundLightTheme} ${compoundDarkTheme} ${compoundDarkSemantic}
                ${telementTokens}
            }
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

    afterEach(async () => {
        await userEvent.unhover(document.body);
        document.body.innerHTML = "";
    });

    it.each([
        ["plain", false],
        ["rich text", true],
    ])("draws the composer's buttons, the send slot's too, as 36px circles in the %s composer", (_, richText) => {
        for (const button of renderComposerActions(richText)) {
            const box = button.getBoundingClientRect();
            expect([box.width, box.height]).toEqual([36, 36]);
            expect(cornerRadii(button)).toEqual({ x: 18, y: 18 });
        }
    });

    it.each([
        ["plain", false],
        ["rich text", true],
    ])(
        "rests the buttons' icons in the secondary gray and darkens them on hover in the %s composer",
        async (_, richText) => {
            const [formatting, emoji, microphone] = renderComposerActions(richText);
            const iconColor = (button: HTMLElement): string => getComputedStyle(button.querySelector("svg")!).color;

            expect(iconColor(formatting)).toBe(lightColor("--cpd-color-icon-secondary"));
            expect(iconColor(microphone)).toBe(lightColor("--cpd-color-icon-secondary"));
            await userEvent.hover(emoji);
            expect(iconColor(emoji)).toBe(lightColor("--cpd-color-icon-primary"));
        },
    );

    describe.each([
        ["light", "cpd-theme-light", false],
        ["dark", "cpd-theme-dark", false],
        ["light", "cpd-theme-light", true],
        ["dark", "cpd-theme-dark", true],
    ])("in the %s theme's %s composer", (_, theme, richText) => {
        const accent = (): string =>
            tokenColor("--cpd-color-icon-accent-primary", document.querySelector(`.${theme}`)!);

        it("draws Send as a bare paper plane in the accent, with no fill", () => {
            renderComposerActions(richText, theme);
            const send = document.querySelector<HTMLElement>('[aria-label="Send"]')!;

            expect(settledStyle(send).backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect(getComputedStyle(send.querySelector("svg")!).color).toBe(accent());
        });

        it("keeps the plane in the accent on the other buttons' hover background", async () => {
            const [, emoji, , send] = renderComposerActions(richText, theme);
            await userEvent.hover(emoji);
            const emojiHover = settledStyle(emoji).backgroundColor;

            await userEvent.hover(send);

            expect(settledStyle(send).backgroundColor).toBe(emojiHover);
            expect(getComputedStyle(send.querySelector("svg")!).color).toBe(accent());
        });
    });

    it.each([
        ["ltr", "none"],
        ["rtl", "matrix(-1, 0, 0, 1, 0, 0)"],
    ])("points the paper plane the way %s text runs", (dir, transform) => {
        renderComposerActions(false, "cpd-theme-light", dir);

        expect(getComputedStyle(document.querySelector('[aria-label="Send"] svg')!).transform).toBe(transform);
    });
});
