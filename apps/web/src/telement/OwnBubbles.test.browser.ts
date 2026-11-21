/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { type ComponentType, createElement, type SVGProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IconButton } from "@vector-im/compound-web";
import {
    CheckIcon,
    CopyIcon,
    DocumentIcon,
    DownloadIcon,
    ErrorSolidIcon,
    ItalicIcon,
    LockSolidIcon,
    PinSolidIcon,
    PlaySolidIcon,
    UserSolidIcon,
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
import githubMarkdownLight from "github-markdown-css/github-markdown-light.css?raw";
import githubMarkdownDark from "github-markdown-css/github-markdown-dark.css?raw";
import hljsLight from "highlight.js/styles/atom-one-light.min.css?raw";
import hljsDark from "highlight.js/styles/atom-one-dark.min.css?raw";

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
import textualBodyStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/TextualBodyView/TextualBody.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import linkedTextStyles from "../../../../packages/shared-components/src/core/utils/LinkedText/LinkedText.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaPreviewGroupViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/MediaPreviewGroupView/MediaPreviewGroupView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaPreviewTileStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/MediaPreviewGroupView/MediaPreviewTile/MediaPreviewTile.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaPreviewComponentsStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/MediaPreviewGroupView/MediaPreviewComponents/MediaPreviewComponents.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaBodyStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/MediaBody/MediaBody.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import reactionsRowStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/reactions/ReactionsRow/ReactionsRow.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import reactionsRowButtonStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/reactions/ReactionsRowButton/ReactionsRowButton.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import replyTileStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/ReplyTileView/ReplyTileView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import padlockStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/E2ePadlock/E2ePadlock.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import redactedStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/RedactedBodyView/RedactedBodyView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import decryptionFailureStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/DecryptionFailureBodyView/DecryptionFailureBodyView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import playPauseStyles from "../../../../packages/shared-components/src/audio/PlayPauseButton/PlayPauseButton.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import imageBodyViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/MImageBodyView/ImageBodyView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import pinnedMarkViewStyles from "../../../../packages/shared-components/src/telement/room/timeline/PinnedMarkView/PinnedMarkView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import playbackContainerStyles from "../../res/css/views/audio_messages/_PlaybackContainer.pcss?raw";
import seekBarStyles from "../../res/css/views/audio_messages/_SeekBar.pcss?raw";
import pollOptionStyles from "../../res/css/components/views/polls/_PollOption.pcss?raw";
import accessibleButtonStyles from "../../res/css/views/elements/_AccessibleButton.pcss?raw";
import pillStyles from "../../res/css/views/elements/_Pill.pcss?raw";
import replyChainStyles from "../../res/css/views/elements/_ReplyChain.pcss?raw";
import radioStyles from "../../res/css/views/elements/_StyledRadioButton.pcss?raw";
import pollBodyStyles from "../../res/css/views/messages/_MPollBody.pcss?raw";
import autocompleteStyles from "../../res/css/views/rooms/_Autocomplete.pcss?raw";
import editComposerStyles from "../../res/css/views/rooms/_EditMessageComposer.pcss?raw";
import formatBarStyles from "../../res/css/views/rooms/_MessageComposerFormatBar.pcss?raw";
import eventTileStyles from "../../res/css/views/rooms/_EventTile.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import lightHighContrastTheme from "../../res/themes/light-high-contrast/css/_light-high-contrast.pcss?raw";
import legacyLightTheme from "../../res/themes/legacy-light/css/_legacy-light.pcss?raw";
import legacyDarkTheme from "../../res/themes/legacy-dark/css/_legacy-dark.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";

interface Theme {
    name: string;
    /** The theme stylesheets it is built from, in the order its entry point imports them. */
    sources: string[];
    markdown: string;
    syntax: string;
    fill: string;
    highlighted: string;
    textSelection: string;
    secondary: string;
    /** The contrast white text has on the fill at least. */
    minimumContrast: number;
    /** The contrast white text has on the text selection at least. */
    selectionContrast: number;
}

const SECONDARY = "rgba(239, 250, 255, 0.8)";

/** Dark high contrast is the dark theme on a system that asks for more contrast. */
const THEMES: Theme[] = [
    {
        name: "cpd-theme-light",
        sources: [lightTheme],
        markdown: githubMarkdownLight,
        syntax: hljsLight,
        fill: "rgb(36, 129, 204)",
        highlighted: "rgb(75, 123, 173)",
        textSelection: "rgb(109, 168, 214)",
        secondary: SECONDARY,
        minimumContrast: 4.1,
        selectionContrast: 2.5,
    },
    {
        name: "cpd-theme-dark",
        sources: [lightTheme, darkTheme],
        markdown: githubMarkdownDark,
        syntax: hljsDark,
        fill: "rgb(61, 106, 151)",
        highlighted: "rgb(80, 121, 161)",
        textSelection: "rgb(53, 90, 128)",
        secondary: SECONDARY,
        minimumContrast: 5.6,
        selectionContrast: 7,
    },
    {
        name: "cpd-theme-light-hc",
        sources: [lightTheme, lightHighContrastTheme],
        markdown: githubMarkdownLight,
        syntax: hljsLight,
        fill: "rgb(5, 83, 138)",
        highlighted: "rgb(3, 68, 116)",
        textSelection: "rgb(0, 39, 71)",
        secondary: "rgb(239, 250, 255)",
        minimumContrast: 7,
        selectionContrast: 7,
    },
    {
        name: "cpd-theme-dark-hc",
        sources: [lightTheme, darkTheme],
        markdown: githubMarkdownDark,
        syntax: hljsDark,
        fill: "rgb(43, 87, 132)",
        highlighted: "rgb(51, 96, 140)",
        textSelection: "rgb(30, 66, 102)",
        secondary: "rgb(239, 250, 255)",
        minimumContrast: 7,
        selectionContrast: 7,
    },
];

interface CustomTheme {
    /** The class its styles apply within in this test. */
    name: string;
    /** The Compound theme the app sets with it. */
    compound: string;
    /** The theme stylesheets it is built from, in the order its entry point imports them. */
    sources: string[];
    markdown: string;
    syntax: string;
    fill: string;
}

/** Element's custom themes, which build on the legacy light and dark themes. */
const CUSTOM_THEMES: CustomTheme[] = [
    {
        name: "legacy-light",
        compound: "cpd-theme-light",
        sources: [legacyLightTheme],
        markdown: githubMarkdownLight,
        syntax: hljsLight,
        fill: "rgb(36, 129, 204)",
    },
    {
        name: "legacy-dark",
        compound: "cpd-theme-dark",
        sources: [legacyLightTheme, legacyDarkTheme],
        markdown: githubMarkdownDark,
        syntax: hljsDark,
        fill: "rgb(61, 106, 151)",
    },
];

const WHITE = "rgb(255, 255, 255)";
const TRANSPARENT = "rgba(0, 0, 0, 0)";

const APP_STYLES = [
    eventTileStyles,
    playbackContainerStyles,
    seekBarStyles,
    pollBodyStyles,
    pollOptionStyles,
    radioStyles,
    pillStyles,
    replyChainStyles,
    editComposerStyles,
    autocompleteStyles,
    formatBarStyles,
    accessibleButtonStyles,
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

/** The opaque color the screen shows for `color` painted over the opaque `under`. */
function composite(color: string, under: string): string {
    const [red, green, blue, alpha = 1] = channels(color);
    const base = channels(under);
    return `rgb(${[red, green, blue].map((channel, i) => channel * alpha + base[i] * (1 - alpha)).join(", ")})`;
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

const icon = (Icon: ComponentType<SVGProps<SVGSVGElement>>, props: Record<string, unknown> = {}): string =>
    renderToStaticMarkup(createElement(Icon, { width: 20, height: 20, ...props }));

const plain = (text: string): string =>
    `<div class="mx_MTextBody mx_EventTile_content TextualBody_root" data-event-layout="bubble"><div class="mx_EventTile_body translate LinkedText_container" dir="auto">${text}</div></div>`;
const formatted = (html: string): string =>
    `<div class="mx_MTextBody mx_EventTile_content TextualBody_root" data-event-layout="bubble"><div class="mx_EventTile_body markdown-body translate" dir="auto">${html}</div></div>`;

interface TileOptions {
    own?: boolean;
    layout?: "Bubble" | "Group" | "Irc";
    states?: string[];
    lineClass?: string;
    reply?: string;
    padlock?: string;
    footer?: string;
    /** What EventTileView renders beside the content in the line, outside the bubble's fill. */
    actionBar?: string;
    /** Telegram's checks or the failed mark, which EventTileView puts after the time. */
    status?: "read" | "failed";
    /** Telegram's pin of a pinned message, which EventTileView puts before the time. */
    pinned?: boolean;
}

/** The pin before the time, as PinnedMarkView renders it in its slot. */
const PIN_SLOT = `<div class="slotPin"><span class="PinnedMarkView_mark" role="img">${icon(PinSolidIcon, { className: "PinnedMarkView_icon" })}</span></div>`;

/** The status after the time, as MessageStatusView renders it in its slot. */
function statusSlot(status: "read" | "failed"): string {
    const glyph = status === "read" ? DoubleCheckIcon : ErrorSolidIcon;
    return `<div class="slotStatus"><span class="MessageStatusView_status MessageStatusView_${status}" role="img" data-status="${status}">${icon(glyph, { className: "MessageStatusView_icon" })}</span></div>`;
}

/** An EventTileView, in the bubble layout unless told otherwise, the last of its sender's run, as the room timeline
 * renders it. */
function tile(
    body: string,
    {
        own = true,
        layout = "Bubble",
        states = [],
        lineClass = "",
        reply,
        padlock,
        footer,
        actionBar,
        status,
        pinned,
    }: TileOptions = {},
): string {
    const classes = [
        `layout${layout}`,
        own && "stateOwnEvent",
        reply && "stateHasReply",
        status && "hasStatusSlot",
        pinned && "hasPinSlot",
        "stateLastInSection",
        ...states,
    ];
    return `
        <li class="root mx_EventTile ${classes.filter(Boolean).join(" ")}">
            <div class="line mx_EventTile_line ${lineClass}">
                <div class="slotTimestamp">${pinned ? PIN_SLOT : ""}<a class="mx_MessageTimestamp content">12:48</a>${status ? statusSlot(status) : ""}</div>
                ${padlock ? `<div class="slotPadlock">${padlock}</div>` : ""}
                ${reply ? `<div class="slotReplyChain"><div class="mx_ReplyChain_wrapper">${reply}</div></div>` : ""}
                <div class="slotBody">${body}</div>
                ${actionBar ? `<div class="slotActionBar">${actionBar}</div>` : ""}
                ${footer ? `<div class="slotFooter">${footer}</div>` : ""}
            </div>
        </li>
    `;
}

const pill = (name: string, kind = "mx_UserPill", before = ""): string =>
    `<bdi><a class="mx_Pill ${kind}" href="#">${before}<span class="mx_Pill_text">${name}</span></a></bdi>`;

const REPLY = `
    <blockquote class="mx_ReplyChain mx_ReplyChain_color3">
        <div class="ReplyTileView_root">
            <a class="ReplyTileView_link" href="#">
                <div class="ReplyTileView_sender">
                    <span class="ReplyTileView_senderProfile"><span class="mx_Username_color3" style="color: var(--cpd-color-text-decorative-3)">Bob</span></span>
                </div>
                <div class="ReplyTileView_body">Are you coming to the office tomorrow?</div>
            </a>
        </div>
    </blockquote>
`;

/** A code block as CodeBlock renders it, with line numbers, syntax highlighting and its copy button. */
const CODE = `
    <div class="mx_EventTile_pre_container">
        <pre><span class="mx_EventTile_lineNumbers"><span>1</span></span><div style="display: contents"><code class="language-ts"><span class="hljs-keyword">const</span> accent = <span class="hljs-string">"#2481cc"</span>;
</code></div></pre>
        <div role="button" class="mx_AccessibleButton mx_EventTile_button mx_EventTile_copyButton">${icon(CopyIcon)}</div>
    </div>
`;

/** A reactions row in a bubble, which has no add-reaction button: your own reaction first, then another. */
const REACTIONS = `
    <div class="mx_ReactionsRow ReactionsRow_reactionsRow" role="toolbar">
        <button type="button" class="ReactionsRowButton_reactionsRowButton ReactionsRowButton_reactionsRowButtonSelected ReactionsRowButton_reactionsRowButtonInBubble" data-reaction="own">
            <span class="ReactionsRowButton_reactionsRowButtonContent">🔥</span><span class="ReactionsRowButton_reactionsRowButtonCount">3</span>
        </button>
        <button type="button" class="ReactionsRowButton_reactionsRowButton ReactionsRowButton_reactionsRowButtonInBubble" data-reaction="other">
            <span class="ReactionsRowButton_reactionsRowButtonContent">👍</span><span class="ReactionsRowButton_reactionsRowButtonCount">12</span>
        </button>
    </div>
`;

/** A file as PreviewFileBody renders it, its icon in the media icon's color (icons.tsx). */
const FILE = `
    <div class="mx_EventTile_content">
        <div class="MediaPreviewGroupView_container">
            <div class="MediaPreviewTile_tile">
                <div class="MediaPreviewTile_below">
                    <div class="MediaPreviewComponents_leftGroup">
                        <div class="MediaPreviewComponents_icon">${icon(DocumentIcon, { style: { color: "var(--tl-color-on-media-icon)" } })}</div>
                        <div class="MediaPreviewComponents_textContent">
                            <div class="MediaPreviewComponents_header">annual-report.pdf</div>
                            <p class="MediaPreviewComponents_body">2.3 MB</p>
                        </div>
                    </div>
                    <div class="MediaPreviewComponents_buttonGroup"><button type="button" class="MediaPreviewComponents_button">${icon(DownloadIcon)}</button></div>
                </div>
            </div>
        </div>
    </div>
`;

const PLAY = renderToStaticMarkup(
    createElement(IconButton, { className: "PlayPauseButton_button", size: "32px" }, createElement(PlaySolidIcon)),
);

/** A voice message as RecordingPlayback renders it, the first bar played. */
const VOICE = `
    <span class="mx_MVoiceMessageBody">
        <div class="mx_MediaBody MediaBody_mediaBody mx_VoiceMessagePrimaryContainer">
            ${PLAY}
            <div class="mx_RecordingPlayback_timelineLayoutMiddle">
                <div class="mx_Waveform"><span class="mx_Waveform_bar mx_Waveform_bar_100pct"></span><span class="mx_Waveform_bar"></span></div>
            </div>
            <span class="mx_Clock">0:07</span>
        </div>
    </span>
`;

/** A poll in a bubble, with your vote on the first option. */
const POLL = `
    <fieldset class="mx_MPollBody mx_MPollBody_bubble">
        <legend>Where shall we eat?<span class="mx_MPollBody_edited"> (edited)</span></legend>
        <div class="mx_MPollBody_allOptions">
            <div class="mx_PollOption mx_PollOption_checked">
                <div class="mx_StyledRadioButton mx_StyledRadioButton_checked mx_StyledRadioButton_enabled">
                    <label class="mx_StyledRadioButton_innerLabel"><input type="radio" checked><div><div>${icon(CheckIcon)}</div></div></label>
                    <div class="mx_StyledRadioButton_content"><div class="mx_PollOption_content"><div>Pizza</div><div class="mx_PollOption_optionVoteCount">3 votes</div></div></div>
                </div>
                <div class="mx_PollOption_popularityBackground"><div class="mx_PollOption_popularityAmount" style="width: 60%"></div></div>
            </div>
        </div>
        <div class="mx_MPollBody_totalVotes">Based on 3 votes</div>
    </fieldset>
`;

/** A text message with a link preview, as TextualBodyView renders it with MediaPreviewGroupView below the text. */
const PREVIEW = `
    <div class="mx_MTextBody mx_EventTile_content TextualBody_root" data-event-layout="bubble">
        <div class="mx_EventTile_body translate LinkedText_container" dir="auto">Notes: <a href="#">https://element.io/blog/</a></div>
        <div class="mx_TextualBody_urlPreviews MediaPreviewGroupView_container">
            <div class="MediaPreviewTile_tile"><div class="MediaPreviewTile_below"><div class="MediaPreviewComponents_textContent">
                <div class="MediaPreviewComponents_header">Element 1.12</div>
                <p class="MediaPreviewComponents_body">Threads for everyone</p>
            </div></div></div>
        </div>
    </div>
`;

/** An inline edit composer, with the autocomplete open above its field and the formatting bar over a selection. */
const EDIT_COMPOSER = `
    <div class="mx_EditMessageComposer mx_EventTile_content">
        <div class="mx_BasicMessageComposer">
            <div class="mx_BasicMessageComposer_AutoCompleteWrapper">
                <div id="mx_Autocomplete" class="mx_Autocomplete" role="listbox">
                    <div class="mx_Autocomplete_ProviderSection">
                        <div class="mx_Autocomplete_Completion_container_pill mx_Autocomplete_Completion_container_truncate">
                            <div class="mx_Autocomplete_Completion mx_Autocomplete_Completion_pill selected" role="option">
                                <span class="mx_Autocomplete_Completion_title">Alice</span>
                                <span class="mx_Autocomplete_Completion_subtitle"></span>
                                <span class="mx_Autocomplete_Completion_description">@alice:example.org</span>
                            </div>
                            <div class="mx_Autocomplete_Completion mx_Autocomplete_Completion_pill" role="option">
                                <span class="mx_Autocomplete_Completion_title">Alan</span>
                                <span class="mx_Autocomplete_Completion_subtitle"></span>
                                <span class="mx_Autocomplete_Completion_description">@alan:example.org</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="mx_MessageComposerFormatBar mx_MessageComposerFormatBar_shown" role="toolbar">
                <div role="button" class="mx_AccessibleButton mx_MessageComposerFormatBar_button">${icon(ItalicIcon)}</div>
            </div>
            <div class="mx_BasicMessageComposer_input" contenteditable="true">Fixed @Al</div>
        </div>
        <div class="mx_EditMessageComposer_buttons">
            <div role="button" class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary">Save</div>
        </div>
    </div>
`;

const EMOJI = `<div class="mx_MTextBody mx_EventTile_content TextualBody_root" data-event-layout="bubble"><div class="mx_EventTile_body mx_EventTile_bigEmoji translate" dir="auto"><span class="mx_Emoji">🎉</span></div></div>`;

let stylesheet: HTMLStyleElement;

describe("Your own bubbles", () => {
    beforeAll(() => {
        // Each theme's variables, and the vendor stylesheets it loads after the app's own, apply within its own class,
        // as each theme is a separate stylesheet in the app. A custom theme's tiles also have its Compound theme's
        // class, so its block comes last and its rules win over that theme's.
        const appStyles = ({ sources, markdown, syntax }: Pick<Theme, "sources" | "markdown" | "syntax">): string => `
            ${toBrowserCss(APP_STYLES, commonStyles, fontSizes, ...sources)}
            ${syntax}
            ${markdown}
        `;
        const themed = [...THEMES, ...CUSTOM_THEMES]
            .map((theme) => `.${theme.name} { ${appStyles(theme)} }`)
            .join("\n");
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
                ${messageTimestampViewStyles}
                ${moduleCss(messageStatusViewStyles, "MessageStatusView")}
                ${moduleCss(textualBodyStyles, "TextualBody")}
                ${moduleCss(linkedTextStyles, "LinkedText")}
                ${moduleCss(mediaPreviewGroupViewStyles, "MediaPreviewGroupView")}
                ${moduleCss(mediaPreviewTileStyles, "MediaPreviewTile")}
                ${moduleCss(mediaPreviewComponentsStyles, "MediaPreviewComponents")}
                ${moduleCss(mediaBodyStyles, "MediaBody")}
                ${moduleCss(reactionsRowStyles, "ReactionsRow")}
                ${moduleCss(reactionsRowButtonStyles, "ReactionsRowButton")}
                ${moduleCss(replyTileStyles, "ReplyTileView")}
                ${moduleCss(padlockStyles, "E2ePadlock")}
                ${moduleCss(redactedStyles, "RedactedBodyView")}
                ${moduleCss(decryptionFailureStyles, "DecryptionFailureBodyView")}
                ${moduleCss(playPauseStyles, "PlayPauseButton")}
                ${moduleCss(imageBodyViewStyles, "ImageBodyView")}
                ${moduleCss(pinnedMarkViewStyles, "PinnedMarkView")}
            }
            @layer app-web { ${themed} }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        getSelection()?.removeAllRanges();
        document.body.innerHTML = "";
    });

    describe.each(THEMES)("in $name", (theme) => {
        function render(...tiles: string[]): HTMLElement {
            document.body.innerHTML = `
                <ol class="${theme.name}" style="width: 880px; margin: 0; padding: 0; list-style: none; color: var(--cpd-color-text-primary); --MediaPreview-width: 478px">
                    ${tiles.join("")}
                </ol>
            `;
            return document.querySelector("ol")!;
        }

        const color = (element: Element | null): string => getComputedStyle(element!).color;
        const fill = (element: Element | null): string => getComputedStyle(element!).backgroundColor;

        it("fills your own bubble and its tail with the theme's blue, with white text on it, and leaves others' gray", () => {
            const list = render(tile(plain("Sounds good")), tile(plain("See you at ten"), { own: false }));
            const [own, others] = list.querySelectorAll(".line");
            const text = own.querySelector(".mx_EventTile_body");

            expect(fill(own)).toBe(theme.fill);
            expect(getComputedStyle(own, "::after").backgroundColor).toBe(theme.fill);
            expect(color(text)).toBe(WHITE);
            expect(contrast(color(text), theme.fill)).toBeGreaterThanOrEqual(theme.minimumContrast);
            expect(fill(others)).toBe(tokenColor("--cpd-color-gray-300", list));
            expect(color(others.querySelector(".mx_EventTile_body"))).toBe(
                tokenColor("--cpd-color-text-primary", list),
            );
        });

        it("writes the time, the edited marker, deleted and undecryptable messages and the padlock in the secondary white", () => {
            const edited = `
                <div class="mx_MTextBody mx_EventTile_content TextualBody_root" data-event-layout="bubble">
                    <div class="TextualBody_annotated" data-textual-body-annotation-wrapper>
                        <div class="mx_EventTile_body translate" dir="auto">Fixed the typo</div>
                        <button class="TextualBody_annotation TextualBody_editedMarker">(edited)</button>
                    </div>
                </div>
            `;
            const padlock = `<div class="E2ePadlock_e2ePadlock E2ePadlock_normal">${icon(LockSolidIcon)}</div>`;
            const list = render(
                tile(edited, { padlock }),
                tile('<span class="RedactedBodyView_content"><span>Message deleted</span></span>'),
                tile('<div class="DecryptionFailureBodyView_content">Unable to decrypt message</div>', {
                    states: ["stateEncryptionFailure"],
                }),
            );

            for (const element of list.querySelectorAll(
                ".mx_MessageTimestamp, .TextualBody_annotation, .E2ePadlock_e2ePadlock, .RedactedBodyView_content, .DecryptionFailureBodyView_content",
            )) {
                expect(color(element)).toBe(theme.secondary);
            }
            expect(contrast(composite(theme.secondary, theme.fill), theme.fill)).toBeGreaterThanOrEqual(
                theme.minimumContrast > 5 ? 4 : 3,
            );
        });

        it("draws the read checks after the time in its secondary white, and the failed mark as the page's red disc ringed in white, so it doesn't look sent", () => {
            const list = render(tile(plain("Read"), { status: "read" }), tile(plain("Not sent"), { status: "failed" }));
            const [read, failed] = list.querySelectorAll(".MessageStatusView_status svg");

            expect(color(read)).toBe(theme.secondary);
            expect(color(read)).toBe(color(list.querySelector(".mx_MessageTimestamp")));
            expect(color(failed)).toBe(tokenColor("--cpd-color-icon-critical-primary", list));
            expect(color(failed)).not.toBe(color(read));
            // The white disc behind the glyph shows through its "!" and rings it
            expect(fill(failed)).toBe(WHITE);
            expect(getComputedStyle(failed).borderRadius).toBe("50%");
            expect(getComputedStyle(failed).boxShadow).toBe(`${WHITE} 0px 0px 0px 0.5px`);
        });

        it("draws the checks of your own emote, which has no bubble, in the page's time color", () => {
            const list = render(
                tile(plain("waves"), {
                    states: ["stateNoBubble", "stateEmote"],
                    lineClass: "lineEmote",
                    status: "read",
                }),
            );

            expect(color(list.querySelector(".MessageStatusView_status svg"))).toBe(
                tokenColor("--cpd-color-text-secondary", list),
            );
        });

        it("draws the padlock of a message from an unverified device in white rather than red", () => {
            const padlock = `<div class="E2ePadlock_e2ePadlock E2ePadlock_warning">${icon(ErrorSolidIcon)}</div>`;
            const list = render(tile(plain("From my laptop"), { padlock }));

            expect(color(list.querySelector(".E2ePadlock_e2ePadlock"))).toBe(WHITE);
        });

        it("draws links white and underlined, as the accent is the bubble's own color", () => {
            const link = '<a href="https://telegram.org">telegram.org</a>';
            const list = render(tile(formatted(`<p>See ${link}</p>`)), tile(plain(`See ${link}`)));

            for (const element of list.querySelectorAll("a[href]")) {
                expect(color(element)).toBe(WHITE);
                expect(getComputedStyle(element).textDecorationLine).toBe("underline");
            }
        });

        it("draws mentions, yours too, as white pills in the bubble's color, without an underline", () => {
            const nonMember = pill(
                "@carol:example.org",
                "mx_UserPill",
                icon(UserSolidIcon, { className: "mx_Pill_UserIcon" }),
            );
            const list = render(
                tile(
                    formatted(
                        `<p>Hey ${pill("Alice")}, ${pill("#design")}, ${pill("me", "mx_UserPill_me")} and ${nonMember}</p>`,
                    ),
                ),
            );

            for (const element of list.querySelectorAll(".mx_Pill")) {
                expect(fill(element)).toBe(WHITE);
                expect(color(element)).toBe(theme.fill);
                expect(getComputedStyle(element).textDecorationLine).toBe("none");
            }
            expect(color(list.querySelector(".mx_Pill_UserIcon"))).toBe(theme.fill);
        });

        it("draws code, its line numbers and its buttons in white on translucent white, syntax colors included", () => {
            const list = render(tile(formatted(`<p>Run <code>pnpm i18n</code>:</p>${CODE}`)));
            const inline = list.querySelector("p code")!;
            const pre = list.querySelector("pre")!;

            for (const element of [inline, pre, ...pre.querySelectorAll("[class^='hljs-']")]) {
                expect(color(element)).toBe(WHITE);
            }
            for (const element of [inline, pre]) {
                const [red, green, blue, alpha] = channels(fill(element));
                expect([red, green, blue]).toEqual([255, 255, 255]);
                expect(alpha).toBeGreaterThan(0);
                expect(alpha).toBeLessThan(0.25);
            }
            expect(contrast(composite(fill(pre), theme.fill), theme.fill)).toBeLessThan(1.25);
            // The secondary white would be under 3:1 on the block's fill in light themes
            expect(color(list.querySelector(".mx_EventTile_lineNumbers"))).toBe(WHITE);
            expect(contrast(WHITE, composite(fill(pre), theme.fill))).toBeGreaterThanOrEqual(3);
            expect(color(list.querySelector(".mx_EventTile_copyButton svg"))).toBe(WHITE);
        });

        it("draws a reply quote's line, sender and text in white, as Telegram does", () => {
            const list = render(tile(plain("Yes, at ten"), { reply: REPLY }));
            const quote = list.querySelector(".mx_ReplyChain")!;

            expect(getComputedStyle(quote, "::before").borderInlineStartColor).toBe(WHITE);
            expect(color(quote.querySelector(".mx_Username_color3"))).toBe(WHITE);
            expect(color(quote.querySelector(".ReplyTileView_body"))).toBe(WHITE);
        });

        it("draws a blockquote's line in white, as the reply quote's, and its text in the secondary white", () => {
            const list = render(
                tile(formatted("<blockquote><p>From the spec</p></blockquote><p>Agreed</p>"), { reply: REPLY }),
            );
            const quote = list.querySelector(".mx_EventTile_body blockquote")!;
            const line = getComputedStyle(quote, "::before").borderInlineStartColor;

            expect(line).toBe(WHITE);
            expect(line).toBe(
                getComputedStyle(list.querySelector(".mx_ReplyChain")!, "::before").borderInlineStartColor,
            );
            expect(color(quote)).toBe(theme.secondary);
        });

        it("fills your own reaction white with the bubble's color, and others' translucent white with white", () => {
            const list = render(tile(plain("Shipping it today"), { footer: REACTIONS }));
            const own = list.querySelector('[data-reaction="own"]')!;
            const other = list.querySelector('[data-reaction="other"]')!;

            expect(fill(own)).toBe(WHITE);
            expect(color(own)).toBe(theme.fill);
            expect(channels(fill(other)).slice(0, 3)).toEqual([255, 255, 255]);
            expect(channels(fill(other))[3]).toBeLessThan(0.25);
            expect(color(other)).toBe(WHITE);
        });

        it("fills a hovered reaction a step deeper than at rest, in your own bubble and in others'", async () => {
            const list = render(
                tile(plain("Shipping it today"), { footer: REACTIONS }),
                tile(plain("Nice"), { own: false, footer: REACTIONS }),
            );
            const [ownBubble, othersBubble] = list.querySelectorAll(".line");
            const hovered = async (bubble: Element, reaction: string): Promise<string> => {
                const chip = bubble.querySelector<HTMLElement>(`[data-reaction="${reaction}"]`)!;
                await userEvent.hover(chip);
                return fill(chip);
            };

            expect(await hovered(ownBubble, "own")).toBe(tokenColor("--tl-color-on-bubble-own-secondary", list));
            expect(await hovered(ownBubble, "other")).toBe(tokenColor("--tl-color-bg-bubble-own-subtle-hovered", list));
            expect(await hovered(othersBubble, "own")).toBe(tokenColor("--cpd-color-bg-accent-hovered", list));
            expect(await hovered(othersBubble, "other")).toBe(tokenColor("--tl-color-bg-badge-accent-hovered", list));
            expect(tokenColor("--tl-color-bg-badge-accent-hovered", list)).not.toBe(
                tokenColor("--cpd-color-bg-badge-accent", list),
            );
        });

        it("draws the pin of a pinned message before the time in the time's secondary white, under reactions too", () => {
            const list = render(
                tile(plain("Shipping it today"), { pinned: true }),
                tile(plain("Lunch?"), { pinned: true, footer: REACTIONS }),
            );

            for (const pin of list.querySelectorAll(".PinnedMarkView_mark svg")) {
                const time = pin.closest(".slotTimestamp")!.querySelector(".mx_MessageTimestamp");
                expect(color(pin)).toBe(theme.secondary);
                expect(color(pin)).toBe(color(time));
            }
        });

        it("draws the pin of your own pinned emote, which has no bubble, in the page's time color", () => {
            const list = render(
                tile(plain("waves"), { states: ["stateNoBubble", "stateEmote"], lineClass: "lineEmote", pinned: true }),
            );

            expect(color(list.querySelector(".PinnedMarkView_mark svg"))).toBe(
                tokenColor("--cpd-color-text-secondary", list),
            );
        });

        it("keeps a file's icon, name, size and download button legible", () => {
            const list = render(tile(FILE, { lineClass: "lineMedia" }));
            const square = list.querySelector(".MediaPreviewComponents_icon")!;

            expect(fill(list.querySelector(".line"))).toBe(theme.fill);
            expect(color(square.querySelector("svg"))).toBe(WHITE);
            expect(channels(fill(square)).slice(0, 3)).toEqual([255, 255, 255]);
            expect(color(list.querySelector(".MediaPreviewComponents_header"))).toBe(WHITE);
            expect(color(list.querySelector(".MediaPreviewComponents_body"))).toBe(theme.secondary);
            expect(color(list.querySelector(".MediaPreviewComponents_button svg"))).toBe(theme.secondary);
        });

        it("draws a voice message's play button as a white circle with the bubble's blue glyph, as Telegram does, and its waveform and duration in the secondary white", () => {
            const list = render(
                tile(VOICE, { lineClass: "lineMedia" }),
                tile(VOICE, { lineClass: "lineMedia", states: ["stateSelected"] }),
            );
            const [played, rest] = list.querySelectorAll(".mx_Waveform_bar");
            const [play, selectedPlay] = list.querySelectorAll(".PlayPauseButton_button");

            expect(fill(list.querySelector(".line"))).toBe(theme.fill);
            expect(fill(play)).toBe(WHITE);
            expect(color(play.querySelector("svg"))).toBe(theme.fill);
            // A glyph, not text: 3:1 on the circle
            expect(contrast(theme.fill, WHITE)).toBeGreaterThanOrEqual(3);
            // A selected bubble's glyph takes its highlighted blue with it
            expect(fill(selectedPlay)).toBe(WHITE);
            expect(fill(selectedPlay.closest(".line"))).toBe(theme.highlighted);
            expect(color(selectedPlay.querySelector("svg"))).toBe(theme.highlighted);
            expect(fill(played)).toBe(theme.secondary);
            expect(fill(rest)).toBe(tokenColor("--tl-color-separator-bubble-own", list));
            expect(color(list.querySelector(".mx_Clock"))).toBe(theme.secondary);
        });

        it("draws a poll's check, bars and counts in white, and its edited marker in the secondary white", () => {
            const list = render(tile(POLL));
            const radio = list.querySelector("input + div")!;

            expect(fill(radio)).toBe(WHITE);
            expect(color(radio.querySelector("svg"))).toBe(theme.fill);
            expect(fill(list.querySelector(".mx_PollOption_popularityAmount"))).toBe(WHITE);
            expect(channels(fill(list.querySelector(".mx_PollOption_popularityBackground"))).slice(0, 3)).toEqual([
                255, 255, 255,
            ]);
            expect(color(list.querySelector(".mx_PollOption_optionVoteCount"))).toBe(theme.secondary);
            expect(color(list.querySelector(".mx_MPollBody_totalVotes"))).toBe(theme.secondary);
            expect(color(list.querySelector(".mx_MPollBody_edited"))).toBe(theme.secondary);
            expect(getComputedStyle(list.querySelector(".mx_MPollBody_edited")!).opacity).toBe("1");
        });

        it("draws a link preview's card in translucent white with white text, its description included", () => {
            const list = render(tile(PREVIEW));
            const card = list.querySelector(".MediaPreviewTile_tile")!;

            expect(channels(fill(card)).slice(0, 3)).toEqual([255, 255, 255]);
            expect(channels(getComputedStyle(card).borderTopColor).slice(0, 3)).toEqual([255, 255, 255]);
            expect(color(card.querySelector(".MediaPreviewComponents_header"))).toBe(WHITE);
            expect(color(card.querySelector(".MediaPreviewComponents_body"))).toBe(WHITE);
            expect(contrast(WHITE, composite(fill(card), theme.fill))).toBeGreaterThanOrEqual(3);
        });

        it("writes a link preview's linked title in the text's color rather than the browser's link blue: white in your own bubble", async () => {
            const linkedTitle = PREVIEW.replace(
                "Element 1.12",
                `<a href="https://element.io/blog/" target="_blank">Element 1.12</a>`,
            );
            const list = render(tile(linkedTitle), tile(linkedTitle, { own: false }));
            const [own, others] = list.querySelectorAll(".MediaPreviewComponents_header a");

            expect(color(own)).toBe(WHITE);
            expect(color(others)).toBe(tokenColor("--cpd-color-text-primary", list));
            expect(getComputedStyle(own).textDecorationLine).toBe("none");
            await userEvent.hover(own);
            expect(getComputedStyle(own).textDecorationLine).toBe("underline");
        });

        it("sets hidden media's placeholder apart from the bubble in translucent white, with white text, also when hovered", async () => {
            const hidden = `
                <div class="mx_EventTile_content">
                    <div class="mx_ImageBody ImageBodyView_root"><div class="mx_ImageBody_container ImageBodyView_thumbnailContainer" style="width: 240px; aspect-ratio: 3 / 2">
                        <div class="ImageBodyView_mediaContent"><button type="button" class="ImageBodyView_hiddenButton"><div class="ImageBodyView_hiddenButtonContent">Show image</div></button></div>
                    </div></div>
                    <div class="mx_MTextBody mx_EventTile_caption TextualBody_root" data-event-layout="bubble"><div class="mx_EventTile_body" dir="auto">My desk</div></div>
                </div>
            `;
            const list = render(tile(hidden, { lineClass: "lineMedia" }));

            const button = list.querySelector("button")!;
            const rest = fill(button);

            expect(fill(list.querySelector(".line"))).toBe(theme.fill);
            expect(channels(rest).slice(0, 3)).toEqual([255, 255, 255]);
            expect(color(list.querySelector(".ImageBodyView_hiddenButtonContent"))).toBe(WHITE);

            // Hovered, it takes the fainter translucent fill rather than the page's color, which here is the bubble's
            await userEvent.hover(button);
            const hovered = fill(button);
            expect(hovered).toBe(tokenColor("--tl-color-bg-bubble-own-subtle", list));
            expect(channels(hovered)[3]).toBeLessThan(channels(rest)[3]);
        });

        it("marks a search result's matched word in white with the bubble's color, which stays visible on the fill", () => {
            const list = render(tile(plain('Review the <span class="mx_EventTile_searchHighlight">draft</span>')));
            const highlight = list.querySelector(".mx_EventTile_searchHighlight")!;

            expect(fill(highlight)).toBe(WHITE);
            expect(color(highlight)).toBe(theme.fill);
        });

        it("fills a selected bubble, jumped to or right-clicked, and its tail with the highlighted blue", () => {
            const list = render(tile(plain("Jumped to this one"), { states: ["stateSelected"] }));
            const line = list.querySelector(".line")!;

            expect(fill(line)).toBe(theme.highlighted);
            expect(getComputedStyle(line, "::after").backgroundColor).toBe(theme.highlighted);
            expect(contrast(WHITE, theme.highlighted)).toBeGreaterThanOrEqual(theme.minimumContrast >= 7 ? 6.5 : 4.4);
        });

        it("selects text in the bubble with Telegram's selection blue, keeping it white", () => {
            const list = render(tile(plain("Sounds good")));
            const text = list.querySelector(".mx_EventTile_body")!;

            expect(getComputedStyle(text, "::selection").backgroundColor).toBe(theme.textSelection);
            expect(getComputedStyle(text, "::selection").color).toBe(WHITE);
            expect(contrast(WHITE, theme.textSelection)).toBeGreaterThanOrEqual(theme.selectionContrast);
        });

        it("draws formatted tables and rules in translucent white rather than github-markdown-css's colors", () => {
            const list = render(
                tile(formatted("<table><tbody><tr><td>Day</td></tr><tr><td>Night</td></tr></tbody></table><hr>")),
            );
            const separator = tokenColor("--tl-color-separator-bubble-own", list);

            for (const row of list.querySelectorAll("tr")) expect(fill(row)).toBe(TRANSPARENT);
            for (const cell of list.querySelectorAll("td")) {
                expect(color(cell)).toBe(WHITE);
                expect(getComputedStyle(cell).borderTopColor).toBe(separator);
            }
            expect(fill(list.querySelector("hr"))).toBe(separator);
        });

        it("keeps an edit composer's field apart from the bubble, in translucent white", () => {
            const list = render(tile(EDIT_COMPOSER, { states: ["stateEditing"] }));
            const field = list.querySelector(".mx_BasicMessageComposer_input")!;

            expect(channels(fill(field)).slice(0, 3)).toEqual([255, 255, 255]);
            expect(channels(fill(field))[3]).toBeLessThan(0.25);
            expect(color(field)).toBe(WHITE);
            expect(fill(list.querySelector(".mx_AccessibleButton_kind_primary"))).toBe(WHITE);
            expect(color(list.querySelector(".mx_AccessibleButton_kind_primary"))).toBe(theme.fill);
        });

        it("keeps the page's colors in an edit composer's autocomplete and formatting bar, which float over the page", () => {
            const list = render(tile(EDIT_COMPOSER, { states: ["stateEditing"] }));
            const menu = list.querySelector(".mx_Autocomplete")!;
            const bar = list.querySelector(".mx_MessageComposerFormatBar")!;
            const menuFill = fill(menu);

            expect(channels(menuFill)[3] ?? 1).toBe(1);
            expect(menuFill).toBe(tokenColor("--tl-color-bg-floating", list));
            for (const title of menu.querySelectorAll(".mx_Autocomplete_Completion_title")) {
                expect(color(title)).toBe(tokenColor("--cpd-color-text-primary", list));
                expect(contrast(color(title), menuFill)).toBeGreaterThanOrEqual(4.5);
            }
            expect(color(menu.querySelector(".mx_Autocomplete_Completion_description"))).toBe(
                tokenColor("--cpd-color-text-secondary", list),
            );
            expect(getComputedStyle(menu).borderTopColor).toBe(
                tokenColor("--cpd-color-border-interactive-secondary", list),
            );

            expect(fill(bar)).toBe(tokenColor("--cpd-color-bg-canvas-default", list));
            expect(channels(fill(bar))[3] ?? 1).toBe(1);
            expect(color(bar.querySelector("svg"))).toBe(tokenColor("--cpd-color-icon-secondary", list));
        });

        it("writes a spoiler in white, hidden and shown, as a button doesn't take its color from the bubble", () => {
            const spoiler = (shown: boolean): string =>
                `<button type="button" class="mx_EventTile_spoiler${shown ? " visible" : ""}"><span class="mx_EventTile_spoiler_reason">(ending)</span>&nbsp;<span class="mx_EventTile_spoiler_content">the butler</span></button>`;
            const list = render(tile(formatted(`<p>Plot: ${spoiler(false)} and ${spoiler(true)}</p>`)));

            for (const content of list.querySelectorAll(".mx_EventTile_spoiler_content")) {
                expect(color(content)).toBe(WHITE);
            }
        });

        it("keeps the page's colors where there is no bubble: large emoji and their reactions, and an emote", () => {
            const list = render(
                tile(EMOJI, { footer: REACTIONS }),
                tile(plain("waves"), { states: ["stateNoBubble", "stateEmote"], lineClass: "lineEmote" }),
            );
            const [emoji, emote] = list.querySelectorAll(".line");

            expect(fill(emoji)).toBe(TRANSPARENT);
            expect(fill(emoji.querySelector('[data-reaction="own"]'))).toBe(
                tokenColor("--cpd-color-bg-accent-rest", list),
            );
            expect(color(emoji.querySelector('[data-reaction="other"]'))).toBe(
                tokenColor("--cpd-color-text-badge-accent", list),
            );
            expect(fill(emote)).toBe(TRANSPARENT);
            expect(color(emote.querySelector(".mx_EventTile_body"))).toBe(tokenColor("--cpd-color-text-primary", list));
            expect(color(emote.querySelector(".mx_MessageTimestamp"))).toBe(
                tokenColor("--cpd-color-text-secondary", list),
            );
        });

        it("keeps the page's colors in the action bar, which floats outside the bubble", () => {
            const list = render(tile(plain("Hovered"), { actionBar: '<div class="toolbar">Options</div>' }));

            expect(color(list.querySelector(".toolbar"))).toBe(tokenColor("--cpd-color-text-primary", list));
        });

        it("fills your own bubbles in the thread panel too, whose rows put the sender before the line", () => {
            const list = render(`
                <li class="root mx_EventTile layoutBubble shapeThread stateOwnEvent stateLastInSection">
                    <div class="senderDetails"></div>
                    <div class="line mx_EventTile_line">
                        <div class="slotBody">${plain("In the thread")}</div>
                        <div class="slotTimestamp"><a class="mx_MessageTimestamp content">12:48</a>${statusSlot("read")}</div>
                    </div>
                </li>
            `);

            expect(fill(list.querySelector(".line"))).toBe(theme.fill);
            expect(color(list.querySelector(".mx_EventTile_body"))).toBe(WHITE);
            expect(color(list.querySelector(".mx_MessageTimestamp"))).toBe(theme.secondary);
            expect(color(list.querySelector(".MessageStatusView_status svg"))).toBe(theme.secondary);
        });

        it.each(["Group", "Irc"] as const)(
            "keeps the page's colors in the %s layout, which has no bubbles",
            (layout) => {
                const list = render(tile(plain("No bubble here"), { layout }));

                expect(fill(list.querySelector(".line"))).toBe(TRANSPARENT);
                expect(color(list.querySelector(".mx_EventTile_body"))).toBe(
                    tokenColor("--cpd-color-text-primary", list),
                );
                expect(color(list.querySelector(".mx_MessageTimestamp"))).toBe(
                    tokenColor("--cpd-color-text-secondary", list),
                );
            },
        );
    });

    describe.each(CUSTOM_THEMES)("in a custom theme built on $name", (theme) => {
        it("fills your own bubble with Telement's blue rather than the legacy green, which white text wouldn't read on", () => {
            document.body.innerHTML = `
                <ol class="${theme.name} ${theme.compound}" style="width: 880px; margin: 0; padding: 0; list-style: none">
                    ${tile(plain("Sounds good"))}
                </ol>
            `;
            const list = document.querySelector("ol")!;
            const line = list.querySelector(".line")!;

            expect(getComputedStyle(line).backgroundColor).toBe(theme.fill);
            expect(getComputedStyle(line).backgroundColor).toBe(tokenColor("--tl-color-bg-bubble-own", list));
            expect(getComputedStyle(list.querySelector(".mx_EventTile_body")!).color).toBe(WHITE);
            expect(contrast(WHITE, theme.fill)).toBeGreaterThanOrEqual(4);
        });
    });
});
