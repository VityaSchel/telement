/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { IconButton } from "@vector-im/compound-web";
import { CopyIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
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
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../../test/telement/browserCss";
import { loadFiraCode, loadInter } from "../../../test/telement/fonts";

const CODE_LINES = ["pnpm i18n", "pnpm lint:fmt:fix"];

/** The block CodeBlock renders in place of a message's `pre`, with line numbers and its expand button. */
function codeBlock(lines = CODE_LINES): string {
    const numbers = lines.map((_, i) => `<span>${i + 1}</span>`).join("");
    return `
        <div class="mx_EventTile_pre_container">
            <pre class="mx_EventTile_collapsedCodeBlock"><span class="mx_EventTile_lineNumbers" data-event-tile-line-numbers="true">${numbers}</span><div style="display: contents"><code>${lines.join("\n")}
</code></div></pre>
            <button class="mx_AccessibleButton mx_EventTile_button" aria-label="Expand">
                <svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" /></svg>
            </button>
            <div class="copy"></div>
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

/** The line heights formatted text inherits: from a bubble or an IRC line, and from a modern layout line. */
const LAYOUT_LINE_HEIGHTS = [
    ["a bubble or the IRC layout", "1.125rem"],
    ["the modern layout", "1.375rem"],
];

let reactRoot: Root | undefined;

function render(html: string, style = ""): void {
    document.body.innerHTML = `
        <div class="cpd-theme-light" style="--emoji-font-family: ''; font-family: Inter; line-height: 1.375rem; width: 480px; ${style}">
            ${html}
        </div>
    `;
    // CopyTextButton: a Compound IconButton with the code block's button classes
    const copy = document.querySelector(".copy");
    if (!copy) return;
    reactRoot = createRoot(copy);
    flushSync(() =>
        reactRoot!.render(
            createElement(
                IconButton,
                {
                    className: "mx_EventTile_button mx_EventTile_copyButton mx_EventTile_buttonBottom",
                    size: "28px",
                    style: { padding: "4px" },
                },
                createElement(CopyIcon),
            ),
        ),
    );
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

let stylesheet: HTMLStyleElement;
let unloadFonts: (() => void)[];

describe("Code in a message", () => {
    beforeAll(async () => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
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
        reactRoot?.unmount();
        reactRoot = undefined;
        document.body.innerHTML = "";
    });

    it("rounds inline code and code blocks as text-level elements, not with github-markdown-css's 6px", () => {
        render(MESSAGE);

        expect(radius("p code")).toBe("4px");
        expect(radius("pre")).toBe("4px");
    });

    it("takes the radius of inline code and code blocks from --tl-radius-inline", () => {
        render(MESSAGE, "--tl-radius-inline: 3px");

        expect(radius("p code")).toBe("3px");
        expect(radius("pre")).toBe("3px");
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

    it("pads inline code at its sides only, as the font already leaves room above and below the text", () => {
        render(CHIPS);
        const code = document.querySelector("p code")!;
        const style = getComputedStyle(code);

        expect(style.padding).toBe("0px 4px");
        // The text starts after the 1px border and the padding
        expect(firstTextLine(code).left - code.getBoundingClientRect().left).toBe(5);
    });

    it("insets a code block's text and line numbers 12px from its edge, border included", () => {
        // Shrunk to fit, as in a bubble, so that the longest line ends at the block's end padding
        render(formatted(codeBlock()), "width: fit-content");
        const pre = box("pre");
        const numbers = box(".mx_EventTile_lineNumbers");
        const code = box("pre code");

        expect(numbers.left - pre.left).toBe(12);
        expect(numbers.top - pre.top).toBe(12);
        expect(pre.bottom - numbers.bottom).toBe(12);
        expect(code.top - pre.top).toBe(12);
        expect(pre.right - code.right).toBe(12);
        expect(pre.bottom - code.bottom).toBe(12);
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

    it("aligns the icons of the expand and copy buttons with the block's 12px inset", () => {
        render(MESSAGE);
        const pre = box("pre");
        const [expand, copy] = [...document.querySelectorAll(".mx_EventTile_button")].map((button) =>
            button.getBoundingClientRect(),
        );
        const [expandIcon, copyIcon] = [...document.querySelectorAll(".mx_EventTile_button svg")].map((icon) =>
            icon.getBoundingClientRect(),
        );

        for (const button of [expand, copy]) expect([button.width, button.height]).toEqual([28, 28]);
        for (const icon of [expandIcon, copyIcon]) expect([icon.width, icon.height]).toEqual([20, 20]);
        expect(copy.top).toBe(expand.bottom);

        expect(expandIcon.top - pre.top).toBe(12);
        expect(pre.right - expandIcon.right).toBe(12);
        expect(pre.right - copyIcon.right).toBe(12);
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
        // Less a fraction of a pixel, as the scroll position is whole pixels and the text isn't
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
        const pre = box("pre");
        const bubbleRadius = parseFloat(getComputedStyle(document.querySelector(".line")!).borderTopLeftRadius);
        const inset = Math.min(pre.top - bubble.top, pre.left - bubble.left, bubble.right - pre.right);

        expect(bubbleRadius).toBe(12);
        expect(parseFloat(radius("pre"))).toBe(Math.max(bubbleRadius - inset, 4));
        expect(radius("pre")).toBe("4px");
    });
});
