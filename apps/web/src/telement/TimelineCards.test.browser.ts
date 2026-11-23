/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";

// The package's built bundle needs Node's `process`, so the views' DOM is written out below and their stylesheets are
// loaded from source
// eslint-disable-next-line no-restricted-imports
import eventTileViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import eventTileBubbleStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileBubble/EventTileBubble.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import imageBodyStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/MImageBodyView/ImageBodyView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaBodyStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/MediaBody/MediaBody.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import audioPlayerStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/AudioPlayerView/AudioPlayerView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import playPauseButtonStyles from "../../../../packages/shared-components/src/audio/PlayPauseButton/PlayPauseButton.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaPreviewGroupStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/MediaPreviewGroupView/MediaPreviewGroupView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaPreviewTileStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/MediaPreviewGroupView/MediaPreviewTile/MediaPreviewTile.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import tileContainerStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/call/ongoing/components/TileContainer/TileContainer.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import callIconStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/call/ongoing/components/CallIcon/CallIcon.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import tombstoneStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/call/tombstone/common.module.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import beaconBodyStyles from "../../res/css/components/views/messages/_MBeaconBody.pcss?raw";
import pollOptionStyles from "../../res/css/components/views/polls/_PollOption.pcss?raw";
import playbackContainerStyles from "../../res/css/views/audio_messages/_PlaybackContainer.pcss?raw";
import uploadConfirmDialogStyles from "../../res/css/views/dialogs/_UploadConfirmDialog.pcss?raw";
import styledRadioButtonStyles from "../../res/css/views/elements/_StyledRadioButton.pcss?raw";
import legacyCallEventStyles from "../../res/css/views/messages/_LegacyCallEvent.pcss?raw";
import locationBodyStyles from "../../res/css/views/messages/_MLocationBody.pcss?raw";
import pollBodyStyles from "../../res/css/views/messages/_MPollBody.pcss?raw";
import newRoomIntroStyles from "../../res/css/views/rooms/_NewRoomIntro.pcss?raw";
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

type Layout = "group" | "irc" | "bubble";

const LAYOUT_CLASS: Record<Layout, string> = { group: "layoutGroup", irc: "layoutIrc", bubble: "layoutBubble" };

interface Card {
    /** The element whose corners are the card's. */
    selector: string;
    body: (layout: Layout) => string;
    /** The line and root states EventTileViewModel gives the event. */
    line?: string;
    state?: string;
}

/** An event in the timeline as EventTileView renders it, its body in the line's body slot. */
function tile(layout: Layout, { body, line = "", state = "" }: Card): string {
    return `
        <li class="root mx_EventTile ${LAYOUT_CLASS[layout]} ${state}" data-testid="event-tile">
            <div class="line mx_EventTile_line ${line}">
                <div class="slotTimestamp"><a class="mx_MessageTimestamp">12:41</a></div>
                <div class="slotBody">${body(layout)}</div>
            </div>
        </li>
    `;
}

function render(layout: Layout, ...cards: Card[]): void {
    document.body.innerHTML = `
        <ol class="cpd-theme-light${layout === "irc" ? " mx_IRCLayout" : ""}"
            style="width: 880px; margin: 0; padding: 0; list-style: none; font-family: Inter; --MediaPreview-width: 478px">
            ${cards.map((card) => tile(layout, card)).join("")}
        </ol>
    `;
}

const bubbleClass = (layout: Layout, name: string): string => (layout === "bubble" ? ` ${name}` : "");

const PICTURE: Card = {
    selector: ".ImageBodyView_thumbnailContainer",
    line: "lineMedia lineTimestampOverMedia",
    body: () => `
        <div class="mx_ImageBody ImageBodyView_root">
            <a class="ImageBodyView_link">
                <div class="mx_ImageBody_container ImageBodyView_thumbnailContainer" style="width: 240px; height: 160px"></div>
            </a>
        </div>
    `,
};

/** MLocationBody's map, as LocationBodyContent renders it. */
const MAP: Card = {
    selector: ".mx_MLocationBody > .mx_MLocationBody_map",
    state: "stateNoBubble",
    body: (layout) => `
        <div class="mx_MLocationBody${bubbleClass(layout, "mx_MLocationBody_bubble")}">
            <div class="mx_MLocationBody_map"><div class="mx_Map mx_MLocationBody_map"></div></div>
        </div>
    `,
};

