/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import sharedComponentsStyles from "@element-hq/web-shared-components/dist/element-web-shared-components.css?raw";

import fontSizes from "../../../../res/css/_font-sizes.pcss?raw";
import accessibleButtonStyles from "../../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import formatBarStyles from "../../../../res/css/views/rooms/_MessageComposerFormatBar.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../../test/telement/browserCss";

const ICON = `<svg viewBox="0 0 24 24"><rect width="24" height="24" /></svg>`;

/** The DOM MessageComposerFormatBar renders while shown, with its six buttons. */
function renderFormatBar(): HTMLElement {
    const labels = ["Bold", "Italics", "Strikethrough", "Code block", "Quote", "Insert link"];
    const buttons = labels.map(
        (label) =>
            `<button class="mx_AccessibleButton mx_MessageComposerFormatBar_button" type="button" aria-label="${label}">${ICON}</button>`,
    );
    document.body.innerHTML = `
        <div class="cpd-theme-light">
            <div class="mx_MessageComposerFormatBar mx_MessageComposerFormatBar_shown" role="toolbar" style="position: static">
                ${buttons.join("")}
            </div>
        </div>
    `;
    return document.querySelector<HTMLElement>(".mx_MessageComposerFormatBar")!;
}

let stylesheet: HTMLStyleElement;

describe("MessageComposerFormatBar styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundTokens} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} }
            @layer compound-web { ${compoundStyles} }
            ${sharedComponentsStyles}
            @layer app-web {
                ${toBrowserCss(accessibleButtonStyles, fontSizes)}
                ${toBrowserCss(formatBarStyles, fontSizes)}
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

    it("draws the bar as a pill around the round hover of its buttons", async () => {
        const bar = renderFormatBar();
        const bold = document.querySelector<HTMLElement>('[aria-label="Bold"]')!;

        await userEvent.hover(bold);

        expect(cornerRadii(bold)).toEqual({ x: 14, y: 14 });
        // Concentric: the bar's radius is the button's plus the margin and border between them.
        const inset = bold.getBoundingClientRect().left - bar.getBoundingClientRect().left;
        expect(inset).toBe(3);
        expect(cornerRadii(bar)).toEqual({ x: 14 + inset, y: 14 + inset });
    });

    it("keeps a keyboard-focused button round, so its focus ring stays inside the pill", async () => {
        renderFormatBar();
        const bold = document.querySelector<HTMLElement>('[aria-label="Bold"]')!;
        await userEvent.unhover(bold);

        await userEvent.tab();

        expect(document.activeElement).toBe(bold);
        expect(bold.matches(":hover")).toBe(false);
        expect(cornerRadii(bold)).toEqual({ x: 14, y: 14 });
    });
});
