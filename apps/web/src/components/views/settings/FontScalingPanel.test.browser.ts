/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";

// The package's built bundle needs Node's `process`, so the preview's message is written out below and its stylesheet
// is loaded from source, with its local class names
// eslint-disable-next-line no-restricted-imports
import eventTileViewStyles from "../../../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileView.module.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../../../res/css/_common.pcss?raw";
import fontScalingPanelStyles from "../../../../res/css/views/settings/_FontScalingPanel.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../../test/telement/browserCss";
import { tokenColor } from "../../../test/telement/computedStyle";

/**
 * The font size preview card with your own message in a bubble, as EventTilePreview renders it: the last of its run.
 * It is on the settings dialog's surface, raised a gray step in dark themes as .mx_Dialog is (_common.pcss).
 */
const preview = (theme = "cpd-theme-light"): string => `
    <div class="${theme}" style="width: 480px">
        <div class="raised">
            <div class="mx_FontScalingPanel_preview" role="presentation">
                <div class="root mx_EventTile stateOwnEvent stateLastInSection layoutBubble">
                    <div class="line mx_EventTile_line">
                        <div class="slotBody">
                            <div class="mx_MTextBody mx_EventTile_content" data-event-layout="bubble">
                                <div class="mx_EventTile_body">Hey you. You're the best!</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;
const PREVIEW = preview();

/** The card's box inside its border. */
function cardInner(card: Element): { top: number; right: number; bottom: number } {
    const box = card.getBoundingClientRect();
    const style = getComputedStyle(card);
    return {
        top: box.top + parseFloat(style.borderTopWidth),
        right: box.right - parseFloat(style.borderRightWidth),
        bottom: box.bottom - parseFloat(style.borderBottomWidth),
    };
}

let stylesheet: HTMLStyleElement;

describe("The font size preview", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic}
                ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
            }
            @layer shared-components {
                ${telementTokens}
                ${eventTileViewStyles.replace(/:global\(([^)]*)\)/g, "$1")}
            }
            @layer app-web {
                ${toBrowserCss(fontScalingPanelStyles, lightTheme)}
                ${toBrowserCss(".raised { @mixin floatingSurface; }", commonStyles)}
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

    it("leaves only the card's padding under its bubble, not the gap the timeline leaves after a run", () => {
        document.body.innerHTML = PREVIEW;
        const card = document.querySelector(".mx_FontScalingPanel_preview")!;
        const bubble = document.querySelector(".line")!;
        const { borderBottomWidth, paddingBottom } = getComputedStyle(card);

        expect(card.getBoundingClientRect().bottom - parseFloat(borderBottomWidth)).toBe(
            bubble.getBoundingClientRect().bottom + parseFloat(paddingBottom),
        );
    });

    it("puts your own bubble at the card's end, with its tail ending at the card's padding", () => {
        document.body.innerHTML = PREVIEW;
        const card = document.querySelector(".mx_FontScalingPanel_preview")!;
        const bubble = document.querySelector(".line")!;
        const tail = getComputedStyle(bubble, "::after");
        const { borderRightWidth, paddingRight } = getComputedStyle(card);

        expect(tail.width).toBe("6px");
        expect(bubble.getBoundingClientRect().right - parseFloat(tail.right)).toBe(
            card.getBoundingClientRect().right - parseFloat(borderRightWidth) - parseFloat(paddingRight),
        );
    });

    it("puts the bubble as far from the card's top and bottom as its tail is from the card's end", () => {
        document.body.innerHTML = PREVIEW;
        const card = cardInner(document.querySelector(".mx_FontScalingPanel_preview")!);
        const bubble = document.querySelector(".line")!;
        const tailEnd = bubble.getBoundingClientRect().right - parseFloat(getComputedStyle(bubble, "::after").right);
        const endInset = card.right - tailEnd;

        expect(endInset).toBe(16);
        expect([
            bubble.getBoundingClientRect().top - card.top,
            card.bottom - bubble.getBoundingClientRect().bottom,
        ]).toEqual([endInset, endInset]);
    });

    it("rounds the card by 8, as the layout cards and theme chips above it", () => {
        document.body.innerHTML = PREVIEW;

        expect(cornerRadii(document.querySelector(".mx_FontScalingPanel_preview")!)).toEqual({ x: 8, y: 8 });
    });

    it.each(["cpd-theme-light", "cpd-theme-dark"])(
        "outlines the card in the separator of the dialog it is in, which a dark theme raises a step (%s)",
        (theme) => {
            document.body.innerHTML = preview(theme);
            const card = document.querySelector(".mx_FontScalingPanel_preview")!;

            expect(getComputedStyle(card).borderTopColor).toBe(
                tokenColor("--cpd-color-separator-primary", document.querySelector(".raised")!),
            );
        },
    );
});
