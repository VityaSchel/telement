/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Glass } from "@vector-im/compound-web";
import { CloseIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../../../res/css/_common.pcss?raw";
import fontSizes from "../../../../res/css/_font-sizes.pcss?raw";
import accessibleButtonStyles from "../../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import beaconViewDialogStyles from "../../../../res/css/components/views/beacon/_BeaconViewDialog.pcss?raw";
import completeSecurityBodyStyles from "../../../../res/css/views/auth/_CompleteSecurityBody.pcss?raw";
import spotlightStyles from "../../../../res/css/views/dialogs/_SpotlightDialog.pcss?raw";
import verifyEmailStyles from "../../../../res/css/views/dialogs/_VerifyEMailDialog.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../../test/telement/browserCss";

const closeIcon = renderToStaticMarkup(createElement(CloseIcon));

/** The wrapper class of a static modal, as the search and the live location dialogs open */
const STATIC = "mx_Dialog_staticWrapper";

/** What Modal.tsx renders around a dialog: the wrapper, Compound's Glass with the body inside, then the backdrop. */
function modal(dialog: string, wrapperClass = ""): string {
    const body = createElement("div", { className: "mx_Dialog", dangerouslySetInnerHTML: { __html: dialog } });
    const background = wrapperClass.includes(STATIC)
        ? "mx_Dialog_background mx_Dialog_staticBackground"
        : "mx_Dialog_background";
    return `
        <div class="mx_Dialog_wrapper ${wrapperClass}">
            ${renderToStaticMarkup(createElement(Glass, { className: "mx_Dialog_border", children: body }))}
            <div class="${background}"></div>
        </div>
    `;
}

/** The DOM BaseDialog renders: the header, the content, then the close button. */
function baseDialog(content = "<p>Are you sure you want to leave the room?</p>"): string {
    return `
        <div class="mx_Dialog_fixedWidth" role="dialog" tabindex="-1" aria-labelledby="mx_BaseDialog_title">
            <div class="mx_Dialog_header">
                <h1 class="mx_Heading_h3 mx_Dialog_title" id="mx_BaseDialog_title">Leave room</h1>
            </div>
            ${content}
            <div class="mx_AccessibleButton mx_Dialog_cancelButton" role="button" tabindex="0"
                aria-label="Close dialog">${closeIcon}</div>
        </div>
    `;
}

/** VerifyEmailModal, which ForgotPassword opens without BaseDialog, so its close button sits right in the body. */
const VERIFY_EMAIL = `
    <h1>Verify your email to continue</h1>
    <p>We need to know it's you before resetting your password.</p>
    <div class="mx_AccessibleButton mx_Dialog_cancelButton" role="button" tabindex="0"
        aria-label="Close dialog">${closeIcon}</div>
`;

/** Content taller than the viewport, filling the body's full width so that it reaches into the corners. */
const TALL_CONTENT = '<div id="tall" style="height: 2000px; margin-inline: -40px"></div>';

/** A layer that the body's overflow doesn't clip, being fixed: it covers the viewport wherever the body lets it show. */
const FIXED_LAYER = '<div id="layer" style="position: fixed; inset: 0"></div>';

/** SpotlightDialog: the keyboard prompt comes first in the body, and its stylesheet moves it up out of the body. */
function spotlight(results = ""): string {
    return `
        <div id="mx_SpotlightDialog_keyboardPrompt">Use <kbd>↓</kbd><kbd>↑</kbd> to scroll</div>
        <div class="mx_SpotlightDialog" role="dialog" tabindex="-1" aria-label="Search Dialog">
            <div class="mx_SpotlightDialog_searchBox"><input type="text" aria-label="Search"></div>
            <div id="mx_SpotlightDialog_content" role="listbox">${results}</div>
        </div>
    `;
}

/** BeaconViewDialog through BaseDialog, which renders the close button after the map, not in the header. */
const BEACON_VIEW = `
    <div class="mx_BeaconViewDialog" role="dialog" tabindex="-1">
        <div class="mx_Dialog_header"></div>
        <div class="mx_MapFallback mx_BeaconViewDialog_map"></div>
        <div class="mx_AccessibleButton mx_Dialog_cancelButton" role="button" tabindex="0"
            aria-label="Close dialog">${closeIcon}</div>
    </div>
`;

function render(html: string): void {
    document.body.innerHTML = `<div class="cpd-theme-light">${html}</div>`;
}

function element(selector: string): HTMLElement {
    return document.querySelector<HTMLElement>(selector)!;
}

/** The radius of an element's corners as drawn, all four being the same. */
function radius(selector: string): number {
    return cornerRadii(element(selector)).x;
}

let stylesheet: HTMLStyleElement;

describe("Dialog frame", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            /* Compound's Glass, the frame's radius and padding before the app's rules */
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} }
            @layer app-web {
                ${toBrowserCss(lightTheme)}
                ${toBrowserCss(commonStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(accessibleButtonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(beaconViewDialogStyles, fontSizes, lightTheme)}
                ${toBrowserCss(completeSecurityBodyStyles, fontSizes, lightTheme)}
                ${toBrowserCss(spotlightStyles, fontSizes, lightTheme)}
                ${toBrowserCss(verifyEmailStyles, fontSizes, lightTheme)}
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

    it.each([
        ["a dialog", modal(baseDialog())],
        ["a static dialog", modal(baseDialog(), STATIC)],
        ["VerifyEmailModal", modal(VERIFY_EMAIL, "mx_VerifyEMailDialog")],
    ])("rounds %s's body around the close button and Glass's frame around the body", (_name, html) => {
        render(html);
        const frame = element(".mx_Dialog_border").getBoundingClientRect();
        const body = element(".mx_Dialog").getBoundingClientRect();
        const close = element(".mx_Dialog_cancelButton").getBoundingClientRect();

        // 28px close button 16px in: 14 + 16 = 30, and Glass's 12px padding: 30 + 12 = 42
        expect([close.width, close.height, body.right - close.right, close.top - body.top]).toEqual([28, 28, 16, 16]);
        expect(radius(".mx_Dialog")).toBe(30);
        expect(radius(".mx_Dialog_border")).toBe(42);

        // The three corners share the close button's center
        const center = { x: close.left + close.width / 2, y: close.top + close.height / 2 };
        expect([body.right - radius(".mx_Dialog"), body.top + radius(".mx_Dialog")]).toEqual([center.x, center.y]);
        expect([frame.right - radius(".mx_Dialog_border"), frame.top + radius(".mx_Dialog_border")]).toEqual([
            center.x,
            center.y,
        ]);
    });

    it("rounds the close button as a control", () => {
        render(modal(baseDialog()));
        const probe = document.createElement("div");
        probe.style.borderRadius = "var(--tl-radius-control)";
        document.body.append(probe);

        expect(getComputedStyle(element(".mx_Dialog_cancelButton")).borderTopLeftRadius).toBe(
            getComputedStyle(probe).borderTopLeftRadius,
        );
    });

    it("clips scrolled content to the body's corners", () => {
        render(modal(baseDialog(TALL_CONTENT)));
        const body = element(".mx_Dialog");
        body.scrollTop = (body.scrollHeight - body.clientHeight) / 2;
        const box = body.getBoundingClientRect();

        // 8px in along the diagonal is inside a 24px corner and outside a 30px one; 10px in is inside both
        expect(document.elementFromPoint(box.right - 8, box.top + 8)).toBe(element(".mx_Dialog_border"));
        expect(document.elementFromPoint(box.right - 10, box.top + 10)).toBe(element("#tall"));
        expect(document.elementFromPoint(box.right - 8, box.bottom - 8)).toBe(element(".mx_Dialog_border"));
        expect(document.elementFromPoint(box.right - 10, box.bottom - 10)).toBe(element("#tall"));
    });

    it("clips all that a dialog's body paints, its scrollbar too, to the body's rounded corners", () => {
        render(modal(baseDialog(FIXED_LAYER)));
        const body = element(".mx_Dialog");
        const box = body.getBoundingClientRect();

        // An always-on scrollbar ignores border-radius but not clip-path. This browser hides scrollbars, so the test
        // measures the clip on a layer that the body's overflow doesn't clip either.
        expect(getComputedStyle(body).clipPath).toBe("border-box");
        // 10px in along the diagonal is inside the 30px corner, 8px in is outside it, and nothing shows beside the body
        expect(document.elementFromPoint(box.right - 10, box.top + 10)).toBe(element("#layer"));
        expect(document.elementFromPoint(box.right - 8, box.top + 8)).toBe(element(".mx_Dialog_border"));
        expect(document.elementFromPoint(box.left - 4, box.top + box.height / 2)).toBe(element(".mx_Dialog_border"));
    });

    it("clips a static dialog's scrollbar too, which its containment doesn't", () => {
        render(modal(baseDialog(), STATIC));

        // contain: content already clips what the body holds, so only the computed value tells
        expect(getComputedStyle(element(".mx_Dialog")).clipPath).toBe("border-box");
    });

    it("clips the search dialog's results, their scrollbar too, to the dialog's bottom corners", () => {
        render(modal(spotlight(FIXED_LAYER), `${STATIC} mx_SpotlightDialog_wrapper`));
        const results = element("#mx_SpotlightDialog_content");
        const box = results.getBoundingClientRect();

        // The body can't clip, for the keyboard prompt's sake. 10px in along the diagonal is inside the 24px corner.
        expect(getComputedStyle(results).clipPath).toBe("border-box");
        expect(document.elementFromPoint(box.right - 10, box.bottom - 10)).toBe(element("#layer"));
        expect(document.elementFromPoint(box.right - 6, box.bottom - 6)).not.toBe(element("#layer"));
        expect(document.elementFromPoint(box.left + 6, box.bottom - 6)).not.toBe(element("#layer"));
    });

    it("leaves the search dialog's keyboard prompt, which sits above the body, unclipped", () => {
        render(modal(spotlight(), `${STATIC} mx_SpotlightDialog_wrapper`));
        const body = element(".mx_Dialog");
        const prompt = element("#mx_SpotlightDialog_keyboardPrompt");
        const box = prompt.getBoundingClientRect();

        expect(box.bottom).toBeLessThan(body.getBoundingClientRect().top);
        expect(getComputedStyle(body).clipPath).toBe("none");
        expect(prompt.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))).toBe(
            true,
        );
    });

    it("keeps the live location dialog's close button, which sits inside the body, in view", () => {
        render(modal(BEACON_VIEW, `${STATIC} mx_BeaconViewDialog_wrapper`));
        const body = element(".mx_Dialog").getBoundingClientRect();
        const button = element(".mx_Dialog_cancelButton");
        const box = button.getBoundingClientRect();

        // _BeaconViewDialog.pcss fixes the close button outside the body only within .mx_Dialog_header, where
        // BaseDialog doesn't render it, so this body keeps its clip
        expect(getComputedStyle(element(".mx_Dialog")).clipPath).toBe("border-box");
        expect([
            box.left >= body.left,
            box.right <= body.right,
            box.top >= body.top,
            box.bottom <= body.bottom,
        ]).toEqual([true, true, true, true]);
        expect(button.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))).toBe(
            true,
        );
    });

    it("keeps the lightbox's body square", () => {
        render(modal('<div class="mx_ImageView"></div>', "mx_Dialog_lightbox"));

        expect(getComputedStyle(element(".mx_Dialog_border")).display).toBe("contents");
        expect(getComputedStyle(element(".mx_Dialog")).borderTopLeftRadius).toBe("0px");
    });

    it("keeps the spinner's and the search dialog's own radii", () => {
        render(modal('<div class="mx_Spinner"></div>', "mx_Dialog_spinner"));
        expect(getComputedStyle(element(".mx_Dialog")).borderTopLeftRadius).toBe("8px");

        render(modal('<div class="mx_SpotlightDialog"></div>', "mx_SpotlightDialog_wrapper"));
        expect(getComputedStyle(element(".mx_Dialog")).borderTopLeftRadius).toBe("24px");
    });

    it("leaves CompleteSecurity's Glass, which isn't a dialog's frame, at Compound's radii", () => {
        const body = createElement("div", { className: "mx_CompleteSecurityBody" }, "Verify this device");
        render(renderToStaticMarkup(createElement(Glass, { className: "mx_Dialog_border", children: body })));

        expect(radius(".mx_Dialog_border")).toBe(36);
        expect(radius(".mx_CompleteSecurityBody")).toBe(24);
    });
});
