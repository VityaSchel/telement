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
import textualBodyStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/TextualBodyView/TextualBody.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import decryptionFailureStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/DecryptionFailureBodyView/DecryptionFailureBodyView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import textualEventViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/TextualEventView/TextualEventView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import disambiguatedProfileStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/DisambiguatedProfile/DisambiguatedProfile.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import readMarkerStyles from "../../../../packages/shared-components/src/room/timeline/ReadMarker/ReadMarker.module.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import roomViewStyles from "../../res/css/structures/_RoomView.pcss?raw";
import baseAvatarStyles from "../../res/css/views/avatars/_BaseAvatar.pcss?raw";
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

const RECEIPTS = `
    <div class="mx_ReadReceiptGroup" role="group" aria-label="Read receipts">
        <div class="mx_AccessibleButton mx_ReadReceiptGroup_button" role="button" tabindex="0">
            <span class="mx_ReadReceiptGroup_container" style="width: 26px">${avatar(14, "Bob")}</span>
        </div>
    </div>
`;

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
        ...states,
    ].filter(Boolean);
    const name = own ? "Viktor" : "Alice";
    const timestamp = slot("Timestamp", '<a class="mx_MessageTimestamp content">12:41</a>');
    const senderMarkup =
        options.sender === "profile"
            ? profile(layout, name)
            : `<div class="mx_DisambiguatedProfile"><span>${name}</span></div>`;
    const sender =
        ((first && !info) || layout === "irc") && options.sender !== "none" ? slot("Sender", senderMarkup) : "";
    const avatarSlot =
        first || info || layout === "irc" ? slot("Avatar", avatar(info || layout === "irc" ? 14 : 30, name)) : "";
    const lock = padlock ? slot("Padlock", PADLOCK) : "";
    const footer = options.footer ? slot("Footer", options.footer) : "";
    const threadInfo = options.threadInfo ? slot("ThreadInfo", options.threadInfo) : "";
    const receipt = options.receipt ? slot("Receipt", RECEIPTS) : "";
    const open = `<li class="${rootClasses.join(" ")}" data-testid="event-tile">`;
    if (layout === "irc") {
        return `${open}${timestamp}${lock}${avatarSlot}${sender}<div class="line mx_EventTile_line ${lineClass}">${slot("Body", body)}${footer}${threadInfo}</div>${receipt}</li>`;
    }
    return `${open}${sender}${avatarSlot}<div class="line mx_EventTile_line ${lineClass}">${timestamp}${lock}${slot("Body", body)}</div>${footer}${threadInfo}${receipt}</li>`;
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
                ${moduleCss(textualBodyStyles, "TextualBody")}
                ${moduleCss(decryptionFailureStyles, "DecryptionFailureBodyView")}
                ${moduleCss(textualEventViewStyles, "TextualEventView")}
                ${moduleCss(readMarkerStyles, "ReadMarker")}
                ${moduleCss(disambiguatedProfileStyles, "DisambiguatedProfile")}
            }
            @layer app-web {
                /* The theme's own variable, which the app's font stack reads: without it the timestamp has no font */
                :root { --emoji-font-family: ""; }
                ${toBrowserCss(commonStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(roomViewStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(eventTileStyles, fontSizes, lightTheme)}
                ${toBrowserCss(textualEventStyles, lightTheme)}
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

        it("puts reactions 8px under their bubble", () => {
            render("bubble", row("bubble", text("Lunch?"), { footer: '<div style="height: 24px"></div>' }));

            expect(box(document.querySelector(".slotFooter")!).top - box(document.querySelector(".line")!).bottom).toBe(
                8,
            );
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
            const canvas = tokenColor("--cpd-color-bg-canvas-default", hovered);
            const band = tokenColor("--event-tile-bubble-hover-background", selected);
            await userEvent.hover(hovered.querySelector(".line")!);

            expect(hovered.matches(":hover")).toBe(true);
            expect(getComputedStyle(hovered, "::before").backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect(getComputedStyle(hovered.querySelector(".slotAvatar")!).borderColor).toBe(canvas);
            expect(getComputedStyle(selected, "::before").backgroundColor).toBe(band);
            expect(getComputedStyle(selected.querySelector(".slotAvatar")!).borderColor).toBe(band);
        });

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

            expect(box(others.querySelector(".slotAvatar > *")!).width).toBe(30);
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

            it.each<[string, string, string, RowOptions]>([
                [
                    "another person's emote",
                    EMOTE,
                    ".mx_MEmoteBody",
                    { states: ["stateEmote", "stateNoBubble"], lineClass: "lineEmote" },
                ],
                ["a message that hides its sender", text("Hello"), ".mx_EventTile_body", { states: ["stateNoSender"] }],
            ])(
                "centers the avatar on the first line of %s, which has no sender row, inside the row, clear of the read markers around it",
                (_name, body, selector, options) => {
                    render(
                        "bubble",
                        row("bubble", text("Morning everyone"), { sender: "profile" }),
                        READ_MARKER,
                        row("bubble", body, { ...options, sender: "none" }),
                        READ_MARKER,
                        row("bubble", text("Lunch?"), { sender: "profile" }),
                    );
                    const tile = all(".root")[1];
                    const avatar = box(tile.querySelector(".slotAvatar > *")!);
                    const [before, after] = all(".ReadMarker_line").map(box);

                    // The text's own box sits up to a pixel off the middle of its line at some font sizes, as the font's
                    // ascent and descent are rounded to whole pixels
                    expect(
                        Math.abs(middle(avatar) - lineMiddles(tile.querySelector(selector)!)[0]),
                    ).toBeLessThanOrEqual(1);
                    expect(avatar.top).toBeGreaterThanOrEqual(box(tile).top);
                    expect(avatar.bottom).toBeLessThanOrEqual(box(tile).bottom);
                    expect(avatar.top - before.bottom).toBeGreaterThanOrEqual(4);
                    expect(after.top - avatar.bottom).toBeGreaterThanOrEqual(4);
                },
            );
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
            expect(otherText.left).toBeGreaterThanOrEqual(box(other.querySelector(".slotAvatar")!).right);
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

                expect(avatar.width).toBe(30);
                expect(avatar.height).toBe(30);
            },
        );

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

        it.each<[string, RowOptions]>([
            ["another's message", {}],
            ["your own message", { own: true }],
            ["an informational row", { states: ["stateInfo"] }],
        ])("ends the read receipts of %s at the timeline's content edge", (_name, options) => {
            const body = options.states ? event("bubble", "Alice joined the room") : text("Hello");
            render("bubble", row("bubble", body, { ...options, receipt: true }));
            const button = document.querySelector(".mx_ReadReceiptGroup_button")!;

            expect(box(button).right).toBe(contentEnd());
        });

        it("keeps the text of an informational row clear of its read receipts", () => {
            // Short words fill each line to within a word of its end
            const body = event("bubble", `Alice changed the topic to ${"ab ".repeat(120)}`);
            render("bubble", row("bubble", body, { states: ["stateInfo"], receipt: true }));
            const receipts = box(document.querySelector(".mx_ReadReceiptGroup_button")!);
            const range = document.createRange();
            range.selectNodeContents(document.querySelector(".mx_TextualEvent")!);
            const textEnd = Math.max(...[...range.getClientRects()].map((rect) => rect.right));

            // The 60px the rows of messages keep free at the end for the receipts
            expect(contentEnd() - textEnd).toBeGreaterThanOrEqual(60);
            expect(textEnd).toBeLessThan(receipts.left);
        });
    });

    describe("in the thread panel's bubble layout", () => {
        /** ReadReceiptGroup for `readers` people, as wide as ReadReceiptGroup makes it for them. */
        const receipts = (readers: number): string => `
            <div class="mx_ReadReceiptGroup" role="group" aria-label="Read receipts">
                <div class="mx_AccessibleButton mx_ReadReceiptGroup_button" role="button" tabindex="0">
                    <span class="mx_ReadReceiptGroup_container" style="width: ${readers * 10 + 6}px"></span>
                </div>
            </div>
        `;

        /** A message in ThreadView, whose Thread shape puts the read receipts in the line. */
        function threadRow(body: string, { own = false, info = false, readers = 2 } = {}): string {
            const classes = ["root", "mx_EventTile", "shapeThread", "layoutBubble", "hasReceiptSlot"];
            if (own) classes.push("stateOwnEvent");
            if (info) classes.push("stateInfo");
            const sender = own || info ? "" : slot("Sender", profile("bubble", "Alice"));
            return `
                <li class="${classes.join(" ")}" data-testid="event-tile">
                    <div class="senderDetails">${own ? "" : slot("Avatar", avatar(info ? 14 : 30))}${sender}</div>
                    <div class="line mx_EventTile_line">
                        ${slot("Body", body)}${slot("Timestamp", '<a class="mx_MessageTimestamp content">12:41</a>')}${slot("Receipt", receipts(readers))}
                    </div>
                </li>
            `;
        }

        /** ThreadView's timeline in a 380px right panel. */
        function renderThread(...items: string[]): void {
            document.body.innerHTML = `
                <div class="mx_ThreadView mx_ThreadPanel cpd-theme-light" style="width: 380px; font-family: Inter">
                    <ol class="mx_RoomView_MessageList" style="padding: 8px">${items.join("")}</ol>
                </div>
            `;
        }

        it("ends the read receipts at the panel's content edge, wherever the bubble ends", () => {
            renderThread(
                threadRow(text("Short")),
                threadRow(text("A much longer message that wraps in the thread panel, over two lines or more")),
                threadRow(text("Yes, from ten"), { own: true }),
                threadRow(event("bubble", "Alice changed the room name to Fifth floor"), { info: true }),
            );

            for (const button of all(".mx_ReadReceiptGroup_button")) expect(box(button).right).toBe(contentEnd());
        });

        it("ends other people's rows the panel's 36px before its content edge, and your own the room's 60px", () => {
            renderThread(threadRow(text("Short")), threadRow(text("Yes, from ten"), { own: true }));
            const [others, own] = all(".root");

            expect(contentEnd() - box(others).right).toBe(36);
            expect(contentEnd() - box(own).right).toBe(60);
        });

        // As in the room: the bubble keeps clear of up to three readers, its text and time of four
        it.each([
            [2, ".line"],
            [3, ".line"],
            [4, ".mx_MessageTimestamp"],
        ])("keeps your own bubble clear of %i readers' receipts", (readers, selector) => {
            renderThread(threadRow(text("A reply of my own that wraps in the thread panel"), { own: true, readers }));
            const button = box(document.querySelector(".mx_ReadReceiptGroup_button")!);

            expect(button.right).toBe(contentEnd());
            expect(box(document.querySelector(selector)!).right).toBeLessThanOrEqual(button.left);
            expect(bodyText(document.querySelector(".root")!).right).toBeLessThan(button.left);
        });

        it.each([
            ["that fits on a line", "Alice changed the room name to Fifth floor"],
            ["that wraps", LONG_TEXT],
        ])(
            "shows the time of an informational row %s in the panel, placed as in the room and centered on the row",
            (_name, body) => {
                render("bubble", row("bubble", event("bubble", body), { states: ["stateInfo"] }));
                const room = document.querySelector(".root")!;
                const inRoom = {
                    time: bodyText(room).left - timeOf(room).left,
                    avatar: bodyText(room).left - box(room.querySelector(".slotAvatar > *")!).right,
                };
                renderThread(threadRow(event("bubble", body), { info: true }));
                const tile = document.querySelector(".root")!;
                const text = bodyText(tile);
                const time = timeOf(tile);
                const avatar = box(tile.querySelector(".slotAvatar > *")!);

                expect(time.left).toBeGreaterThanOrEqual(box(document.querySelector(".mx_ThreadView")!).left);
                expect(text.left - time.left).toBe(inRoom.time);
                expect(text.left - avatar.right).toBe(inRoom.avatar);
                expect(Math.abs(middle(time) - middle(text))).toBeLessThanOrEqual(0.5);
                expect(Math.abs(middle(avatar) - middle(text))).toBeLessThanOrEqual(0.5);
            },
        );

        it("keeps the text of an informational row clear of its read receipts", () => {
            renderThread(threadRow(event("bubble", `Alice changed the topic to ${"ab ".repeat(60)}`), { info: true }));
            const range = document.createRange();
            range.selectNodeContents(document.querySelector(".mx_TextualEvent")!);
            const textEnd = Math.max(...[...range.getClientRects()].map((rect) => rect.right));

            expect(textEnd).toBeLessThan(box(document.querySelector(".mx_ReadReceiptGroup_button")!).left);
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
});
