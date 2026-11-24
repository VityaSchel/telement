/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Field, Label, RadioControl, Root } from "@vector-im/compound-web";
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
import commonStyles from "../../../../res/css/_common.pcss?raw";
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
                ${toBrowserCss(layoutSwitcherStyles, lightTheme, commonStyles)}
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

    it("puts your own bubble at the card's end, its tail as far inside the border as the radio is from the card's edge", () => {
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
        // The header's radio is 12px from the card's edge, its border included, as on the theme chips
        expect(cardEnd - tailEnd).toBe(label.getBoundingClientRect().left - card.getBoundingClientRect().left);
        expect(bubble.getBoundingClientRect().left - cardStart).toBeGreaterThan(cardEnd - tailEnd);
    });

    it("heads the card with a 44px row, the radio 12px from the card's top and start, as the theme chips", () => {
        document.body.innerHTML = `<div class="cpd-theme-light" style="width: 307px">${renderToStaticMarkup(
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
                            createElement(RadioControl, { name: "layout", value: "bubble" }),
                            createElement("span", {}, "Message bubbles"),
                        ),
                        createElement("hr", { className: "mxLayoutSwitcher_LayoutSelector_LayoutRadio_separator" }),
                    ),
                ),
            ),
        )}</div>`;
        const card = document.querySelector(".mxLayoutSwitcher_LayoutSelector_LayoutRadio")!.getBoundingClientRect();
        const radio = document.querySelector("input")!.getBoundingClientRect();
        const separator = document
            .querySelector(".mxLayoutSwitcher_LayoutSelector_LayoutRadio_separator")!
            .getBoundingClientRect();

        expect(separator.bottom - card.top).toBe(44);
        expect([radio.width, radio.height]).toEqual([20, 20]);
        expect([radio.left - card.left, radio.top - card.top]).toEqual([12, 12]);
        expect(separator.top - radio.bottom).toBe(radio.top - card.top - 1);
    });

    it("writes the message in the weight of the timeline's, not of the label it is in", () => {
        renderBubbleOption();
        const label = getComputedStyle(document.querySelector("label")!);
        const message = getComputedStyle(document.querySelector(".mx_EventTile_body")!);

        expect(label.fontWeight).toBe("500");
        expect([message.fontWeight, message.fontSize]).toEqual(["400", "15px"]);
    });

    it.each([
        // The tile's avatar is 8px inside it, under 18px of padding
        ["group", { marginInlineStart: "-8px", marginBlockStart: "-12px" }],
        // The tile pads 4px over its line
        ["irc", { marginInlineStart: "0px", marginBlockStart: "-4px" }],
    ])("puts the %s layout's message on the preview's edges", (layout, margins) => {
        renderBubbleOption();
        document.querySelector(".mx_EventTile_content")!.setAttribute("data-event-layout", layout);
        const { marginInlineStart, marginBlockStart, marginInlineEnd, marginBlockEnd } = getComputedStyle(
            document.querySelector(".mx_EventTile")!,
        );

        expect({ marginInlineStart, marginBlockStart }).toEqual(margins);
        expect([marginInlineEnd, marginBlockEnd]).toEqual(["0px", "0px"]);
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
