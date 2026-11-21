/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar } from "@vector-im/compound-web";
import { CheckIcon, PinSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundLightHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-base.css?raw";
import compoundLightHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package's built bundle needs Node's `process`, so the views' DOM is written out below and their stylesheets are
// loaded from source
// eslint-disable-next-line no-restricted-imports
import eventTileViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import messageTimestampViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/timestamp/MessageTimestampView/MessageTimestampView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import messageStatusViewStyles from "../../../../packages/shared-components/src/telement/room/timeline/MessageStatusView/MessageStatusView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import { DoubleCheckIcon } from "../../../../packages/shared-components/src/telement/core/icons/DoubleCheckIcon";
// eslint-disable-next-line no-restricted-imports
import pinnedMarkViewStyles from "../../../../packages/shared-components/src/telement/room/timeline/PinnedMarkView/PinnedMarkView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import textualBodyStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/TextualBodyView/TextualBody.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import decryptionFailureStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/DecryptionFailureBodyView/DecryptionFailureBodyView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import textualEventViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/TextualEventView/TextualEventView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import disambiguatedProfileStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/DisambiguatedProfile/DisambiguatedProfile.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import eventTileBubbleStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileBubble/EventTileBubble.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import readMarkerStyles from "../../../../packages/shared-components/src/room/timeline/ReadMarker/ReadMarker.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import reactionsRowStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/reactions/ReactionsRow/ReactionsRow.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import reactionsRowButtonStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/reactions/ReactionsRowButton/ReactionsRowButton.module.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import roomViewStyles from "../../res/css/structures/_RoomView.pcss?raw";
import baseAvatarStyles from "../../res/css/views/avatars/_BaseAvatar.pcss?raw";
import cryptoEventStyles from "../../res/css/views/messages/_common_CryptoEvent.pcss?raw";
import threadPanelStyles from "../../res/css/views/right_panel/_ThreadPanel.pcss?raw";
import eventBubbleTileStyles from "../../res/css/views/rooms/_EventBubbleTile.pcss?raw";
import genericEventListSummaryStyles from "../../res/css/views/elements/_GenericEventListSummary.pcss?raw";
import textualEventStyles from "../../res/css/views/messages/_TextualEvent.pcss?raw";
import eventTileStyles from "../../res/css/views/rooms/_EventTile.pcss?raw";
import ircLayoutStyles from "../../res/css/views/rooms/_IRCLayout.pcss?raw";
import newRoomIntroStyles from "../../res/css/views/rooms/_NewRoomIntro.pcss?raw";
import readReceiptGroupStyles from "../../res/css/views/rooms/_ReadReceiptGroup.pcss?raw";
import whoIsTypingTileStyles from "../../res/css/views/rooms/_WhoIsTypingTile.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { cornerRadii, toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";
import { loadInter } from "../test/telement/fonts";

/** A CSS module's stylesheet with its local class names prefixed by the module's name, as the library build does. */
function moduleCss(source: string, name: string): string {
    const globals: string[] = [];
    return source
        .replace(/:global\(([^)]*)\)/g, (_match, selector: string) => `@global${globals.push(selector) - 1}@`)
        .replace(/\.(-?[_a-zA-Z][\w-]*)/g, `.${name}_$1`)
        .replace(/@global(\d+)@/g, (_match, index: string) => globals[Number(index)]);
}

type Layout = "bubble" | "group" | "irc";

const LAYOUT_CLASS: Record<Layout, string> = { bubble: "layoutBubble", group: "layoutGroup", irc: "layoutIrc" };

function avatar(size: number, name = "Alice"): string {
    return renderToStaticMarkup(
        createElement(Avatar, { id: `@${name.toLowerCase()}:example.org`, name, size: `${size}px`, type: "round" }),
    ).replace('class="', 'class="mx_BaseAvatar ');
}

const slot = (name: string, content: string): string => `<div class="slot${name}">${content}</div>`;

const text = (body: string): string =>
    `<div class="mx_MTextBody mx_EventTile_content TextualBody_root TextualBody_text"><div class="mx_EventTile_body translate" dir="auto">${body}</div></div>`;

/** A message of only emoji, which the app marks to draw them large. */
const bigEmoji = (emoji: string): string =>
    `<div class="mx_MTextBody mx_EventTile_content TextualBody_root TextualBody_text"><span class="mx_EventTile_body mx_EventTile_bigEmoji translate" dir="auto">${emoji}</span></div>`;

/**
 * A reactions row as ReactionsRowView renders it in a bubble, each reaction an emoji, its count and whether it is the
 * reader's own. Bubbles have no add-reaction button.
 */
function reactions(...items: Array<[emoji: string, count: number, own?: boolean]>): string {
    const chips = items.map(
        ([emoji, count, own]) => `
            <button type="button" aria-label="${count} reactions for ${emoji}"
                class="ReactionsRowButton_reactionsRowButton${own ? " ReactionsRowButton_reactionsRowButtonSelected" : ""} ReactionsRowButton_reactionsRowButtonInBubble">
                <span class="ReactionsRowButton_reactionsRowButtonContent" aria-hidden="true">${emoji}</span>
                <span class="ReactionsRowButton_reactionsRowButtonCount" aria-hidden="true">${count}</span>
            </button>`,
    );
    return `
        <div class="mx_ReactionsRow ReactionsRow_reactionsRow" role="toolbar" aria-label="Reactions">
            ${chips.join("")}
        </div>
    `;
}

const RECEIPTS = `
    <div class="mx_ReadReceiptGroup" role="group" aria-label="Read receipts">
        <div class="mx_AccessibleButton mx_ReadReceiptGroup_button" role="button" tabindex="0">
            <span class="mx_ReadReceiptGroup_container" style="width: 26px">${avatar(14, "Bob")}</span>
        </div>
    </div>
`;

/** Telegram's checks for your own message, as MessageStatusView renders them in the status slot after the time. */
function status(state: "sent" | "read" = "read"): string {
    const icon = renderToStaticMarkup(
        createElement(state === "read" ? DoubleCheckIcon : CheckIcon, {
            "className": "MessageStatusView_icon",
            "aria-hidden": true,
        }),
    );
    return slot(
        "Status",
        `<span class="MessageStatusView_status MessageStatusView_${state}" role="img" aria-label="${state}">${icon}</span>`,
    );
}

/** The time with the checks after it, as the time's slot holds them for your own message. */
const timeWithStatus = (state?: "sent" | "read"): string =>
    slot("Timestamp", `<a class="mx_MessageTimestamp content">12:41</a>${status(state)}`);

/** Telegram's pin of a pinned message, as PinnedMarkView renders it in the pin's slot before the time. */
const PIN = slot(
    "Pin",
    `<span class="PinnedMarkView_mark" role="img" aria-label="Pinned message">${renderToStaticMarkup(
        createElement(PinSolidIcon, { "className": "PinnedMarkView_icon", "aria-hidden": true }),
    )}</span>`,
);

/** The middle of the first check that a status's icon draws, which is the middle of both. */
const checkMiddle = (tile: Element): number => middle(box(tile.querySelector(".slotStatus svg > path")!));

/** The text of an informational row ("Alice joined the room"), as TextualEventView renders it. */
const event = (layout: Layout, body: string): string =>
    `<div class="mx_TextualEvent TextualEventView_textualEvent" data-event-layout="${layout}">${body}</div>`;

const PADLOCK = '<div class="mx_E2ePadlock" style="width: 14px; height: 14px"></div>';

const LONG_TEXT =
    "changed the topic to the move to the fifth floor on Monday: desks are numbered by team, the kitchen is next to the " +
    "lifts, and the meeting rooms can be booked from the shared calendar as before";

interface RowOptions {
    own?: boolean;
    first?: boolean;
    last?: boolean;
    states?: string[];
    lineClass?: string;
    padlock?: boolean;
    footer?: string;
    threadInfo?: string;
    receipt?: boolean;
    /** Telegram's checks after the time, as the bubble layout shows them on your own messages. */
    status?: boolean;
    /** Telegram's pin before the time, as the bubble layout marks a pinned message. */
    pinned?: boolean;
    /** No sender row, as for an emote, or the sender as DisambiguatedProfileView renders it. */
    sender?: "none" | "profile";
}

/** The sender's name as DisambiguatedProfileView renders it in a message's sender row. */
const profile = (layout: Layout, name: string): string =>
    `<div class="mx_DisambiguatedProfile DisambiguatedProfile_disambiguatedProfile" data-event-layout="${layout}" role="button"><span class="DisambiguatedProfile_disambiguatedProfile_displayName mx_DisambiguatedProfile_displayName" dir="auto">${name}</span></div>`;

