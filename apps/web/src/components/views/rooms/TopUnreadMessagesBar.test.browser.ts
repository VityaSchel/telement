/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChevronUpIcon, CloseIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import accessibleButtonStyles from "../../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import topUnreadMessagesBarStyles from "../../../../res/css/views/rooms/_TopUnreadMessagesBar.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../../test/telement/browserCss";

/** The DOM TopUnreadMessagesBar renders, inside the positioned timeline it sits on. */
function render(style = ""): void {
    const chevron = renderToStaticMarkup(createElement(ChevronUpIcon));
    const close = renderToStaticMarkup(createElement(CloseIcon));
    document.body.innerHTML = `
        <div class="cpd-theme-light" style="position: relative; width: 320px; height: 240px; ${style}">
            <div class="mx_TopUnreadMessagesBar">
                <div class="mx_AccessibleButton mx_TopUnreadMessagesBar_scrollUp" role="button" tabindex="0"
                    aria-label="Jump to first unread message.">${chevron}</div>
                <div class="mx_AccessibleButton mx_TopUnreadMessagesBar_markAsRead" role="button" tabindex="0"
                    aria-label="Mark all as read">${close}</div>
            </div>
        </div>
    `;
}

function rect(selector: string): DOMRect {
    return document.querySelector(selector)!.getBoundingClientRect();
}

function centerX(box: { left: number; right: number }): number {
    return (box.left + box.right) / 2;
}

/** The unread dot drawn above the button, as left and right edges in the page. */
function unreadDot(): { left: number; right: number } {
    const bar = document.querySelector(".mx_TopUnreadMessagesBar")!;
    const dot = getComputedStyle(bar, "::after");
    const left = bar.getBoundingClientRect().left + parseFloat(dot.left);
    const width = parseFloat(dot.width) + parseFloat(dot.borderLeftWidth) + parseFloat(dot.borderRightWidth);
    return { left, right: left + width };
}

let stylesheet: HTMLStyleElement;

describe("TopUnreadMessagesBar styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} }
            @layer app-web {
                ${accessibleButtonStyles}
                ${toBrowserCss(topUnreadMessagesBarStyles, lightTheme)}
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

    it("makes the jump button a 36px pill, as high as the other controls", () => {
        render();

        const button = rect(".mx_TopUnreadMessagesBar_scrollUp");
        expect(button.width).toBe(36);
        expect(button.height).toBe(36);
        expect(rect(".mx_TopUnreadMessagesBar").width).toBe(36);
        expect(cornerRadii(document.querySelector(".mx_TopUnreadMessagesBar_scrollUp")!)).toEqual({ x: 18, y: 18 });
    });

    it("takes the button's size from --tl-control-size", () => {
        render("--tl-control-size: 40px");

        const button = rect(".mx_TopUnreadMessagesBar_scrollUp");
        expect(button.width).toBe(40);
        expect(button.height).toBe(40);
        // A fixed radius would still look round at 36px, where the browser scales it down to fit
        expect(cornerRadii(document.querySelector(".mx_TopUnreadMessagesBar_scrollUp")!)).toEqual({ x: 20, y: 20 });
        expect(centerX(unreadDot())).toBeCloseTo(centerX(button), 1);
    });

    it("centers the unread dot, the mark-as-read button and the 24px chevron on the jump button", () => {
        render();

        const button = rect(".mx_TopUnreadMessagesBar_scrollUp");
        expect(centerX(unreadDot())).toBeCloseTo(centerX(button), 1);
        expect(centerX(rect(".mx_TopUnreadMessagesBar_markAsRead"))).toBeCloseTo(centerX(button), 1);

        const icon = document.querySelector<SVGElement>(".mx_TopUnreadMessagesBar_scrollUp svg")!;
        const iconStyle = getComputedStyle(icon);
        const iconBox = icon.getBoundingClientRect();
        expect(iconStyle.width).toBe("24px");
        expect(iconBox.left + parseFloat(iconStyle.paddingLeft) + 12).toBeCloseTo(centerX(button), 0);
        expect(iconBox.top + parseFloat(iconStyle.paddingTop) + 12).toBeCloseTo(button.top + button.height / 2, 0);
    });
});
