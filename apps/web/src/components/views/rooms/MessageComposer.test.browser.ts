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
import { press, settledStyle, tokenColor } from "../../../test/telement/computedStyle";

const ICON = `<svg viewBox="0 0 24 24"><rect width="24" height="24" /></svg>`;

/** The composer's action buttons, as MessageComposer renders them with or without the rich text editor. */
function renderComposerActions(richText: boolean): HTMLElement[] {
    document.body.innerHTML = `
        <div class="cpd-theme-light mx_MessageComposer${richText ? " mx_MessageComposer_wysiwyg" : ""}">
            <div class="mx_MessageComposer_actions">
                <div class="mx_AccessibleButton mx_MessageComposer_button" role="button" aria-label="Formatting">${ICON}</div>
                <div class="mx_AccessibleButton mx_MessageComposer_button" role="button" aria-label="Emoji">${ICON}</div>
                <div class="mx_AccessibleButton mx_MessageComposer_sendMessage" role="button" aria-label="Send">${ICON}</div>
                <!-- A <button> so that holding Space presses it; the rules don't depend on the element -->
                <button class="mx_AccessibleButton mx_MessageComposer_sendMessage" aria-label="Pressed send">${ICON}</button>
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
            @layer compound-tokens { ${compoundTokens} ${compoundSemantic} ${compoundLightTheme} ${telementTokens} }
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

    it.each([
        ["plain", false],
        ["rich text", true],
    ])(
        "rests the buttons' icons in the secondary gray and darkens them on hover in the %s composer",
        async (_, richText) => {
            const [formatting, emoji] = renderComposerActions(richText);
            const iconColor = (button: HTMLElement): string => getComputedStyle(button.querySelector("svg")!).color;

            expect(iconColor(formatting)).toBe(lightColor("--cpd-color-icon-secondary"));
            await userEvent.hover(emoji);
            expect(iconColor(emoji)).toBe(lightColor("--cpd-color-icon-primary"));
        },
    );

    it("fills the send button with the accent, deeper on hover and press, with the arrow on top", async () => {
        renderComposerActions(false);
        const send = document.querySelector<HTMLElement>('[aria-label="Send"]')!;

        expect(settledStyle(send).backgroundColor).toBe(lightColor("--cpd-color-bg-accent-rest"));
        expect(getComputedStyle(send.querySelector("svg")!).color).toBe(
            lightColor("--cpd-color-icon-on-solid-primary"),
        );
        await userEvent.hover(send);
        expect(settledStyle(send).backgroundColor).toBe(lightColor("--cpd-color-bg-accent-hovered"));
        const pressed = await press(document.querySelector<HTMLElement>('[aria-label="Pressed send"]')!);
        expect(pressed.backgroundColor).toBe(lightColor("--cpd-color-bg-accent-pressed"));
    });
});
