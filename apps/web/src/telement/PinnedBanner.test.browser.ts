/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import pinnedMessageBannerStyles from "../../res/css/views/rooms/_PinnedMessageBanner.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";

/** The pinned message banner under the room header, as PinnedMessageBanner renders it for two pinned messages. */
function render(dir: "ltr" | "rtl" = "ltr"): void {
    document.body.innerHTML = `
        <div dir="${dir}" class="cpd-theme-light" style="width: 600px; font-family: Inter">
            <div class="mx_PinnedMessageBanner" data-single-message="false">
                <button type="button" class="mx_PinnedMessageBanner_main">
                    <div class="mx_PinnedMessageBanner_content">
                        <div class="mx_PinnedMessageBanner_Indicators">
                            <div class="mx_PinnedMessageBanner_Indicator mx_PinnedMessageBanner_Indicator--active"></div>
                            <div class="mx_PinnedMessageBanner_Indicator"></div>
                        </div>
                        <svg class="mx_PinnedMessageBanner_PinIcon" width="16px" height="16px" viewBox="0 0 24 24">
                            <path d="M0 0h24v24H0z" />
                        </svg>
                        <div class="mx_PinnedMessageBanner_title">1 of 2 Pinned messages</div>
                        <span class="mx_PinnedMessageBanner_message">First pinned message</span>
                    </div>
                </button>
                <div class="mx_PinnedMessageBanner_actions"><button type="button">View all</button></div>
            </div>
        </div>
    `;
}

const box = (selector: string): DOMRect => document.querySelector(selector)!.getBoundingClientRect();

let stylesheet: HTMLStyleElement;

describe("Pinned message banner", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            ${compoundBase} ${compoundSemantic} ${compoundLightTheme}
            ${telementTokens}
            ${toBrowserCss(pinnedMessageBannerStyles, fontSizes, lightTheme)}
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("puts its accent line 12px in, on the room header's content edge, and its actions 12px from its end", () => {
        render();
        const banner = box(".mx_PinnedMessageBanner");

        expect(box(".mx_PinnedMessageBanner_Indicator--active").left - banner.left).toBe(12);
        expect(banner.right - box(".mx_PinnedMessageBanner_actions").right).toBe(12);
    });

    it("tilts its 16px pin as the room list does, in a 20px box like the other icons", () => {
        render();
        const pin = document.querySelector(".mx_PinnedMessageBanner_PinIcon")!;
        const style = getComputedStyle(pin);
        const title = box(".mx_PinnedMessageBanner_title");

        expect([style.width, style.height]).toEqual(["16px", "16px"]);
        expect(style.transform).toBe("matrix(0.707107, 0.707107, -0.707107, 0.707107, 0, 0)");
        expect(title.left - box(".mx_PinnedMessageBanner_Indicators").right).toBe(2 * 8 + 20);
    });

    it("tilts the pin the other way in a banner laid out right to left", () => {
        render("rtl");
        const style = getComputedStyle(document.querySelector(".mx_PinnedMessageBanner_PinIcon")!);

        expect(style.transform).toBe("matrix(0.707107, -0.707107, 0.707107, 0.707107, 0, 0)");
    });
});