/** MBeaconBody with its map, as a live location share renders. */
const BEACON: Card = {
    selector: ".mx_MBeaconBody",
    state: "stateNoBubble",
    body: (layout) => `
        <div class="mx_MBeaconBody${bubbleClass(layout, "mx_MBeaconBody_bubble")}">
            <div class="mx_MBeaconBody_map"></div>
        </div>
    `,
};

/** A poll's option, as PollOption renders a live option that hasn't been voted for. */
const POLL_OPTION = `
    <div class="mx_PollOption">
        <label class="mx_StyledRadioButton mx_PollOption_live-option mx_StyledRadioButton_enabled">
            <input type="radio" name="poll" value="ramen" aria-label="Ramen bar, 3 votes">
            <div><div></div></div>
            <div class="mx_StyledRadioButton_content">
                <div aria-hidden="true">
                    <div class="mx_PollOption_content">
                        <div class="mx_PollOption_optionText">Ramen bar</div>
                        <div class="mx_PollOption_optionVoteCount">3 votes</div>
                    </div>
                </div>
            </div>
            <div class="mx_StyledRadioButton_spacer"></div>
        </label>
        <div class="mx_PollOption_popularityBackground">
            <div class="mx_PollOption_popularityAmount" style="width: 60%"></div>
        </div>
    </div>
`;

const POLL: Card = {
    selector: ".mx_PollOption",
    body: (layout) => `
        <fieldset class="mx_MPollBody${bubbleClass(layout, "mx_MPollBody_bubble")}">
            <legend>Where should we have the team lunch?</legend>
            <div class="mx_MPollBody_allOptions">${POLL_OPTION}</div>
        </fieldset>
    `,
};

/** A link preview card under a text message, as TextualBodyView renders it with MediaPreviewGroupView. */
const LINK_PREVIEW: Card = {
    selector: ".MediaPreviewTile_tile",
    body: () => `
        <div class="mx_MTextBody mx_EventTile_content">
            <div class="mx_EventTile_body translate" dir="auto">Release notes are up</div>
            <div class="mx_TextualBody_urlPreviews MediaPreviewGroupView_container">
                <div class="MediaPreviewTile_tile"><div class="MediaPreviewTile_below"><div style="height: 40px"></div></div></div>
            </div>
        </div>
    `,
};

/** An m.file event's card, as PreviewFileBody renders it. */
const FILE_CARD: Card = {
    selector: ".MediaPreviewTile_tile",
    line: "lineMedia",
    body: () => `
        <div class="mx_EventTile_content">
            <div class="MediaPreviewGroupView_container">
                <div class="MediaPreviewTile_tile"><div class="MediaPreviewTile_below"><div style="height: 40px"></div></div></div>
            </div>
        </div>
    `,
};

const AUDIO_PLAYER: Card = {
    selector: ".mx_MediaBody",
    line: "lineMedia",
    body: () => `
        <span class="mx_MAudioBody">
            <div class="mx_MediaBody MediaBody_mediaBody AudioPlayerView_audioPlayer"><div style="height: 40px"></div></div>
        </span>
    `,
};

/** A voice message's player in the timeline, as RecordingPlayback renders it in MVoiceMessageBody. */
const VOICE_PLAYER: Card = {
    selector: ".mx_MediaBody",
    line: "lineMedia",
    body: () => `
        <span class="mx_MVoiceMessageBody">
            <div class="mx_MediaBody MediaBody_mediaBody mx_VoiceMessagePrimaryContainer" data-testid="recording-playback">
                <button class="PlayPauseButton_button" aria-label="Play"></button>
                <div class="mx_RecordingPlayback_timelineLayoutMiddle"><div class="mx_Waveform"></div></div>
                <span class="mx_Clock">0:07</span>
            </div>
        </span>
    `,
};

/** An "Encryption enabled" card, as EncryptionEventView renders EventTileBubble. */
const EVENT_CARD: Card = {
    selector: ".EventTileBubble_container",
    state: "stateBubbleContainer",
    body: () => `
        <div class="EventTileBubble_container mx_EventTileBubble mx_cryptoEvent">
            <svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16"></rect></svg>
            <div class="EventTileBubble_title">Encryption enabled</div>
            <div class="EventTileBubble_subtitle">Messages in this room are end-to-end encrypted.</div>
        </div>
    `,
};

