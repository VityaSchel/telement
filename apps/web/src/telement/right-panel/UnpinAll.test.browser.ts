/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundLightHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-base.css?raw";
import compoundLightHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-semantic.css?raw";
import compoundDarkHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-hc-base.css?raw";
import compoundDarkHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-hc-semantic.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../../res/css/_common.pcss?raw";
import fontSizes from "../../../res/css/_font-sizes.pcss?raw";
import rightPanelStyles from "../../../res/css/structures/_RightPanel.pcss?raw";
import focusRingStyles from "../../../res/css/telement/FocusRing.pcss?raw";
import telegramComposerStyles from "../../../res/css/telement/_TelegramComposer.pcss?raw";
import baseCardStyles from "../../../res/css/views/right_panel/_BaseCard.pcss?raw";
import pinnedMessagesCardStyles from "../../../res/css/views/right_panel/_PinnedMessagesCard.pcss?raw";
import messageComposerStyles from "../../../res/css/views/rooms/_MessageComposer.pcss?raw";
import sendMessageComposerStyles from "../../../res/css/views/rooms/_SendMessageComposer.pcss?raw";
import lightTheme from "../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../test/telement/browserCss";
import { contrastOver, hoveredFill, pressedFill, settledStyle, tokenColor } from "../../test/telement/computedStyle";

const THEMES = ["cpd-theme-light", "cpd-theme-dark", "cpd-theme-light-hc", "cpd-theme-dark-hc"];

