/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IconButton } from "@vector-im/compound-web";
import {
    CheckIcon,
    DocumentIcon,
    DownloadIcon,
    LinkIcon,
    PlaySolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundLightHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-base.css?raw";
import compoundLightHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-semantic.css?raw";
import compoundDarkHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-hc-base.css?raw";
import compoundDarkHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-hc-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package's built bundle needs Node's `process`, so the views' DOM is written out below and their stylesheets are
// loaded from source
// eslint-disable-next-line no-restricted-imports
import eventTileViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import textualBodyStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/TextualBodyView/TextualBody.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaBodyStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/MediaBody/MediaBody.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import audioPlayerViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/AudioPlayerView/AudioPlayerView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaPreviewGroupViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/MediaPreviewGroupView/MediaPreviewGroupView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaPreviewTileStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/MediaPreviewGroupView/MediaPreviewTile/MediaPreviewTile.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaPreviewComponentsStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/MediaPreviewGroupView/MediaPreviewComponents/MediaPreviewComponents.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import playPauseStyles from "../../../../packages/shared-components/src/audio/PlayPauseButton/PlayPauseButton.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import seekBarModuleStyles from "../../../../packages/shared-components/src/audio/SeekBar/SeekBar.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import playbackContainerStyles from "../../res/css/views/audio_messages/_PlaybackContainer.pcss?raw";
import waveformStyles from "../../res/css/views/audio_messages/_Waveform.pcss?raw";
import seekBarStyles from "../../res/css/views/audio_messages/_SeekBar.pcss?raw";
import pollOptionStyles from "../../res/css/components/views/polls/_PollOption.pcss?raw";
import radioStyles from "../../res/css/views/elements/_StyledRadioButton.pcss?raw";
import pollBodyStyles from "../../res/css/views/messages/_MPollBody.pcss?raw";
import eventTileStyles from "../../res/css/views/rooms/_EventTile.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import lightHighContrastTheme from "../../res/themes/light-high-contrast/css/_light-high-contrast.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";

interface Theme {
    name: string;
    /** The theme stylesheets it is built from, in the order its entry point imports them. */
    sources: string[];
    /** The accent fill white sits on: a step deeper than the accent in dark themes. */
    fill: string;
    /** The accent of lines and icons. */
    line: string;
    /** The contrast white has on the fill at least: about 4:1, and about 7:1 in high contrast. */
    minimumContrast: number;
}

/** Dark high contrast is the dark theme on a system that asks for more contrast. */
const THEMES: Theme[] = [
    {
        name: "cpd-theme-light",
        sources: [lightTheme],
        fill: "rgb(36, 129, 204)",
        line: "rgb(36, 129, 204)",
        minimumContrast: 4,
    },
    {
        name: "cpd-theme-dark",
        sources: [lightTheme, darkTheme],
        fill: "rgb(1, 131, 211)",
        line: "rgb(46, 166, 255)",
        minimumContrast: 4,
    },
    {
        name: "cpd-theme-light-hc",
        sources: [lightTheme, lightHighContrastTheme],
        fill: "rgb(1, 93, 156)",
        line: "rgb(1, 93, 156)",
        minimumContrast: 6.8,
    },
    {
        name: "cpd-theme-dark-hc",
        sources: [lightTheme, darkTheme],
        fill: "rgb(1, 93, 151)",
        line: "rgb(159, 209, 254)",
        minimumContrast: 6.8,
    },
];

const WHITE = "rgb(255, 255, 255)";
const TRANSPARENT = "rgba(0, 0, 0, 0)";

const APP_STYLES = [
    eventTileStyles,
    playbackContainerStyles,
    waveformStyles,
    seekBarStyles,
    pollBodyStyles,
    pollOptionStyles,
    radioStyles,
].join("\n");

/**
 * A CSS module with its local class names prefixed by the module's name, as the library build names them, so that
 * several modules' `.root` don't collide.
 */
function moduleCss(source: string, name: string): string {
    const globals: string[] = [];
    return source
        .replace(/:global\(([^)]*)\)/g, (_match, selector: string) => `@global${globals.push(selector) - 1}@`)
        .replace(/\.(-?[_a-zA-Z][\w-]*)/g, `.${name}_$1`)
        .replace(/@global(\d+)@/g, (_match, index: string) => globals[Number(index)]);
}

function channels(color: string): number[] {
    return color.match(/\d+(\.\d+)?/g)!.map(Number);
}

