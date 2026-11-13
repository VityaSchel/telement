/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar, Text } from "@vector-im/compound-web";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import githubMarkdown from "github-markdown-css/github-markdown-light.css?raw";

// The package's built bundle needs Node's `process`, so the views' DOM is written out below and their stylesheets are
// loaded from source
// eslint-disable-next-line no-restricted-imports
import eventTileViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import messageTimestampViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/timestamp/MessageTimestampView/MessageTimestampView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import imageBodyViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/MImageBodyView/ImageBodyView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import videoBodyViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/MVideoBodyView/VideoBodyView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import textualBodyStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/TextualBodyView/TextualBody.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaPreviewGroupViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/MediaPreviewGroupView/MediaPreviewGroupView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaPreviewTileStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/MediaPreviewGroupView/MediaPreviewTile/MediaPreviewTile.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaPreviewComponentsStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/MediaPreviewGroupView/MediaPreviewComponents/MediaPreviewComponents.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import linkedTextStyles from "../../../../packages/shared-components/src/core/utils/LinkedText/LinkedText.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaBodyStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/MediaBody/MediaBody.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import audioPlayerViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/AudioPlayerView/AudioPlayerView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import flexStyles from "../../../../packages/shared-components/src/core/utils/Flex/Flex.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import playbackContainerStyles from "../../res/css/views/audio_messages/_PlaybackContainer.pcss?raw";
import baseAvatarStyles from "../../res/css/views/avatars/_BaseAvatar.pcss?raw";
import eventTileStyles from "../../res/css/views/rooms/_EventTile.pcss?raw";
import textualEventStyles from "../../res/css/views/messages/_TextualEvent.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { cornerRadii, toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";

/**
 * A CSS module with its local class names prefixed by the module's name, as the library build names them, so that
 * several modules' `.root` don't collide. EventTileView's own names stay unprefixed, as the timestamp tests have them.
 */
function moduleCss(source: string, name: string): string {
    const globals: string[] = [];
    return source
        .replace(/:global\(([^)]*)\)/g, (_match, selector: string) => `@global${globals.push(selector) - 1}@`)
        .replace(/\.(-?[_a-zA-Z][\w-]*)/g, `.${name}_$1`)
        .replace(/@global(\d+)@/g, (_match, index: string) => globals[Number(index)]);
}

const timestamp = '<div class="slotTimestamp"><a class="mx_MessageTimestamp content">12:48</a></div>';
const plain = (text: string): string => `<div class="mx_EventTile_body translate" dir="auto">${text}</div>`;

/** The padlock of a message from an unverified device, 14px square as E2ePadlock draws it. */
const PADLOCK = '<div class="slotPadlock"><div class="mx_E2ePadlock" style="width: 14px; height: 14px"></div></div>';

interface TileOptions {
    own?: boolean;
    continuation?: boolean;
    last?: boolean;
    reply?: string;
    padlock?: boolean;
    lineClass?: string;
}

/** An EventTileView in the bubble layout, as the room timeline renders it. */
function tile(
    body: string,
    { own = false, continuation = false, last = true, reply, padlock = false, lineClass = "" }: TileOptions = {},
): string {
    const states = [
        own && "stateOwnEvent",
        continuation && "stateContinuation",
        reply && "stateHasReply",
        last && "stateLastInSection",
    ].filter(Boolean);
    const replyChain = reply
        ? `<div class="slotReplyChain"><div class="mx_ReplyChain_wrapper">${reply}</div></div>`
        : "";
    return `
        <li class="root mx_EventTile layoutBubble ${states.join(" ")}" data-testid="event-tile">
            <div class="line mx_EventTile_line ${lineClass}">
                ${timestamp}${padlock ? PADLOCK : ""}${replyChain}
                <div class="slotBody">${body}</div>
            </div>
        </li>
    `;
}

/** A picture as ImageBodyView renders it. */
function picture(width: number, height: number): string {
    return `
        <div class="mx_ImageBody ImageBodyView_root">
            <a class="ImageBodyView_link" href="#">
                <div class="mx_ImageBody_container ImageBodyView_thumbnailContainer"
                    style="width: ${width}px; max-width: 100%; max-height: ${height}px; aspect-ratio: ${width} / ${height}">
                    <div class="ImageBodyView_mediaContent"></div>
                </div>
            </a>
        </div>
    `;
}

/** A video poster as VideoBodyView renders it. */
function video(width: number, height: number): string {
    return `
        <span class="mx_MVideoBody VideoBodyView_root">
            <button type="button" class="mx_MVideoBody_container VideoBodyView_container VideoBodyView_frame"
                style="width: ${width}px; max-width: 100%; max-height: ${height}px; aspect-ratio: ${width} / ${height}"></button>
        </span>
    `;
}

const PICTURE = picture(240, 160);
const VIDEO = video(240, 135);

/** A picture hidden by the media preview setting, as ImageBodyView renders it. */
const HIDDEN_PICTURE = `
    <div class="mx_ImageBody ImageBodyView_root">
        <div class="mx_ImageBody_container ImageBodyView_thumbnailContainer"
            style="width: 240px; max-width: 100%; max-height: 160px; aspect-ratio: 3 / 2">
            <div class="ImageBodyView_mediaContent">
                <div style="width: 240px; height: 160px">
                    <button type="button" class="ImageBodyView_hiddenButton">
                        <div class="ImageBodyView_hiddenButtonContent"><span>Show image</span></div>
                    </button>
                </div>
            </div>
        </div>
    </div>
`;

