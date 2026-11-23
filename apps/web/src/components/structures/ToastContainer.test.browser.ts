/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, IconButton } from "@vector-im/compound-web";
import { CheckIcon, CloseIcon, ErrorSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
// The package doesn't export its token stylesheet on its own, and its build can be older than the toast's source
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../packages/shared-components/src/telement/tokens.css?raw";
// eslint-disable-next-line no-restricted-imports
import genericToastStyles from "../../../../../packages/shared-components/src/core/toast/GenericToast.module.css?raw";

import fontSizes from "../../../res/css/_font-sizes.pcss?raw";
import toastStyles from "../../../res/css/structures/_ToastContainer.pcss?raw";
import { toBrowserCss } from "../../test/telement/browserCss";
import { loadInter } from "../../test/telement/fonts";

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

/**
 * The "Verify this device" toast as ToastContainer renders it with GenericToast's body (with its unhashed class
 * names), between the room list's filters and its first room when `docked`, and on its own otherwise.
 */
function renderVerifyToast(docked: boolean, stacked = false, width = 370): void {
    const button = (kind: "primary" | "secondary", label: string): string =>
        renderToStaticMarkup(createElement(Button, { kind, size: "md" }, label));
    const container = `
        <div class="mx_ToastContainer ${stacked ? "mx_ToastContainer_stacked" : ""}" role="alert">
            <div class="mx_Toast_toast mx_Toast_hasIcon">
                ${renderToStaticMarkup(createElement(ErrorSolidIcon, { id: "toastIcon" }))}
                <div class="mx_Toast_title"><h2>Verify this device</h2></div>
                <div class="mx_Toast_body">
                    <div>
                        <div class="description">
                            Soon, unverified devices will not be able to send and receive messages. <a>Learn more</a>
                        </div>
                        <div class="buttons">${button("secondary", "Later")}${button("primary", "Continue")}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.innerHTML = docked
        ? `
            <nav class="mx_RoomListPanel cpd-theme-light" style="display: flex; flex-direction: column; width: ${width}px">
                <div id="filters" style="height: 48px"></div>
                ${container}
                <div id="firstRoom" style="height: 72px"></div>
            </nav>
        `
        : `<div class="cpd-theme-light">${container}</div>`;
}

describe("A toast docked in the room list", () => {
    let removeInter: () => void;

    beforeAll(async () => {
        removeInter = await loadInter();
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundTokens} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} ${genericToastStyles} }
            @layer app-web { ${toBrowserCss(toastStyles, fontSizes)} }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
        removeInter();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    function box(selector: string): DOMRect {
        return document.querySelector(selector)!.getBoundingClientRect();
    }

    it("lies on the room list's 12px content edge, between the filters and the first room, 12px above its plate", () => {
        renderVerifyToast(true);
        const panel = box(".mx_RoomListPanel");
        const card = box(".mx_Toast_toast");

        expect([card.left - panel.left, panel.right - card.right]).toEqual([12, 12]);
        expect(card.top).toBe(box("#filters").bottom);
        // The grid's last row, then the room's 4px inset around its plate
        expect(box("#firstRoom").top - card.bottom).toBe(8);
        expect(getComputedStyle(document.querySelector(".mx_ToastContainer")!).position).toBe("static");
    });

    it("lies flat in the list, rounded like a card, with no shadow", () => {
        renderVerifyToast(true);
        const style = getComputedStyle(document.querySelector(".mx_Toast_toast")!);

        expect(style.boxShadow).toBe("none");
        expect(style.borderTopLeftRadius).toBe("12px");
        expect(style.borderTopWidth).toBe("1px");
    });

    it("pads its icon, title, text and buttons 12 × 16 like a settings card, its text spanning it", () => {
        renderVerifyToast(true);
        const card = box(".mx_Toast_toast");
        const icon = box("#toastIcon");
        const title = box(".mx_Toast_title h2");
        const description = box(".description");
        const buttons = [...document.querySelectorAll(".buttons button")].map((button) =>
            button.getBoundingClientRect(),
        );

        expect(icon.left - card.left).toBe(16);
        expect(Math.min(icon.top, title.top) - card.top).toBe(12);
        // The icon in the middle of the title's line
        expect(icon.top + icon.height / 2).toBeCloseTo(title.top + title.height / 2, 0);
        expect([description.left - card.left, card.right - description.right]).toEqual([16, 16]);
        expect(card.right - buttons.at(-1)!.right).toBe(16);
        expect(card.bottom - buttons.at(-1)!.bottom).toBe(12);
        expect(buttons.map((button) => button.height)).toEqual([36, 36]);
    });

    it("keeps its buttons inside it in the room list at its narrowest, the action under the other button", () => {
        // The left panel's minimum width
        renderVerifyToast(true, false, 200);
        const card = box(".mx_Toast_toast");
        const [later, action] = [...document.querySelectorAll(".buttons button")].map((button) =>
            button.getBoundingClientRect(),
        );

        expect(card.right - action.right).toBe(16);
        expect(card.right - later.right).toBe(16);
        expect(action.top - later.bottom).toBe(8);
        expect(card.bottom - action.bottom).toBe(12);
    });

    it("outlines the toast behind a stacked one rather than raising it", () => {
        renderVerifyToast(true, true);
        const behind = getComputedStyle(document.querySelector(".mx_ToastContainer")!, "::before");

        expect(behind.boxShadow).toBe("none");
        expect(behind.borderTopWidth).toBe("1px");
    });

    it("floats over the app as before where there is no room list", () => {
        renderVerifyToast(false);

        expect(getComputedStyle(document.querySelector(".mx_ToastContainer")!).position).toBe("absolute");
        expect(getComputedStyle(document.querySelector(".description")!).maxWidth).toBe("272px");
    });
});
