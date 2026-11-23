/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IconButton } from "@vector-im/compound-web";
import { CopyIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import githubMarkdown from "github-markdown-css/github-markdown-light.css?raw";

// The package's built bundle needs Node's `process`, so the bubble is written out below and its stylesheet is loaded
// from source, with its local class names
// eslint-disable-next-line no-restricted-imports
import eventTileViewStyles from "../../../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import replyTileStyles from "../../../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/ReplyTileView/ReplyTileView.module.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../../../res/css/_common.pcss?raw";
import fontSizes from "../../../../res/css/_font-sizes.pcss?raw";
import accessibleButtonStyles from "../../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import eventTileStyles from "../../../../res/css/views/rooms/_EventTile.pcss?raw";
import editorStyles from "../../../../res/css/views/rooms/wysiwyg_composer/components/_Editor.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../../test/telement/browserCss";
import { tokenColor } from "../../../test/telement/computedStyle";
import { loadFiraCode, loadInter } from "../../../test/telement/fonts";

const CODE_LINES = ["pnpm i18n", "pnpm lint:fmt:fix"];

/** The block as a whole, its header line and its code, which owns its fill and corners. */
const BLOCK = ".mx_EventTile_pre_container";

/** CopyTextButton: a Compound IconButton with the code block's button classes. */
const COPY_BUTTON = renderToStaticMarkup(
    createElement(
        IconButton,
        { className: "mx_EventTile_button mx_EventTile_copyButton", size: "28px", style: { padding: "4px" } },
        createElement(CopyIcon),
    ),
);

/**
 * The block CodeBlock renders in place of a message's `pre`: its header line, with the language the fence names and
 * the expand and copy buttons, over the code with its line numbers.
 */
function codeBlock(lines = CODE_LINES, language = "sh"): string {
    const numbers = lines.map((_, i) => `<span>${i + 1}</span>`).join("");
    return `
        <div class="mx_EventTile_pre_container">
            <div class="mx_EventTile_codeBlockHeader">${language ? `<span class="mx_EventTile_codeBlockLanguage">${language}</span>` : ""}<button class="mx_AccessibleButton mx_EventTile_button" aria-label="Expand"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" /></svg></button>${COPY_BUTTON}</div>
            <pre class="mx_EventTile_collapsedCodeBlock"><span class="mx_EventTile_lineNumbers" data-event-tile-line-numbers="true">${numbers}</span><div style="display: contents"><code class="language-${language}">${lines.join("\n")}
</code></div></pre>
        </div>
    `;
}

/** A CSS module's stylesheet with its class names prefixed by the module's name, so that two modules' `.root`s differ. */
function moduleStyles(css: string, name: string): string {
    return css.replace(
        /:global\(([^)]*)\)|\.(?=[a-z_])([\w-]+)/gi,
        (_, global, local) => global ?? `.${name}_${local}`,
    );
}

/** A formatted message as TextualBody renders it. */
const formatted = (html: string): string =>
    `<div class="mx_EventTile_content"><div class="mx_EventTile_body markdown-body" dir="auto">${html}</div></div>`;

const MESSAGE = formatted(`<p>Run <code>pnpm i18n</code> first:</p>${codeBlock()}`);

/** Chips that wrap onto several lines, one of them broken across two. */
const CHIPS = formatted(
    "<p>Run <code>pnpm i18n</code>, <code>pnpm lint:fmt:fix</code> and <code>pnpm lint:types</code>, then " +
        "<code>git tag -s v1.12.33-telement.1</code> and <code>git log --oneline</code>.</p>",
);

/** The line heights formatted text inherits: from a bubble, an IRC line and a modern layout line. */
const LAYOUT_LINE_HEIGHTS = [
    ["a bubble", "1.25rem"],
    ["the IRC layout", "1.125rem"],
    ["the modern layout", "1.375rem"],
];

/** A message in a bubble of the bubble layout, your own or someone else's. */
const bubble = (message: string, own = false): string => `
    <li class="root mx_EventTile layoutBubble${own ? " stateOwnEvent" : ""}">
        <div class="line mx_EventTile_line">
            <div class="slotBody">${message}</div>
        </div>
    </li>
`;

/** A computed `rgb()` or `rgba()` color's channels, from 0 to 255, and its alpha, from 0 to 1. */
function channels(color: string): [number, number, number, number] {
    const [red, green, blue, alpha = 1] = color.match(/[\d.]+/g)!.map(Number);
    return [red, green, blue, alpha];
}

