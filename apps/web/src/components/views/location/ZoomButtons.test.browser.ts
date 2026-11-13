/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import sharedComponentsStyles from "@element-hq/web-shared-components/dist/element-web-shared-components.css?raw";

import accessibleButtonStyles from "../../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import zoomButtonsStyles from "../../../../res/css/components/views/location/_ZoomButtons.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../../test/telement/browserCss";

let stylesheet: HTMLStyleElement;

describe("ZoomButtons styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundTokens} }
            @layer compound-web { ${compoundStyles} }
            ${sharedComponentsStyles}
            @layer app-web {
                ${toBrowserCss(accessibleButtonStyles)}
                ${toBrowserCss(zoomButtonsStyles)}
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

    it("draws the zoom buttons as 24px circles", () => {
        document.body.innerHTML = `
            <div style="position: relative; width: 320px; height: 240px">
                <div class="mx_ZoomButtons">
                    <div class="mx_AccessibleButton mx_ZoomButtons_button" role="button" title="Zoom in"></div>
                    <div class="mx_AccessibleButton mx_ZoomButtons_button" role="button" title="Zoom out"></div>
                </div>
            </div>
        `;

        for (const button of document.querySelectorAll<HTMLElement>(".mx_ZoomButtons_button")) {
            const box = button.getBoundingClientRect();
            expect([box.width, box.height]).toEqual([24, 24]);
            expect(cornerRadii(button)).toEqual({ x: 12, y: 12 });
        }
    });
});
