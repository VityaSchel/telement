/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IconButton } from "@vector-im/compound-web";
import { CheckIcon, CloseIcon, ErrorSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

import fontSizes from "../../../res/css/_font-sizes.pcss?raw";
import toastStyles from "../../../res/css/structures/_ToastContainer.pcss?raw";
import { toBrowserCss } from "../../test/telement/browserCss";

/** The close button as ToastContainer renders it, without its tooltip. */
function closeButton(id: string): string {
    return renderToStaticMarkup(
        createElement(
            IconButton,
            { id, className: "mx_Toast_closebutton", size: "28px", kind: "secondary" },
            createElement(CloseIcon),
        ),
    );
}

/**
 * A toast with an icon, as ToastContainer renders it, with an icon in its body. A close button outside the toast shows
 * how Compound draws it anywhere else.
 */
function renderToast(): void {
    document.body.innerHTML = `
        <div class="mx_ToastContainer" role="alert">
            <div class="mx_Toast_toast mx_Toast_hasIcon">
                ${renderToStaticMarkup(createElement(ErrorSolidIcon, { id: "toastIcon" }))}
                <div class="mx_Toast_title"><h2>Verify your new session</h2></div>
                ${closeButton("closeButton")}
                <div class="mx_Toast_body">${renderToStaticMarkup(createElement(CheckIcon, { id: "bodyIcon" }))}</div>
            </div>
        </div>
        ${closeButton("referenceCloseButton")}
    `;
}

function widthOf(selector: string): string {
    return getComputedStyle(document.querySelector(selector)!).width;
}

let stylesheet: HTMLStyleElement;

describe("A toast with an icon", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, app-web;
            @layer compound-tokens { ${compoundTokens} }
            @layer compound-web { ${compoundStyles} }
            @layer app-web { ${toBrowserCss(toastStyles, fontSizes)} }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("sizes its own icon at 20px", () => {
        renderToast();

        expect(widthOf("#toastIcon")).toBe("20px");
    });

    it("leaves the close button's X at the size Compound gives a 28px icon button", () => {
        renderToast();

        expect(widthOf("#closeButton svg")).toBe(widthOf("#referenceCloseButton svg"));
        expect(widthOf("#closeButton svg")).toBe("21px");
    });

    it("leaves the icons in its body at their own size", () => {
        renderToast();

        expect(widthOf("#bodyIcon")).toBe("16px");
    });
});