/** A message as EventTileView lays out its slots in the given layout. */
function row(layout: Layout, body: string, options: RowOptions = {}): string {
    const { own = false, first = true, last = true, states = [], lineClass = "", padlock = false } = options;
    const info = states.includes("stateInfo");
    const rootClasses = [
        "root",
        "mx_EventTile",
        LAYOUT_CLASS[layout],
        own && "stateOwnEvent",
        !first && "stateContinuation",
        last && "stateLastInSection",
        options.receipt && "hasReceiptSlot",
        options.status && "hasStatusSlot",
        options.pinned && "hasPinSlot",
        ...states,
    ].filter(Boolean);
    const name = own ? "Viktor" : "Alice";
    const timestamp = slot(
        "Timestamp",
        `${options.pinned ? PIN : ""}<a class="mx_MessageTimestamp content">12:41</a>${options.status ? status() : ""}`,
    );
    const senderMarkup =
        options.sender === "profile"
            ? profile(layout, name)
            : `<div class="mx_DisambiguatedProfile"><span>${name}</span></div>`;
    const sender =
        ((first && !info) || layout === "irc") && options.sender !== "none" ? slot("Sender", senderMarkup) : "";
    // In bubbles a message's avatar is on the last row of its sender's run and follows the line, beside the bubble's
    // bottom; informational and full-width rows keep it before their content
    const fullWidth = states.some((state) => ["stateBubbleContainer", "stateLeftAlignedBubble"].includes(state));
    const avatarFollowsLine = layout === "bubble" && !info && !fullWidth;
    const avatarSlot =
        (avatarFollowsLine ? last : first) || info || layout === "irc"
            ? slot("Avatar", avatar(info || layout === "irc" ? 14 : layout === "bubble" ? 32 : 30, name))
            : "";
    const lock = padlock ? slot("Padlock", PADLOCK) : "";
    const footer = options.footer ? slot("Footer", options.footer) : "";
    const threadInfo = options.threadInfo ? slot("ThreadInfo", options.threadInfo) : "";
    const receipt = options.receipt ? slot("Receipt", RECEIPTS) : "";
    const open = `<li class="${rootClasses.join(" ")}" data-testid="event-tile">`;
    if (layout === "irc") {
        return `${open}${timestamp}${lock}${avatarSlot}${sender}<div class="line mx_EventTile_line ${lineClass}">${slot("Body", body)}${footer}${threadInfo}</div>${receipt}</li>`;
    }
    // In bubbles a message's reactions end its bubble; a message drawn without one keeps them under it
    const footerInLine =
        avatarFollowsLine && !states.includes("stateNoBubble") && !lineClass.includes("lineTimestampOverMedia");
    // In bubbles an informational row's time follows its text
    const content =
        layout === "bubble" && info
            ? `${lock}${slot("Body", body)}${timestamp}`
            : `${timestamp}${lock}${slot("Body", body)}`;
    const line = `<div class="line mx_EventTile_line ${lineClass}">${content}${footerInLine ? footer : ""}</div>`;
    const after = footerInLine ? "" : footer;
    return avatarFollowsLine
        ? `${open}${sender}${line}${avatarSlot}${after}${threadInfo}${receipt}</li>`
        : `${open}${sender}${avatarSlot}${line}${after}${threadInfo}${receipt}</li>`;
}

const INTRO = `
    <li class="mx_NewRoomIntro">
        ${avatar(52, "Office")}
        <h2>Office</h2>
        <p>You created this room. This is the start of <strong>Office</strong>.</p>
        <div class="mx_NewRoomIntro_buttons">
            <div class="mx_AccessibleButton mx_NewRoomIntro_inviteButton" role="button" style="width: 60%">
                <svg width="20" height="20"></svg>Invite to this room
            </div>
            <div class="mx_AccessibleButton" role="button" style="width: 60%">Add a topic</div>
        </div>
    </li>
`;

/** A notice card, such as the one about encryption, as EventTileBubble renders it. */
const notice = (title: string, subtitle: string): string => `
    <div class="EventTileBubble_container mx_EventTileBubble mx_cryptoEvent">
        <svg width="16" height="16"></svg>
        <div class="EventTileBubble_title">${title}</div>
        <div class="EventTileBubble_subtitle">${subtitle}</div>
    </div>
`;

/** The intro of a room that isn't encrypted, its warning card above it, as NewRoomIntro renders it. */
const UNENCRYPTED_INTRO = INTRO.replace(
    '<li class="mx_NewRoomIntro">',
    `<li class="mx_NewRoomIntro">${notice(
        "End-to-end encryption isn't enabled",
        "Your private messages are normally encrypted, but this room isn't. Enable encryption in settings.",
    )}`,
);

/** A row whose card is its content, as EventTileView lays out "Encryption enabled": no avatar. */
const NOTICE_ROW = `
    <li class="root mx_EventTile layoutBubble stateBubbleContainer stateLastInSection" data-testid="event-tile">
        <div class="line mx_EventTile_line">
            ${slot("Timestamp", '<a class="mx_MessageTimestamp content">12:41</a>')}
            ${slot("Body", notice("Encryption enabled", "Messages in this room are end-to-end encrypted."))}
        </div>
    </li>
`;

/** A date separator as TimelineSeparator lays it out: a pill centered in a row as wide as the timeline's content. */
const DATE_SEPARATOR = `
    <li><div role="separator" style="display: flex; justify-content: center"><span class="pill">Today</span></div></li>
`;

function typing(people: string[]): string {
    return `
        <li class="mx_WhoIsTypingTile" aria-atomic="true">
            <div class="mx_WhoIsTypingTile_avatars">${people.map((name) => avatar(24, name)).join("")}</div>
            <div class="mx_WhoIsTypingTile_label">${people.join(" and ")} is typing …</div>
        </li>
    `;
}

/** The room timeline: its body says which layout it shows, and IRC marks the message panel too. */
function render(layout: Layout, ...items: string[]): void {
    document.body.innerHTML = `
        <div class="mx_RoomView_body cpd-theme-light" data-layout="${layout}" style="width: 880px; height: 700px; font-family: Inter">
            <div class="mx_ScrollPanel mx_RoomView_messagePanel${layout === "irc" ? " mx_IRCLayout" : ""}">
                <ol class="mx_RoomView_MessageList">${items.join("")}</ol>
            </div>
        </div>
    `;
}

function all(selector: string): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>(selector)];
}

function box(element: Element): DOMRect {
    return element.getBoundingClientRect();
}

/** The box of an element's own text, beside any icon in it, from its first line's top to its last line's bottom. */
function textBox(element: Element): DOMRect {
    const range = document.createRange();
    const node = [...element.childNodes].find(
        (child) => child.nodeType === Node.TEXT_NODE && child.textContent!.trim(),
    );
    if (node) range.selectNodeContents(node);
    else range.selectNodeContents(element);
    const lines = [...range.getClientRects()].filter((rect) => rect.width > 0);
    return new DOMRect(lines[0].left, lines[0].top, lines[0].width, lines.at(-1)!.bottom - lines[0].top);
}

/** The middle of each line of an element's text, from its first line to its last. */
function lineMiddles(element: Element): number[] {
    const range = document.createRange();
    range.selectNodeContents(element);
    const lines: Array<{ top: number; bottom: number }> = [];
    for (const rect of range.getClientRects()) {
        if (rect.width === 0) continue;
        const line = lines.find((other) => Math.abs(other.top - rect.top) < 3);
        if (line) line.bottom = Math.max(line.bottom, rect.bottom);
        else lines.push({ top: rect.top, bottom: rect.bottom });
    }
    return lines.map((line) => (line.top + line.bottom) / 2);
}

/** The box of each line of an element's text, from its first line to its last. */
function lineBoxes(element: Element): DOMRect[] {
    const range = document.createRange();
    range.selectNodeContents(element);
    const lines: DOMRect[] = [];
    for (const rect of range.getClientRects()) {
        if (rect.width === 0) continue;
        const line = lines.find((other) => Math.abs(other.top - rect.top) < 3);
        if (!line) lines.push(DOMRect.fromRect(rect));
        else {
            const left = Math.min(line.left, rect.left);
            const right = Math.max(line.right, rect.right);
            line.x = left;
            line.width = right - left;
            line.height = Math.max(line.bottom, rect.bottom) - line.top;
        }
    }
    return lines;
}

const middle = (rect: DOMRect): number => (rect.top + rect.bottom) / 2;
const centerX = (rect: DOMRect): number => (rect.left + rect.right) / 2;

/** Where the message list's content ends: its padding is the timeline's inset. */
function contentEnd(): number {
    const list = document.querySelector(".mx_RoomView_MessageList")!;
    return box(list).right - parseFloat(getComputedStyle(list).paddingRight);
}

const timeOf = (tile: Element): DOMRect => textBox(tile.querySelector(".mx_MessageTimestamp")!);
const bodyText = (tile: Element): DOMRect => textBox(tile.querySelector(".mx_EventTile_body, .mx_TextualEvent")!);

let stylesheet: HTMLStyleElement;
let unloadInter: () => void;