/** WCAG's contrast ratio between two opaque `rgb()` colors. */
function contrast(first: string, second: string): number {
    const luminance = (color: string): number => {
        const [red, green, blue] = channels(color).map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
}

const icon = (Icon: typeof CheckIcon, props: Record<string, unknown> = {}): string =>
    renderToStaticMarkup(createElement(Icon, { width: 20, height: 20, ...props }));

/** An EventTileView in the bubble layout, the last of its sender's run, as the room timeline renders it. */
function tile(body: string, { own = false, lineClass = "" }: { own?: boolean; lineClass?: string } = {}): string {
    return `
        <li class="root mx_EventTile layoutBubble stateLastInSection${own ? " stateOwnEvent" : ""}">
            <div class="line mx_EventTile_line ${lineClass}">
                <div class="slotTimestamp"><a class="mx_MessageTimestamp content">12:48</a></div>
                <div class="slotBody">${body}</div>
            </div>
        </li>
    `;
}

/** PlayPauseButton: Compound's 32px icon button around the play glyph. */
const PLAY = renderToStaticMarkup(
    createElement(
        IconButton,
        { "className": "PlayPauseButton_button", "size": "32px", "aria-label": "Play" },
        createElement(PlaySolidIcon),
    ),
);

/** A voice message as RecordingPlayback renders it, the first bar played. */
const VOICE = `
    <span class="mx_MVoiceMessageBody">
        <div class="mx_MediaBody MediaBody_mediaBody mx_VoiceMessagePrimaryContainer">
            ${PLAY}
            <div class="mx_RecordingPlayback_timelineLayoutMiddle">
                <div class="mx_Waveform"><span class="mx_Waveform_bar mx_Waveform_bar_100pct"></span><span class="mx_Waveform_bar"></span></div>
                <input type="range" class="mx_SeekBar" min="0" max="1" step="0.001" value="0.5" style="--fillTo: 0.5" aria-label="Audio seek bar">
            </div>
            <span class="mx_Clock">0:07</span>
        </div>
    </span>
`;

/** An audio file as AudioPlayerView renders it, 40% played. */
const AUDIO = `
    <span class="mx_MAudioBody">
        <div class="mx_MediaBody MediaBody_mediaBody AudioPlayerView_audioPlayer" role="region" tabindex="0">
            <div style="display: flex; align-items: center; gap: 8px">
                ${PLAY}
                <div class="AudioPlayerView_mediaInfo"><span class="AudioPlayerView_mediaName">standup.ogg</span></div>
            </div>
            <div style="display: flex; align-items: center; gap: 4px">
                <input type="range" class="SeekBar_seekBar" min="0" max="100" step="1" value="40" style="--fillTo: 0.4" aria-label="Audio seek bar">
                <time class="mx_Clock AudioPlayerView_clock">00:12</time>
            </div>
        </div>
    </span>
`;

/** A preview tile with its icon square, as MediaPreviewGroupView renders a file or a link with the icons of icons.tsx. */
const previewTile = (glyph: typeof CheckIcon, header: string): string => `
    <div class="MediaPreviewTile_tile">
        <div class="MediaPreviewTile_below">
            <div class="MediaPreviewComponents_leftGroup">
                <div class="MediaPreviewComponents_icon">${icon(glyph, { style: { color: "var(--tl-color-on-media-icon)" } })}</div>
                <div class="MediaPreviewComponents_textContent">
                    <div class="MediaPreviewComponents_header">${header}</div>
                    <p class="MediaPreviewComponents_body">2.3 MB</p>
                </div>
            </div>
            <div class="MediaPreviewComponents_buttonGroup"><button type="button" class="MediaPreviewComponents_button">${icon(DownloadIcon)}</button></div>
        </div>
    </div>
`;

/** A file as PreviewFileBody renders it. */
const FILE = `
    <div class="mx_EventTile_content">
        <div class="MediaPreviewGroupView_container">${previewTile(DocumentIcon, "annual-report.pdf")}</div>
    </div>
`;

/** A text message with a link's preview below it, as TextualBodyView renders it. */
const LINK = `
    <div class="mx_MTextBody mx_EventTile_content TextualBody_root" data-event-layout="bubble">
        <div class="mx_EventTile_body translate" dir="auto">Notes: <a href="#">https://element.io/blog/</a></div>
        <div class="mx_TextualBody_urlPreviews MediaPreviewGroupView_container">${previewTile(LinkIcon, "element.io")}</div>
    </div>
`;

/** A poll's option as PollOption renders it. */
function pollOption(
    text: string,
    percent: number,
    { checked = false, ended = false }: { checked?: boolean; ended?: boolean } = {},
): string {
    const optionClasses = ["mx_PollOption", checked && "mx_PollOption_checked", ended && "mx_PollOption_ended"];
    const radioClasses = [
        "mx_StyledRadioButton mx_PollOption_live-option",
        ended ? "mx_StyledRadioButton_disabled" : "mx_StyledRadioButton_enabled",
        checked && "mx_StyledRadioButton_checked",
    ];
    return `
        <div class="${optionClasses.filter(Boolean).join(" ")}" data-option="${text}">
            <label class="${radioClasses.filter(Boolean).join(" ")}">
                <input type="radio" name="poll" value="${text}"${checked ? " checked" : ""}${ended ? " disabled" : ""}>
                <div><div>${checked ? icon(CheckIcon) : ""}</div></div>
                <div class="mx_StyledRadioButton_content">
                    <div aria-hidden="true"><div class="mx_PollOption_content">
                        <div class="mx_PollOption_optionText">${text}</div>
                        <div class="mx_PollOption_optionVoteCount">${percent / 20} votes</div>
                    </div></div>
                </div>
                <div class="mx_StyledRadioButton_spacer"></div>
            </label>
            <div class="mx_PollOption_popularityBackground">
                <div class="mx_PollOption_popularityAmount" style="width: ${percent}%"></div>
            </div>
        </div>
    `;
}

/** A poll in a bubble, as MPollBody renders it. */
const poll = (options: string): string => `
    <fieldset class="mx_MPollBody mx_MPollBody_bubble">
        <legend>Where shall we eat?</legend>
        <div class="mx_MPollBody_allOptions">${options}</div>
        <div class="mx_MPollBody_totalVotes">Based on 5 votes</div>
    </fieldset>
`;

/** The composer's voice recording while it records, as VoiceRecordComposerTile renders it. */
const LIVE_RECORDING = `
    <div class="mx_MessageComposer_row">
        <div class="mx_MediaBody MediaBody_mediaBody mx_VoiceMessagePrimaryContainer mx_VoiceRecordComposerTile_recording">
            <span class="mx_Clock">0:03</span>
            <div class="mx_Waveform"><span class="mx_Waveform_bar mx_Waveform_bar_100pct"></span></div>
        </div>
    </div>
`;

let stylesheet: HTMLStyleElement;

describe("Voice, audio, poll and file controls", () => {
    beforeAll(() => {
        // Each theme's variables apply within its own class, as each theme is a separate stylesheet in the app
        const themed = THEMES.map(
            ({ name, sources }) => `.${name} { ${toBrowserCss(APP_STYLES, commonStyles, fontSizes, ...sources)} }`,
        ).join("\n");
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic}
                ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
                ${compoundLightHcTheme} ${compoundLightHcSemantic} ${compoundDarkHcTheme} ${compoundDarkHcSemantic}
            }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components {
                ${telementTokens}
                ${eventTileViewStyles.replace(/:global\(([^)]*)\)/g, "$1")}
                ${moduleCss(textualBodyStyles, "TextualBody")}
                ${moduleCss(mediaBodyStyles, "MediaBody")}
                ${moduleCss(audioPlayerViewStyles, "AudioPlayerView")}
                ${moduleCss(mediaPreviewGroupViewStyles, "MediaPreviewGroupView")}
                ${moduleCss(mediaPreviewTileStyles, "MediaPreviewTile")}
                ${moduleCss(mediaPreviewComponentsStyles, "MediaPreviewComponents")}
                ${moduleCss(playPauseStyles, "PlayPauseButton")}
                ${moduleCss(seekBarModuleStyles, "SeekBar")}
            }
            @layer app-web { ${themed} }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    describe.each(THEMES)("in $name", (theme) => {
        function render(...items: string[]): HTMLElement {
            document.body.innerHTML = `
                <ol class="${theme.name}" style="width: 880px; margin: 0; padding: 0; list-style: none; color: var(--cpd-color-text-primary); --MediaPreview-width: 478px">
                    ${items.join("")}
                </ol>
            `;
            return document.querySelector("ol")!;
        }

        const fill = (element: Element | null): string => getComputedStyle(element!).backgroundColor;
        /** The color the glyph is painted in: its path's fill, which Compound's icon button colors on every element. */
        const glyph = (element: Element | null): string => getComputedStyle(element!.querySelector("svg path")!).fill;

        it("fills a voice message's play button with the accent and draws its glyph white, also when hovered", async () => {
            const list = render(tile(VOICE, { lineClass: "lineMedia" }));
            const play = list.querySelector<HTMLElement>(".PlayPauseButton_button")!;

            expect(fill(play)).toBe(theme.fill);
            expect(fill(play)).toBe(tokenColor("--cpd-color-bg-accent-rest", list));
            expect(glyph(play)).toBe(WHITE);
            expect(contrast(WHITE, theme.fill)).toBeGreaterThanOrEqual(theme.minimumContrast);

            // Compound's icon button turns its glyph to the primary icon color when hovered
            await userEvent.hover(play);
            expect(fill(play)).toBe(theme.fill);
            expect(glyph(play)).toBe(WHITE);
        });

        it("draws the played part of a voice message's waveform in the accent, and the rest gray", () => {
            const list = render(tile(VOICE, { lineClass: "lineMedia" }));
            const [played, rest] = list.querySelectorAll(".mx_Waveform_bar");

            expect(fill(played)).toBe(theme.line);
            expect(fill(played)).toBe(tokenColor("--cpd-color-icon-accent-primary", list));
            expect(fill(rest)).toBe(tokenColor("--cpd-color-gray-600", list));
            // A line, not text: 3:1 on the bubble
            expect(contrast(fill(played), fill(list.querySelector(".line")))).toBeGreaterThanOrEqual(3);
        });

        it("keeps the composer's live recording gray, as it marks every bar as played", () => {
            const list = render(LIVE_RECORDING);

            expect(fill(list.querySelector(".mx_Waveform_bar"))).toBe(tokenColor("--cpd-color-text-secondary", list));
        });

        it("fills an audio's play button with the accent and draws its seek bar's played part in it, on a gray track", () => {
            const list = render(tile(AUDIO, { lineClass: "lineMedia" }));
            const play = list.querySelector(".PlayPauseButton_button")!;
            const seekBar = list.querySelector(".SeekBar_seekBar")!;

            expect(fill(play)).toBe(theme.fill);
            expect(glyph(play)).toBe(WHITE);
            expect(getComputedStyle(seekBar, "::before").backgroundColor).toBe(theme.line);
            expect(getComputedStyle(seekBar).backgroundColor).toBe(tokenColor("--cpd-color-gray-600", list));
        });

        it("marks your choice with a white check on the accent, and every option's result with a bar in the accent on a gray track", () => {
            const list = render(tile(poll(pollOption("Pizza", 60, { checked: true }) + pollOption("Ramen", 40))));
            const chosen = list.querySelector('[data-option="Pizza"]')!;
            const radio = chosen.querySelector("input + div")!;

            expect(fill(radio)).toBe(theme.fill);
            expect(getComputedStyle(radio).borderTopColor).toBe(theme.fill);
            expect(getComputedStyle(radio.querySelector("svg")!).color).toBe(WHITE);
            // Nothing white sits on a bar, so it is a line's accent, which stays clear of the bubble in every theme
            for (const bar of list.querySelectorAll(".mx_PollOption_popularityAmount")) {
                expect(fill(bar)).toBe(theme.line);
                expect(contrast(fill(bar), fill(list.querySelector(".line")))).toBeGreaterThanOrEqual(3);
            }
            for (const track of list.querySelectorAll(".mx_PollOption_popularityBackground")) {
                expect(fill(track)).toBe(tokenColor("--cpd-color-alpha-gray-400", list));
            }
        });

        it("leaves the options' rings gray before you vote, as Telegram does", () => {
            const list = render(tile(poll(pollOption("Pizza", 0) + pollOption("Ramen", 0))));

            for (const ring of list.querySelectorAll(".mx_PollOption input + div")) {
                expect(getComputedStyle(ring).borderTopColor).toBe(
                    tokenColor("--cpd-color-border-interactive-primary", list),
                );
                expect(fill(ring)).toBe(TRANSPARENT);
            }
        });

        it("keeps an ended poll's winner check and every result bar in the accent, though its radios are disabled", () => {
            const list = render(
                tile(
                    poll(
                        pollOption("Pizza", 60, { checked: true, ended: true }) +
                            pollOption("Ramen", 40, { ended: true }),
                    ),
                ),
            );
            const radio = list.querySelector('[data-option="Pizza"] input + div')!;

            expect(fill(radio)).toBe(theme.fill);
            expect(getComputedStyle(radio.querySelector("svg")!).color).toBe(WHITE);
            for (const bar of list.querySelectorAll(".mx_PollOption_popularityAmount")) {
                expect(fill(bar)).toBe(theme.line);
            }
        });

        it.each([
            ["a file", FILE, "lineMedia"],
            ["a link's preview", LINK, ""],
        ])(
            "fills %s's icon square with the accent and draws its glyph white, with no outline",
            (_name, body, lineClass) => {
                const list = render(tile(body, { lineClass }));
                const square = list.querySelector(".MediaPreviewComponents_icon")!;

                expect(fill(square)).toBe(theme.fill);
                expect(getComputedStyle(square.querySelector("svg")!).color).toBe(WHITE);
                expect(getComputedStyle(square).borderTopColor).toBe(TRANSPARENT);
                expect(contrast(WHITE, theme.fill)).toBeGreaterThanOrEqual(theme.minimumContrast);
            },
        );

        it("draws an audio's play button in your own bubble as a white circle with the bubble's blue glyph, also when hovered, and its played part the secondary white", async () => {
            const list = render(tile(AUDIO, { own: true, lineClass: "lineMedia" }));
            const play = list.querySelector<HTMLElement>(".PlayPauseButton_button")!;
            const seekBar = list.querySelector(".SeekBar_seekBar")!;
            const bubble = tokenColor("--tl-color-bg-bubble-own", list);

            expect(fill(play)).toBe(WHITE);
            expect(glyph(play)).toBe(bubble);
            await userEvent.hover(play);
            expect(fill(play)).toBe(WHITE);
            expect(glyph(play)).toBe(bubble);
            expect(getComputedStyle(seekBar, "::before").backgroundColor).toBe(
                tokenColor("--tl-color-on-bubble-own-secondary", list),
            );
            expect(getComputedStyle(seekBar).backgroundColor).toBe(tokenColor("--tl-color-separator-bubble-own", list));
        });

        it("keeps a file's and a link's icon square translucent white with a white glyph and edge in your own bubble", () => {
            const list = render(tile(FILE, { own: true, lineClass: "lineMedia" }), tile(LINK, { own: true }));

            for (const square of list.querySelectorAll(".MediaPreviewComponents_icon")) {
                expect(fill(square)).toBe(tokenColor("--tl-color-bg-bubble-own-subtle-hovered", list));
                expect(getComputedStyle(square.querySelector("svg")!).color).toBe(WHITE);
                expect(getComputedStyle(square).borderTopColor).toBe(
                    tokenColor("--tl-color-separator-bubble-own", list),
                );
            }
        });

        it("grows an audio's played part from the right in RTL, where its thumb starts", () => {
            const list = render(tile(AUDIO, { lineClass: "lineMedia" }));
            list.dir = "rtl";
            const played = getComputedStyle(list.querySelector(".SeekBar_seekBar")!, "::before");

            expect(played.transformOrigin).toBe(`${played.width} ${played.height}`);
        });

        describe("in forced colors", () => {
            beforeAll(async () => {
                await cdp().send("Emulation.setEmulatedMedia", {
                    features: [{ name: "forced-colors", value: "active" }],
                });
            });

            afterAll(async () => {
                await cdp().send("Emulation.setEmulatedMedia", { features: [] });
            });

            /** A system color as an SVG glyph takes it: SVGs keep the colors they are given in forced colors. */
            function systemColor(name: string, scope: Element): string {
                const probe = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                probe.style.color = name;
                scope.append(probe);
                const color = getComputedStyle(probe).color;
                probe.remove();
                return color;
            }

            it.each([false, true])(
                "draws the play button's and the icon squares' glyphs in the system's colors, which drop the accent fill (own bubble: %s)",
                (own) => {
                    const list = render(
                        tile(VOICE, { own, lineClass: "lineMedia" }),
                        tile(FILE, { own, lineClass: "lineMedia" }),
                        tile(LINK, { own }),
                    );

                    expect(glyph(list.querySelector(".PlayPauseButton_button"))).toBe(systemColor("ButtonText", list));
                    for (const square of list.querySelectorAll(".MediaPreviewComponents_icon")) {
                        expect(getComputedStyle(square.querySelector("svg")!).color).toBe(
                            systemColor("CanvasText", list),
                        );
                    }
                    expect(systemColor("CanvasText", list)).not.toBe(systemColor("Canvas", list));
                },
            );
        });
    });
});
