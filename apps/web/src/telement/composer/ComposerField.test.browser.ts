/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../../res/css/_common.pcss?raw";
import fontSizes from "../../../res/css/_font-sizes.pcss?raw";
import basicMessageComposerStyles from "../../../res/css/views/rooms/_BasicMessageComposer.pcss?raw";
import sendMessageComposerStyles from "../../../res/css/views/rooms/_SendMessageComposer.pcss?raw";
import sendWysiwygComposerStyles from "../../../res/css/views/rooms/wysiwyg_composer/_SendWysiwygComposer.pcss?raw";
import editorStyles from "../../../res/css/views/rooms/wysiwyg_composer/components/_Editor.pcss?raw";
import formattingButtonsStyles from "../../../res/css/views/rooms/wysiwyg_composer/components/_FormattingButtons.pcss?raw";
import lightTheme from "../../../res/themes/light/css/_light.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../test/telement/browserCss";

const PLACEHOLDER = "Send a message…";

/** Drafts as the rich-text editor holds them, without whitespace between tags, which its pre-wrap would show. */
const RICH_TEXT_DRAFTS = [
    { name: "the placeholder", html: "<br>", lines: 1 },
    { name: "one line", html: "See you at the standup", lines: 1 },
    { name: "a quote", html: "<blockquote><p>Are you coming to the office tomorrow?</p></blockquote>", lines: 1 },
    { name: "three lines", html: "<p>Morning!</p><p>The draft wraps</p><p>onto three lines.</p>", lines: 3 },
    {
        name: "a quote and a line",
        html: "<blockquote><p>Are you coming to the office tomorrow?</p></blockquote><p>Yes, from ten.</p>",
        lines: 2,
    },
];

/** SendWysiwygComposer's field, as Editor renders it, with or without the formatting buttons above it. */
function renderRichTextField(html: string, { toolbar = false, dir = "ltr" } = {}): void {
    const placeholder = html === "<br>" ? " mx_WysiwygComposer_Editor_content_placeholder" : "";
    document.body.innerHTML = `
        <div class="mx_SendWysiwygComposer cpd-theme-light" dir="${dir}" style="width: 480px">
            ${
                toolbar
                    ? `<div class="mx_FormattingButtons">
                        <button class="mx_FormattingButtons_Button" aria-label="Bold"><svg class="mx_FormattingButtons_Icon"></svg></button>
                        <button class="mx_FormattingButtons_Button" aria-label="Italic"><svg class="mx_FormattingButtons_Icon"></svg></button>
                    </div>`
                    : ""
            }
            <div class="mx_WysiwygComposer_Editor">
                <div class="mx_WysiwygComposer_Editor_container">
                    <div
                        class="mx_WysiwygComposer_Editor_content${placeholder}"
                        style='--placeholder: "${PLACEHOLDER}"'
                        contenteditable="true"
                        role="textbox"
                        dir="auto"
                    >${html}</div>
                </div>
            </div>
        </div>
    `;
}

/** SendMessageComposer's field, with the placeholder when the draft is empty. */
function renderPlainField(lines: string[]): void {
    const empty = lines.length === 0;
    document.body.innerHTML = `
        <div class="mx_SendMessageComposer" style="width: 480px">
            <div class="mx_BasicMessageComposer">
                <div
                    class="mx_BasicMessageComposer_input${empty ? " mx_BasicMessageComposer_inputEmpty" : ""}"
                    style="--placeholder: '${PLACEHOLDER.replaceAll(" ", "\\ ")}'"
                    contenteditable="true"
                    role="textbox"
                ><div>${empty ? "<br>" : lines.join("<br>")}</div></div>
            </div>
        </div>
    `;
}

function element(selector: string): HTMLElement {
    return document.querySelector<HTMLElement>(selector)!;
}

/** The space between the inside of `field`'s border and `content`'s box, on each side. */
function insets(field: HTMLElement, content: HTMLElement): { top: number; bottom: number; start: number; end: number } {
    const outer = field.getBoundingClientRect();
    const style = getComputedStyle(field);
    const inner = content.getBoundingClientRect();
    const rtl = style.direction === "rtl";
    const left = inner.left - outer.left - parseFloat(style.borderLeftWidth);
    const right = outer.right - parseFloat(style.borderRightWidth) - inner.right;
    return {
        top: inner.top - outer.top - parseFloat(style.borderTopWidth),
        bottom: outer.bottom - parseFloat(style.borderBottomWidth) - inner.bottom,
        start: rtl ? right : left,
        end: rtl ? left : right,
    };
}

let stylesheet: HTMLStyleElement;