/** A picture that failed to load, as ImageBodyView renders it: a line of text in place of the frame. */
const FAILED_PICTURE = `
    <span class="mx_ImageBody ImageBodyView_root ImageBodyView_error">
        <svg class="ImageBodyView_errorIcon" width="16" height="16"></svg>Error downloading image
    </span>
`;

/** A picture or video with its caption, as MessageEvent's CaptionBody renders them, in a media line. */
function captioned(media: string, caption: string, options: TileOptions = {}, body = plain(caption)): string {
    return tile(
        `<div class="mx_EventTile_content">${media}<div class="mx_MTextBody mx_EventTile_caption TextualBody_root TextualBody_caption" data-event-layout="bubble">${body}</div></div>`,
        { ...options, lineClass: "lineMedia" },
    );
}

/** An audio player as AudioPlayerView renders it, in MAudioBody's span. */
const AUDIO = `
    <span class="mx_MAudioBody">
        <div class="mx_MediaBody MediaBody_mediaBody AudioPlayerView_audioPlayer" role="region" tabindex="0">
            <div class="Flex_flex" style="--mx-flex-display: flex; --mx-flex-align: center; --mx-flex-gap: var(--cpd-space-2x)">
                <button type="button" class="play" style="width: 32px; height: 32px; flex-shrink: 0"></button>
                <div class="Flex_flex AudioPlayerView_mediaInfo" style="--mx-flex-display: flex; --mx-flex-direction: column">
                    <span class="AudioPlayerView_mediaName">Sample Audio</span>
                    <div class="Flex_flex AudioPlayerView_byline" style="--mx-flex-display: flex">05:00 (3.42 KB)</div>
                </div>
            </div>
            <div class="Flex_flex" style="--mx-flex-display: flex; --mx-flex-align: center; --mx-flex-gap: var(--cpd-space-1x)">
                <input type="range" style="width: 160px; margin: 0" />
                <time class="mx_Clock AudioPlayerView_clock">02:00</time>
            </div>
        </div>
    </span>
`;

/** A voice message as RecordingPlayback renders it in the timeline, in MVoiceMessageBody's span. */
const VOICE = `
    <span class="mx_MVoiceMessageBody">
        <div class="mx_MediaBody MediaBody_mediaBody mx_VoiceMessagePrimaryContainer">
            <button type="button" class="play" style="width: 32px; height: 32px; flex-shrink: 0"></button>
            <div class="mx_RecordingPlayback_timelineLayoutMiddle"><div class="mx_Waveform"></div></div>
            <span class="mx_Clock">0:07</span>
        </div>
    </span>
`;

/** The file's size as MediaPreviewComponents' Body renders it: LinkedText, in Compound's body text. */
const FILE_SIZE = renderToStaticMarkup(
    createElement(
        Text,
        { type: "body", size: "md", className: "LinkedText_container MediaPreviewComponents_body" },
        "2.3 MB",
    ),
);

/** A button of a file's card, with its 20px icon. */
const fileButton = (label: string): string =>
    `<button type="button" aria-label="${label}" class="MediaPreviewComponents_button"><svg width="20" height="20"></svg></button>`;

/**
 * A file as PreviewFileBody renders it: the media preview group of one tile, in an mx_EventTile_content, with the
 * download button, and the viewer's button too when the document viewer is on.
 */
const file = (name: string, buttons = [fileButton("Download")]): string => `
    <div class="mx_EventTile_content">
        <div class="MediaPreviewGroupView_container">
            <div class="MediaPreviewTile_tile">
                <div class="MediaPreviewTile_below">
                    <div class="MediaPreviewComponents_leftGroup">
                        <div class="MediaPreviewComponents_icon play"><button type="button" aria-label="View file"></button></div>
                        <div class="MediaPreviewComponents_textContent">
                            <div class="MediaPreviewComponents_header">${name}</div>
                            ${FILE_SIZE}
                        </div>
                    </div>
                    <div class="MediaPreviewComponents_buttonGroup">${buttons.join("")}</div>
                </div>
            </div>
        </div>
    </div>
`;

const FILE = file("annual-report.pdf");

const CARDS: Array<[string, string]> = [
    ["an audio player", AUDIO],
    ["a voice message", VOICE],
    ["a file", FILE],
];

/** What paints a card of its own outside a bubble: the media body of a player, the tile of a file. */
function cardOf(line: Element): HTMLElement {
    return line.querySelector<HTMLElement>(".mx_MediaBody, .MediaPreviewTile_tile")!;
}

/** The element that paints a media line's bubble: the line, or else the card in it. */
function paintedBubble(line: HTMLElement): HTMLElement {
    return getComputedStyle(line).backgroundColor === "rgba(0, 0, 0, 0)" ? cardOf(line) : line;
}

/** A link preview card as MediaPreviewTile renders it. */
const CARD = `
    <div class="MediaPreviewTile_tile">
        <div style="height: 100px"></div>
        <div class="MediaPreviewTile_below"><div style="height: 40px">Element 1.12: threads for everyone</div></div>
    </div>
`;

