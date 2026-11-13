/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import sharedComponentsStyles from "@element-hq/web-shared-components/dist/element-web-shared-components.css?raw";

import fontSizes from "../../../res/css/_font-sizes.pcss?raw";
import nonUrgentToastStyles from "../../../res/css/structures/_NonUrgentToastContainer.pcss?raw";
import toastStyles from "../../../res/css/structures/_ToastContainer.pcss?raw";
import { toBrowserCss } from "../../test/telement/browserCss";

/** The DOM of both toast containers, each with one toast, as ToastContainer and NonUrgentToastContainer render them. */
function renderToasts(): void {
    document.body.innerHTML = `
        <div class="mx_ToastContainer mx_ToastContainer_stacked" role="alert" id="toastContainer">
            <div class="mx_Toast_toast" id="toast">
                <div class="mx_Toast_title"><h2>Update Telement</h2></div>
                <div class="mx_Toast_body">New version of Telement is available</div>
            </div>
        </div>
        <div class="mx_NonUrgentToastContainer" role="alert">
            <div class="mx_NonUrgentToastContainer_toast" id="nonUrgentToast">
                Your server isn't responding to some requests.
            </div>
        </div>
    `;
}

function style(id: string): CSSStyleDeclaration {
    return getComputedStyle(document.getElementById(id)!);
}

let stylesheet: HTMLStyleElement;

describe("NonUrgentToastContainer styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundTokens} }
            @layer compound-web { ${compoundStyles} }
            ${sharedComponentsStyles}
            @layer app-web {
                ${toBrowserCss(toastStyles, fontSizes)}
                ${toBrowserCss(nonUrgentToastStyles, fontSizes)}
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

    it("rounds the toast like the other toasts, as a card", () => {
        renderToasts();

        expect(style("nonUrgentToast").borderTopLeftRadius).toBe("12px");
        expect(style("toast").borderTopLeftRadius).toBe("12px");
    });

    it("rounds the card peeking out under stacked toasts like the toast in front of it", () => {
        renderToasts();

        const underCard = getComputedStyle(document.getElementById("toastContainer")!, "::before");
        expect(underCard.borderBottomLeftRadius).toBe(style("toast").borderBottomLeftRadius);
    });

    it("insets its text by 8px vertically and 12px horizontally", () => {
        renderToasts();

        const toast = style("nonUrgentToast");
        expect([toast.paddingTop, toast.paddingRight, toast.paddingBottom, toast.paddingLeft]).toEqual([
            "8px",
            "12px",
            "8px",
            "12px",
        ]);
    });
});
