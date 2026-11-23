/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar } from "@vector-im/compound-web";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

import fontSizes from "../../../../res/css/_font-sizes.pcss?raw";
import accessibleButtonStyles from "../../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import summaryStyles from "../../../../res/css/views/elements/_GenericEventListSummary.pcss?raw";
import ircLayoutStyles from "../../../../res/css/views/rooms/_IRCLayout.pcss?raw";
import eventBubbleTileStyles from "../../../../res/css/views/rooms/_EventBubbleTile.pcss?raw";
import { tokenColor } from "../../../test/telement/computedStyle";

const fontSizeVariables = new Map(
    [...fontSizes.matchAll(/^\$(font-[\w-]+):\s*([^;]+);/gm)].map(([, name, value]) => [name, value]),
);

/** Substitutes the font size variables, the only ones these stylesheets need to lay out; the browser does the nesting. */
function toBrowserCss(pcss: string): string {
    return pcss.replace(/\$(font-[\w-]+)/g, (variable, name: string) => fontSizeVariables.get(name) ?? variable);
}

const PICTURE =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14'%3E%3Crect width='14' height='14'/%3E%3C/svg%3E";

// Avatars with and without a picture, as MemberAvatar renders them
const avatars = [{ name: "Alice" }, { name: "Bob", src: PICTURE }, { name: "Carol" }]
    .map(({ name, src }) =>
        renderToStaticMarkup(
            createElement(Avatar, {
                id: `@${name.toLowerCase()}:example.org`,
                name,
                src,
                size: "14px",
                type: "round",
                className: "mx_BaseAvatar",
            }),
        ),
    )
    .join("");

const SHORT_SUMMARY = "Alice and 2 others joined";
const LONG_SUMMARY =
    "Alice, Bob, Carol, Dave, Eve, Frank, Grace, Heidi, Ivan, Judy, Mallory, Niaj, Olivia, Peggy and 18 others " +
    "joined and left 3 times, changed their names and changed their profile pictures";
const UNBREAKABLE_SUMMARY = "@whatsapp_491512345678901234:matrix.bridged-network.example.org and 2 others joined";

/**
 * The DOM GenericEventListSummary renders, collapsed or expanded. A collapsed summary in bubbles ends its text with its
 * toggle, a span there, which {@link toggleAfterText} moves into place once the layout is known.
 */
function summary(layout: string, expanded: boolean, text: string): string {
    const toggle =
        `<div aria-expanded="${expanded}" role="button" tabindex="0" class="mx_AccessibleButton ` +
        `mx_GenericEventListSummary_toggle mx_AccessibleButton_hasKind mx_AccessibleButton_kind_link">` +
        `${expanded ? "Collapse" : "Expand"}</div>`;
    const body = expanded
        ? `<div class="mx_GenericEventListSummary_spacer">&nbsp;</div><ol class="mx_GenericEventListSummary_unstyledList"></ol>`
        : `<div class="mx_EventTile_line"><div class="mx_EventTile_info">` +
          `<span class="mx_GenericEventListSummary_avatars">${avatars}</span>` +
          `<span class="mx_TextualEvent mx_GenericEventListSummary_summary"><span>${text}</span><!--toggle--></span>` +
          `</div></div>`;
    return `<li class="mx_GenericEventListSummary" data-expanded="${expanded}" data-layout="${layout}"><!--start-->${toggle}<!--/start-->${body}</li>`;
}

/** Moves the toggle of each collapsed summary to the end of its text, as a span, as the bubble layout renders it. */
function toggleAfterText(list: string): string {
    return list.replace(/<!--start-->(.*?)<!--\/start-->(.*?)<!--toggle-->/gs, (_, toggle: string, between: string) =>
        between.concat(toggle.replace(/^<div/, "<span").replace(/<\/div>$/, "</span>")),
    );
}

/**
 * The timeline list, without markers as in the app, in each layout's container, and the height of a line of a
 * collapsed summary there: as when the summary was inline text, the timeline's own line if it is taller than the
 * summary text's 19.5px line, as the 22.5px body text line is in the modern and bubble layouts.
 */