/** The button under a group of previews that shows the rest of them, as MediaPreviewGroupView renders it. */
const SHOW_MORE =
    '<button type="button" class="MediaPreviewGroupView_toggleButton" data-kind="tertiary" style="height: 36px">Show 2 more</button>';

/** A text message with link previews, as TextualBodyView renders it with MediaPreviewGroupView below the text. */
function withPreviews(text: string, cards: number, options: TileOptions = {}, showMore = false): string {
    return tile(
        `<div class="mx_MTextBody mx_EventTile_content TextualBody_root TextualBody_text" data-event-layout="bubble">${plain(text)}<div class="mx_TextualBody_urlPreviews MediaPreviewGroupView_container">${CARD.repeat(cards)}${showMore ? SHOW_MORE : ""}</div></div>`,
        options,
    );
}

/** A 14px avatar as BaseAvatar renders it: a <button> when clicking it opens the user's profile. */
function avatar(clickable: boolean): string {
    return renderToStaticMarkup(
        createElement(Avatar, {
            id: "@alice:example.org",
            name: "Alice",
            size: "14px",
            type: "round",
            className: "mx_BaseAvatar",
            onClick: clickable ? (): void => {} : undefined,
        }),
    );
}

/** An informational row ("Alice joined the room"). */
function infoRow(layout: "layoutBubble" | "layoutGroup", clickable: boolean): string {
    return `
        <li class="root mx_EventTile ${layout} stateInfo" data-testid="event-tile">
            <div class="slotAvatar">${avatar(clickable)}</div>
            <div class="line mx_EventTile_line">
                ${timestamp}<div class="slotBody"><div class="mx_TextualEvent">Alice joined the room</div></div>
            </div>
        </li>
    `;
}

function render(...tiles: string[]): void {
    renderAt(880, ...tiles);
}

/** The tiles in a timeline of the given width. */
function renderAt(width: number, ...tiles: string[]): void {
    document.body.innerHTML = `
        <ol class="cpd-theme-light" style="width: ${width}px; margin: 0; padding: 0; list-style: none; --MediaPreview-width: 478px">
            ${tiles.join("")}
        </ol>
    `;
}

function all(selector: string): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>(selector)];
}

function box(element: Element): DOMRect {
    return element.getBoundingClientRect();
}

function timeOf(line: Element): DOMRect {
    return box(line.querySelector(".slotTimestamp > *")!);
}

/** The boxes of the text in an element, one per line of each text node. */
function textBoxes(element: Element): DOMRect[] {
    const boxes: DOMRect[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        boxes.push(...Array.from(range.getClientRects()).filter((rect) => rect.width > 0));
    }
    return boxes;
}

