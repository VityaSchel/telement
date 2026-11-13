/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import sharedComponentsStyles from "@element-hq/web-shared-components/dist/element-web-shared-components.css?raw";

import lightTheme from "../../../../../../res/themes/light/css/_light.pcss?raw";
import accessibleButtonStyles from "../../../../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import formattingButtonsStyles from "../../../../../../res/css/views/rooms/wysiwyg_composer/components/_FormattingButtons.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../../../../test/telement/browserCss";

const ICON = `<svg class="mx_FormattingButtons_Icon" viewBox="0 0 24 24"><rect width="24" height="24" /></svg>`;

/** The DOM FormattingButtons renders, with bold applied to the selection. */
function renderFormattingButtons(): void {
    document.body.innerHTML = `
        <div class="mx_FormattingButtons">
            <button class="mx_AccessibleButton mx_FormattingButtons_Button mx_FormattingButtons_active" aria-label="Bold">${ICON}</button>
            <button class="mx_AccessibleButton mx_FormattingButtons_Button mx_FormattingButtons_Button_hover" aria-label="Italic">${ICON}</button>
        </div>
    `;
}

let stylesheet: HTMLStyleElement;

describe("FormattingButtons styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundTokens} }
            @layer compound-web { ${compoundStyles} }
            ${sharedComponentsStyles}
            @layer app-web {
                ${toBrowserCss(accessibleButtonStyles, lightTheme)}
                ${toBrowserCss(formattingButtonsStyles, lightTheme)}
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

    it("draws the active and the hovered formatting buttons as 28px circles", async () => {
        renderFormattingButtons();
        const italic = document.querySelector<HTMLElement>('[aria-label="Italic"]')!;

        await userEvent.hover(italic);

        for (const button of document.querySelectorAll<HTMLElement>(".mx_FormattingButtons_Button")) {
            const box = button.getBoundingClientRect();
            expect([box.width, box.height]).toEqual([28, 28]);
            expect(cornerRadii(button)).toEqual({ x: 14, y: 14 });
        }
    });
});