describe("Composer text field", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            ${compoundBase}
            ${compoundSemantic}
            ${compoundLightTheme}
            ${telementTokens}
            ${toBrowserCss(sendWysiwygComposerStyles, fontSizes, lightTheme)}
            ${toBrowserCss(editorStyles, commonStyles, fontSizes, lightTheme)}
            ${toBrowserCss(formattingButtonsStyles, lightTheme)}
            ${toBrowserCss(sendMessageComposerStyles, fontSizes)}
            ${toBrowserCss(basicMessageComposerStyles, fontSizes, lightTheme)}
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    describe("rich-text", () => {
        it.each(RICH_TEXT_DRAFTS)("pads $name evenly: 6px above and below, 12px at either end", ({ html, lines }) => {
            renderRichTextField(html);
            const content = element(".mx_WysiwygComposer_Editor_content");

            expect(content.getBoundingClientRect().height).toBe(22 * lines);
            expect(insets(element(".mx_WysiwygComposer_Editor"), content)).toEqual({
                top: 6,
                bottom: 6,
                start: 12,
                end: 12,
            });
        });

        it.each(RICH_TEXT_DRAFTS.filter(({ lines }) => lines === 1))(
            "is a pill as tall as the composer's buttons with $name",
            ({ html }) => {
                renderRichTextField(html);
                const field = element(".mx_WysiwygComposer_Editor");

                expect(field.getBoundingClientRect().height).toBe(36);
                expect(cornerRadii(field)).toEqual({ x: 18, y: 18 });
            },
        );

        it.each(RICH_TEXT_DRAFTS.filter(({ lines }) => lines > 1))(
            "keeps the one-line pill's corners with $name",
            ({ html, lines }) => {
                renderRichTextField(html);
                const field = element(".mx_WysiwygComposer_Editor");

                expect(field.getBoundingClientRect().height).toBe(14 + 22 * lines);
                expect(cornerRadii(field)).toEqual({ x: 18, y: 18 });
            },
        );

        it("sets a quote's line where the text starts, as far inside the top border as the last line is above the bottom one", () => {
            renderRichTextField(RICH_TEXT_DRAFTS[4].html);
            const field = element(".mx_WysiwygComposer_Editor");
            const quote = element("blockquote");
            const line = getComputedStyle(quote, "::before");

            expect(insets(field, quote)).toMatchObject({ top: 6, start: 12 });
            expect(insets(field, element(".mx_WysiwygComposer_Editor_content > p"))).toMatchObject({ bottom: 6 });
            expect([line.top, line.left]).toEqual(["0px", "0px"]);
            expect(parseFloat(line.height)).toBe(22);
        });

        it("draws a code block as it looks once sent: 4px corners, its text 12px inside its edge", () => {
            renderRichTextField("<pre><code>pnpm install\npnpm run build</code></pre><p>Then reload the page.</p>");
            const block = element(".mx_WysiwygComposer_Editor_content > pre");
            const style = getComputedStyle(block);
            const inset = (side: string): number =>
                parseFloat(style.getPropertyValue(`border-${side}-width`)) +
                parseFloat(style.getPropertyValue(`padding-${side}`));

            expect(cornerRadii(block)).toEqual({ x: 4, y: 4 });
            expect(["top", "right", "bottom", "left"].map(inset)).toEqual([12, 12, 12, 12]);
            expect(insets(element(".mx_WysiwygComposer_Editor"), block)).toMatchObject({ top: 6, start: 12, end: 12 });
        });

        it("keeps the same padding with the formatting buttons shown", () => {
            renderRichTextField(RICH_TEXT_DRAFTS[1].html, { toolbar: true });
            const field = element(".mx_WysiwygComposer_Editor");

            expect(field.getBoundingClientRect().height).toBe(36);
            expect(insets(field, element(".mx_WysiwygComposer_Editor_content"))).toEqual({
                top: 6,
                bottom: 6,
                start: 12,
                end: 12,
            });
        });

        it.each(["ltr", "rtl"])("starts the formatting buttons in line with the field, %s", (dir) => {
            renderRichTextField(RICH_TEXT_DRAFTS[1].html, { toolbar: true, dir });
            const field = element(".mx_WysiwygComposer_Editor").getBoundingClientRect();
            const bold = element(".mx_FormattingButtons_Button").getBoundingClientRect();

            expect(dir === "rtl" ? field.right - bold.right : bold.left - field.left).toBe(0);
        });
    });

    describe("plain", () => {
        it.each([
            ["the placeholder", []],
            ["one line", ["See you at the standup"]],
            ["three lines", ["Morning!", "The draft wraps", "onto three lines."]],
        ])("centers %s with 16px above and below", (_, lines) => {
            renderPlainField(lines);
            const input = element(".mx_BasicMessageComposer_input");
            const text = element(".mx_BasicMessageComposer_input > div");

            expect(text.getBoundingClientRect().height).toBe(18 * Math.max(lines.length, 1));
            expect(insets(input, text)).toMatchObject({ top: 16, bottom: 16 });
        });
    });
});
