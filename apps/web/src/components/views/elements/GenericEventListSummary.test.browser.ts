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
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

import fontSizes from "../../../../res/css/_font-sizes.pcss?raw";
import accessibleButtonStyles from "../../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import summaryStyles from "../../../../res/css/views/elements/_GenericEventListSummary.pcss?raw";
import ircLayoutStyles from "../../../../res/css/views/rooms/_IRCLayout.pcss?raw";

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

/** The DOM GenericEventListSummary renders, collapsed or expanded. */
function summary(layout: string, expanded: boolean, text: string): string {
    const toggle =
        `<div aria-expanded="${expanded}" role="button" tabindex="0" class="mx_AccessibleButton ` +
        `mx_GenericEventListSummary_toggle mx_AccessibleButton_hasKind mx_AccessibleButton_kind_link_inline">` +
        `${expanded ? "Collapse" : "Expand"}</div>`;
    const body = expanded
        ? `<div class="mx_GenericEventListSummary_spacer">&nbsp;</div><ol class="mx_GenericEventListSummary_unstyledList"></ol>`
        : `<div class="mx_EventTile_line"><div class="mx_EventTile_info">` +
          `<span class="mx_GenericEventListSummary_avatars">${avatars}</span>` +
          `<span class="mx_TextualEvent mx_GenericEventListSummary_summary"><span>${text}</span></span>` +
          `</div></div>`;
    return `<li class="mx_GenericEventListSummary" data-expanded="${expanded}" data-layout="${layout}">${toggle}${body}</li>`;
}

/**
 * The timeline list, without markers as in the app, in each layout's container, and the height of a line of a
 * collapsed summary there: as when the summary was inline text, the timeline's own line if it is taller than the
 * summary text's 19.5px line, as the 22.5px body text line is in the modern and bubble layouts.
 */
const layouts: Record<string, { wrap: (list: string) => string; lineHeight: number }> = {
    modern: { wrap: (list) => timeline("", list.replaceAll("LAYOUT", "group")), lineHeight: 22.5 },
    compact: {
        wrap: (list) => timeline("mx_MatrixChat_useCompactLayout", list.replaceAll("LAYOUT", "group")),
        lineHeight: 19.5,
    },
    bubble: { wrap: (list) => timeline("", list.replaceAll("LAYOUT", "bubble")), lineHeight: 22.5 },
    IRC: { wrap: (list) => timeline("mx_IRCLayout", list.replaceAll("LAYOUT", "irc")), lineHeight: 19.5 },
};

function timeline(className: string, list: string): string {
    return (
        `<div class="mx_RoomView ${className}">` +
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

let stylesheet: HTMLStyleElement;

describe("GenericEventListSummary styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, app-web;
            @layer compound-tokens { ${compoundTokens} }
            @layer compound-web { ${compoundStyles} }
            @layer app-web {
                /* What _common.pcss and _RoomView.pcss set around the timeline */
                body { font: var(--cpd-font-body-md-regular); }
                .mx_RoomView { word-wrap: break-word; }
                ${toBrowserCss(accessibleButtonStyles)}
                ${toBrowserCss(ircLayoutStyles)}
                ${toBrowserCss(summaryStyles)}
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

    describe.each(Object.entries(layouts))("in the %s layout", (_, { wrap, lineHeight }) => {
        it.each([
            ["one line", SHORT_SUMMARY, false],
            ["several lines", LONG_SUMMARY, true],
        ])("centres the avatars and the toggle on the first line of a summary on %s", async (_, text, wraps) => {
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
            expect(centre(firstGlyph(toggle))).toBeCloseTo(centre(firstGlyph(summaryText)), 1);
        });

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
    });
});
