/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";

// The package's built bundle needs Node's `process`, so EventTileView's DOM is written out below and the stylesheets
// are loaded from source
// eslint-disable-next-line no-restricted-imports
import eventTileViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import textualBodyStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/TextualBodyView/TextualBody.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import profileStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/DisambiguatedProfile/DisambiguatedProfile.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import timestampStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/timestamp/MessageTimestampView/MessageTimestampView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import imageBodyStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/MImageBodyView/ImageBodyView.module.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import accessibleButtonStyles from "../../res/css/views/elements/_AccessibleButton.pcss?raw";
import genericEventListSummaryStyles from "../../res/css/views/elements/_GenericEventListSummary.pcss?raw";
import ircLayoutStyles from "../../res/css/views/rooms/_IRCLayout.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { loadInter } from "../test/telement/fonts";

/** A CSS module's stylesheet with its class names prefixed by the module's name, so that two modules' `.root`s differ. */
function moduleStyles(css: string, name: string): string {
    return css.replace(
        /:global\(([^)]*)\)|\.(?=[a-z_])([\w-]+)/gi,
        (_, global, local) => global ?? `.${name}_${local}`,
    );
}

/** A text message as TextualBody renders it, without whitespace between the tags, which its pre-wrap would show. */
const text = (body: string): string =>
    `<div class="mx_MTextBody mx_EventTile_content TextualBody_root TextualBody_text" data-event-layout="irc">` +
    `<div class="mx_EventTile_body translate" dir="auto">${body}</div></div>`;

const PICTURE = `
    <div class="mx_ImageBody ImageBodyView_root">
        <a class="ImageBodyView_link">
            <div class="mx_ImageBody_container ImageBodyView_thumbnailContainer" style="width: 120px; height: 80px">
                <div class="ImageBodyView_mediaContent"></div>
            </div>
        </a>
    </div>
`;

/** A collapsed summary of membership events, as GenericEventListSummary renders it. */
const SUMMARY = `
    <li class="mx_GenericEventListSummary" data-expanded="false" data-layout="irc">
        <button class="mx_AccessibleButton mx_GenericEventListSummary_toggle mx_AccessibleButton_hasKind mx_AccessibleButton_kind_link_inline" aria-expanded="false">
            expand
        </button>
        <div class="mx_EventTile_line">
            <div class="mx_EventTile_info">
                <span class="mx_GenericEventListSummary_avatars"></span>
                <span class="mx_TextualEvent mx_GenericEventListSummary_summary">Alice joined</span>
            </div>
        </div>
    </li>
`;

/** A message in the IRC layout as EventTileView renders it: time, avatar and sender, then the message. */
function row(body: string, { media = false, info = false } = {}): string {
    const line = media ? "line mx_EventTile_line lineMedia lineTimestampOverMedia" : "line mx_EventTile_line";
    return `
        <li class="root mx_EventTile layoutIrc${info ? " stateInfo" : ""}" data-testid="event-tile">
            <div data-testid="event-tile-slot-timestamp" class="slotTimestamp">
                <a class="mx_MessageTimestamp MessageTimestampView_content">12:41</a>
            </div>
            <div data-testid="event-tile-slot-avatar" class="slotAvatar"><span style="width: 14px; height: 14px"></span></div>
            <div data-testid="event-tile-slot-sender" class="slotSender">
                <div class="mx_DisambiguatedProfile DisambiguatedProfile_disambiguatedProfile" data-event-layout="irc">
                    <span class="mx_DisambiguatedProfile_displayName DisambiguatedProfile_disambiguatedProfile_displayName">Alice</span>
                </div>
            </div>
            <div data-testid="event-tile-line" class="${line}">
                <div data-testid="event-tile-slot-body" class="slotBody">${body}</div>
            </div>
        </li>
    `;
}

function render(...rows: string[]): void {
    document.body.innerHTML = `
        <ol class="mx_IRCLayout cpd-theme-light" style="width: 600px; margin: 0; padding: 0; list-style: none; font-family: Inter">
            ${rows.join("")}
        </ol>
    `;
}

function lines(): DOMRect[] {
    return [...document.querySelectorAll(".line")].map((line) => line.getBoundingClientRect());
}

/** The box of the first line of `element`'s text. */
function firstTextLine(element: Element): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getClientRects()[0];
}

