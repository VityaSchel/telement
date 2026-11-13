/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";

import fontSizes from "../../../../res/css/_font-sizes.pcss?raw";
import nonUrgentToastStyles from "../../../../res/css/structures/_NonUrgentToastContainer.pcss?raw";
import echoFailureToastStyles from "../../../../res/css/views/toasts/_NonUrgentEchoFailureToast.pcss?raw";
import { toBrowserCss } from "../../../test/telement/browserCss";
import { loadInter } from "../../../test/telement/fonts";

/**
 * NonUrgentToastContainer with NonUrgentEchoFailureToast in it (`_t` wraps the tagged string in a span), in the
 * app's body font: Inter with Compound's line height of 1.5.
 */
function renderToast(text: string): void {
    document.body.innerHTML = `
        <div class="mx_NonUrgentToastContainer" role="alert" style="font-family: Inter; line-height: 1.5">
            <div class="mx_NonUrgentToastContainer_toast">
                <div class="mx_NonUrgentEchoFailureToast">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
                    <span>${text} <a>requests</a>.</span>
                </div>
            </div>
        </div>
    `;
}

/** The boxes of each line of the toast's text. */
function textLines(): DOMRect[] {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector(".mx_NonUrgentEchoFailureToast > span")!);
    const lines: DOMRect[] = [];
    for (const rect of range.getClientRects()) {
        if (lines.every((line) => Math.abs(line.top - rect.top) > 1)) lines.push(rect);
    }
    return lines;
}

function middle(rect: DOMRect): number {
    return rect.top + rect.height / 2;
}

let stylesheet: HTMLStyleElement;
let unloadInter: () => void;

describe("NonUrgentEchoFailureToast styles", () => {
    beforeAll(async () => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            ${compoundTokens}
            ${toBrowserCss(nonUrgentToastStyles, fontSizes)}
            ${toBrowserCss(echoFailureToastStyles, fontSizes)}
        `;
        document.head.append(stylesheet);
        // Text is measured to the half pixel, so with the app's font rather than whatever the system falls back to
        unloadInter = await loadInter();
    });

    afterAll(() => {
        stylesheet.remove();
        unloadInter();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it.each([
        ["one line", "Your server isn't responding to some", 1],
        ["two lines", "Your server isn't responding to some of your recent", 2],
    ])("centers the icon on the first line of text on %s", (_, text, lineCount) => {
        renderToast(text);

        const lines = textLines();
        expect(lines).toHaveLength(lineCount);
        const icon = document.querySelector(".mx_NonUrgentEchoFailureToast svg")!.getBoundingClientRect();
        expect(Math.abs(middle(icon) - middle(lines[0]))).toBeLessThanOrEqual(0.25);
        // Wrapped text lines up with the first line, beside the icon rather than under it
        for (const line of lines) expect(line.left).toBe(lines[0].left);
        expect(lines[0].left).toBeGreaterThanOrEqual(icon.right + 8);
    });

    it("is 36px tall with one line of text inside its 8px padding", () => {
        renderToast("Your server isn't responding to some");

        const toast = document.querySelector(".mx_NonUrgentToastContainer_toast")!;
        expect(toast.getBoundingClientRect().height).toBe(36);
    });
});
