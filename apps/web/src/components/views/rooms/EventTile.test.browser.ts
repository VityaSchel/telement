/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import githubMarkdown from "github-markdown-css/github-markdown-light.css?raw";

// The package's built bundle needs Node's `process`, so EventTileView's DOM is written out below and its stylesheet is
// loaded from source, with its local class names
// eslint-disable-next-line no-restricted-imports
import eventTileViewStyles from "../../../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import messageTimestampViewStyles from "../../../../../../packages/shared-components/src/room/timeline/event-tile/timestamp/MessageTimestampView/MessageTimestampView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import fontSizes from "../../../../res/css/_font-sizes.pcss?raw";
import eventTileStyles from "../../../../res/css/views/rooms/_EventTile.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../../test/telement/browserCss";

const plain = (html: string): string => `<div class="mx_EventTile_body translate" dir="auto">${html}</div>`;
const formatted = (html: string): string =>
    `<div class="mx_EventTile_body markdown-body translate" dir="auto">${html}</div>`;
/** A code block as CodeBlock renders it in place of the message's `pre`. */
const codeBlock = (code: string): string =>
    `<div class="mx_EventTile_pre_container"><pre class="mx_EventTile_collapsedCodeBlock"><code>${code}\n</code></pre></div>`;

/** A bubble as EventTileView renders it in the room timeline, with TextualBody's content as its body. */
function bubble(body: string, { media = "" } = {}): string {
    const line = media ? "line mx_EventTile_line lineMedia" : "line mx_EventTile_line";
    const content = media
        ? `<div class="mx_EventTile_content">${media}<div class="mx_MTextBody mx_EventTile_caption">${body}</div></div>`
        : `<div class="mx_MTextBody mx_EventTile_content">${body}</div>`;
    return `
        <li class="root mx_EventTile stateLastInSection layoutBubble" data-testid="event-tile">
            <div data-testid="event-tile-line" class="${line}">
                <div data-testid="event-tile-slot-timestamp" class="slotTimestamp">
                    <a class="mx_MessageTimestamp content">12:55</a>
                </div>
                <div data-testid="event-tile-slot-body" class="slotBody">${content}</div>
            </div>
        </li>
    `;
}

function render(...bubbles: string[]): void {
    document.body.innerHTML = `
        <ol class="cpd-theme-light" style="width: 600px; margin: 0; padding: 0; list-style: none">${bubbles.join("")}</ol>
    `;
}

/** The boxes of the text in the bubble's body, one per line of each text node. */
function textBoxes(tile: Element): DOMRect[] {
    const boxes: DOMRect[] = [];
    const walker = document.createTreeWalker(
        tile.querySelector('[data-testid="event-tile-slot-body"]')!,
        NodeFilter.SHOW_TEXT,
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        boxes.push(...Array.from(range.getClientRects()).filter((box) => box.width > 0));
    }
    return boxes;
}

function timestamp(tile: Element): DOMRect {
    return tile.querySelector('[data-testid="event-tile-slot-timestamp"] > *')!.getBoundingClientRect();
}

