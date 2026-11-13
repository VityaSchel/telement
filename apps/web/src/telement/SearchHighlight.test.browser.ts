/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import eventTileStyles from "../../res/css/views/rooms/_EventTile.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";

/** A search result's message, as HtmlHighlighter marks the matched word. */
function render(style = ""): HTMLElement {
    document.body.innerHTML = `
        <ol style="${style}">
            <li class="mx_EventTile">
                <div class="mx_EventTile_body">Can you review the
                    <span class="mx_EventTile_searchHighlight" id="highlight">draft</span> before the meeting?</div>
            </li>
        </ol>
    `;
    return document.getElementById("highlight")!;
}

let stylesheet: HTMLStyleElement;

describe("Search highlight", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            ${compoundBase}
            ${telementTokens}
            ${toBrowserCss(eventTileStyles, commonStyles, fontSizes, lightTheme)}
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("rounds the matched word with the inline radius, as text-level elements are", () => {
        expect(getComputedStyle(render()).borderRadius).toBe("4px");
    });

    it("takes its radius from --tl-radius-inline", () => {
        expect(getComputedStyle(render("--tl-radius-inline: 3px")).borderRadius).toBe("3px");
    });
});