/** An ongoing call's card, as DmOngoingCallTileView renders TileContainer around a CallIcon. */
const CALL_TILE: Card = {
    selector: ".TileContainer_container",
    state: "stateLeftAlignedBubble stateAlignedBetweenBubbles",
    body: () => `
        <div class="TileContainer_container" style="display: flex; align-items: center">
            <div class="CallIcon_container"></div>
        </div>
    `,
};

const ENDED_CALL_TILE: Card = {
    selector: ".TombstoneCommon_container",
    state: "stateLeftAlignedBubble stateAlignedBetweenBubbles",
    body: () => `<div class="TombstoneCommon_container" style="display: flex; align-items: center"></div>`,
};

/** A legacy 1:1 call's card, as LegacyCallEvent renders a missed call. */
const LEGACY_CALL: Card = {
    selector: ".mx_LegacyCallEvent",
    state: "stateLeftAlignedBubble",
    body: () => `
        <div class="mx_LegacyCallEvent_wrapper">
            <div class="mx_LegacyCallEvent mx_LegacyCallEvent_voice">
                <div class="mx_LegacyCallEvent_info">
                    <span class="mx_BaseAvatar" style="width: 32px; height: 32px"></span>
                    <div class="mx_LegacyCallEvent_info_basic">
                        <div class="mx_LegacyCallEvent_sender">Alice</div>
                        <div class="mx_LegacyCallEvent_type">Voice call</div>
                    </div>
                </div>
                <div class="mx_LegacyCallEvent_content">
                    Missed call
                    <div class="mx_LegacyCallEvent_content_actions">
                        <div class="mx_AccessibleButton mx_LegacyCallEvent_content_button" role="button">Call back</div>
                    </div>
                </div>
            </div>
        </div>
    `,
};

function box(element: Element): DOMRect {
    return element.getBoundingClientRect();
}

function card({ selector }: Card): HTMLElement {
    return document.querySelector<HTMLElement>(selector)!;
}

/** Where `inner` sits inside `outer`: its distance from each of `outer`'s edges. */
function insets(outer: Element, inner: Element): { top: number; end: number; bottom: number; start: number } {
    const o = box(outer);
    const i = box(inner);
    return { top: i.top - o.top, end: o.right - i.right, bottom: o.bottom - i.bottom, start: i.left - o.left };
}

let stylesheet: HTMLStyleElement;
let unloadInter: () => void;

