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
import serverPickerStyles from "../../../../res/css/views/elements/_ServerPicker.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../../test/telement/browserCss";

let stylesheet: HTMLStyleElement;

describe("ServerPicker styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundTokens} }
            @layer compound-web { ${compoundStyles} }
            ${sharedComponentsStyles}
            @layer app-web {
                ${toBrowserCss(accessibleButtonStyles)}
                ${toBrowserCss(serverPickerStyles)}
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

    it("draws the help button, and so its focus ring, as a circle", () => {
        document.body.innerHTML = `
            <div class="mx_ServerPicker" style="width: 380px">
                <h2>Account provider</h2>
                <div class="mx_AccessibleButton mx_ServerPicker_help" role="button" tabindex="0" aria-label="Help"></div>
                <span class="mx_ServerPicker_server">matrix.org</span>
            </div>
        `;

        const help = document.querySelector<HTMLElement>(".mx_ServerPicker_help")!;
        const box = help.getBoundingClientRect();
        expect([box.width, box.height]).toEqual([24, 24]);
        expect(cornerRadii(help)).toEqual({ x: 12, y: 12 });
    });
});
