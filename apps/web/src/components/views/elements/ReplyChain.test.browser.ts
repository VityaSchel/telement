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

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import replyChainStyles from "../../../../res/css/views/elements/_ReplyChain.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../../test/telement/browserCss";
import { tokenColor } from "../../../test/telement/computedStyle";

/** The reply quote ReplyChain renders above a message, with the quoted message in place of ReplyTile. */
function quote(
    classes = "mx_ReplyChain_color3",
    content = '<div class="quoted">Alice<br>Are you coming?</div>',
): string {
    return `
        <div class="mx_ReplyChain_wrapper">
            <div></div>
            <div><blockquote class="mx_ReplyChain ${classes}">${content}</blockquote></div>
        </div>
    `;
}

/** The two rows ReplyChain shows in the new timeline while the quoted message loads. */
const PLACEHOLDER = quote(
    "mx_ReplyChain_placeholder",
    '<div class="mx_ReplyChain_placeholderRow"></div><div class="mx_ReplyChain_placeholderRow"></div>',
);

/** The quote ReplyChain shows when the quoted message can't be loaded, which has no sender. */
const ERROR = quote("mx_ReplyChain_error", '<div class="quoted">Can\'t load the message this replies to.</div>');

function render(html: string, { dir = "ltr", panelClass = "" } = {}): void {
    document.body.innerHTML = `
        <div class="cpd-theme-light ${panelClass}" dir="${dir}" style="width: 480px">${html}</div>
    `;
}

function blockquote(): HTMLElement {
    return document.querySelector<HTMLElement>("blockquote")!;
}

function quoteLine(): CSSStyleDeclaration {
    return getComputedStyle(blockquote(), "::before");
}

let stylesheet: HTMLStyleElement;

describe("ReplyChain styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} }
            @layer app-web { ${toBrowserCss(replyChainStyles, lightTheme)} }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("draws the quote line as a 2px pill in the sender's color along the whole quote", () => {
        render(quote());

        const line = quoteLine();
        // A border on an empty box, rather than a background, which forced colors would paint over
        expect(line.borderInlineStartStyle).toBe("solid");
        expect(line.borderInlineStartWidth).toBe("2px");
        expect(line.borderInlineStartColor).toBe(tokenColor("--cpd-color-text-decorative-3", blockquote()));
        expect(line.width).toBe("0px");
        expect(parseFloat(line.height)).toBe(blockquote().getBoundingClientRect().height);
        expect(line.left).toBe("0px");
        // Both ends are round, on the side of the text as on the outer side
        for (const radius of [
            line.borderTopLeftRadius,
            line.borderTopRightRadius,
            line.borderBottomRightRadius,
            line.borderBottomLeftRadius,
        ]) {
            expect(parseFloat(radius)).toBeGreaterThanOrEqual(parseFloat(line.borderInlineStartWidth) / 2);
        }
        expect(getComputedStyle(blockquote()).borderLeftStyle).toBe("none");
    });

    it("rounds the quote line with --tl-radius-control", () => {
        render(quote());

        const probe = document.createElement("div");
        probe.style.borderRadius = "var(--tl-radius-control)";
        blockquote().append(probe);
        expect(quoteLine().borderTopLeftRadius).toBe(getComputedStyle(probe).borderTopLeftRadius);
    });

    it("starts the quoted text 12px from the quote line", () => {
        render(quote());

        const text = document.querySelector(".quoted")!.getBoundingClientRect();
        expect(text.left - blockquote().getBoundingClientRect().left).toBe(12);
    });

    it("puts the quote line at the right, 12px from the text, in right-to-left text", () => {
        render(quote(), { dir: "rtl" });

        const text = document.querySelector(".quoted")!.getBoundingClientRect();
        expect(quoteLine().right).toBe("0px");
        expect(quoteLine().borderRightWidth).toBe("2px");
        expect(quoteLine().borderLeftWidth).toBe("0px");
        expect(blockquote().getBoundingClientRect().right - text.right).toBe(12);
    });

    it("keeps the quote line in forced colors", async () => {
        render(quote());
        const probe = document.createElement("div");
        probe.style.color = "CanvasText";
        document.body.append(probe);

        await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
        try {
            expect(matchMedia("(forced-colors: active)").matches).toBe(true);
            expect(quoteLine().borderInlineStartWidth).toBe("2px");
            expect(quoteLine().borderInlineStartColor).toBe(getComputedStyle(probe).color);
        } finally {
            await cdp().send("Emulation.setEmulatedMedia", { features: [] });
        }
    });

    it("draws the line of the loading placeholder in the placeholder's color", () => {
        render(PLACEHOLDER, { panelClass: "mx_NewTimelinePanel" });

        expect(quoteLine().borderInlineStartWidth).toBe("2px");
        expect(quoteLine().borderInlineStartColor).toBe(tokenColor("--cpd-color-gray-400", blockquote()));
        expect(parseFloat(quoteLine().height)).toBe(blockquote().getBoundingClientRect().height);
    });

    it("draws no line for a quote that failed to load", () => {
        render(ERROR, { panelClass: "mx_NewTimelinePanel" });

        expect(quoteLine().borderInlineStartStyle).toBe("none");
        expect(quoteLine().borderInlineStartWidth).toBe("0px");
    });
});