let stylesheet: HTMLStyleElement;
let unloadInter: () => void;

describe("IRC layout", () => {
    beforeAll(async () => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            @layer shared-components {
                ${telementTokens}
                ${eventTileViewStyles.replace(/:global\(([^)]*)\)/g, "$1")}
                ${moduleStyles(textualBodyStyles, "TextualBody")}
                ${moduleStyles(imageBodyStyles, "ImageBodyView")}
                ${moduleStyles(profileStyles, "DisambiguatedProfile")}
                ${moduleStyles(timestampStyles, "MessageTimestampView")}
            }
            @layer app-web {
                ${toBrowserCss(commonStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(ircLayoutStyles, fontSizes, lightTheme)}
                ${toBrowserCss(accessibleButtonStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(genericEventListSummaryStyles, fontSizes, lightTheme)}
            }
        `;
        document.head.append(stylesheet);
        // The sender and the message are compared to the pixel, so with the app's font
        unloadInter = await loadInter();
    });

    afterAll(() => {
        stylesheet.remove();
        unloadInter();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("keeps messages 4px apart, so that a message after a picture doesn't read as its caption", () => {
        render(
            row(text("Here's the view.")),
            row(PICTURE, { media: true }),
            row(text("Run pnpm i18n")),
            row(text("Ok")),
        );
        const [first, picture, afterPicture, last] = lines();

        expect(picture.top - first.bottom).toBe(4);
        expect(afterPicture.top - picture.bottom).toBe(4);
        expect(last.top - afterPicture.bottom).toBe(4);
    });

    it("keeps state events together, without the gap between messages", () => {
        render(
            row(text("Morning!")),
            row(text("Alice joined"), { info: true }),
            row(text("Bob joined"), { info: true }),
        );
        const [message, joined, joinedToo] = lines();

        expect(joined.top - message.bottom).toBe(0);
        expect(joinedToo.top - joined.bottom).toBe(0);
    });

    it("keeps a collapsed summary of events 4px from the messages on either side", () => {
        render(row(text("Morning!")), SUMMARY, row(text("After the summary")));
        const [before, after] = lines();
        const summary = document
            .querySelector(".mx_GenericEventListSummary > .mx_EventTile_line")!
            .getBoundingClientRect();

        expect(summary.top - before.bottom).toBe(4);
        expect(after.top - summary.bottom).toBe(4);
    });

    it("puts the time and the sender on the first line of a text message", () => {
        render(row(text("Morning!")), row(text("The build on main is green again.")));

        for (const tile of document.querySelectorAll(".root")) {
            const sender = firstTextLine(tile.querySelector(".mx_DisambiguatedProfile_displayName")!);
            const time = firstTextLine(tile.querySelector(".mx_MessageTimestamp")!);
            const message = firstTextLine(tile.querySelector(".mx_EventTile_body")!);

            expect(sender.top).toBe(message.top);
            expect(sender.bottom).toBe(message.bottom);
            expect(Math.abs(time.top + time.height / 2 - (sender.top + sender.height / 2))).toBeLessThanOrEqual(0.5);
        }
    });

    it("keeps IRC's 44px minimum for a small picture, as its time has a column of its own rather than a badge", () => {
        const small = PICTURE.replace("width: 120px; height: 80px", "width: 30px; height: 30px");
        render(row(text("A small one")), row(small, { media: true }));
        const picture = document.querySelector(".ImageBodyView_thumbnailContainer")!.getBoundingClientRect();
        const time = document.querySelectorAll(".mx_MessageTimestamp")[1].getBoundingClientRect();

        expect([picture.width, picture.height]).toEqual([44, 44]);
        expect(time.right).toBeLessThanOrEqual(picture.left);
    });

    it("puts the time and the sender's line at the top of a picture", () => {
        render(row(text("Here's the view.")), row(PICTURE, { media: true }));
        const tile = document.querySelectorAll(".root")[1];
        const picture = tile.querySelector(".ImageBodyView_thumbnailContainer")!.getBoundingClientRect();

        expect(tile.querySelector(".slotSender")!.getBoundingClientRect().top).toBe(picture.top);
        expect(tile.querySelector(".slotTimestamp")!.getBoundingClientRect().top).toBe(picture.top);
    });
});