function overlaps(a: DOMRect, b: DOMRect): boolean {
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

let stylesheet: HTMLStyleElement;

describe("Bubble layout", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components {
                ${telementTokens}
                ${eventTileViewStyles.replace(/:global\(([^)]*)\)/g, "$1")}
                ${messageTimestampViewStyles}
                ${moduleCss(imageBodyViewStyles, "ImageBodyView")}
                ${moduleCss(videoBodyViewStyles, "VideoBodyView")}
                ${moduleCss(textualBodyStyles, "TextualBody")}
                ${moduleCss(mediaPreviewGroupViewStyles, "MediaPreviewGroupView")}
                ${moduleCss(mediaPreviewTileStyles, "MediaPreviewTile")}
                ${moduleCss(mediaPreviewComponentsStyles, "MediaPreviewComponents")}
                ${moduleCss(linkedTextStyles, "LinkedText")}
                ${moduleCss(mediaBodyStyles, "MediaBody")}
                ${moduleCss(audioPlayerViewStyles, "AudioPlayerView")}
                ${moduleCss(flexStyles, "Flex")}
            }
            @layer app-web {
                ${githubMarkdown}
                ${toBrowserCss(eventTileStyles, fontSizes, lightTheme)}
                ${toBrowserCss(textualEventStyles, lightTheme)}
                ${toBrowserCss(baseAvatarStyles)}
                ${toBrowserCss(playbackContainerStyles, fontSizes, lightTheme)}
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

    describe("a captioned picture or video", () => {
        it.each([
            ["picture", PICTURE],
            ["video", VIDEO],
        ])("is a bubble with the %s across its top and the caption padded like text", (_name, media) => {
            render(captioned(media, "The view"), captioned(media, "My desk", { own: true }));
            const [others, own] = all(".line");

            expect(getComputedStyle(others).backgroundColor).toBe(
                tokenColor("--event-tile-bubble-other-background", others),
            );
            expect(getComputedStyle(own).backgroundColor).toBe(tokenColor("--event-tile-bubble-self-background", own));
            for (const line of [others, own]) {
                const frame = box(line.querySelector(".mx_ImageBody_container, .mx_MVideoBody_container")!);
                const bubble = box(line);
                const caption = textBoxes(line.querySelector(".mx_EventTile_caption")!);
                const time = timeOf(line);

                expect(frame.top).toBe(bubble.top);
                expect(frame.left).toBe(bubble.left);
                expect(frame.right).toBe(bubble.right);
                // 12px padding plus the body's 1px, as in a text bubble
                expect(caption[0].left - bubble.left).toBe(13);
                expect(caption[0].top).toBeGreaterThanOrEqual(frame.bottom + 8);
                expect(bubble.right - time.right).toBe(12);
                expect(bubble.bottom - time.bottom).toBe(8);
                expect(caption.some((text) => overlaps(text, time))).toBe(false);
                expect((time.top + time.bottom) / 2).toBeGreaterThan(caption.at(-1)!.top);
                expect((time.top + time.bottom) / 2).toBeLessThan(caption.at(-1)!.bottom);
            }
        });

        it("clips the media to the bubble's top corners and squares its bottom edge onto the caption", () => {
            render(
                captioned(PICTURE, "The view"),
                captioned(PICTURE, "More", { continuation: true }),
                captioned(PICTURE, "Mine", { own: true, continuation: true }),
            );

            for (const line of all(".line")) {
                const content = line.querySelector(".mx_EventTile_content")!;
                const frame = getComputedStyle(line.querySelector(".mx_ImageBody_container")!);
                const bubble = getComputedStyle(line);

                expect(getComputedStyle(content).overflow).not.toBe("visible");
                expect(getComputedStyle(content).borderStartStartRadius).toBe(bubble.borderStartStartRadius);
                expect(getComputedStyle(content).borderStartEndRadius).toBe(bubble.borderStartEndRadius);
                expect(frame.borderEndStartRadius).toBe("0px");
                expect(frame.borderEndEndRadius).toBe("0px");
            }
            const [first, continuation, ownContinuation] = all(".line").map((line) =>
                getComputedStyle(line.querySelector(".mx_EventTile_content")!),
            );
            expect([first.borderStartStartRadius, first.borderStartEndRadius]).toEqual(["12px", "12px"]);
            expect([continuation.borderStartStartRadius, continuation.borderStartEndRadius]).toEqual(["0px", "12px"]);
            expect([ownContinuation.borderStartStartRadius, ownContinuation.borderStartEndRadius]).toEqual([
                "12px",
                "0px",
            ]);
        });

        it("wraps a long caption within the media's width", () => {
            render(
                captioned(
                    PICTURE,
                    "The view from the fifth floor, looking west over the harbour towards the old lighthouse.",
                ),
            );
            const [line] = all(".line");
            const caption = textBoxes(line.querySelector(".mx_EventTile_caption")!);

            expect(box(line).width).toBe(240);
            expect(new Set(caption.map((text) => Math.round(text.bottom))).size).toBeGreaterThan(1);
            expect(caption.some((text) => overlaps(text, timeOf(line)))).toBe(false);
        });

        it.each([
            ["a 4:5 portrait", picture(183, 228), "Supercalifragilisticexpialidocious!"],
            ["a 1:5 picture", picture(65, 324), "Tower"],
            ["a 1:5 picture", picture(65, 324), "The tower from the street, all twelve floors of it."],
        ])("keeps every word of a caption under %s inside the bubble's padding", (_name, media, text) => {
            render(captioned(media, text));
            const [line] = all(".line");
            const bubble = box(line);
            const caption = textBoxes(line.querySelector(".mx_EventTile_caption")!);

            for (const textBox of caption) {
                expect(textBox.left).toBeGreaterThanOrEqual(bubble.left + 12);
                expect(textBox.right).toBeLessThanOrEqual(bubble.right - 12);
            }
        });

        it.each([
            ["picture", picture(65, 324)],
            ["video", video(65, 324)],
        ])("centres a %s narrower than a portrait thumbnail in a 160px bubble", (_name, media) => {
            render(captioned(media, "Tower"));
            const [line] = all(".line");
            const bubble = box(line);
            const frame = box(line.querySelector(".mx_ImageBody_container, .mx_MVideoBody_container")!);
            const caption = textBoxes(line.querySelector(".mx_EventTile_caption")!);

            expect(bubble.width).toBe(160);
            expect(frame.top).toBe(bubble.top);
            expect(frame.left - bubble.left).toBeCloseTo(bubble.right - frame.right, 1);
            expect(caption).toHaveLength(1);
        });

        it.each([
            ["a 9:16 portrait", picture(182, 324)],
            ["a 4:5 portrait", picture(183, 228)],
        ])("leaves %s thumbnail as wide as its bubble", (_name, media) => {
            render(captioned(media, "My desk"));
            const [line] = all(".line");
            const frame = box(line.querySelector(".mx_ImageBody_container")!);

            expect(frame.left).toBe(box(line).left);
            expect(frame.right).toBe(box(line).right);
        });

        it("pads a picture that failed to load like the caption below it", () => {
            render(captioned(FAILED_PICTURE, "The view from the fifth floor"));
            const [line] = all(".line");
            const bubble = box(line);
            const error = line.querySelector(".mx_ImageBody")!;
            const [text] = textBoxes(error);

            expect(box(error.querySelector("svg")!).left - bubble.left).toBe(12);
            expect(text.top - bubble.top).toBeGreaterThanOrEqual(8);
            expect(bubble.right - text.right).toBeGreaterThanOrEqual(12);
        });

        it.each([
            ["another's", false],
            ["an own", true],
        ])("sets hidden media's placeholder apart from %s bubble", (_name, own) => {
            render(captioned(HIDDEN_PICTURE, "Hidden picture", { own }));
            const [line] = all(".line");

            expect(getComputedStyle(line.querySelector("button")!).backgroundColor).not.toBe(
                getComputedStyle(line).backgroundColor,
            );
        });

        it("keeps the media flush with a padlock, which sits at the start of the caption's last line", () => {
            render(
                captioned(PICTURE, "From an unverified device, with a caption long enough to wrap", { padlock: true }),
            );
            const [line] = all(".line");
            const bubble = box(line);
            const frame = box(line.querySelector(".mx_ImageBody_container")!);
            const padlock = box(line.querySelector(".mx_E2ePadlock")!);
            const caption = textBoxes(line.querySelector(".mx_EventTile_caption")!);
            const lastLine = caption.at(-1)!;

            expect([frame.top, frame.left, frame.right]).toEqual([bubble.top, bubble.left, bubble.right]);
            expect(padlock.left - bubble.left).toBe(12);
            expect(
                Math.abs((padlock.top + padlock.bottom) / 2 - (lastLine.top + lastLine.bottom) / 2),
            ).toBeLessThanOrEqual(1);
            for (const textBox of caption) expect(textBox.left).toBeGreaterThanOrEqual(padlock.right + 4);
            expect(caption.some((text) => overlaps(text, timeOf(line)))).toBe(false);
        });

        it("puts the timestamp of a caption that ends in a code block in the block's bottom margin", () => {
            const code =
                '<div class="mx_EventTile_pre_container"><pre class="mx_EventTile_collapsedCodeBlock"><code>pnpm i18n\n</code></pre></div>';
            render(
                captioned(
                    PICTURE,
                    "",
                    {},
                    `<div class="mx_EventTile_body markdown-body translate" dir="auto"><p>Run:</p>${code}</div>`,
                ),
            );
            const [line] = all(".line");
            const pre = line.querySelector("pre")!;
            const caption = getComputedStyle(line.querySelector(".mx_EventTile_caption")!);

            expect(timeOf(line).top).toBeGreaterThanOrEqual(box(pre).bottom);
            expect(box(line).bottom - box(pre).bottom).toBeCloseTo(
                parseFloat(getComputedStyle(pre).marginBottom) +
                    parseFloat(caption.paddingBottom) +
                    parseFloat(caption.marginBottom),
                1,
            );
        });

        it("insets the media like the reply quote above it, with a radius of 12 minus the inset", () => {
            const quote =
                '<blockquote class="mx_ReplyChain">Are you coming to the office tomorrow, at ten?</blockquote>';
            render(captioned(PICTURE, "Here's the view", { own: true, reply: quote }));
            const [line] = all(".line");
            const bubble = box(line);
            const frameElement = line.querySelector(".mx_ImageBody_container")!;
            const frame = box(frameElement);

            expect(frame.left - bubble.left).toBe(12);
            expect(bubble.right - frame.right).toBe(12);
            expect(box(line.querySelector(".mx_ReplyChain_wrapper")!).width).toBe(240);
            expect(cornerRadii(frameElement)).toEqual({ x: 4, y: 4 });
            expect(bubble.right - timeOf(line).right).toBe(12);
            expect(bubble.bottom - timeOf(line).bottom).toBe(8);
        });

        it("keeps the inset media's corners concentric with the bubble's when the padding changes", () => {
            const quote = '<blockquote class="mx_ReplyChain">Are you coming?</blockquote>';
            render(captioned(PICTURE, "Here's the view", { reply: quote }));
            document
                .querySelector<HTMLElement>(".root")!
                .style.setProperty("--event-tile-bubble-padding-inline", "4px");
            const [line] = all(".line");
            const frameElement = line.querySelector(".mx_ImageBody_container")!;

            expect(box(frameElement).left - box(line).left).toBe(4);
            expect(cornerRadii(frameElement)).toEqual({ x: 8, y: 8 });
        });

        it("leaves a picture without a caption as it was: no bubble, rounded by 12 all round", () => {
            render(tile(PICTURE, { lineClass: "lineMedia lineTimestampOverMedia" }));
            const [line] = all(".line");
            const frame = line.querySelector(".mx_ImageBody_container")!;

            expect(getComputedStyle(line).backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect(getComputedStyle(frame).borderRadius).toBe("12px");
        });
    });

    describe("audio, voice messages and files", () => {
        it.each(CARDS)(
            "make %s one bubble in the sender's color, without a frame of its own, the card 8px from its start, top and bottom",
            (_name, body) => {
                render(tile(body, { lineClass: "lineMedia" }), tile(body, { own: true, lineClass: "lineMedia" }));
                const [others, own] = all(".line");

                expect(getComputedStyle(others).backgroundColor).toBe(
                    tokenColor("--event-tile-bubble-other-background", others),
                );
                expect(getComputedStyle(own).backgroundColor).toBe(
                    tokenColor("--event-tile-bubble-self-background", own),
                );
                for (const line of [others, own]) {
                    const bubble = box(line);
                    const card = getComputedStyle(cardOf(line));
                    const cardBox = box(cardOf(line));
                    const time = timeOf(line);

                    expect(card.backgroundColor).toBe("rgba(0, 0, 0, 0)");
                    expect(card.borderTopWidth).toBe("0px");
                    expect(cardBox.left - bubble.left).toBe(8);
                    expect(cardBox.top - bubble.top).toBe(8);
                    expect(bubble.bottom - cardBox.bottom).toBe(8);
                    // The card's own padding and margins give way to the bubble's
                    expect(box(line.querySelector(".play")!).left).toBe(cardBox.left);
                    expect(bubble.right - time.right).toBe(12);
                }
            },
        );

        it.each(CARDS.slice(0, 2))(
            "keep a column at the end of %s for the time, in its bottom corner",
            (_name, body) => {
                render(tile(body, { lineClass: "lineMedia" }), tile(body, { own: true, lineClass: "lineMedia" }));

                for (const line of all(".line")) {
                    const time = timeOf(line);
                    const contents = [...line.querySelectorAll(".slotBody *")]
                        .map(box)
                        .filter((rect) => rect.width > 0);

                    expect(box(line).bottom - time.bottom).toBe(8);
                    expect(contents.some((rect) => overlaps(rect, time))).toBe(false);
                }
            },
        );

        it.each(CARDS)("put the caption of %s in the same bubble, with the time at its end", (_name, body) => {
            const captioned = (caption: string, own = false): string =>
                tile(
                    `<div class="mx_EventTile_content">${body}<div class="mx_MTextBody mx_EventTile_caption TextualBody_root TextualBody_caption" data-event-layout="bubble">${plain(caption)}</div></div>`,
                    { own, lineClass: "lineMedia" },
                );
            render(captioned("The demo from Friday's rehearsal"), captioned("Got it", true));

            for (const line of all(".line")) {
                const bubble = box(line);
                const card = box(cardOf(line));
                const caption = textBoxes(line.querySelector(".mx_EventTile_caption")!);
                const time = timeOf(line);

                expect(getComputedStyle(line).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
                expect(card.left - bubble.left).toBe(8);
                expect(card.top - bubble.top).toBe(8);
                // 12px padding plus the body's 1px, as in a text bubble
                expect(caption[0].left - bubble.left).toBe(13);
                expect(caption[0].top).toBeGreaterThanOrEqual(card.bottom + 8);
                expect(bubble.right - time.right).toBe(12);
                expect(bubble.bottom - time.bottom).toBe(8);
                expect(caption.some((text) => overlaps(text, time))).toBe(false);
                expect((time.top + time.bottom) / 2).toBeGreaterThan(caption.at(-1)!.top);
                expect((time.top + time.bottom) / 2).toBeLessThan(caption.at(-1)!.bottom);
            }
        });

        it.each(CARDS)("keep a reply quote above %s at a text bubble's inset", (_name, body) => {
            render(tile(body, { lineClass: "lineMedia", reply: "<blockquote>Are you coming?</blockquote>" }));
            const [line] = all(".line");

            expect(box(line.querySelector(".mx_ReplyChain_wrapper")!).left - box(line).left).toBe(12);
            expect(box(cardOf(line)).left - box(line).left).toBe(8);
        });

        it.each(CARDS)("round %s like a text bubble in the same place in its group", (_name, body) => {
            const places: TileOptions[] = [
                { last: false },
                { continuation: true },
                { own: true, last: false },
                { own: true, continuation: true },
            ];
            render(
                ...places.flatMap((place) => [
                    tile(body, { ...place, lineClass: "lineMedia" }),
                    tile(plain("Text"), place),
                ]),
            );
            const lines = all(".line");

            for (let i = 0; i < lines.length; i += 2) {
                expect(getComputedStyle(paintedBubble(lines[i])).borderRadius).toBe(
                    getComputedStyle(lines[i + 1]).borderRadius,
                );
            }
            // Where another's group ends, all four corners are round
            const lastOfGroup = getComputedStyle(paintedBubble(lines[2]));
            expect([lastOfGroup.borderEndStartRadius, lastOfGroup.borderEndEndRadius]).toEqual(["12px", "12px"]);
        });
    });

    describe("a file bubble", () => {
        const withCaption = (name: string): string =>
            `<div class="mx_EventTile_content">${file(name)}<div class="mx_MTextBody mx_EventTile_caption TextualBody_root TextualBody_caption" data-event-layout="bubble">${plain("Ok")}</div></div>`;

        /** How many lines the file's name takes before it's cut short to one. */
        function nameLines(line: Element): number {
            const range = document.createRange();
            range.selectNodeContents(line.querySelector(".MediaPreviewComponents_header")!);
            return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
        }

        it.each([
            ["without a caption", file],
            ["with a caption", withCaption],
        ])("is Telegram's 268px wide for a short name, %s, and the card fills it", (_name, body) => {
            render(
                tile(body("q3.pdf"), { lineClass: "lineMedia" }),
                tile(body("q3.pdf"), { own: true, lineClass: "lineMedia" }),
            );

            for (const line of all(".line")) {
                const card = box(cardOf(line));
                expect(box(line).width).toBe(268);
                expect(card.left - box(line).left).toBe(8);
                expect(box(line).right - card.right).toBe(parseFloat(getComputedStyle(line).paddingInlineEnd));
            }
        });

        it("grows with a longer name and shows it whole", () => {
            render(tile(file("annual-report-for-the-board-meeting.pdf"), { lineClass: "lineMedia" }));
            const [line] = all(".line");

            expect(box(line).width).toBeGreaterThan(268);
            expect(nameLines(line)).toBe(1);
            expect(box(line).width).toBeLessThan(box(line.closest("li")!).width * 0.7);
        });

        it("is as wide as an audio bubble can be for a name too long for it, and cuts the name short only there", () => {
            const name = `quarterly-report-${"and-appendix-".repeat(12)}final.pdf`;
            render(
                tile(file(name), { lineClass: "lineMedia" }),
                tile(plain(name.replaceAll("-", " "))),
                tile(AUDIO, { lineClass: "lineMedia" }),
            );
            const [fileLine, textLine, audioLine] = all(".line");
            const audio = getComputedStyle(audioLine);

            // A text bubble's widest content, with an audio bubble's padding and its column for the time
            expect(box(fileLine).width).toBeCloseTo(
                parseFloat(getComputedStyle(textLine).width) +
                    parseFloat(audio.paddingInlineStart) +
                    parseFloat(audio.paddingInlineEnd),
                2,
            );
            expect(nameLines(fileLine)).toBeGreaterThan(1);
        });

        /** The text of the file's size, its line's box, and where the line's room for text ends. */
        function sizeOf(line: Element): { text: DOMRect; line: DOMRect; textEnd: number } {
            const size = line.querySelector(".MediaPreviewComponents_body")!;
            const [text] = textBoxes(size);
            return {
                text,
                line: box(size),
                textEnd: box(size).right - parseFloat(getComputedStyle(size).paddingInlineEnd),
            };
        }

        it.each([
            ["another's", false],
            ["your own", true],
        ])(
            "puts the time at the end of the file's size in %s bubble, as at the end of a text bubble's last line",
            (_name, own) => {
                render(tile(file("annual-report.pdf"), { own, lineClass: "lineMedia" }));
                const [line] = all(".line");
                const bubble = box(line);
                const size = sizeOf(line);
                const timeSlot = box(line.querySelector(".slotTimestamp")!);
                const time = timeOf(line);

                // No column for the time: the card ends where a caption does
                expect(bubble.right - box(cardOf(line)).right).toBe(12);
                expect(bubble.right - time.right).toBe(12);
                expect(timeSlot.bottom).toBe(size.line.bottom);
                expect(timeSlot.height).toBe(18);
                // The size's line runs to the card's end and keeps the time's room and its 8px gap free
                expect(size.line.right).toBe(box(cardOf(line)).right);
                expect(time.left - size.textEnd).toBeGreaterThanOrEqual(8);
                expect(time.left - size.text.right).toBeGreaterThanOrEqual(8);
            },
        );

        it.each([
            ["the download button", [fileButton("Download")]],
            ["the viewer's and the download buttons", [fileButton("Open"), fileButton("Download")]],
        ])(
            "runs the name's line to %s, 36px and centered on it, the icons ending where the time does",
            (_name, buttons) => {
                render(tile(file("annual-report.pdf", buttons), { lineClass: "lineMedia" }));
                const [line] = all(".line");
                const name = box(line.querySelector(".MediaPreviewComponents_header")!);
                const icons = all(".MediaPreviewComponents_button svg").map(box);
                const time = timeOf(line);

                expect(icons[0].left - name.right).toBeGreaterThanOrEqual(8);
                expect(box(line.querySelector(".MediaPreviewComponents_buttonGroup")!).left - name.right).toBe(8);
                for (const element of all(".MediaPreviewComponents_button")) {
                    const button = box(element);
                    expect([button.width, button.height]).toEqual([36, 36]);
                    expect(button.top + button.height / 2).toBe(name.top + name.height / 2);
                    expect(box(line).right - button.right).toBeGreaterThanOrEqual(4);
                    // The whole of it takes a click: neither the event's content nor the time's box cuts it short
                    for (const [x, y] of [
                        [button.left + 1, button.top + 1],
                        [button.right - 1, button.top + 1],
                        [button.left + 1, button.bottom - 1],
                        [(button.left + button.right) / 2, button.bottom - 1],
                        [button.right - 1, button.bottom - 1],
                    ]) {
                        expect(document.elementFromPoint(x, y)?.closest("button")).toBe(element);
                    }
                }
                // The end of the bubble's content: the last icon and the time end 12px from the bubble's end
                expect(icons.at(-1)!.right).toBe(time.right);
                // The icons as far apart as on the card in the other layouts
                for (let i = 1; i < icons.length; i++) expect(icons[i].left - icons[i - 1].right).toBe(24);
                expect(icons.at(-1)!.bottom).toBeLessThanOrEqual(time.top);
                // The time keeps its own clicks
                const timeCenter = document.elementFromPoint(
                    (time.left + time.right) / 2,
                    (time.top + time.bottom) / 2,
                );
                expect(timeCenter?.closest(".slotTimestamp")).not.toBeNull();
            },
        );

        it("keeps the name's line and the size's centered beside the icon", () => {
            render(tile(file("annual-report.pdf"), { lineClass: "lineMedia" }));
            const [line] = all(".line");
            const icon = box(line.querySelector(".MediaPreviewComponents_icon")!);
            const name = box(line.querySelector(".MediaPreviewComponents_header")!);
            const size = sizeOf(line).line;

            expect(name.left - icon.right).toBe(12);
            expect(size.left).toBe(name.left);
            expect(size.top).toBe(name.bottom);
            expect(name.top - icon.top).toBe(icon.bottom - size.bottom);
        });

        it("keeps the icon centered beside the two lines and the time on the size's line when they outgrow the icon", () => {
            // Element's largest font size, where the name's and the size's lines are taller than the 44px icon
            document.documentElement.style.fontSize = "36px";
            try {
                render(tile(file("annual-report.pdf"), { lineClass: "lineMedia" }));
                const [line] = all(".line");
                const icon = box(line.querySelector(".MediaPreviewComponents_icon")!);
                const name = box(line.querySelector(".MediaPreviewComponents_header")!);
                const size = sizeOf(line).line;

                expect(size.bottom - name.top).toBeGreaterThan(icon.height);
                expect(icon.top - name.top).toBe(size.bottom - icon.bottom);
                expect(box(line.querySelector(".slotTimestamp")!).bottom).toBe(size.bottom);
                expect(box(line).bottom - size.bottom).toBe(8);
            } finally {
                document.documentElement.style.fontSize = "";
            }
        });

        it.each([
            ["another's", false],
            ["your own", true],
        ])(
            "shows a name the column for the time would have cut short in %s bubble on a 420px timeline",
            (_name, own) => {
                renderAt(420, tile(file("annual-report.pdf"), { own, lineClass: "lineMedia" }));
                const [line] = all(".line");

                expect(nameLines(line)).toBe(1);
            },
        );
    });

    describe("link previews", () => {
        const SHORT = 'Notes: <a href="https://element.io/blog/">https://element.io/blog/</a>';
        const LONG =
            "Release notes are up, with everything that changed in threads and the new notification settings: " +
            '<a href="https://element.io/blog/">https://element.io/blog/</a>';

        it.each([
            ["one card under a short message", SHORT, 1, false],
            ["two cards under a short message", SHORT, 2, false],
            ["one card under a long message", LONG, 1, false],
            ["two cards under a long own message", LONG, 2, true],
        ])("put the timestamp under %s, at the bubble's end", (_name, text, cards, own) => {
            render(withPreviews(text, cards, { own }));
            const [line] = all(".line");
            const bubble = box(line);
            const lastCard = box(all(".MediaPreviewTile_tile").at(-1)!);
            const timeSlot = box(line.querySelector(".slotTimestamp")!);
            const time = timeOf(line);

            expect(time.top).toBeGreaterThanOrEqual(lastCard.bottom);
            expect(bubble.right - time.right).toBe(12);
            expect(bubble.bottom - time.bottom).toBe(8);
            expect(timeSlot.top - lastCard.bottom).toBeGreaterThanOrEqual(0);
            expect(timeSlot.top - lastCard.bottom).toBeLessThanOrEqual(1);
            expect(getComputedStyle(line).paddingInlineEnd).toBe("12px");
        });

        it("keeps a bubble with a card as wide as the card and the bubble's padding", () => {
            render(withPreviews(SHORT, 1));
            const [line] = all(".line");
            const card = box(all(".MediaPreviewTile_tile")[0]);

            // 12px padding plus the body's 1px on each side
            expect(box(line).right - card.right).toBe(13);
            expect(card.left - box(line).left).toBe(13);
        });

        it("put the timestamp beside the button that shows more of them, with no row of its own", () => {
            render(withPreviews(SHORT, 2, {}, true));
            const [line] = all(".line");
            const bubble = box(line);
            const showMore = box(line.querySelector(".MediaPreviewGroupView_toggleButton")!);
            const time = timeOf(line);

            // The group's 4px margin, the body's 1px and the bubble's 8px padding, but no line for the timestamp
            expect(bubble.bottom - showMore.bottom).toBeLessThan(22);
            expect(time.top).toBeGreaterThanOrEqual(box(all(".MediaPreviewTile_tile").at(-1)!).bottom);
            expect(bubble.right - time.right).toBe(12);
            expect(overlaps(showMore, time)).toBe(false);
        });
    });

    describe("informational rows", () => {
        function initialOffset(avatarElement: Element): number {
            const range = document.createRange();
            range.selectNodeContents(avatarElement);
            const text = range.getBoundingClientRect();
            const circle = box(avatarElement);
            return (text.top + text.bottom) / 2 - (circle.top + circle.bottom) / 2;
        }

        it.each([
            ["span", "bubble", "layoutBubble" as const, false],
            ["button", "bubble", "layoutBubble" as const, true],
            ["span", "modern", "layoutGroup" as const, false],
            ["button", "modern", "layoutGroup" as const, true],
        ])(
            "draw the initial of an avatar that is a %s in the middle of its 14px circle in the %s layout",
            (_element, _name, layout, clickable) => {
                render(infoRow(layout, clickable));
                const avatarElement = document.querySelector(".slotAvatar > *")!;

                expect(avatarElement.tagName).toBe(clickable ? "BUTTON" : "SPAN");
                expect(box(avatarElement).width).toBe(14);
                expect(box(avatarElement).height).toBe(14);
                expect(Math.abs(initialOffset(avatarElement))).toBeLessThanOrEqual(0.5);
            },
        );
    });
});