describe("Timeline cards", () => {
    beforeAll(async () => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            @layer shared-components {
                ${telementTokens}
                ${eventTileViewStyles.replace(/:global\(([^)]*)\)/g, "$1")}
                ${moduleStyles(eventTileBubbleStyles, "EventTileBubble")}
                ${moduleStyles(imageBodyStyles, "ImageBodyView")}
                ${moduleStyles(mediaBodyStyles, "MediaBody")}
                ${moduleStyles(audioPlayerStyles, "AudioPlayerView")}
                ${moduleStyles(playPauseButtonStyles, "PlayPauseButton")}
                ${moduleStyles(mediaPreviewGroupStyles, "MediaPreviewGroupView")}
                ${moduleStyles(mediaPreviewTileStyles, "MediaPreviewTile")}
                ${moduleStyles(tileContainerStyles, "TileContainer")}
                ${moduleStyles(callIconStyles, "CallIcon")}
                ${moduleStyles(tombstoneStyles, "TombstoneCommon")}
            }
            @layer app-web {
                ${toBrowserCss(commonStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(locationBodyStyles, fontSizes, lightTheme)}
                ${toBrowserCss(beaconBodyStyles, fontSizes, lightTheme)}
                ${toBrowserCss(pollBodyStyles, fontSizes, lightTheme)}
                ${toBrowserCss(pollOptionStyles, fontSizes, lightTheme)}
                ${toBrowserCss(styledRadioButtonStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(playbackContainerStyles, fontSizes, lightTheme)}
                ${toBrowserCss(legacyCallEventStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(uploadConfirmDialogStyles, fontSizes, lightTheme)}
                ${toBrowserCss(newRoomIntroStyles, fontSizes, lightTheme)}
            }
        `;
        document.head.append(stylesheet);
        // The poll's radio sits on its label's baseline, so the option is measured with the app's font
        unloadInter = await loadInter();
    });

    afterAll(() => {
        stylesheet.remove();
        unloadInter();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    describe("round every card kind by the layout", () => {
        it.each<[string, Card]>([
            ["a picture", PICTURE],
            ["a location map", MAP],
            ["a live location", BEACON],
            ["a poll option", POLL],
            ["a link preview", LINK_PREVIEW],
            ["a file card", FILE_CARD],
            ["an audio player", AUDIO_PLAYER],
            ["a voice message player", VOICE_PLAYER],
            ["an event card", EVENT_CARD],
            ["an ongoing call", CALL_TILE],
            ["an ended call", ENDED_CALL_TILE],
            ["a legacy call", LEGACY_CALL],
        ])("rounds %s by 8 in the modern and IRC layouts", (_name, kind) => {
            for (const layout of ["group", "irc"] as const) {
                render(layout, kind);
                expect(getComputedStyle(card(kind)).borderTopLeftRadius).toBe("8px");
            }
        });

        // Audio, voice, file and poll bubbles are the card themselves, so their players, file cards and poll options
        // have no frame there (TimelinePieces.test.browser.ts measures the poll's)
        it.each<[string, Card]>([
            ["a picture", PICTURE],
            ["a location map", MAP],
            ["a live location", BEACON],
            ["an event card", EVENT_CARD],
            ["an ongoing call", CALL_TILE],
            ["an ended call", ENDED_CALL_TILE],
            ["a legacy call", LEGACY_CALL],
        ])("rounds %s by the bubble's 12 in the bubble layout", (_name, kind) => {
            render("bubble", kind);
            expect(getComputedStyle(card(kind)).borderTopLeftRadius).toBe("12px");
        });

        it("rounds a link preview in a text bubble concentrically with the bubble, at the 4px minimum", () => {
            render("bubble", LINK_PREVIEW);
            const line = document.querySelector(".line")!;
            const preview = card(LINK_PREVIEW);

            // 12px from the bubble's 12px corner: max(12 - 12, 4)
            expect(insets(line, preview).start).toBeGreaterThanOrEqual(12);
            expect(getComputedStyle(preview).borderTopLeftRadius).toBe("4px");
        });

        it("rounds a link preview in a picture's caption concentrically with the picture's bubble", () => {
            render("bubble", {
                ...LINK_PREVIEW,
                line: "lineMedia lineTimestampOverMedia",
                body: () => `
                    <div class="mx_EventTile_content">
                        ${PICTURE.body("bubble")}
                        <div class="mx_MTextBody mx_EventTile_caption">
                            <div class="mx_EventTile_body translate" dir="auto">Release notes are up</div>
                            <div class="mx_TextualBody_urlPreviews MediaPreviewGroupView_container">
                                <div class="MediaPreviewTile_tile"><div class="MediaPreviewTile_below"><div style="height: 40px"></div></div></div>
                            </div>
                        </div>
                    </div>
                `,
            });
            const line = document.querySelector(".line")!;
            const preview = card(LINK_PREVIEW);

            expect(insets(line, preview).start).toBe(12);
            expect(getComputedStyle(preview).borderTopLeftRadius).toBe("4px");
        });

        it("rounds a link preview under an emote, which has no bubble, as a card of its own", () => {
            render("bubble", { ...LINK_PREVIEW, line: "lineEmote", state: "stateNoBubble stateEmote" });

            expect(getComputedStyle(card(LINK_PREVIEW)).borderTopLeftRadius).toBe("12px");
        });

        it("keeps the card radius on the preview in the upload dialog, outside the timeline", () => {
            document.body.innerHTML = `
                <div class="mx_UploadConfirmDialog_previewInner">
                    <div class="MediaPreviewGroupView_container"><div class="MediaPreviewTile_tile"></div></div>
                </div>
            `;

            expect(getComputedStyle(document.querySelector(".MediaPreviewTile_tile")!).borderTopLeftRadius).toBe(
                "12px",
            );
        });
    });

    it("lays a live location out in bubbles, as wide as a location map", () => {
        const map = (): DOMRect => box(document.querySelector(".mx_MBeaconBody_map")!);
        render("bubble", BEACON);

        expect(map().width).toBe(450);
        expect(map().height).toBe(220);

        render("group", BEACON);
        expect(map().width).toBe(325);
    });

    it.each<[Layout, number]>([
        ["bubble", 20],
        ["irc", 18],
        ["group", 22],
    ])("centers an event card's icon on its title's line in the %s layout", (layout, lineHeight) => {
        render(layout, EVENT_CARD);
        const title = box(document.querySelector(".EventTileBubble_title")!);
        const icon = box(document.querySelector(".EventTileBubble_container > svg")!);

        expect(title.height).toBe(lineHeight);
        expect(icon.top + icon.height / 2).toBe(title.top + title.height / 2);
        expect(insets(card(EVENT_CARD), document.querySelector(".EventTileBubble_container > svg")!).start).toBe(12);
    });

    describe("a poll option", () => {
        it.each<[Layout, number]>([
            ["irc", 60],
            ["group", 64],
        ])(
            "is on the 4px grid in the %s layout (%ipx), its bar 13px from the sides and the bottom",
            (layout, height) => {
                render(layout, POLL);
                const option = card(POLL);
                const bar = insets(option, option.querySelector(".mx_PollOption_popularityBackground")!);

                expect(box(option).height).toBe(height);
                expect(bar.start).toBe(13);
                expect(bar.end).toBe(13);
                expect(bar.bottom).toBe(13);
            },
        );

        it.each<Layout>(["irc", "group"])(
            "centers the radio on the label's line in the %s layout, on the bar's edge",
            (layout) => {
                render(layout, POLL);
                const option = card(POLL);
                const radio = box(option.querySelector("input + div")!);
                const label = box(option.querySelector(".mx_PollOption_optionText")!);

                expect(insets(option, option.querySelector("input + div")!).start).toBe(13);
                expect(radio.top + radio.height / 2).toBe(label.top + label.height / 2);
            },
        );

        it.each<[Layout, "ltr" | "rtl"]>([
            ["group", "ltr"],
            ["irc", "rtl"],
        ])("lines its label and its bar up 13px from the sides in the %s layout, %s", (layout, dir) => {
            render(layout, POLL);
            document.querySelector("ol")!.dir = dir;
            const option = box(card(POLL));
            const bar = box(document.querySelector(".mx_PollOption_popularityBackground")!);
            const label = box(document.querySelector(".mx_PollOption_optionText")!);
            const count = box(document.querySelector(".mx_PollOption_optionVoteCount")!);
            const [labelStart, countEnd] = dir === "ltr" ? [label.left, count.right] : [label.right, count.left];

            expect(bar.left - option.left).toBe(13);
            expect(option.right - bar.right).toBe(13);
            // The vote count ends where the bar does, and the label's line starts as far from the top
            expect(countEnd).toBe(dir === "ltr" ? bar.right : bar.left);
            // After the 20px radio and its 8px gap
            expect(Math.abs(labelStart - (dir === "ltr" ? option.left : option.right))).toBe(41);
            expect(label.top - option.top).toBe(13);
        });
    });

    it.each<Layout>(["group", "irc"])(
        "makes a voice message a 48px row with the play button 8px from its top, bottom and start in the %s layout",
        (layout) => {
            render(layout, VOICE_PLAYER);
            const player = card(VOICE_PLAYER);
            const play = insets(player, player.querySelector("button")!);

            expect(box(player).height).toBe(48);
            expect(play).toMatchObject({ top: 8, bottom: 8, start: 8 });
        },
    );

    it.each<Layout>(["group", "irc"])(
        "insets a legacy call card's first item and its button 12px from its sides in the %s layout",
        (layout) => {
            render(layout, LEGACY_CALL);
            const legacyCall = card(LEGACY_CALL);
            // The IRC layout's row shows the caller's avatar, so the card starts with the call's type
            const first = layout === "irc" ? ".mx_LegacyCallEvent_type" : ".mx_BaseAvatar";

            expect(insets(legacyCall, legacyCall.querySelector(first)!).start).toBe(12);
            expect(insets(legacyCall, legacyCall.querySelector(".mx_LegacyCallEvent_content_button")!).end).toBe(12);
            // A card at 65% of the line, with its time outside it
            expect(box(legacyCall).width).toBeCloseTo(
                0.65 * box(document.querySelector(".mx_LegacyCallEvent_wrapper")!).width,
                1,
            );
        },
    );

    describe("a legacy call card", () => {
        /**
         * The call's row: EventTileView gives a call no avatar or sender of its own outside the IRC layout
         * (getEventTileSenderProfileState), so the card's are the only ones.
         */
        function renderCall(layout: Layout, width: number, narrow: boolean): void {
            const body = LEGACY_CALL.body(layout);
            const irc = layout === "irc";
            const ircSender = irc
                ? `<div class="slotAvatar"><span class="mx_BaseAvatar" style="display: block; width: 14px; height: 14px"></span></div><div class="slotSender">Alice</div>`
                : "";
            document.body.innerHTML = `
                <ol class="cpd-theme-light${irc ? " mx_IRCLayout" : ""}" style="width: ${width}px; margin: 0; padding: 0; list-style: none; font-family: Inter">
                    <li class="root mx_EventTile ${LAYOUT_CLASS[layout]} stateLeftAlignedBubble stateContinuation" data-testid="event-tile">
                        ${ircSender}
                        <div class="line mx_EventTile_line">
                            <div class="slotTimestamp"><a class="mx_MessageTimestamp">12:41</a></div>
                            <div class="slotBody">${narrow ? body.replace("mx_LegacyCallEvent_voice", "mx_LegacyCallEvent_voice mx_LegacyCallEvent_narrow") : body}</div>
                        </div>
                    </li>
                </ol>
            `;
        }

        /** The box of the card's own text, its first text node. */
        function statusText(legacyCall: Element): DOMRect {
            const content = legacyCall.querySelector(".mx_LegacyCallEvent_content")!;
            const range = document.createRange();
            range.selectNodeContents([...content.childNodes].find((node) => node.textContent!.trim())!);
            return range.getBoundingClientRect();
        }

        it("is narrower than LegacyCallEvent's threshold for its narrow layout in bubbles, which it therefore always takes", () => {
            renderCall("bubble", 880, false);

            // MAX_NON_NARROW_WIDTH in LegacyCallEvent.tsx
            expect(box(document.querySelector(".mx_LegacyCallEvent_wrapper")!).width).toBeLessThan((450 / 70) * 100);
        });

        it.each([880, 420])(
            "stacks the call's type, its state and the call-back button, start-aligned, with its time in its bottom end corner, in bubbles at %ipx",
            (width) => {
                renderCall("bubble", width, true);
                const legacyCall = card(LEGACY_CALL);
                const avatar = box(legacyCall.querySelector(".mx_BaseAvatar")!);
                const type = box(legacyCall.querySelector(".mx_LegacyCallEvent_type")!);
                const status = statusText(legacyCall);
                const button = box(legacyCall.querySelector(".mx_LegacyCallEvent_content_button")!);
                const time = box(document.querySelector(".mx_MessageTimestamp")!);
                const timeSlot = box(document.querySelector(".slotTimestamp")!);

                // One avatar: the card's
                expect(document.querySelectorAll(".mx_BaseAvatar")).toHaveLength(1);
                expect(insets(legacyCall, legacyCall.querySelector(".mx_BaseAvatar")!).start).toBe(12);
                // The narrow layout's own minimum width, wider than what it holds
                expect(box(legacyCall).width).toBe(290);
                // The type, the state and the button start 12px after the avatar, the button on a row of its own
                expect(type.left).toBe(avatar.right + 12);
                expect(status.left).toBe(type.left);
                expect(button.left).toBe(type.left);
                expect(button.top).toBeGreaterThanOrEqual(status.bottom);
                // The card's 12px inset around the button and the time, in a column the button keeps clear of
                expect(box(legacyCall).bottom - button.bottom).toBe(12);
                expect(box(legacyCall).right - time.right).toBe(12);
                expect(box(legacyCall).bottom - timeSlot.bottom).toBe(12);
                expect(button.right).toBeLessThan(time.left);
            },
        );

        it("shows the caller's avatar and name once in the IRC layout, in the row rather than on the card", () => {
            renderCall("irc", 880, false);
            const legacyCall = card(LEGACY_CALL);
            const type = box(legacyCall.querySelector(".mx_LegacyCallEvent_type")!);

            expect(getComputedStyle(legacyCall.querySelector(".mx_BaseAvatar")!).display).toBe("none");
            expect(getComputedStyle(legacyCall.querySelector(".mx_LegacyCallEvent_sender")!).display).toBe("none");
            expect(type.left - box(legacyCall).left).toBe(12);
        });
    });

    describe("the time over a location map", () => {
        /** A picture with its time as a badge in the body slot, as EventTileView renders a picture in bubbles. */
        const PICTURE_WITH_BADGE = `
            <li class="root mx_EventTile layoutBubble">
                <div class="line mx_EventTile_line lineMedia lineTimestampOverMedia">
                    <div class="slotBody">
                        ${PICTURE.body("bubble")}
                        <div class="slotTimestamp"><a class="mx_MessageTimestamp">12:40</a></div>
                    </div>
                </div>
            </li>
        `;

        /** LocationBodyFallbackContent: the text shown when the map fails to load. */
        const FAILED_MAP: Card = {
            ...MAP,
            body: () =>
                '<div class="mx_EventTile_body mx_MLocationBody">Failed to load map<br>Location geo:51.5,-0.1</div>',
        };

        it("is, over a GIF, the same 20px badge as the GIF's label, as far from its corner", () => {
            const gif = PICTURE_WITH_BADGE.replace(
                'style="width: 240px; height: 160px">',
                'style="width: 240px; height: 160px"><div class="ImageBodyView_mediaContent" style="height: 100%"><p class="ImageBodyView_gifLabel">GIF</p></div>',
            );
            document.body.innerHTML = `<ol class="cpd-theme-light" style="margin: 0; padding: 0; list-style: none; font-family: Inter">${gif}</ol>`;
            const badge = document.querySelector<HTMLElement>(".slotTimestamp")!;
            const label = document.querySelector<HTMLElement>(".ImageBodyView_gifLabel")!;
            const picture = box(document.querySelector(".ImageBodyView_thumbnailContainer")!);

            for (const property of ["backgroundColor", "borderTopLeftRadius", "padding"] as const) {
                expect(getComputedStyle(badge)[property]).toBe(getComputedStyle(label)[property]);
            }
            for (const property of ["color", "font"] as const) {
                expect(getComputedStyle(badge.firstElementChild!)[property]).toBe(getComputedStyle(label)[property]);
            }
            expect(box(badge).height).toBe(20);
            expect(box(label).height).toBe(20);
            expect(picture.right - box(badge).right).toBe(box(label).left - picture.left);
            expect(picture.bottom - box(badge).bottom).toBe(box(label).top - picture.top);
        });

        it("is a badge in its bottom end corner, as over a picture, in the bubble layout", () => {
            render("bubble", MAP);
            document.querySelector("ol")!.insertAdjacentHTML("afterbegin", PICTURE_WITH_BADGE);
            const [pictureBadge, mapBadge] = [...document.querySelectorAll<HTMLElement>(".slotTimestamp")];
            const map = box(card(MAP));

            for (const property of ["backgroundColor", "borderRadius", "padding", "height"] as const) {
                expect(getComputedStyle(mapBadge)[property]).toBe(getComputedStyle(pictureBadge)[property]);
            }
            for (const property of ["color", "font"] as const) {
                expect(getComputedStyle(mapBadge.firstElementChild!)[property]).toBe(
                    getComputedStyle(pictureBadge.firstElementChild!)[property],
                );
            }
            expect(getComputedStyle(mapBadge).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
            expect(map.right - box(mapBadge).right).toBe(8);
            expect(map.bottom - box(mapBadge).bottom).toBe(8);
        });

        it.each<[string, Layout, Card]>([
            ["beside the text shown when the map fails to load", "bubble", FAILED_MAP],
            ["in the modern layout", "group", MAP],
            ["in the IRC layout", "irc", MAP],
        ])("is the plain time %s", (_name, layout, kind) => {
            render(layout, kind);

            expect(getComputedStyle(document.querySelector(".slotTimestamp")!).backgroundColor).toBe(
                "rgba(0, 0, 0, 0)",
            );
        });
    });

    it.each<[Layout, string]>([
        ["bubble", "12px"],
        ["group", "8px"],
    ])("rounds the new room intro's warning card like the timeline's cards in the %s layout", (layout, radius) => {
        document.body.innerHTML = `
            <div class="mx_RoomView_body cpd-theme-light" data-layout="${layout}">
                <ol class="mx_RoomView_MessageList">
                    <li class="mx_NewRoomIntro">
                        <div class="EventTileBubble_container mx_EventTileBubble mx_cryptoEvent">
                            <div class="EventTileBubble_title">End-to-end encryption isn't enabled</div>
                        </div>
                    </li>
                </ol>
            </div>
        `;

        expect(getComputedStyle(document.querySelector(".EventTileBubble_container")!).borderTopLeftRadius).toBe(
            radius,
        );
    });
});