/** The room's composer with one line of text, docked at the bottom, beside the pinned messages with their Unpin all. */
function render(theme = "cpd-theme-light", pins = 1, dir = "ltr"): HTMLElement {
    document.body.innerHTML = `
        <div class="${theme}" dir="${dir}" style="display: flex; width: 900px; height: 500px; background: var(--cpd-color-bg-canvas-default)">
            <div style="display: flex; flex: 1; flex-direction: column; justify-content: flex-end">
                <div class="mx_MessageComposer"><div class="mx_MessageComposer_wrapper"><div class="mx_MessageComposer_row">
                    <div class="mx_TelementAttachButton" style="display: flex; --cpd-icon-button-size: 36px"><svg width="20" height="20"></svg></div>
                    <div class="mx_SendMessageComposer"><div class="mx_BasicMessageComposer"><div class="mx_BasicMessageComposer_input" role="textbox"><div>Hi</div></div></div></div>
                    <div class="mx_MessageComposer_actions"><div class="mx_MessageComposer_button" role="button"><svg></svg></div></div>
                </div></div></div>
            </div>
            <div class="mx_RightPanel" style="width: 360px">
                <div class="mx_BaseCard mx_PinnedMessagesCard">
                    <div class="mx_BaseCard_header"></div>
                    <div class="mx_AutoHideScrollbar">
                        <div class="mx_PinnedMessagesCard_wrapper mx_PinnedMessagesCard_wrapper_unpin_all" role="list">
                            ${'<div role="listitem" style="flex: none; height: 60px">Pin</div>'.repeat(pins)}
                        </div>
                        <button type="button" class="mx_PinnedMessagesCard_unpin">Unpin all messages</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    return get(`.${theme}`);
}

function get(selector: string): HTMLElement {
    return document.querySelector<HTMLElement>(selector)!;
}

const box = (selector: string): DOMRect => get(selector).getBoundingClientRect();

let stylesheet: HTMLStyleElement;

describe("Unpin all messages", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, shared-components, app-web;
            @layer compound-tokens {
                ${focusRingStyles}
                ${compoundBase} ${compoundSemantic}
                ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
                ${compoundLightHcTheme} ${compoundLightHcSemantic} ${compoundDarkHcTheme} ${compoundDarkHcSemantic}
            }
            @layer shared-components { ${telementTokens} }
            @layer app-web {
                ${[
                    commonStyles,
                    rightPanelStyles,
                    telegramComposerStyles,
                    baseCardStyles,
                    pinnedMessagesCardStyles,
                    messageComposerStyles,
                    sendMessageComposerStyles,
                ]
                    .map((styles) => toBrowserCss(styles, commonStyles, lightTheme, fontSizes))
                    .join("\n")}
                body { margin: 0; }
            }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(async () => {
        await userEvent.unhover(document.body);
        document.documentElement.style.fontSize = "";
        document.body.innerHTML = "";
    });

    it.each([14, 16, 20, 24])("is as tall as the composer beside it with one line of text, at %ipx", (size) => {
        document.documentElement.style.fontSize = `${size}px`;
        render();
        const composer = box(".mx_MessageComposer_wrapper");
        const row = box(".mx_PinnedMessagesCard_unpin");

        expect([row.top, row.bottom]).toEqual([composer.top, composer.bottom]);
    });

    it("is 51px tall in the default font size, the composer's 50px line of text under its 1px border", () => {
        render();

        expect(box(".mx_PinnedMessagesCard_unpin").height).toBe(51);
    });

    it.each(["ltr", "rtl"])(
        "is a row across the card's bottom under the composer's line, without a shadow (%s)",
        (dir) => {
            render("cpd-theme-light", 1, dir);
            const card = box(".mx_PinnedMessagesCard");
            const row = box(".mx_PinnedMessagesCard_unpin");
            const style = getComputedStyle(get(".mx_PinnedMessagesCard_unpin"));
            const composer = getComputedStyle(get(".mx_MessageComposer_wrapper"));

            expect([row.left, row.right, row.bottom]).toEqual([card.left, card.right, card.bottom]);
            expect(style.borderTop).toBe(composer.borderTop);
            expect(style.borderTopWidth).toBe("1px");
            expect([style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth]).toEqual([
                "0px",
                "0px",
                "0px",
            ]);
            expect([style.boxShadow, style.borderRadius]).toEqual(["none", "0px"]);
            expect([style.paddingLeft, style.paddingRight]).toEqual([composer.paddingLeft, composer.paddingRight]);
        },
    );

    it("leaves the list of pins all of the card above it, which scrolls on its own", () => {
        render("cpd-theme-light", 20);
        const list = get(".mx_PinnedMessagesCard_wrapper");
        list.scrollTop = list.scrollHeight;

        expect(list.scrollTop).toBeGreaterThan(0);
        expect(list.getBoundingClientRect().bottom).toBe(box(".mx_PinnedMessagesCard_unpin").top);
        expect(box("[role=listitem]:last-child").bottom).toBeLessThanOrEqual(box(".mx_PinnedMessagesCard_unpin").top);
        expect(get(".mx_PinnedMessagesCard .mx_AutoHideScrollbar").scrollHeight).toBe(
            get(".mx_PinnedMessagesCard .mx_AutoHideScrollbar").clientHeight,
        );
    });

    it.each(THEMES)("is filled across when hovered and pressed, its label in the accent (%s)", async (theme) => {
        const scope = render(theme);
        const row = get(".mx_PinnedMessagesCard_unpin");
        const page = getComputedStyle(scope).backgroundColor;

        expect(getComputedStyle(row).color).toBe(tokenColor("--cpd-color-text-action-accent", scope));
        expect(await hoveredFill(row)).toBe(tokenColor("--cpd-color-bg-action-secondary-hovered", scope));
        expect(contrastOver(settledStyle(row).backgroundColor, page)).toBeGreaterThan(1.05);
        expect(await pressedFill(row)).toBe(tokenColor("--cpd-color-bg-action-secondary-pressed", scope));
    });

    it("rings inside itself when the keyboard is on it, where the card would clip a ring around it", async () => {
        render();
        await userEvent.keyboard("{Tab}");
        const row = get(".mx_PinnedMessagesCard_unpin");
        for (let i = 0; i < 5 && document.activeElement !== row; i++) await userEvent.keyboard("{Tab}");

        expect(document.activeElement).toBe(row);
        expect(getComputedStyle(row).outline).toContain("solid 2px");
        expect(getComputedStyle(row).outlineOffset).toBe("-2px");
    });
});