/** The color that `over` paints on the opaque color `under`. */
function composite(over: string, under: string): number[] {
    const [red, green, blue, alpha] = channels(over);
    const base = channels(under);
    return [red, green, blue].map((channel, i) => channel * alpha + base[i] * (1 - alpha));
}

/** WCAG's contrast ratio between two opaque colors. */
function contrast(first: number[], second: number[]): number {
    const luminance = (rgb: number[]): number => {
        const [red, green, blue] = rgb.map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
}

function render(html: string, style = "", theme = "cpd-theme-light"): void {
    document.body.innerHTML = `
        <div class="${theme}" style="--emoji-font-family: ''; font-family: Inter; line-height: 1.375rem; width: 480px; ${style}">
            ${html}
        </div>
    `;
}

function box(selector: string): DOMRect {
    return document.querySelector(selector)!.getBoundingClientRect();
}

function radius(selector: string): string {
    return getComputedStyle(document.querySelector(selector)!).borderRadius;
}

/** The boxes of every line of every inline code chip, top to bottom. */
function chipLines(): DOMRect[] {
    return [...document.querySelectorAll("p code")]
        .flatMap((code) => [...code.getClientRects()])
        .sort((a, b) => a.top - b.top || a.left - b.left);
}

/** The boxes of `element`'s text, one or more per line. */
function textBoxes(element: Element): DOMRect[] {
    const range = document.createRange();
    range.selectNodeContents(element);
    return [...range.getClientRects()];
}

/** The box of the text of `element`'s first line. */
function firstTextLine(element: Element): DOMRect {
    return textBoxes(element)[0];
}

/** The distinct tops of `element`'s lines of text, top to bottom. */
function lineTops(element: Element): number[] {
    return [...new Set(textBoxes(element).map((line) => Math.round(line.top)))].sort((a, b) => a - b);
}

/** How far apart consecutive lines of `element`'s text are. */
function lineSpacings(element: Element): number[] {
    const tops = lineTops(element);
    return tops.slice(1).map((top, i) => top - tops[i]);
}

let stylesheet: HTMLStyleElement;
let unloadFonts: (() => void)[];

describe("Code in a message", () => {
    beforeAll(async () => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundDarkTheme} }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components {
                ${telementTokens}
                ${eventTileViewStyles.replace(/:global\(([^)]*)\)/g, "$1")}
                ${moduleStyles(replyTileStyles, "ReplyTileView")}
            }
            @layer app-web {
                ${githubMarkdown}
                ${toBrowserCss(commonStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(accessibleButtonStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(eventTileStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(editorStyles, commonStyles, fontSizes, lightTheme)}
            }
        `;
        document.head.append(stylesheet);
        // Chips and lines are measured to the pixel, so with the app's fonts rather than whatever the system has
        unloadFonts = await Promise.all([loadInter(), loadFiraCode()]);
    });

    afterAll(() => {
        stylesheet.remove();
        for (const unload of unloadFonts) unload();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("rounds inline code and code blocks as text-level elements, not with github-markdown-css's 6px", () => {
        render(MESSAGE);

        expect(radius("p code")).toBe("4px");
        expect(radius(BLOCK)).toBe("4px");
    });

    it("takes the radius of inline code and code blocks from --tl-radius-inline", () => {
        render(MESSAGE, "--tl-radius-inline: 3px");

        expect(radius("p code")).toBe("3px");
        expect(radius(BLOCK)).toBe("3px");
    });

    describe.each([
        ["light", "cpd-theme-light"],
        ["dark", "cpd-theme-dark"],
    ])("in the %s theme", (_, theme) => {
        it.each([
            ["other people's", false],
            ["your own", true],
        ])("fills a code block one gray step from %s bubble, with no outline", (_, own) => {
            render(bubble(MESSAGE, own), "", theme);
            const block = document.querySelector(BLOCK)!;
            const pre = document.querySelector("pre")!;
            const bubbleColor = getComputedStyle(document.querySelector(".line")!).backgroundColor;
            const ratio = contrast(
                composite(getComputedStyle(block).backgroundColor, bubbleColor),
                channels(bubbleColor),
            );

            expect(ratio).toBeGreaterThanOrEqual(1.1);
            expect(ratio).toBeLessThan(1.25);
            expect(getComputedStyle(pre).borderTopColor).toBe("rgba(0, 0, 0, 0)");
            // The fill is translucent and the block's, so neither the code nor its lines paint one of their own over it
            expect(getComputedStyle(pre).backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect(getComputedStyle(pre.querySelector("code")!).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        });
    });

    it("draws no outline around a code block while its message is hovered", async () => {
        render(bubble(MESSAGE));
        const line = document.querySelector<HTMLElement>(".line")!;

        await userEvent.hover(line);
        expect(getComputedStyle(document.querySelector("pre")!).borderTopColor).toBe("rgba(0, 0, 0, 0)");
        await userEvent.unhover(line);
    });

    it("draws a code block in the rich-text editor with the fill and outline it has once sent", () => {
        render(`
            ${MESSAGE}
            <div class="mx_WysiwygComposer_Editor_container">
                <div class="mx_WysiwygComposer_Editor_content" contenteditable="true"><pre><code>pnpm i18n</code></pre></div>
            </div>
        `);
        const [sent, draft] = [...document.querySelectorAll("pre")].map((pre) => getComputedStyle(pre));

        expect(draft.backgroundColor).toBe(getComputedStyle(document.querySelector(BLOCK)!).backgroundColor);
        expect(draft.borderTopColor).toBe(sent.borderTopColor);
    });

    it("writes the line numbers in the secondary text color", () => {
        render(MESSAGE);
        const numbers = document.querySelector(".mx_EventTile_lineNumbers")!;

        expect(getComputedStyle(numbers).color).toBe(tokenColor("--cpd-color-text-secondary", numbers));
    });

    describe.each(LAYOUT_LINE_HEIGHTS)("in %s", (_, lineHeight) => {
        it("fits inline code inside its line, so chips on consecutive lines don't touch", () => {
            render(CHIPS, `width: 320px; line-height: ${lineHeight}`);
            const lines = chipLines();
            const tops = [...new Set(lines.map((line) => line.top))];

            // Including the chip broken across two lines
            expect(tops.length).toBeGreaterThanOrEqual(3);
            for (const [above, below] of lines.flatMap((a) => lines.map((b) => [a, b]))) {
                if (below.top <= above.top) continue;
                expect(below.top - above.bottom).toBeGreaterThanOrEqual(2);
            }
        });
    });

    it("sets a bubble's text and its quotes 20px apart, Telegram's 1.33, and keeps its code 22px apart", () => {
        const words = "The room list now shows two lines of preview and the badges under the time.";
        render(
            bubble(
                formatted(
                    `<p>${words}</p><blockquote><p>${words}</p></blockquote>` +
                        codeBlock(["pnpm i18n", "pnpm lint:fmt:fix", "pnpm lint:types"]),
                ),
            ),
        );
        const [text, quote] = [...document.querySelectorAll(".markdown-body p")];

        for (const element of [text, quote]) {
            const spacings = lineSpacings(element);
            expect(spacings.length).toBeGreaterThan(0);
            for (const spacing of spacings) expect(spacing).toBe(20);
        }
        expect(lineSpacings(document.querySelector("pre code")!)).toEqual([22, 22]);
    });

    it("pads inline code at its sides only, as the font already leaves room above and below the text", () => {
        render(CHIPS);
        const code = document.querySelector("p code")!;
        const style = getComputedStyle(code);

        expect(style.padding).toBe("0px 4px");
        // The text starts after the 1px border and the padding
        expect(firstTextLine(code).left - code.getBoundingClientRect().left).toBe(5);
    });

    it("insets a code block's text and line numbers 12px from its edge, border included, at its end too", () => {
        // Shrunk to fit, as in a bubble, so that the longest line ends at the block's end padding
        render(formatted(codeBlock()), "width: fit-content");
        const pre = box("pre");
        const numbers = box(".mx_EventTile_lineNumbers");
        const code = box("pre code");

        expect(numbers.left - pre.left).toBe(12);
        expect(numbers.top - pre.top).toBe(12);
        expect(pre.bottom - numbers.bottom).toBe(12);
        expect(code.top - pre.top).toBe(12);
        // No room kept for buttons over the code: they are on the header line
        expect(pre.right - code.right).toBe(12);
        expect(pre.bottom - code.bottom).toBe(12);
    });

    it.each(["ltr", "rtl"])(
        "keeps the code clear of its buttons in %s text, on the header line above it, when the block fits its longest line, as in a bubble",
        (dir) => {
            // The first line is the longest. A message that starts in Hebrew is right to left.
            const block = codeBlock(["const accent = '#2481cc';", "x"]);
            render(formatted(dir === "ltr" ? block : `<p>הריצו:</p>${block}`), "width: fit-content");
            const firstLine = textBoxes(document.querySelector("pre code")!)[0];

            for (const button of document.querySelectorAll(".mx_EventTile_button")) {
                expect(firstLine.top - button.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(12);
            }
        },
    );

    it("puts the header line's buttons at the end of a right-to-left block and its language at the start, with the line numbers", () => {
        render(formatted(`<p>הריצו את הפקודות:</p>${codeBlock()}`));
        const block = box(BLOCK);
        const numbers = box(".mx_EventTile_lineNumbers");
        const [expandIcon, copyIcon] = [...document.querySelectorAll(".mx_EventTile_button svg")].map((icon) =>
            icon.getBoundingClientRect(),
        );

        expect(copyIcon.left - block.left).toBe(8);
        expect(expandIcon.left).toBeGreaterThan(copyIcon.right);
        expect(block.right - firstTextLine(document.querySelector(".mx_EventTile_codeBlockLanguage")!).right).toBe(12);
        expect(block.right - numbers.right).toBe(12);
    });

    it("starts the code 8px after its line numbers", () => {
        render(MESSAGE);
        const numbers = box(".mx_EventTile_lineNumbers span");

        expect(firstTextLine(document.querySelector("pre code")!).left - numbers.right).toBe(8);
    });

    it("puts the line numbers at the start of a right-to-left block, 8px from the code", () => {
        render(formatted(`<p>הריצו את הפקודות:</p>${codeBlock()}`));
        const pre = box("pre");
        const numbers = box(".mx_EventTile_lineNumbers");
        const textEnd = Math.max(...textBoxes(document.querySelector("pre code")!).map((line) => line.right));

        expect(pre.right - numbers.right).toBe(12);
        expect(numbers.left - textEnd).toBe(8);
    });

    it("puts a 28px header line inside the block's top, its line under it, with the expand and copy buttons at its end", () => {
        render(MESSAGE);
        const block = box(BLOCK);
        const header = document.querySelector(".mx_EventTile_codeBlockHeader")!;
        const [expand, copy] = [...document.querySelectorAll(".mx_EventTile_button")].map((button) =>
            button.getBoundingClientRect(),
        );
        const [expandIcon, copyIcon] = [...document.querySelectorAll(".mx_EventTile_button svg")].map((icon) =>
            icon.getBoundingClientRect(),
        );

        expect(header.getBoundingClientRect().top).toBe(block.top);
        expect(header.getBoundingClientRect().height).toBe(28 + 1);
        expect(getComputedStyle(header).borderBottomColor).toBe(tokenColor("--cpd-color-alpha-gray-400", header));
        expect(box("pre").top).toBe(header.getBoundingClientRect().bottom);

        for (const button of [expand, copy]) expect([button.width, button.height]).toEqual([28, 28]);
        for (const icon of [expandIcon, copyIcon]) expect([icon.width, icon.height]).toEqual([20, 20]);
        // Side by side on the line, copy last, both always shown
        expect(copy.left - expand.right).toBe(4);
        expect(expand.top).toBe(block.top);
        expect(copy.top).toBe(block.top);
        expect(block.right - copyIcon.right).toBe(8);
        for (const button of document.querySelectorAll(".mx_EventTile_button")) {
            expect(getComputedStyle(button).visibility).toBe("visible");
        }
    });

    it("names the fence's language at the start of the header line, in 13px secondary text on the code's 12px edge", () => {
        render(MESSAGE);
        const block = box(BLOCK);
        const header = box(".mx_EventTile_codeBlockHeader");
        const language = document.querySelector(".mx_EventTile_codeBlockLanguage")!;
        const text = firstTextLine(language);

        expect(language.textContent).toBe("sh");
        expect(text.left - block.left).toBe(12);
        expect(Math.abs((text.top + text.bottom) / 2 - (header.top + 14))).toBeLessThanOrEqual(0.5);
        expect(getComputedStyle(language).fontSize).toBe("13px");
        expect(getComputedStyle(language).color).toBe(tokenColor("--cpd-color-text-secondary", language));
    });

    it("keeps the buttons at the end of the header line of a block that names no language", () => {
        render(formatted(codeBlock(CODE_LINES, "")));
        const block = box(BLOCK);
        const copyIcon = box(".mx_EventTile_copyButton svg");

        expect(document.querySelector(".mx_EventTile_codeBlockLanguage")).toBeNull();
        expect(block.right - copyIcon.right).toBe(8);
    });

    it("draws the language in white in your own bubble, where secondary white would be too faint on the block", () => {
        render(bubble(MESSAGE, true));
        const language = document.querySelector(".mx_EventTile_codeBlockLanguage")!;

        expect(getComputedStyle(language).color).toBe("rgb(255, 255, 255)");
    });

    it("keeps every line of a numbered block visible when the block shrinks to fit, as in a bubble", () => {
        // The widest line isn't the first, which the line numbers widen
        render(formatted(codeBlock(["pnpm i18n", "pnpm lint:fmt:fix && pnpm lint:types"])), "width: fit-content");
        const pre = document.querySelector("pre")!;

        expect(pre.scrollWidth).toBeLessThanOrEqual(pre.clientWidth);
    });

    it("keeps its end padding after the longest line when a numbered block scrolls", () => {
        render(
            formatted(
                codeBlock(["pnpm i18n", `pnpm exec vitest run --project 'element-web (browser)' ${"x".repeat(80)}`]),
            ),
        );
        const pre = document.querySelector("pre")!;
        pre.scrollLeft = pre.scrollWidth;
        const textEnd = Math.max(...textBoxes(pre.querySelector("code")!).map((line) => line.right));

        expect(pre.scrollLeft).toBeGreaterThan(0);
        // The 12px, less a fraction of a pixel, as the scroll position is whole pixels and the text isn't
        expect(pre.getBoundingClientRect().right - textEnd).toBeGreaterThan(11);
        expect(pre.getBoundingClientRect().right - textEnd).toBeLessThanOrEqual(12);
    });

    it("cuts a reply's quoted code block off at its padding, after the lines the quote shows", () => {
        const lines = ["pnpm install", "pnpm i18n", "pnpm lint:fmt:fix", "pnpm test:unit"];
        render(
            `<blockquote class="mx_ReplyChain"><div class="ReplyTileView_body">${formatted(codeBlock(lines))}</div></blockquote>`,
        );
        const pre = box("pre");

        // In the bottom padding, where the top of the third line would show
        const hit = document.elementFromPoint(pre.left + 20, pre.bottom - 6);
        expect(hit).toBe(document.querySelector("pre"));
    });

    it("shows only the code in a reply's quote, in its own fill, without the header line", () => {
        render(`<blockquote class="mx_ReplyChain"><div class="ReplyTileView_body">${MESSAGE}</div></blockquote>`);

        expect(getComputedStyle(document.querySelector(".mx_EventTile_codeBlockHeader")!).display).toBe("none");
        expect(getComputedStyle(document.querySelector(BLOCK)!).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(getComputedStyle(document.querySelector("pre")!).backgroundColor).toBe(
            tokenColor("--cpd-color-alpha-gray-300", document.querySelector("pre")!),
        );
    });

    it("leaves the code in a reply's quote inline, for the quote to clamp it to its first lines", () => {
        render(`<blockquote class="mx_ReplyChain">${MESSAGE}</blockquote>`);

        expect(getComputedStyle(document.querySelector("pre code")!).display).toBe("inline");
    });

    it.each([
        ["after text", MESSAGE],
        ["that starts the message", formatted(`${codeBlock()}<p>Then commit.</p>`)],
    ])("rounds a code block %s concentrically with its bubble, which gives the inline radius", (_, message) => {
        render(`
            <li class="root mx_EventTile layoutBubble">
                <div class="line mx_EventTile_line">
                    <div class="slotBody">${message}</div>
                </div>
            </li>
        `);
        const bubble = box(".line");
        const block = box(BLOCK);
        const bubbleRadius = parseFloat(getComputedStyle(document.querySelector(".line")!).borderTopLeftRadius);
        const inset = Math.min(block.top - bubble.top, block.left - bubble.left, bubble.right - block.right);

        expect(bubbleRadius).toBe(12);
        expect(parseFloat(radius(BLOCK))).toBe(Math.max(bubbleRadius - inset, 4));
        expect(radius(BLOCK)).toBe("4px");
    });
});
