/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// The Playwright provider's types give the CDP session its `send` method
/// <reference types="@vitest/browser-playwright" />

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cdp } from "vitest/browser";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import githubMarkdown from "github-markdown-css/github-markdown-light.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import eventTileStyles from "../../res/css/views/rooms/_EventTile.pcss?raw";
import ircLayoutStyles from "../../res/css/views/rooms/_IRCLayout.pcss?raw";
import editorStyles from "../../res/css/views/rooms/wysiwyg_composer/components/_Editor.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";

const formattedBody = (html: string): string =>
    `<div class="mx_EventTile_content"><div class="mx_EventTile_body markdown-body" dir="auto">${html}</div></div>`;

const secondaryContent = (scope: Element): string => tokenColor("--cpd-color-text-secondary", scope);

/** Where formatted text shows a quote, the markup around it, and the color of the quoted text there. */
const SURFACES = [
    { name: "a message", wrap: formattedBody, textColor: secondaryContent },
    {
        name: "a message in the IRC layout",
        wrap: (html: string) => `<div class="mx_IRCLayout">${formattedBody(html)}</div>`,
        textColor: secondaryContent,
    },
    {
        // The topic InfoDialog, which renders the topic's HTML as formatted text
        name: "a dialog",
        wrap: (html: string) =>
            `<div class="mx_Dialog"><div class="mx_Dialog_content markdown-body">${html}</div></div>`,
        textColor: secondaryContent,
    },
    {
        name: "the rich-text editor",
        wrap: (html: string) =>
            `<div class="mx_WysiwygComposer_Editor_container"><div class="mx_WysiwygComposer_Editor_content" contenteditable="true" dir="auto">${html}</div></div>`,
        // The editor's quotes keep upstream's fixed gray
        textColor: () => "rgb(119, 119, 119)",
    },
];

/** Without whitespace between the tags, which the editor's pre-wrap would show as lines. */
const QUOTE = "<blockquote><p>Are you coming to the office tomorrow?</p></blockquote><p>Yes, from ten.</p>";
const HEBREW_QUOTE = "<blockquote><p>אתה מגיע מחר למשרד?</p></blockquote><p>כן, מעשר.</p>";
const NESTED_QUOTE =
    "<blockquote><p>Did you see the plan?</p><blockquote><p>The fifth floor is ready.</p></blockquote></blockquote>";

function render(html: string): void {
    document.body.innerHTML = `<div class="cpd-theme-light" style="width: 480px">${html}</div>`;
}

function quotes(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>("blockquote")];
}

function lineOf(quote: HTMLElement): CSSStyleDeclaration {
    return getComputedStyle(quote, "::before");
}

function firstParagraph(quote: HTMLElement): DOMRect {
    return quote.querySelector("p")!.getBoundingClientRect();
}

let stylesheet: HTMLStyleElement;

describe("Quote lines in formatted text", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} }
            @layer app-web {
                ${githubMarkdown}
                ${toBrowserCss(eventTileStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(ircLayoutStyles, fontSizes, lightTheme)}
                ${toBrowserCss(commonStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(editorStyles, commonStyles, fontSizes, lightTheme)}
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

    describe.each(SURFACES)("in $name", ({ wrap, textColor }) => {
        it("draws the line as a 2px pill along the whole quote, like the reply quote's", () => {
            render(wrap(QUOTE));
            const [quote] = quotes();
            const line = lineOf(quote);

            // A border on an empty box, rather than a background, which forced colors would paint over
            expect(line.borderInlineStartStyle).toBe("solid");
            expect(line.borderInlineStartWidth).toBe("2px");
            expect(line.borderInlineStartColor).toBe(tokenColor("--cpd-color-border-interactive-primary", quote));
            expect(line.width).toBe("0px");
            expect(parseFloat(line.height)).toBe(quote.getBoundingClientRect().height);
            expect(line.left).toBe("0px");
            for (const radius of [
                line.borderTopLeftRadius,
                line.borderTopRightRadius,
                line.borderBottomRightRadius,
                line.borderBottomLeftRadius,
            ]) {
                expect(parseFloat(radius)).toBeGreaterThanOrEqual(parseFloat(line.borderInlineStartWidth) / 2);
            }
            // Neither upstream's line nor github-markdown-css's is left on the quote itself
            expect(getComputedStyle(quote).borderLeftStyle).toBe("none");
            expect(getComputedStyle(quote).borderRightStyle).toBe("none");
        });

        it("rounds the line with --tl-radius-control", () => {
            render(wrap(QUOTE));
            const [quote] = quotes();

            const probe = document.createElement("div");
            probe.style.borderRadius = "var(--tl-radius-control)";
            quote.append(probe);
            expect(lineOf(quote).borderTopLeftRadius).toBe(getComputedStyle(probe).borderTopLeftRadius);
        });

        it("starts the quoted text 12px from the line, with no space added above or below it", () => {
            render(wrap(QUOTE));
            const [quote] = quotes();
            const box = quote.getBoundingClientRect();
            const text = firstParagraph(quote);

            expect(text.left - box.left).toBe(12);
            expect(text.top).toBe(box.top);
            expect(text.bottom).toBe(box.bottom);
            expect(getComputedStyle(quote).color).toBe(textColor(quote));
        });

        it("puts the line at the right, 12px from the text, in right-to-left text", () => {
            render(`<div dir="rtl">${wrap(HEBREW_QUOTE)}</div>`);
            const [quote] = quotes();
            const line = lineOf(quote);

            expect(line.right).toBe("0px");
            expect(line.borderRightWidth).toBe("2px");
            expect(line.borderLeftWidth).toBe("0px");
            expect(quote.getBoundingClientRect().right - firstParagraph(quote).right).toBe(12);
        });

        it("draws a line for each level of a nested quote", () => {
            render(wrap(NESTED_QUOTE));
            const [outer, inner] = quotes();

            for (const quote of [outer, inner]) {
                expect(lineOf(quote).borderInlineStartWidth).toBe("2px");
                expect(parseFloat(lineOf(quote).height)).toBe(quote.getBoundingClientRect().height);
            }
            expect(inner.getBoundingClientRect().left - outer.getBoundingClientRect().left).toBe(12);
        });

        it("keeps the line in forced colors", async () => {
            render(wrap(QUOTE));
            const [quote] = quotes();
            const probe = document.createElement("div");
            probe.style.color = "CanvasText";
            document.body.append(probe);

            await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
            try {
                expect(matchMedia("(forced-colors: active)").matches).toBe(true);
                expect(lineOf(quote).borderInlineStartWidth).toBe("2px");
                expect(lineOf(quote).borderInlineStartColor).toBe(getComputedStyle(probe).color);
            } finally {
                await cdp().send("Emulation.setEmulatedMedia", { features: [] });
            }
        });
    });
});
