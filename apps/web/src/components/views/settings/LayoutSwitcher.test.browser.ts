/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Field, Label, Root } from "@vector-im/compound-web";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package's built bundle needs Node's `process`, so the preview's message is written out below and its stylesheet
// is loaded from source, with its local class names
// eslint-disable-next-line no-restricted-imports
import eventTileViewStyles from "../../../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileView.module.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import layoutSwitcherStyles from "../../../../res/css/views/settings/_LayoutSwitcher.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../../test/telement/browserCss";

/** Your own message in a bubble, as EventTilePreview renders it: the last of its run. */
const TILE = `
    <div class="root mx_EventTile stateOwnEvent stateLastInSection layoutBubble">
        <div class="line mx_EventTile_line">
            <div class="slotBody">
                <div class="mx_MTextBody mx_EventTile_content" data-event-layout="bubble">
                    <div class="mx_EventTile_body">Hey you. You're the best!</div>
                </div>
            </div>
        </div>
    </div>
`;

/** The "Message bubbles" option of the layout switcher, as LayoutRadio lays it out, in a 307px settings column. */
function renderBubbleOption(): void {
    const option = renderToStaticMarkup(
        createElement(
            Root,
            { className: "mx_LayoutSwitcher_LayoutSelector" },
            createElement(
                Field,
                { name: "layout", className: "mxLayoutSwitcher_LayoutSelector_LayoutRadio" },
                createElement(
                    Label,
                    {},
                    createElement(
                        "div",
                        { className: "mxLayoutSwitcher_LayoutSelector_LayoutRadio_inline" },
                        createElement("span", {}, "Message bubbles"),
                    ),
                    createElement("hr", { className: "mxLayoutSwitcher_LayoutSelector_LayoutRadio_separator" }),
                    createElement("div", {
                        className: "mxLayoutSwitcher_LayoutSelector_LayoutRadio_EventTilePreview",
                        role: "presentation",
                        dangerouslySetInnerHTML: { __html: TILE },
                    }),
                ),
            ),
        ),
    );
    document.body.innerHTML = `<div class="cpd-theme-light" style="width: 307px">${option}</div>`;
}

let stylesheet: HTMLStyleElement;

describe("The layout switcher's bubble preview", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components {
                ${telementTokens}
                ${eventTileViewStyles.replace(/:global\(([^)]*)\)/g, "$1")}
            }
            @layer app-web {
                ${toBrowserCss(layoutSwitcherStyles, lightTheme)}
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

    it("puts your own bubble at the card's end, its tail as far from that end as the option's label is from the start", () => {
        renderBubbleOption();
        const card = document.querySelector(".mxLayoutSwitcher_LayoutSelector_LayoutRadio")!;
        const label = document.querySelector(".mxLayoutSwitcher_LayoutSelector_LayoutRadio_inline")!;
        const bubble = document.querySelector(".line")!;
        const tail = getComputedStyle(bubble, "::after");
        const { borderLeftWidth, borderRightWidth } = getComputedStyle(card);
        const cardStart = card.getBoundingClientRect().left + parseFloat(borderLeftWidth);
        const cardEnd = card.getBoundingClientRect().right - parseFloat(borderRightWidth);
        const tailEnd = bubble.getBoundingClientRect().right - parseFloat(tail.right);

        expect(tail.width).toBe("6px");
        expect(cardEnd - tailEnd).toBe(label.getBoundingClientRect().left - cardStart);
        expect(bubble.getBoundingClientRect().left - cardStart).toBeGreaterThan(cardEnd - tailEnd);
    });

    it("puts your own bubble as far below the separator and above the card's bottom as its tail is from the card's end", () => {
        renderBubbleOption();
        const card = document.querySelector(".mxLayoutSwitcher_LayoutSelector_LayoutRadio")!;
        const separator = document.querySelector(".mxLayoutSwitcher_LayoutSelector_LayoutRadio_separator")!;
        const bubble = document.querySelector(".line")!.getBoundingClientRect();
        const tail = getComputedStyle(document.querySelector(".line")!, "::after");
        const { borderRightWidth, borderBottomWidth } = getComputedStyle(card);
        const cardEnd = card.getBoundingClientRect().right - parseFloat(borderRightWidth);
        const cardBottom = card.getBoundingClientRect().bottom - parseFloat(borderBottomWidth);
        const endInset = cardEnd - (bubble.right - parseFloat(tail.right));

        expect(endInset).toBe(12);
        expect([bubble.top - separator.getBoundingClientRect().bottom, cardBottom - bubble.bottom]).toEqual([
            endInset,
            endInset,
        ]);
    });
});