describe("Timeline shell", () => {
    beforeAll(async () => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic} ${compoundLightTheme}
                ${compoundDarkTheme} ${compoundDarkSemantic} ${compoundLightHcTheme} ${compoundLightHcSemantic}
            }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components {
                ${telementTokens}
                ${eventTileViewStyles.replace(/:global\(([^)]*)\)/g, "$1")}
                ${messageTimestampViewStyles}
                ${moduleCss(messageStatusViewStyles, "MessageStatusView")}
                ${moduleCss(pinnedMarkViewStyles, "PinnedMarkView")}
                ${moduleCss(textualBodyStyles, "TextualBody")}
                ${moduleCss(decryptionFailureStyles, "DecryptionFailureBodyView")}
                ${moduleCss(textualEventViewStyles, "TextualEventView")}
                ${moduleCss(eventTileBubbleStyles, "EventTileBubble")}
                ${moduleCss(readMarkerStyles, "ReadMarker")}
                ${moduleCss(disambiguatedProfileStyles, "DisambiguatedProfile")}
                ${moduleCss(reactionsRowStyles, "ReactionsRow")}
                ${moduleCss(reactionsRowButtonStyles, "ReactionsRowButton")}
            }
            @layer app-web {
                /* The theme's own variable, which the app's font stack reads: without it the timestamp has no font */
                :root { --emoji-font-family: ""; }
                ${toBrowserCss(commonStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(roomViewStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(eventTileStyles, fontSizes, lightTheme)}
                ${toBrowserCss(genericEventListSummaryStyles, fontSizes, lightTheme)}
                ${toBrowserCss(eventBubbleTileStyles, fontSizes, lightTheme)}
                ${toBrowserCss(threadPanelStyles, fontSizes, lightTheme)}
                ${toBrowserCss(textualEventStyles, lightTheme)}
                ${toBrowserCss(cryptoEventStyles)}
                ${toBrowserCss(baseAvatarStyles)}
                ${toBrowserCss(ircLayoutStyles, fontSizes, lightTheme)}
                ${toBrowserCss(readReceiptGroupStyles, fontSizes, lightTheme)}
                ${toBrowserCss(newRoomIntroStyles, fontSizes, lightTheme)}
                ${toBrowserCss(whoIsTypingTileStyles, fontSizes, lightTheme)}
            }
        `;
        document.head.append(stylesheet);
        // Text is centered on other text to the half pixel, so with the app's font
        unloadInter = await loadInter();
    });

    afterAll(() => {
        stylesheet.remove();
        unloadInter();
    });

    afterEach(async () => {
        await userEvent.unhover(document.body);
        document.body.innerHTML = "";
    });

    describe("in the bubble layout", () => {
        it("insets the timeline's content 12px from its sides: other people's avatars start there, their bubbles 40px further, and your own bubbles' tails end there", () => {
            render("bubble", row("bubble", text("Morning")), row("bubble", text("Hi"), { own: true, status: true }));
            const list = box(document.querySelector(".mx_RoomView_MessageList")!);
            const [, own] = all(".line");
            const tail = parseFloat(getComputedStyle(own, "::after").width);

            expect(box(document.querySelector(".slotAvatar > *")!).left - list.left).toBe(12);
            expect(box(document.querySelector(".line")!).left - list.left).toBe(52);
            expect(list.right - (box(own).right + tail)).toBe(12);
        });

        it.each(["group", "irc"] as const)("keeps the timeline's 18px inset in the %s layout", (layout) => {
            render(layout, row(layout, text("Morning")));
            const list = getComputedStyle(document.querySelector(".mx_RoomView_MessageList")!);

            expect([list.paddingLeft, list.paddingRight]).toEqual(["18px", "18px"]);
        });

        it("puts 12px between sections and 2px between the bubbles of one", () => {
            render(
                "bubble",
                row("bubble", text("Morning!"), { last: false }),
                row("bubble", text("The build is green again."), { first: false }),
                row("bubble", text("Thanks"), { own: true }),
            );
            const [first, second, third] = all(".root").map(box);

            expect(second.top - first.bottom).toBe(2);
            expect(third.top - second.bottom).toBe(12);
        });

        it.each([
            ["another's", false],
            ["your own", true],
        ])(
            "holds reactions at the bottom of %s bubble, 8px under the text, the time centered on their row",
            (_name, own) => {
                render("bubble", row("bubble", text("Lunch?"), { own, footer: reactions(["🔥", 1, true], ["👍", 2]) }));
                const line = box(document.querySelector(".line")!);
                const chips = all(".ReactionsRowButton_reactionsRowButton").map(box);

                expect(chips[0].left - line.left).toBe(12);
                expect(chips[0].top - box(document.querySelector(".mx_EventTile_content")!).bottom).toBe(8);
                expect(line.bottom - chips[0].bottom).toBe(8);
                expect(
                    Math.abs(middle(timeOf(document.querySelector(".root")!)) - middle(chips[0])),
                ).toBeLessThanOrEqual(0.5);
                expect(timeOf(document.querySelector(".root")!).left).toBeGreaterThan(chips[1].right);
            },
        );

        it("keeps reactions 8px under a picture without a caption, which has no bubble", () => {
            render(
                "bubble",
                row("bubble", '<div style="width: 160px; height: 120px"></div>', {
                    lineClass: "lineMedia lineTimestampOverMedia",
                    footer: reactions(["🔥", 1]),
                }),
            );

            expect(document.querySelector(".line .slotFooter")).toBeNull();
            expect(box(document.querySelector(".slotFooter")!).top - box(document.querySelector(".line")!).bottom).toBe(
                8,
            );
        });

        it.each([
            ["another's", false],
            ["your own", true],
        ])("draws %s message of only large emoji without a bubble, its time a badge after them", (_name, own) => {
            render("bubble", row("bubble", bigEmoji("👍"), { own }));
            const line = document.querySelector(".line")!;
            const badge = document.querySelector(".slotTimestamp")!;
            const emoji = textBox(document.querySelector(".mx_EventTile_bigEmoji")!);

            expect(getComputedStyle(line).backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect(getComputedStyle(badge).backgroundColor).toBe("rgba(0, 0, 0, 0.55)");
            expect(getComputedStyle(badge.firstElementChild!).color).toBe("rgb(255, 255, 255)");
            expect(box(badge).height).toBe(20);
            expect(box(badge).right).toBe(box(line).right);
            expect(box(badge).bottom).toBe(box(line).bottom);
            expect(box(badge).left).toBeGreaterThanOrEqual(emoji.right);
        });

        /** Large emoji as TextualBodyView renders them in a bubble timeline: plain, or with "(edited)" after them. */
        const largeEmoji = (emoji: string, edited = false): string => {
            const body = `<${edited ? "span" : "div"} class="mx_EventTile_body mx_EventTile_bigEmoji translate" dir="auto">${emoji}</${edited ? "span" : "div"}>`;
            return `<div class="mx_MTextBody mx_EventTile_content TextualBody_root TextualBody_text" data-event-layout="bubble">${
                edited
                    ? `<div data-textual-body-annotation-wrapper>${body}<button type="button" class="mx_EventTile_edited">(edited)</button></div>`
                    : body
            }</div>`;
        };

        it.each([
            ["another's", false, false],
            ["your own", true, false],
            ["an edited", false, true],
        ])("makes %s large emoji the message's whole box, where the bubble would be", (_name, own, edited) => {
            render("bubble", row("bubble", largeEmoji("👍", edited), { own }));
            const line = box(document.querySelector(".line")!);
            const content = box(document.querySelector(".mx_EventTile_content")!);
            const badge = box(document.querySelector(".slotTimestamp")!);

            // The 48px emoji without the leading of their 57px line, nor the 1px inset of a bubble's text
            expect(line.height).toBe(48);
            expect([content.top, content.bottom]).toEqual([line.top - 4.5, line.bottom + 4.5]);
            expect(own ? content.right : content.left).toBe(own ? line.right : line.left);
            // The badge's bottom is level with the emoji's
            expect(badge.bottom).toBe(line.bottom);
        });

        it.each([
            ["another's", false],
            ["your own", true],
        ])("keeps %s large emoji 2px from the bubbles of their run, as bubbles are", (_name, own) => {
            render(
                "bubble",
                row("bubble", text("Look at this"), { own, last: false }),
                row("bubble", largeEmoji("🎉"), { own, first: false, last: false }),
                row("bubble", text("Nice, right?"), { own, first: false }),
            );
            const [before, , after] = all(".line").map(box);
            // The 48px emoji in the middle of their 57px line
            const content = box(all(".mx_EventTile_content")[1]);
            const emoji = { top: content.top + 4.5, bottom: content.bottom - 4.5 };

            expect(emoji.top - before.bottom).toBe(2);
            expect(after.top - emoji.bottom).toBe(2);
        });

        it("puts reactions 8px under large emoji, as under a bubble's text, with the badge centered on their row", () => {
            render("bubble", row("bubble", largeEmoji("🔥"), { footer: reactions(["😁", 1]) }));
            const content = box(document.querySelector(".mx_EventTile_content")!);
            const chips = box(document.querySelector(".mx_ReactionsRow")!);
            const badge = box(document.querySelector(".slotTimestamp")!);

            expect(chips.top - (content.bottom - 4.5)).toBe(8);
            expect(badge.top + badge.height / 2).toBe(chips.top + chips.height / 2);
        });

        it.each([
            ["another's", false],
            ["your own", true],
        ])("lines the thread summary up with the edge of %s bubble above it", (_name, own) => {
            render(
                "bubble",
                row("bubble", text("Draft for the offsite agenda."), {
                    own,
                    threadInfo: '<button type="button" style="width: 300px; height: 40px"></button>',
                }),
            );
            const line = box(document.querySelector(".line")!);
            const summary = box(document.querySelector(".slotThreadInfo > button")!);

            // Your own bubbles and their summaries line up at the end, other people's at the start
            const [summaryEdge, lineEdge] = own ? [summary.right, line.right] : [summary.left, line.left];
            expect(summaryEdge).toBe(lineEdge);
        });

        it("draws no band behind a hovered message, as in Telegram, but keeps one behind a selected message", async () => {
            render(
                "bubble",
                row("bubble", text("Lunch at the ramen bar?")),
                row("bubble", text("Or the pizza place"), { states: ["stateSelected"] }),
            );
            const [hovered, selected] = all(".root");
            const band = tokenColor("--event-tile-bubble-hover-background", selected);
            await userEvent.hover(hovered.querySelector(".line")!);

            expect(hovered.matches(":hover")).toBe(true);
            expect(getComputedStyle(hovered, "::before").backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect(getComputedStyle(selected, "::before").backgroundColor).toBe(band);
        });

        it.each<[string, RowOptions]>([
            ["another's message", {}],
            ["a selected message", { states: ["stateSelected"] }],
            ["a message that hides its sender", { states: ["stateNoSender"], sender: "none" }],
        ])(
            "puts the avatar beside the last bubble of %s, 8px before it and level with its bottom, with no ring",
            (_name, options) => {
                render(
                    "bubble",
                    row("bubble", text("Morning everyone"), { ...options, last: false }),
                    row("bubble", text(LONG_TEXT), {
                        ...options,
                        first: false,
                        footer: '<div style="height: 24px"></div>',
                    }),
                );
                const [first, last] = all(".root");
                const line = box(last.querySelector(".line")!);
                const picture = last.querySelector(".slotAvatar > *")!;

                expect(first.querySelector(".slotAvatar")).toBeNull();
                expect([box(picture).width, box(picture).height]).toEqual([32, 32]);
                expect(line.left - box(picture).right).toBe(8);
                expect(box(picture).bottom).toBe(line.bottom);
                expect(box(picture).left).toBeGreaterThanOrEqual(
                    box(document.querySelector(".mx_RoomView_MessageList")!).left,
                );
                expect(getComputedStyle(last.querySelector(".slotAvatar")!).borderTopWidth).toBe("0px");
                expect(getComputedStyle(picture).boxShadow).toBe("none");
            },
        );

        it("hides the avatar beside your own bubbles, so the read marker before them crosses nothing", () => {
            render(
                "bubble",
                row("bubble", text("Hello everyone")),
                '<li class="ReadMarker_readMarker"><hr class="ReadMarker_line" /></li>',
                row("bubble", text("Welcome!"), { own: true }),
                row("bubble", event("bubble", "You changed the room name"), {
                    own: true,
                    states: ["stateInfo"],
                }),
            );
            const [others, own, ownInfo] = all(".root");
            const marker = box(document.querySelector(".ReadMarker_line")!);

            expect(box(others.querySelector(".slotAvatar > *")!).width).toBe(32);
            expect(getComputedStyle(own.querySelector(".slotAvatar")!).display).toBe("none");
            for (const element of own.querySelectorAll("*")) {
                const rect = box(element);
                if (rect.width === 0 || rect.height === 0) continue;
                expect(rect.top).toBeGreaterThanOrEqual(marker.bottom);
            }
            // An informational row keeps its avatar, which is part of its text ("[V] You changed the room name")
            expect(box(ownInfo.querySelector(".slotAvatar > *")!).width).toBe(14);
        });

        it("centers an emote's time on its line", () => {
            render(
                "bubble",
                row(
                    "bubble",
                    '<div class="mx_MEmoteBody mx_EventTile_content TextualBody_root TextualBody_emote" dir="auto">*&nbsp;<button class="TextualBody_emoteSender" type="button">Viktor</button>&nbsp;<span class="mx_EventTile_body translate" dir="auto">waves</span></div>',
                    { own: true, states: ["stateEmote", "stateNoBubble"], lineClass: "lineEmote" },
                ),
            );
            const tile = document.querySelector(".root")!;

            expect(Math.abs(middle(timeOf(tile)) - middle(bodyText(tile)))).toBeLessThanOrEqual(0.5);
        });

        it("puts the time of an emote that wraps on its last line", () => {
            render(
                "bubble",
                row(
                    "bubble",
                    `<div class="mx_MEmoteBody mx_EventTile_content TextualBody_root TextualBody_emote" dir="auto">*&nbsp;<button class="TextualBody_emoteSender" type="button">Viktor</button>&nbsp;<span class="mx_EventTile_body translate" dir="auto">${LONG_TEXT}</span></div>`,
                    { own: true, states: ["stateEmote", "stateNoBubble"], lineClass: "lineEmote" },
                ),
            );
            const tile = document.querySelector(".root")!;
            const lines = lineMiddles(tile.querySelector(".mx_MEmoteBody")!);

            expect(lines.length).toBeGreaterThan(1);
            expect(Math.abs(middle(timeOf(tile)) - lines.at(-1)!)).toBeLessThanOrEqual(0.5);
        });

        it.each([
            ["light", "cpd-theme-light"],
            ["dark", "cpd-theme-dark"],
            ["high contrast", "cpd-theme-light-hc"],
        ])("keeps another person's selected bubble visible in its band in the %s theme", (_name, theme) => {
            render("bubble", row("bubble", text("Or the pizza place"), { states: ["stateSelected"] }));
            document.querySelector(".mx_RoomView_body")!.classList.replace("cpd-theme-light", theme);
            const selected = document.querySelector(".root")!;
            const band = getComputedStyle(selected, "::before").backgroundColor;

            // One gray step darker than the bubble
            expect(band).toBe(tokenColor("--cpd-color-bg-subtle-primary", selected));
            expect(getComputedStyle(selected.querySelector(".line")!).backgroundColor).toBe(
                tokenColor("--cpd-color-bg-subtle-secondary", selected),
            );
        });

        const READ_MARKER = '<li class="ReadMarker_readMarker"><hr class="ReadMarker_line" /></li>';

        const EMOTE =
            '<div class="mx_MEmoteBody mx_EventTile_content TextualBody_root TextualBody_emote" dir="auto">*&nbsp;<button class="TextualBody_emoteSender" type="button">Alice</button>&nbsp;<span class="mx_EventTile_body translate" dir="auto">waves</span></div>';

        describe.each(["", "20px"])("at the root font size %s", (fontSize) => {
            beforeEach(() => {
                document.documentElement.style.fontSize = fontSize;
            });

            afterEach(() => {
                document.documentElement.style.fontSize = "";
            });

            /** The row between two read markers, with the avatar's box and the markers' lines. */
            function renderBetweenMarkers(body: string, options: RowOptions): [Element, DOMRect, DOMRect, DOMRect] {
                render(
                    "bubble",
                    row("bubble", text("Morning everyone"), { sender: "profile" }),
                    READ_MARKER,
                    row("bubble", body, { ...options, sender: "none" }),
                    READ_MARKER,
                    row("bubble", text("Lunch?"), { sender: "profile" }),
                );
                const tile = all(".root")[1];
                const [before, after] = all(".ReadMarker_line").map(box);
                return [tile, box(tile.querySelector(".slotAvatar > *")!), before, after];
            }

            it.each([
                ["fits on a line", "waves"],
                ["wraps", LONG_TEXT],
            ])("centers the avatar on the last line of another person's emote that %s", (_name, words) => {
                const [tile, avatar] = renderBetweenMarkers(EMOTE.replace("waves", words), {
                    states: ["stateEmote", "stateNoBubble"],
                    lineClass: "lineEmote",
                });

                // The text's own box sits up to a pixel off the middle of its line at some font sizes, as the font's
                // ascent and descent are rounded to whole pixels
                expect(
                    Math.abs(middle(avatar) - lineMiddles(tile.querySelector(".mx_MEmoteBody")!).at(-1)!),
                ).toBeLessThanOrEqual(1);
                expect(avatar.bottom).toBeLessThanOrEqual(box(tile).bottom);
            });

            it("keeps the avatar of a one-line emote, which has no sender row, inside the row, clear of the read markers around it", () => {
                const [tile, avatar, before, after] = renderBetweenMarkers(EMOTE, {
                    states: ["stateEmote", "stateNoBubble"],
                    lineClass: "lineEmote",
                });

                expect(avatar.top).toBeGreaterThanOrEqual(box(tile).top);
                expect(avatar.bottom).toBeLessThanOrEqual(box(tile).bottom);
                expect(avatar.top - before.bottom).toBeGreaterThanOrEqual(4);
                expect(after.top - avatar.bottom).toBeGreaterThanOrEqual(4);
            });

            it("puts the avatar of a message that hides its sender level with its bubble's bottom, clear of the read markers around it", () => {
                const [tile, avatar, before, after] = renderBetweenMarkers(text("Hello"), {
                    states: ["stateNoSender"],
                });

                expect(Math.abs(avatar.bottom - box(tile.querySelector(".line")!).bottom)).toBeLessThanOrEqual(0.5);
                expect(avatar.top).toBeGreaterThanOrEqual(box(tile).top);
                expect(avatar.top - before.bottom).toBeGreaterThanOrEqual(4);
                expect(after.top - avatar.bottom).toBeGreaterThanOrEqual(4);
            });
        });

        /** LocationBodyFallbackContent: the text MLocationBody shows when the map fails to load. */
        const FAILED_MAP =
            '<div class="mx_EventTile_body mx_MLocationBody"><span class="mx_EventTile_tileError">Failed to load map</span><br>Location geo:51.5,-0.1</div>';

        it.each<[string, string, string, RowOptions]>([
            [
                "an emote's text",
                EMOTE,
                ".mx_MEmoteBody",
                { states: ["stateEmote", "stateNoBubble"], lineClass: "lineEmote", sender: "none" },
            ],
            [
                "the text shown when a location's map fails to load",
                FAILED_MAP,
                ".mx_MLocationBody",
                { states: ["stateNoBubble"], sender: "profile" },
            ],
        ])("starts %s where a bubble's text starts, clear of the sender's avatar", (_name, body, selector, options) => {
            render("bubble", row("bubble", text("Morning everyone")), row("bubble", body, options));
            const [message, other] = all(".root");
            const otherText = textBox(other.querySelector(selector)!);

            expect(otherText.left).toBe(bodyText(message).left);
            expect(otherText.left).toBeGreaterThanOrEqual(box(other.querySelector(".slotAvatar > *")!).right);
        });

        it("centers the time of the text shown when a location's map fails to load on its last line", () => {
            render("bubble", row("bubble", FAILED_MAP, { states: ["stateNoBubble"] }));
            const tile = document.querySelector(".root")!;
            const lines = lineMiddles(tile.querySelector(".mx_MLocationBody")!);

            expect(lines.length).toBe(2);
            expect(Math.abs(middle(timeOf(tile)) - lines.at(-1)!)).toBeLessThanOrEqual(0.5);
        });

        it.each(["stateLeftAlignedBubble", "stateBubbleContainer"])(
            "keeps the avatar round beside a full-width %s row",
            (state) => {
                render("bubble", row("bubble", '<div style="height: 60px"></div>', { states: [state] }));
                const avatar = box(document.querySelector(".slotAvatar > *")!);

                expect(avatar.width).toBe(32);
                expect(avatar.height).toBe(32);
            },
        );

        it("centers a notice row's card, such as the encryption one, under the date separators", () => {
            render("bubble", DATE_SEPARATOR, NOTICE_ROW);
            const pill = box(document.querySelector(".pill")!);
            const card = box(document.querySelector(".mx_cryptoEvent")!);

            expect(Math.abs(centerX(card) - centerX(pill))).toBeLessThanOrEqual(0.5);
        });

        /** A message that couldn't be decrypted, as EventTileView lays it out with its padlock, under a text bubble. */
        function renderUndecryptable(reply = ""): { plain: Element; tile: Element } {
            const utd =
                '<div class="DecryptionFailureBodyView_content mx_DecryptionFailureBody mx_EventTile_content">Unable to decrypt message</div>';
            const states = ["stateEncryptionFailure", ...(reply ? ["stateHasReply"] : [])];
            render(
                "bubble",
                row("bubble", text("One line")),
                row("bubble", utd, { padlock: true, states }).replace(
                    '<div class="slotBody">',
                    `${reply ? slot("ReplyChain", `<div class="mx_ReplyChain_wrapper">${reply}</div>`) : ""}<div class="slotBody">`,
                ),
            );
            const [plain, tile] = all(".root");
            return { plain, tile };
        }

        it("puts the shield of an undecryptable message before its text, in a one-line bubble", () => {
            const { plain, tile } = renderUndecryptable();
            const shield = box(tile.querySelector(".mx_E2ePadlock")!);
            const label = textBox(tile.querySelector(".mx_DecryptionFailureBody")!);

            expect(Math.abs(middle(shield) - middle(label))).toBeLessThanOrEqual(0.5);
            expect(label.left - shield.right).toBeGreaterThanOrEqual(4);
            expect(box(tile.querySelector(".line")!).height).toBe(box(plain.querySelector(".line")!).height);
        });

        it("puts the shield of an undecryptable reply before its text, under the quote", () => {
            const { plain, tile } = renderUndecryptable("<blockquote>Are you coming?</blockquote>");
            const shield = box(tile.querySelector(".mx_E2ePadlock")!);
            const label = textBox(tile.querySelector(".mx_DecryptionFailureBody")!);
            const line = box(tile.querySelector(".line")!);

            expect(Math.abs(middle(shield) - middle(label))).toBeLessThanOrEqual(0.5);
            expect(label.left - shield.right).toBeGreaterThanOrEqual(4);
            expect(label.top - box(tile.querySelector("blockquote")!).bottom).toBeGreaterThanOrEqual(4);
            expect(line.bottom - label.bottom).toBeCloseTo(
                box(plain.querySelector(".line")!).bottom - bodyText(plain).bottom,
                0,
            );
        });

        it.each<[string, RowOptions, number]>([
            // As far as your own bubble's tail reaches past its row
            ["another's message", {}, 18],
            ["your own message", { own: true, status: true }, 18],
            ["an informational row", { states: ["stateInfo"] }, 0],
        ])("keeps no column for read receipts at the end of %s", (_name, options, margin) => {
            const body = options.states ? event("bubble", "Alice joined the room") : text("Hello");
            render("bubble", row("bubble", body, options));

            expect(contentEnd() - box(document.querySelector(".root")!).right).toBe(margin);
            expect(document.querySelector(".mx_ReadReceiptGroup")).toBeNull();
        });

        it("runs the text of an informational row to the timeline's content edge, with its time on its last line", () => {
            // Short words fill each line to within a word of its end
            const body = event("bubble", `Alice changed the topic to ${"ab ".repeat(120)}`);
            render("bubble", row("bubble", body, { states: ["stateInfo"] }));
            const range = document.createRange();
            range.selectNodeContents(document.querySelector(".mx_TextualEvent")!);
            const textEnd = Math.max(...[...range.getClientRects()].map((rect) => rect.right));

            expect(contentEnd() - textEnd).toBeGreaterThanOrEqual(0);
            expect(contentEnd() - textEnd).toBeLessThan(30);
            expect(timeOf(document.querySelector(".root")!).right).toBeLessThanOrEqual(contentEnd());
        });

        it("lets other people's bubbles grow into the end margin the read receipts had", () => {
            render("bubble", row("bubble", text(LONG_TEXT)));
            const list = document.querySelector(".mx_RoomView_MessageList")!;
            const contentWidth = box(list).width - 2 * parseFloat(getComputedStyle(list).paddingLeft);
            const line = box(document.querySelector(".line")!);

            // 70% of the row, which starts 49px in and ends 18px from the content edge, and the bubble's padding
            expect(line.width).toBeCloseTo((contentWidth - 49 - 18) * 0.7 + 24, 0);
        });

        describe("Telegram's checks on your own messages", () => {
            const tileOf = (): Element => document.querySelector(".root")!;

            it("follow the time 2px after it, in a 16px box ending in the bubble's padding corner", () => {
                render("bubble", row("bubble", text("Yes, from ten"), { own: true, status: true }));
                const checks = box(document.querySelector(".MessageStatusView_status")!);
                const time = box(document.querySelector(".mx_MessageTimestamp")!);

                expect([checks.width, checks.height]).toEqual([16, 16]);
                expect(checks.left - time.right).toBe(2);
                expect(box(document.querySelector(".line")!).right - checks.right).toBe(12);
            });

            it.each<[string, string, RowOptions]>([
                ["a text bubble", text("Yes, from ten"), {}],
                ["a bubble ending in reactions", text("Lunch?"), { footer: reactions(["🔥", 1]) }],
                [
                    "an emote",
                    '<div class="mx_MEmoteBody mx_EventTile_content TextualBody_root TextualBody_emote" dir="auto">*&nbsp;<button class="TextualBody_emoteSender" type="button">Viktor</button>&nbsp;<span class="mx_EventTile_body translate" dir="auto">waves</span></div>',
                    { states: ["stateEmote", "stateNoBubble"], lineClass: "lineEmote", sender: "none" },
                ],
                ["large emoji", bigEmoji("👍"), {}],
            ])("center on the digits of the time of %s", (_name, body, options) => {
                render("bubble", row("bubble", body, { ...options, own: true, status: true }));

                expect(Math.abs(checkMiddle(tileOf()) - middle(timeOf(tileOf())))).toBeLessThanOrEqual(0.5);
            });

            it("keep every last line of your own message clear of the time and themselves", () => {
                // Messages a narrow letter longer each, so that one of them ends where only the time would fit beside it
                render(
                    "bubble",
                    ...Array.from({ length: 60 }, (_, index) =>
                        row("bubble", text(`ok ${"i".repeat(index)}`), { own: true, status: true, first: false }),
                    ),
                );

                for (const tile of all(".root")) {
                    const lines = lineBoxes(tile.querySelector(".mx_EventTile_body")!);
                    const last = lines.at(-1)!;
                    const end = box(tile.querySelector(".MessageStatusView_status")!);
                    const time = timeOf(tile);

                    const sharesTimeLine = last.top < time.bottom && time.top < last.bottom;

                    expect(sharesTimeLine && last.right > time.left).toBe(false);
                    expect(end.left).toBeGreaterThanOrEqual(time.right);
                }
            });

            it("sit on the time's badge over a picture, after the time, in its white", () => {
                render(
                    "bubble",
                    `<li class="root mx_EventTile layoutBubble stateOwnEvent stateLastInSection hasStatusSlot">
                        <div class="line mx_EventTile_line lineMedia lineTimestampOverMedia">
                            ${slot("Body", `<div style="width: 240px; height: 160px"></div>${timeWithStatus()}`)}
                        </div>
                    </li>`,
                );
                const badge = document.querySelector(".slotTimestamp")!;
                const checks = box(document.querySelector(".MessageStatusView_status")!);

                expect(getComputedStyle(badge).backgroundColor).toBe("rgba(0, 0, 0, 0.55)");
                expect(box(badge).right - checks.right).toBe(8);
                expect(Math.abs(checkMiddle(tileOf()) - middle(timeOf(tileOf())))).toBeLessThanOrEqual(0.5);
                expect(getComputedStyle(document.querySelector(".MessageStatusView_status svg")!).color).toBe(
                    "rgb(255, 255, 255)",
                );
            });
        });

        describe("Telegram's pin on pinned messages", () => {
            const tileOf = (): Element => document.querySelector(".root")!;
            const pinOf = (tile: Element): DOMRect => box(tile.querySelector(".PinnedMarkView_mark")!);

            it.each<[string, RowOptions]>([
                ["another's message", {}],
                ["your own message", { own: true, status: true }],
            ])("puts a 12px pin 4px before the time of %s, centered on its line, in its color", (_name, options) => {
                render("bubble", row("bubble", text("The plan for Monday"), { ...options, pinned: true }));
                const pin = pinOf(tileOf());
                const time = box(document.querySelector(".mx_MessageTimestamp")!);

                expect([pin.width, pin.height]).toEqual([12, 12]);
                expect(time.left - pin.right).toBe(4);
                expect(Math.abs(middle(pin) - middle(time))).toBeLessThanOrEqual(0.5);
                expect(getComputedStyle(document.querySelector(".PinnedMarkView_mark svg")!).color).toBe(
                    getComputedStyle(document.querySelector(".mx_MessageTimestamp")!).color,
                );
            });

            it("keeps the time in the bubble's padding corner, with the pin before it and the checks after it", () => {
                render("bubble", row("bubble", text("The plan for Monday"), { own: true, status: true, pinned: true }));
                const checks = box(document.querySelector(".MessageStatusView_status")!);
                const time = box(document.querySelector(".mx_MessageTimestamp")!);

                expect(box(document.querySelector(".line")!).right - checks.right).toBe(12);
                expect(checks.left - time.right).toBe(2);
                expect(time.left - pinOf(tileOf()).right).toBe(4);
            });

            it("keeps every last line of a pinned message clear of the pin and the time", () => {
                // Messages a narrow letter longer each, so that one of them ends where only the time would fit beside it
                render(
                    "bubble",
                    ...Array.from({ length: 60 }, (_, index) =>
                        row("bubble", text(`ok ${"i".repeat(index)}`), { pinned: true, first: false }),
                    ),
                );

                for (const tile of all(".root")) {
                    const last = lineBoxes(tile.querySelector(".mx_EventTile_body")!).at(-1)!;
                    const pin = pinOf(tile);

                    expect(last.top < pin.bottom && pin.top < last.bottom && last.right > pin.left).toBe(false);
                }
            });

            it.each([
                ["another's", false],
                ["your own", true],
            ])(
                "ends the reactions' row of %s pinned message with the pin and the time, nothing between them and the reactions",
                (_name, own) => {
                    render(
                        "bubble",
                        row("bubble", text("Lunch?"), {
                            own,
                            pinned: true,
                            footer: reactions(["👀", 2, true], ["🎉", 1]),
                        }),
                    );
                    const chips = all(".ReactionsRowButton_reactionsRowButton").map(box);
                    const pin = pinOf(tileOf());
                    const time = box(document.querySelector(".mx_MessageTimestamp")!);

                    // The 8px the row keeps before the time's room, and what the time's text is narrower than its 30px
                    expect(pin.left - chips.at(-1)!.right).toBeCloseTo(8 + 30 - time.width, 0);
                    expect(Math.abs(middle(pin) - middle(chips.at(-1)!))).toBeLessThanOrEqual(0.5);
                    expect(chips[1].left - chips[0].right).toBe(4);
                },
            );

            it("puts the pin on the time's badge over a picture, 8px from its start, in its white", () => {
                render(
                    "bubble",
                    `<li class="root mx_EventTile layoutBubble stateLastInSection hasPinSlot">
                        <div class="line mx_EventTile_line lineMedia lineTimestampOverMedia">
                            ${slot("Body", `<div style="width: 240px; height: 160px"></div>${slot("Timestamp", `${PIN}<a class="mx_MessageTimestamp content">12:41</a>`)}`)}
                        </div>
                    </li>`,
                );
                const badge = box(document.querySelector(".slotTimestamp")!);
                const pin = pinOf(tileOf());

                expect(pin.left - badge.left).toBe(8);
                expect(Math.abs(middle(pin) - middle(badge))).toBeLessThanOrEqual(0.5);
                expect(getComputedStyle(document.querySelector(".PinnedMarkView_mark svg")!).color).toBe(
                    "rgb(255, 255, 255)",
                );
            });
        });

        describe("an informational row", () => {
            const SHORT = "Alice joined the room";

            it.each([
                ["that fits on a line", SHORT],
                ["that wraps", LONG_TEXT],
            ])("ends its text %s with its time, 8px after its last line and centered on it", (_name, words) => {
                render("bubble", row("bubble", event("bubble", words), { states: ["stateInfo"] }));
                const tile = document.querySelector(".root")!;
                const lines = lineBoxes(tile.querySelector(".mx_TextualEvent")!);
                const time = timeOf(tile);

                expect(lines.length).toBe(words === SHORT ? 1 : 2);
                expect(time.left - lines.at(-1)!.right).toBeCloseTo(8, 0);
                expect(Math.abs(middle(time) - middle(lines.at(-1)!))).toBeLessThanOrEqual(0.5);
            });

            it("draws its time in the bubbles' time style: 11px, in the secondary text color", () => {
                render(
                    "bubble",
                    row("bubble", text("Morning")),
                    row("bubble", event("bubble", SHORT), { states: ["stateInfo"] }),
                );
                const [bubbleTime, time] = all(".mx_MessageTimestamp").map((element) => getComputedStyle(element));

                expect(time.fontSize).toBe("11px");
                expect(time.fontSize).toBe(bubbleTime.fontSize);
                expect(time.color).toBe(bubbleTime.color);
                expect(time.color).toBe(tokenColor("--cpd-color-text-secondary", document.querySelector(".root")!));
            });

            it("starts on the bubble column, its 14px avatar where other people's bubbles start and its text 4px after it", () => {
                render(
                    "bubble",
                    row("bubble", text("Morning everyone")),
                    row("bubble", event("bubble", SHORT), { states: ["stateInfo"] }),
                );
                const [message, info] = all(".root");
                const avatar = box(info.querySelector(".slotAvatar > *")!);

                expect(avatar.width).toBe(14);
                expect(avatar.left).toBe(box(message.querySelector(".line")!).left);
                expect(bodyText(info).left - avatar.right).toBe(4);
            });

            it.each([
                ["another person's", false],
                ["your own", true],
            ])("puts the avatar of %s row that wraps on its first line", (_name, own) => {
                render("bubble", row("bubble", event("bubble", LONG_TEXT), { own, states: ["stateInfo"] }));
                const tile = document.querySelector(".root")!;
                const lines = lineBoxes(tile.querySelector(".mx_TextualEvent")!);
                const avatar = box(tile.querySelector(".slotAvatar > *")!);

                expect(lines.length).toBe(2);
                expect(Math.abs(middle(avatar) - middle(lines[0]))).toBeLessThanOrEqual(0.5);
            });

            it("ends its text with its time on the left in a timeline laid out right to left", () => {
                render("bubble", row("bubble", event("bubble", LONG_TEXT), { states: ["stateInfo"] }));
                document.querySelector(".mx_RoomView_body")!.setAttribute("dir", "rtl");
                const tile = document.querySelector(".root")!;
                const lines = lineBoxes(tile.querySelector(".mx_TextualEvent")!);
                const avatar = box(tile.querySelector(".slotAvatar > *")!);

                expect(lines.at(-1)!.left - timeOf(tile).right).toBeCloseTo(8, 0);
                expect(avatar.left).toBeGreaterThan(lines[0].right);
            });

            it("lines a collapsed summary of such rows up with them", () => {
                render(
                    "bubble",
                    `<li class="mx_GenericEventListSummary" data-expanded="false" data-layout="bubble">
                        <div class="mx_AccessibleButton mx_GenericEventListSummary_toggle" role="button" aria-expanded="false">Expand</div>
                        <div class="mx_EventTile_line"><div class="mx_EventTile_info">
                            <span class="mx_GenericEventListSummary_avatars">${avatar(14)}</span>
                            <span class="mx_TextualEvent mx_GenericEventListSummary_summary">Alice joined and left</span>
                        </div></div>
                    </li>`,
                    row("bubble", event("bubble", SHORT), { states: ["stateInfo"] }),
                );

                expect(box(document.querySelector(".mx_GenericEventListSummary_avatars > *")!).left).toBe(
                    box(document.querySelector(".root .slotAvatar > *")!).left,
                );
            });
        });
    });

    describe("in the thread panel's bubble layout", () => {
        /** A message in ThreadView, your own with Telegram's checks after its time, a pinned one with the pin before it. */
        function threadRow(
            body: string,
            { own = false, info = false, first = true, last = true, pinned = false } = {},
        ): string {
            const withStatus = own && !info;
            const classes = ["root", "mx_EventTile", "shapeThread", "layoutBubble"];
            if (withStatus) classes.push("hasStatusSlot");
            if (pinned) classes.push("hasPinSlot");
            if (own) classes.push("stateOwnEvent");
            if (info) classes.push("stateInfo");
            if (!first) classes.push("stateContinuation");
            if (last) classes.push("stateLastInSection");
            const sender = own || info || !first ? "" : slot("Sender", profile("bubble", "Alice"));
            // Another person's avatar follows the line of the last message of their run, as in the room; an
            // informational row keeps its own beside its text
            const avatarSlot = own && !info ? "" : slot("Avatar", avatar(info ? 14 : 32));
            return `
                <li class="${classes.join(" ")}" data-testid="event-tile">
                    <div class="senderDetails">${info ? avatarSlot : ""}${sender}</div>
                    <div class="line mx_EventTile_line">
                        ${slot("Body", body)}${slot("Timestamp", `${pinned ? PIN : ""}<a class="mx_MessageTimestamp content">12:41</a>${withStatus ? status() : ""}`)}
                    </div>
                    ${!info && last ? avatarSlot : ""}
                </li>
            `;
        }

        /** ThreadView's timeline in a 380px right panel, marked with the layout it shows. */
        function renderThread(...items: string[]): void {
            document.body.innerHTML = `
                <div class="mx_ThreadView mx_ThreadPanel cpd-theme-light" style="width: 380px; font-family: Inter">
                    <div class="mx_ThreadView_timelinePanelWrapper" data-layout="bubble">
                        <div class="mx_ScrollPanel mx_RoomView_messagePanel">
                            <div class="mx_RoomView_messageListWrapper">
                                <ol class="mx_RoomView_MessageList">${items.join("")}</ol>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        it("insets its content 12px from the panel's start, as the room does: other people's avatars start there and their bubbles 40px further", () => {
            renderThread(threadRow(text("Morning")));
            const panel = box(document.querySelector(".mx_ThreadView")!);

            expect(box(document.querySelector(".slotAvatar > *")!).left - panel.left).toBe(12);
            expect(box(document.querySelector(".line")!).left - panel.left).toBe(52);
            expect(parseFloat(getComputedStyle(document.querySelector(".mx_RoomView_MessageList")!).paddingRight)).toBe(
                12,
            );
        });

        it("ends your own bubbles' tails at the panel's content edge, 12px from its end where the scrollbar takes no room, as in the room", () => {
            renderThread(
                threadRow(text("Yes, from ten"), { own: true }),
                threadRow(text("A reply of my own that wraps in the thread panel, over two lines or more"), {
                    own: true,
                }),
            );
            const panel = box(document.querySelector(".mx_ThreadView")!);

            for (const line of all(".line")) {
                expect(box(line).right + parseFloat(getComputedStyle(line, "::after").width)).toBe(contentEnd());
            }
            expect(panel.right - contentEnd()).toBe(12);
        });

        it("ends other people's rows the panel's 36px before its content edge, and your own the room's 18px", () => {
            renderThread(threadRow(text("Short")), threadRow(text("Yes, from ten"), { own: true }));
            const [others, own] = all(".root");

            expect(contentEnd() - box(others).right).toBe(36);
            expect(contentEnd() - box(own).right).toBe(18);
        });

        it("starts other people's bubbles where they do in the room, with their avatar 8px before the last one, level with its bottom", () => {
            renderThread(
                threadRow(text("Morning"), { last: false }),
                threadRow(text("A much longer message that wraps in the thread panel, over two lines or more"), {
                    first: false,
                }),
            );
            const list = document.querySelector(".mx_RoomView_MessageList")!;
            const contentStart = box(list).left + parseFloat(getComputedStyle(list).paddingLeft);
            const [first, last] = all(".line").map(box);
            const picture = box(document.querySelector(".slotAvatar > *")!);

            expect(all(".slotAvatar")).toHaveLength(1);
            expect(picture.width).toBe(32);
            expect(first.left - contentStart).toBe(40);
            expect(last.left).toBe(first.left);
            expect(last.left - picture.right).toBe(8);
            expect(picture.bottom).toBe(last.bottom);
            expect(picture.left).toBeGreaterThanOrEqual(contentStart);
        });

        it("follows the time of your own reply with its checks, in the bubble's corner and centered on the time", () => {
            renderThread(threadRow(text("A reply of my own that wraps in the thread panel"), { own: true }));
            const tile = document.querySelector(".root")!;
            const checks = box(tile.querySelector(".MessageStatusView_status")!);

            expect(checks.left - box(tile.querySelector(".mx_MessageTimestamp")!).right).toBe(2);
            expect(box(tile.querySelector(".line")!).right - checks.right).toBe(12);
            expect(Math.abs(checkMiddle(tile) - middle(timeOf(tile)))).toBeLessThanOrEqual(0.5);
            expect(document.querySelector(".mx_ReadReceiptGroup")).toBeNull();
        });

        it.each([
            ["another's", false],
            ["your own", true],
        ])("puts the pin of %s pinned reply 4px before its time, centered on it", (_name, own) => {
            renderThread(threadRow(text("A pinned reply that wraps in the thread panel"), { own, pinned: true }));
            const tile = document.querySelector(".root")!;
            const pin = box(tile.querySelector(".PinnedMarkView_mark")!);
            const time = box(tile.querySelector(".mx_MessageTimestamp")!);

            expect(time.left - pin.right).toBe(4);
            expect(Math.abs(middle(pin) - middle(time))).toBeLessThanOrEqual(0.5);
            expect(lineBoxes(tile.querySelector(".mx_EventTile_body")!).at(-1)!.right).toBeLessThanOrEqual(pin.left);
        });

        it.each([
            ["that fits on a line", "Alice changed the room name to Fifth floor", false],
            ["that wraps", LONG_TEXT, false],
            ["of your own that wraps", LONG_TEXT, true],
        ])(
            "lays out an informational row %s as in the room: on the bubble column, its avatar on the first line and its time 8px after the last",
            (_name, body, own) => {
                renderThread(threadRow(text("Morning")), threadRow(event("bubble", body), { info: true, own }));
                const [message, tile] = all(".root");
                const lines = lineBoxes(tile.querySelector(".mx_TextualEvent")!);
                const time = timeOf(tile);
                const avatar = box(tile.querySelector(".slotAvatar > *")!);

                expect(avatar.width).toBe(14);
                expect(avatar.left).toBe(box(message.querySelector(".line")!).left);
                expect(bodyText(tile).left - avatar.right).toBe(4);
                expect(Math.abs(middle(avatar) - middle(lines[0]))).toBeLessThanOrEqual(0.5);
                expect(time.left - lines.at(-1)!.right).toBeCloseTo(8, 0);
                expect(Math.abs(middle(time) - middle(lines.at(-1)!))).toBeLessThanOrEqual(0.5);
            },
        );

        it("runs the text of an informational row to the panel's content edge", () => {
            renderThread(threadRow(event("bubble", `Alice changed the topic to ${"ab ".repeat(60)}`), { info: true }));
            const range = document.createRange();
            range.selectNodeContents(document.querySelector(".mx_TextualEvent")!);
            const textEnd = Math.max(...[...range.getClientRects()].map((rect) => rect.right));

            expect(contentEnd() - textEnd).toBeGreaterThanOrEqual(0);
            expect(contentEnd() - textEnd).toBeLessThan(30);
        });
    });

    describe("informational rows", () => {
        it.each(["bubble", "group", "irc"] as const)("center their time on their text in the %s layout", (layout) => {
            render(layout, row(layout, event(layout, "Alice joined the room"), { states: ["stateInfo"] }));
            const tile = document.querySelector(".root")!;

            expect(Math.abs(middle(timeOf(tile)) - middle(bodyText(tile)))).toBeLessThanOrEqual(0.5);
        });

        it("keep their time on the last line of a text that wraps in the modern layout, as messages do", () => {
            render("group", row("group", event("group", LONG_TEXT), { states: ["stateInfo"] }));
            const tile = document.querySelector(".root")!;
            const lines = lineMiddles(tile.querySelector(".mx_TextualEvent")!);

            expect(lines.length).toBeGreaterThan(1);
            expect(Math.abs(middle(timeOf(tile)) - lines.at(-1)!)).toBeLessThanOrEqual(0.5);
        });
    });

    describe("the read marker", () => {
        const MARKER = '<li class="ReadMarker_readMarker"><hr class="ReadMarker_line" /></li>';
        const EMOTE_BODY =
            '<div class="mx_MEmoteBody mx_EventTile_content TextualBody_root TextualBody_emote" dir="auto">*&nbsp;<button class="TextualBody_emoteSender" type="button">Alice</button>&nbsp;<span class="mx_EventTile_body translate" dir="auto">waves</span></div>';

        it.each(["bubble", "group", "irc"] as const)(
            "stays 2px clear of every avatar in the %s layout, between any two kinds of row",
            (layout) => {
                const rows = [
                    row(layout, event(layout, "Alice joined the room"), { states: ["stateInfo"] }),
                    row(layout, event(layout, "Alice changed their name"), { states: ["stateInfo"], first: false }),
                    row(layout, text("Morning everyone"), { sender: "profile" }),
                    row(layout, text("Lunch?"), { first: false }),
                    row(layout, EMOTE_BODY, {
                        states: ["stateEmote", "stateNoBubble"],
                        lineClass: "lineEmote",
                        sender: "none",
                    }),
                    row(layout, text("Hello"), { states: ["stateNoSender"], sender: "none" }),
                    // An emote in a direct message, which also hides its sender
                    row(layout, EMOTE_BODY, {
                        states: ["stateEmote", "stateNoBubble", "stateNoSender"],
                        lineClass: "lineEmote",
                        sender: "none",
                    }),
                    row(layout, text("Welcome!"), { own: true }),
                    row(layout, text("Bye"), { sender: "profile" }),
                ];
                render(layout, rows.join(MARKER));
                const lines = all(".ReadMarker_line").map(box);
                const avatars = all(".slotAvatar > *")
                    .map(box)
                    .filter((avatar) => avatar.width > 0);
                // The space between each painted line and every avatar beside it, negative where they overlap
                const tooClose = lines.flatMap((line, index) =>
                    avatars
                        .filter((avatar) => line.left < avatar.right && avatar.left < line.right)
                        .map((avatar) => ({
                            marker: index,
                            avatar: [avatar.top, avatar.bottom],
                            space: Math.max(avatar.top - line.bottom, line.top - avatar.bottom),
                        }))
                        .filter(({ space }) => space < 2),
                );

                expect(lines).toHaveLength(rows.length - 1);
                expect(avatars.length).toBeGreaterThan(4);
                expect(tooClose).toEqual([]);
            },
        );
    });

    describe("read receipts", () => {
        it("end where the time of a message without them does in the modern layout", () => {
            render("group", row("group", text("Hello"), { receipt: true }), row("group", text("Hi"), { first: false }));
            const [withReceipts, withoutReceipts] = all(".root");

            expect(box(withReceipts.querySelector(".mx_ReadReceiptGroup_button")!).right).toBe(
                timeOf(withoutReceipts).right,
            );
        });

        it.each(["bubble", "group", "irc"] as const)("are a pill in the %s layout", (layout) => {
            render(layout, row(layout, text("Hello"), { receipt: true }));
            const button = document.querySelector(".mx_ReadReceiptGroup_button")!;
            const { height } = box(button);

            expect(cornerRadii(button)).toEqual({ x: height / 2, y: height / 2 });
        });
    });

    describe("the start of a room and the typing notice", () => {
        it.each(["bubble", "group", "irc"] as const)(
            "start where the text of a message does in the %s layout",
            (layout) => {
                render(layout, INTRO, row(layout, text("First message in the room")), typing(["Alice"]));
                const message = bodyText(document.querySelector(".root")!);

                expect(box(document.querySelector(".mx_NewRoomIntro")!).left).toBe(message.left);
                expect(box(document.querySelector(".mx_NewRoomIntro > p")!).left).toBe(message.left);
                expect(textBox(document.querySelector(".mx_WhoIsTypingTile_label")!).left).toBe(message.left);
            },
        );

        it.each(["bubble", "group", "irc"] as const)(
            "centers the warning of a room that isn't encrypted under the date separators in the %s layout",
            (layout) => {
                render(layout, DATE_SEPARATOR, UNENCRYPTED_INTRO, row(layout, text("First message in the room")));
                const pill = box(document.querySelector(".pill")!);
                const card = box(document.querySelector(".mx_cryptoEvent")!);

                expect(Math.abs(centerX(card) - centerX(pill))).toBeLessThanOrEqual(0.5);
                // The rest of the intro still starts where the text of a message does
                expect(box(document.querySelector(".mx_NewRoomIntro > p")!).left).toBe(
                    bodyText(document.querySelector(".root")!).left,
                );
            },
        );

        it.each([
            ["one person", ["Alice"]],
            ["two people", ["Alice", "Bob"]],
            ["three people", ["Alice", "Bob", "Carol"]],
        ])(
            "keeps the avatars of %s typing on the message avatars' column and off the label in bubbles",
            (_name, people) => {
                render("bubble", row("bubble", text("First message in the room")), typing(people));
                const messageAvatar = box(document.querySelector(".slotAvatar > *")!);
                const avatars = all(".mx_WhoIsTypingTile_avatars > *").map(box);
                const label = textBox(document.querySelector(".mx_WhoIsTypingTile_label")!);

                expect(centerX(avatars.at(-1)!)).toBe(centerX(messageAvatar));
                expect(label.left - avatars.at(-1)!.right).toBeGreaterThanOrEqual(8);
            },
        );

        it("puts the typing avatars where the sender's name starts in the IRC layout", () => {
            render("irc", row("irc", text("First message in the room")), typing(["Alice", "Bob"]));
            const sender = box(document.querySelector(".slotSender")!);
            const avatars = all(".mx_WhoIsTypingTile_avatars > *").map(box);

            expect(avatars[0].left).toBe(sender.left);
            expect(avatars.at(-1)!.right).toBeLessThan(
                textBox(document.querySelector(".mx_WhoIsTypingTile_label")!).left,
            );
        });

        it("spaces the intro's buttons 12px apart when they wrap, with 8px between an icon and its label", () => {
            render("bubble", INTRO);
            const [invite, topic] = all(".mx_NewRoomIntro_buttons > *").map(box);
            const icon = box(document.querySelector(".mx_NewRoomIntro_buttons svg")!);
            const label = textBox(document.querySelector(".mx_NewRoomIntro_inviteButton")!);

            expect(topic.top - invite.bottom).toBe(12);
            expect(label.left - icon.right).toBe(8);
        });
    });

    describe("the end of a message search's results", () => {
        /**
         * RoomSearchView's results: the line that ends them, then a result as SearchResultTile renders it, a list of
         * its date separator and its message.
         */
        function renderSearchResults(marker: string, { dir = "ltr", compact = false } = {}): HTMLElement {
            document.body.innerHTML = `
                <div class="${compact ? "mx_MatrixChat_useCompactLayout" : ""}" dir="${dir}">
                    <div class="mx_RoomView_body cpd-theme-light" data-layout="bubble" style="width: 880px; height: 700px; font-family: Inter">
                        <div class="mx_ScrollPanel mx_RoomView_searchResultsPanel mx_RoomView_messagePanel">
                            <div class="mx_RoomView_messageListWrapper">
                                <ol class="mx_RoomView_MessageList">
                                    <li class="mx_RoomView_scrollheader"></li>
                                    <li><h2 class="mx_RoomView_topMarker">${marker}</h2></li>
                                    <li><ol>${DATE_SEPARATOR}${row("bubble", text("Can you check the dark theme?"))}</ol></li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            return document.querySelector<HTMLElement>(".mx_RoomView_topMarker")!;
        }

        it.each(["No more results", "No results"])(
            "writes %s as a line of 13px secondary text, without a pill",
            (marker) => {
                const line = renderSearchResults(marker);
                const style = getComputedStyle(line);

                expect(style.fontSize).toBe("13px");
                expect(style.fontWeight).toBe("400");
                expect(style.color).toBe(tokenColor("--cpd-color-text-secondary", line));
                expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
                expect(style.borderRadius).toBe("0px");
            },
        );

        it.each([false, true])(
            "spaces the line 8px above and below, as the date pills, in the compact layout: %s",
            (compact) => {
                const style = getComputedStyle(renderSearchResults("No more results", { compact }));

                expect([style.marginTop, style.marginBottom]).toEqual(["8px", "8px"]);
            },
        );

        it.each(["ltr", "rtl"])("centers the line on the results' date pills in %s text", (dir) => {
            const line = textBox(renderSearchResults("No more results", { dir }));
            const pill = box(document.querySelector(".pill")!);

            expect(Math.abs(centerX(line) - centerX(pill))).toBeLessThanOrEqual(0.5);
        });

        it.each(["ltr", "rtl"])(
            "puts a result's avatar and bubble on the timeline's edges in %s text, not the browser's list padding further in",
            (dir) => {
                /** How far the avatar and the bubble start from the list's start edge. */
                const insets = (): number[] => {
                    const list = box(document.querySelector(".mx_RoomView_MessageList")!);
                    const start = (rect: DOMRect): number =>
                        dir === "ltr" ? rect.left - list.left : list.right - rect.right;
                    return [start(box(document.querySelector(".slotAvatar > *")!)), start(box(all(".line")[0]))];
                };
                render("bubble", row("bubble", text("Can you check the dark theme?")));
                document.querySelector(".mx_RoomView_body")!.setAttribute("dir", dir);
                const timeline = insets();
                renderSearchResults("No more results", { dir });

                expect(timeline).toEqual([12, 52]);
                expect(insets()).toEqual(timeline);
            },
        );
    });
});