const layouts: Record<string, { wrap: (list: string) => string; lineHeight: number; toggleEndsText: boolean }> = {
    modern: {
        wrap: (list) => timeline("", list.replaceAll("LAYOUT", "group")),
        lineHeight: 22.5,
        toggleEndsText: false,
    },
    compact: {
        wrap: (list) => timeline("mx_MatrixChat_useCompactLayout", list.replaceAll("LAYOUT", "group")),
        lineHeight: 19.5,
        toggleEndsText: false,
    },
    bubble: {
        wrap: (list) => timeline("", toggleAfterText(list.replaceAll("LAYOUT", "bubble")), "bubble"),
        lineHeight: 22.5,
        toggleEndsText: true,
    },
    IRC: {
        wrap: (list) => timeline("mx_IRCLayout", list.replaceAll("LAYOUT", "irc")),
        lineHeight: 19.5,
        toggleEndsText: false,
    },
};

function timeline(className: string, list: string, layout = "group"): string {
    return (
        `<div class="mx_RoomView mx_RoomView_body ${className}" data-layout="${layout}">` +
        `<ol class="mx_RoomView_MessageList" style="list-style: none">${list}</ol></div>`
    );
}

function centre(rect: DOMRect): number {
    return rect.top + rect.height / 2;
}

/** The box of the first character of an element's text, which is where its first line's glyphs sit. */
function firstGlyph(element: Element): DOMRect {
    const range = document.createRange();
    const text = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode()!;
    range.setStart(text, 0);
    range.setEnd(text, 1);
    return range.getBoundingClientRect();
}

/** The box of the last character of an element's first text, the summary's own words before its toggle. */
function lastGlyph(element: Element): DOMRect {
    const range = document.createRange();
    const text = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode()!;
    range.setStart(text, text.textContent!.length - 1);
    range.setEnd(text, text.textContent!.length);
    return range.getBoundingClientRect();
}

let stylesheet: HTMLStyleElement;

