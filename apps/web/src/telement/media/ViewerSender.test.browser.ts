/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";

// The package doesn't export its stylesheets on their own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../packages/shared-components/src/telement/tokens.css?raw";
// eslint-disable-next-line no-restricted-imports
import videoLightboxStyles from "../../../../../packages/shared-components/src/telement/media/VideoLightboxView/VideoLightboxView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import messageTimestampStyles from "../../../../../packages/shared-components/src/room/timeline/event-tile/timestamp/MessageTimestampView/MessageTimestampView.module.css?raw";
import commonStyles from "../../../res/css/_common.pcss?raw";
import fontSizes from "../../../res/css/_font-sizes.pcss?raw";
import imageViewStyles from "../../../res/css/views/elements/_ImageView.pcss?raw";
import lightTheme from "../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../test/telement/browserCss";
import { tokenColor } from "../../test/telement/computedStyle";
import { loadInter } from "../../test/telement/fonts";

const DATE = "Thu, Nov 12, 2026, 10:42 AM";
const HREF = "https://matrix.to/#/!room:example.org/$event";

let stylesheet: HTMLStyleElement;
let removeInter: () => void;

/** ImageView's sender: the name, and the date as MessageTimestampView renders it with ImageView's class. */
const imageSender = `
    <div class="cpd-theme-dark mx_ImageView" data-testid="image">
        <div class="mx_ImageView_panel"><div class="mx_ImageView_info_wrapper">
            <div class="mx_ImageView_info">
                <div class="mx_ImageView_info_sender">Alice</div>
                <a class="mx_MessageTimestamp content" href="${HREF}">${DATE}</a>
            </div>
        </div></div>
    </div>
`;

/** VideoLightboxView's sender, with the module's class names; `kind` is what the view gives the date's link. */
const videoSender = (testId: string, kind: string | null = "primary"): string => `
    <div class="cpd-theme-dark root" data-testid="${testId}">
        <div class="topBar"><div class="sender"><div class="senderText">
            <span class="senderName">Alice</span>
            <a class="date"${kind ? ` data-kind="${kind}"` : ""} href="${HREF}">${DATE}</a>
        </div></div></div>
    </div>
`;

/** Puts `html` in the app's theme, with the emoji font the theme defines, which the app's font stack refers to. */
function render(html: string): void {
    document.body.innerHTML = `<div class="cpd-theme-light" style="--emoji-font-family: ''">${html}</div>`;
}

function get(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`nothing matches ${selector}`);
    return element;
}

function text(element: Element): object {
    const style = getComputedStyle(element);
    return {
        family: style.fontFamily,
        size: style.fontSize,
        weight: style.fontWeight,
        lineHeight: style.lineHeight,
        color: style.color,
        height: element.getBoundingClientRect().height,
    };
}

describe("media viewers' sender", () => {
    beforeAll(async () => {
        removeInter = await loadInter();
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundDarkTheme} ${compoundDarkSemantic} }
            @layer shared-components { ${telementTokens} ${videoLightboxStyles} ${messageTimestampStyles} }
            @layer app-web {
                ${toBrowserCss(commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(imageViewStyles, fontSizes, lightTheme)}
            }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
        removeInter();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("looks the same in the image and the video viewer: a semibold name over a regular, secondary date", () => {
        render(imageSender + videoSender("video"));
        const dark = get("[data-testid=video]");

        expect(text(get(".mx_ImageView_info_sender"))).toEqual(text(get("[data-testid=video] .senderName")));
        expect(text(get(".mx_ImageView_info .mx_MessageTimestamp"))).toEqual(text(get("[data-testid=video] .date")));
        expect(getComputedStyle(get(".mx_ImageView_info_sender")).fontWeight).toBe("600");
        expect(getComputedStyle(get("[data-testid=video] .date")).fontWeight).toBe("400");
        expect(getComputedStyle(get("[data-testid=video] .date")).color).toBe(
            tokenColor("--cpd-color-text-secondary", dark),
        );
    });

    it("keeps the app's link color off the video viewer's date by giving it a kind, as Compound's links have", () => {
        render(videoSender("with-kind") + videoSender("without-kind", null));
        const dark = get("[data-testid=with-kind]");

        expect(getComputedStyle(get("[data-testid=with-kind] .date")).color).toBe(
            tokenColor("--cpd-color-text-secondary", dark),
        );
        // Without one, _common.pcss's legacy link color, in the later app layer, wins over the module's
        expect(getComputedStyle(get("[data-testid=without-kind] .date")).color).not.toBe(
            tokenColor("--cpd-color-text-secondary", dark),
        );
    });
});