function overlaps(a: DOMRect, b: DOMRect): boolean {
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function tiles(): Element[] {
    return Array.from(document.querySelectorAll('[data-testid="event-tile"]'));
}

let stylesheet: HTMLStyleElement;

describe("EventTile bubble timestamps", () => {
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
            }
            @layer app-web {
                ${githubMarkdown}
                ${toBrowserCss(eventTileStyles, fontSizes, lightTheme)}
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

    it.each([
        ["formatted text with inline code", formatted("Thanks, <code>pnpm i18n</code> did it.")],
        ["formatted text", formatted("Use <strong>bold</strong>")],
        ["plain text", plain("Thanks, pnpm i18n did it.")],
    ])("puts the timestamp of a one-line bubble of %s beside the text", (_name, body) => {
        render(bubble(body));
        const [tile] = tiles();
        const text = textBoxes(tile);
        const time = timestamp(tile);
        const line = text[0];

        expect(text.every((box) => box.top < line.bottom && box.bottom > line.top)).toBe(true);
        expect(text.some((box) => overlaps(box, time))).toBe(false);
        expect(time.left).toBeGreaterThanOrEqual(Math.max(...text.map((box) => box.right)));
        expect(time.top).toBeLessThan(line.bottom);
        expect(time.bottom).toBeGreaterThan(line.top);
    });

    it.each([
        [
            "wrapped formatted text",
            formatted(
                "Run <code>pnpm i18n</code> after you change a string, then format the files with " +
                    "<code>pnpm lint:fmt:fix</code> and check the types.<br>Thanks!",
            ),
        ],
        [
            "formatted text that ends in a paragraph",
            formatted(
                "<p>First paragraph with <em>emphasis</em> and a sentence long enough to wrap onto the next line.</p>\n" +
                    "<p>Second paragraph.</p>\n",
            ),
        ],
        ["a quote and a reply", formatted("<blockquote>\n<p>Are you coming?</p>\n</blockquote>\n<p>Yes</p>\n")],
    ])("keeps the timestamp on the last line of %s", (_name, body) => {
        render(bubble(body));
        const [tile] = tiles();
        const text = textBoxes(tile);
        const time = timestamp(tile);
        const lastLine = text.reduce((last, box) => (box.bottom > last.bottom ? box : last));

        expect(new Set(text.map((box) => Math.round(box.bottom))).size).toBeGreaterThan(1);
        expect(text.some((box) => overlaps(box, time))).toBe(false);
        expect(time.top).toBeLessThan(lastLine.bottom);
        expect(time.bottom).toBeGreaterThan(lastLine.top);
    });

    it("moves the timestamp below a final paragraph whose last line is full", () => {
        // A box as wide as the paragraph stands in for a line of text that leaves no room beside it
        const fullLine = '<span class="fullLine" style="display: inline-block; width: 100%; height: 1em"></span>';
        render(bubble(formatted(`<p>First paragraph.</p>\n<p>Second ${fullLine}</p>\n`)));
        const [tile] = tiles();
        const time = timestamp(tile);

        expect(overlaps(tile.querySelector(".fullLine")!.getBoundingClientRect(), time)).toBe(false);
        expect(textBoxes(tile).some((box) => overlaps(box, time))).toBe(false);
    });

    it("puts the timestamp of a bubble that ends in a code block in the block's bottom margin", () => {
        render(bubble(formatted(`<p>Run:</p>\n${codeBlock("pnpm i18n")}\n`)));
        const [tile] = tiles();
        const line = tile.querySelector('[data-testid="event-tile-line"]')!;
        const pre = tile.querySelector("pre")!;
        const content = tile.querySelector(".mx_EventTile_content")!;
        const preBox = pre.getBoundingClientRect();

        expect(timestamp(tile).top).toBeGreaterThanOrEqual(preBox.bottom);
        // Below the block: only its margin, the body's padding and the bubble's, with no row added for the time
        expect(line.getBoundingClientRect().bottom - preBox.bottom).toBeCloseTo(
            parseFloat(getComputedStyle(pre).marginBottom) +
                parseFloat(getComputedStyle(content).paddingBottom) +
                parseFloat(getComputedStyle(line).paddingBottom),
            1,
        );
    });

    it("keeps the timestamp clear of formatted text that ends in a list", () => {
        render(bubble(formatted("<ul>\n<li>one</li>\n<li>two</li>\n</ul>\n")));
        const [tile] = tiles();

        expect(textBoxes(tile).some((box) => overlaps(box, timestamp(tile)))).toBe(false);
    });

    it("keeps the timestamp clear of a formatted caption whose last line is full", () => {
        const picture = '<div style="width: 240px; height: 120px"></div>';
        // A box as wide as the caption stands in for a line of text that leaves no room beside it
        const fullLine = '<span class="fullLine" style="display: inline-block; width: 100%; height: 1em"></span>';
        render(
            bubble(formatted(`The <em>view</em> ${fullLine}`), { media: picture }),
            bubble(plain(`The view ${fullLine}`), { media: picture }),
        );
        const [formattedTile, plainTile] = tiles();
        const fullLineOf = (tile: Element): DOMRect => tile.querySelector(".fullLine")!.getBoundingClientRect();

        expect(overlaps(fullLineOf(formattedTile), timestamp(formattedTile))).toBe(false);
        expect(formattedTile.getBoundingClientRect().height).toBe(plainTile.getBoundingClientRect().height);
    });

    it("keeps the timestamp on the last line of a formatted caption that ends in a paragraph", () => {
        render(
            bubble(formatted("<p>The <em>view</em> from the office.</p>\n<p>Monday.</p>\n"), {
                media: '<div style="width: 240px; height: 120px"></div>',
            }),
        );
        const [tile] = tiles();
        const text = textBoxes(tile);
        const time = timestamp(tile);
        const lastLine = text.reduce((last, box) => (box.bottom > last.bottom ? box : last));
        // A caption has no padding below, so a time on a row of its own still reaches into the last line's box
        const timeMiddle = (time.top + time.bottom) / 2;

        expect(text.some((box) => overlaps(box, time))).toBe(false);
        expect(timeMiddle).toBeGreaterThan(lastLine.top);
        expect(timeMiddle).toBeLessThan(lastLine.bottom);
    });

    it("puts the timestamp below a code block that ends a caption, which has no padding to hold it", () => {
        render(
            bubble(formatted(`<p>Run:</p>\n${codeBlock("pnpm i18n")}\n`), {
                media: '<div style="width: 240px; height: 120px"></div>',
            }),
        );
        const [tile] = tiles();

        expect(timestamp(tile).top).toBeGreaterThanOrEqual(tile.querySelector("pre")!.getBoundingClientRect().bottom);
    });
});