describe("GenericEventListSummary styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, app-web;
            @layer compound-tokens { ${compoundTokens} ${compoundSemantic} ${compoundLightTheme} }
            @layer compound-web { ${compoundStyles} }
            @layer app-web {
                /* What _common.pcss and _RoomView.pcss set around the timeline */
                body { font: var(--cpd-font-body-md-regular); }
                .mx_RoomView { word-wrap: break-word; }
                ${toBrowserCss(accessibleButtonStyles)}
                ${toBrowserCss(ircLayoutStyles)}
                ${toBrowserCss(summaryStyles)}
                ${toBrowserCss(eventBubbleTileStyles)}
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

    describe.each(Object.entries(layouts))("in the %s layout", (_, { wrap, lineHeight, toggleEndsText }) => {
        it.each([
            ["one line", SHORT_SUMMARY, false],
            ["several lines", LONG_SUMMARY, true],
        ])(
            "centres the avatars on the first line of a summary on %s, and the toggle on its line",
            async (_, text, wraps) => {
                document.body.innerHTML = `<div style="width: 600px">${wrap(summary("LAYOUT", false, text))}</div>`;
                await Promise.all([...document.images].map((image) => image.decode()));

                const summaryText = document.querySelector(".mx_GenericEventListSummary_summary")!;
                const lineHeight = parseFloat(getComputedStyle(summaryText).lineHeight);
                const firstLineCentre = summaryText.getBoundingClientRect().top + lineHeight / 2;
                expect(summaryText.getBoundingClientRect().height > lineHeight).toBe(wraps);

                const avatarCentres = [...document.querySelectorAll(".mx_BaseAvatar")].map((avatar) =>
                    centre(avatar.getBoundingClientRect()),
                );
                expect(avatarCentres).toHaveLength(3);
                for (const avatarCentre of avatarCentres) expect(avatarCentre).toBeCloseTo(firstLineCentre, 1);

                const toggle = document.querySelector(".mx_GenericEventListSummary_toggle")!;
                const toggleLine = toggleEndsText ? lastGlyph(summaryText) : firstGlyph(summaryText);
                expect(centre(firstGlyph(toggle))).toBeCloseTo(centre(toggleLine), 1);
            },
        );

        it("keeps the height of the line the summary had as inline text", () => {
            document.body.innerHTML = wrap(summary("LAYOUT", false, SHORT_SUMMARY));
            const summaryText = document.querySelector(".mx_GenericEventListSummary_summary")!;
            const toggle = document.querySelector(".mx_GenericEventListSummary_toggle")!;

            expect(document.querySelector(".mx_GenericEventListSummary")!.getBoundingClientRect().height).toBeCloseTo(
                lineHeight,
                1,
            );
            expect(parseFloat(getComputedStyle(summaryText).lineHeight)).toBeCloseTo(lineHeight, 1);
            expect(parseFloat(getComputedStyle(toggle).lineHeight)).toBeCloseTo(lineHeight, 1);
        });

        it("wraps a long name without spaces inside the timeline", () => {
            document.body.innerHTML = `<div style="width: 320px">${wrap(summary("LAYOUT", false, UNBREAKABLE_SUMMARY))}</div>`;
            const timelineEdge = document.body.firstElementChild!.getBoundingClientRect().right;
            const summaryText = document.querySelector(".mx_GenericEventListSummary_summary")!;
            const info = document.querySelector(".mx_EventTile_info")!;

            expect(summaryText.getBoundingClientRect().right).toBeLessThanOrEqual(timelineEdge);
            expect(info.scrollWidth).toBeLessThanOrEqual(info.clientWidth);
        });

        it("keeps the toggle's size when the summary is expanded", () => {
            document.body.innerHTML = wrap(summary("LAYOUT", false, SHORT_SUMMARY) + summary("LAYOUT", true, ""));
            const [expand, collapse] = document.querySelectorAll(".mx_GenericEventListSummary_toggle");

            expect(getComputedStyle(collapse).font).toBe(getComputedStyle(expand).font);
        });

        it("labels the toggle in sentence case, as a text button without an underline", () => {
            document.body.innerHTML = wrap(summary("LAYOUT", false, SHORT_SUMMARY) + summary("LAYOUT", true, ""));

            for (const toggle of document.querySelectorAll(".mx_GenericEventListSummary_toggle")) {
                const style = getComputedStyle(toggle);
                expect(style.textTransform).toBe("none");
                expect(style.textDecorationLine).toBe("none");
            }
        });
    });

    describe("in bubbles", () => {
        const { wrap } = layouts.bubble;

        it.each([
            { lines: "one line", text: SHORT_SUMMARY, dir: "ltr" },
            { lines: "several lines", text: LONG_SUMMARY, dir: "ltr" },
            { lines: "one line", text: "אליס ועוד 2 הצטרפו", dir: "rtl" },
        ])(
            "follows a summary on $lines with Expand 8px after its text, where an informational row has its time ($dir)",
            ({ text, dir }) => {
                document.body.innerHTML = `<div dir="${dir}" style="width: 600px">${wrap(summary("LAYOUT", false, text))}</div>`;
                const summaryText = document.querySelector(".mx_GenericEventListSummary_summary")!;
                const words = lastGlyph(summaryText);
                const toggle = document.querySelector(".mx_GenericEventListSummary_toggle")!.getBoundingClientRect();

                expect(dir === "ltr" ? toggle.left - words.right : words.left - toggle.right).toBeCloseTo(8, 0);
            },
        );

        it("draws Expand and Collapse in 13px accent", () => {
            document.body.innerHTML = wrap(summary("LAYOUT", false, SHORT_SUMMARY) + summary("LAYOUT", true, ""));

            for (const toggle of document.querySelectorAll(".mx_GenericEventListSummary_toggle")) {
                const style = getComputedStyle(toggle);
                expect(style.fontSize).toBe("13px");
                expect(style.color).toBe(tokenColor("--cpd-color-text-action-accent", toggle));
            }
        });

        it("starts Collapse on the bubble column, where the expanded rows' avatars start", () => {
            document.body.innerHTML = wrap(summary("LAYOUT", true, ""));
            const list = document.querySelector(".mx_RoomView_MessageList")!;
            const contentStart = list.getBoundingClientRect().left + parseFloat(getComputedStyle(list).paddingLeft);
            const toggle = document.querySelector(".mx_GenericEventListSummary_toggle")!.getBoundingClientRect();

            expect(toggle.left - contentStart).toBe(40);
        });
    });
});
