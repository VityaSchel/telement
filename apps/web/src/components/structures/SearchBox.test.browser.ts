/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import sharedComponentsStyles from "@element-hq/web-shared-components/dist/element-web-shared-components.css?raw";

import commonStyles from "../../../res/css/_common.pcss?raw";
import searchBoxStyles from "../../../res/css/structures/_SearchBox.pcss?raw";
import spaceChildrenPickerStyles from "../../../res/css/views/spaces/_SpaceChildrenPicker.pcss?raw";
import lightTheme from "../../../res/themes/light/css/_light.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../test/telement/browserCss";

/** The DOM SearchBox renders, inside the given containers, outermost first; the clear button shows once focused. */
function renderSearchBox(containers: string[], focused = false): HTMLElement {
    const clearButton = focused
        ? `<div class="mx_AccessibleButton mx_SearchBox_closeButton" role="button" tabindex="-1">
               <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
           </div>`
        : "";
    const searchBox = `
        <div class="mx_SearchBox mx_textinput">
            <input type="text" class="mx_textinput_icon mx_textinput_search" placeholder="Search for rooms or people" />
            ${clearButton}
        </div>
    `;
    document.body.innerHTML = containers.reduceRight(
        (html, container) => `<div class="${container}" style="width: 480px">${html}</div>`,
        searchBox,
    );
    return document.querySelector<HTMLElement>(".mx_SearchBox")!;
}

/** The color a Compound color token resolves to in the light theme. */
function tokenColor(token: string): string {
    const probe = document.createElement("span");
    probe.style.color = `var(${token})`;
    document.querySelector(".cpd-theme-light")!.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}

let stylesheet: HTMLStyleElement;

describe("SearchBox styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundTokens} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} }
            @layer compound-web { ${compoundStyles} }
            ${sharedComponentsStyles}
            @layer app-web {
                ${toBrowserCss(commonStyles, lightTheme)}
                ${toBrowserCss(searchBoxStyles)}
                ${toBrowserCss(spaceChildrenPickerStyles)}
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
        ["a dialog", ["mx_Dialog"]],
        ["a space's room picker", ["mx_Dialog", "mx_SpaceChildrenPicker"]],
        ["a space's home", ["mx_MatrixChat_wrapper", "mx_SpaceRoomView_landing"]],
    ])("is a 36px search pill in %s", (_, containers) => {
        const searchBox = renderSearchBox(containers);

        expect(searchBox.getBoundingClientRect().height).toBe(36);
        expect(cornerRadii(searchBox)).toEqual({ x: 18, y: 18 });
    });

    // The numbers of SearchFieldView, the room list's search field
    it("draws a 20px gray magnifier 12px from the start of the pill and 8px from the text", () => {
        const searchBox = renderSearchBox(["cpd-theme-light", "mx_Dialog"]);
        const style = getComputedStyle(searchBox);
        const icon = getComputedStyle(searchBox, "::before");
        const input = searchBox.querySelector("input")!;

        const border = parseFloat(style.borderLeftWidth);
        expect([icon.width, icon.height]).toEqual(["20px", "20px"]);
        expect(border + parseFloat(icon.left)).toBe(12);
        expect(border + parseFloat(icon.top)).toBe((36 - 20) / 2);
        expect(icon.backgroundColor).toBe(tokenColor("--cpd-color-icon-secondary"));
        // The input's own icon is gone, and its text starts after the magnifier and the gap
        expect(getComputedStyle(input).backgroundImage).toBe("none");
        const textStart = input.getBoundingClientRect().left + parseFloat(getComputedStyle(input).paddingLeft);
        expect(textStart - searchBox.getBoundingClientRect().left).toBe(12 + 20 + 8);
    });

    it("fills the pill without a visible border, and rings it in Compound's focus blue while focused", () => {
        const searchBox = renderSearchBox(["cpd-theme-light", "mx_Dialog"]);
        const style = getComputedStyle(searchBox);
        const probe = document.createElement("span");
        probe.style.backgroundColor = "var(--cpd-color-bg-subtle-secondary)";
        document.querySelector(".cpd-theme-light")!.append(probe);
        const fill = getComputedStyle(probe).backgroundColor;
        probe.remove();

        expect(style.backgroundColor).toBe(fill);
        expect(style.borderTopColor).toBe("rgba(0, 0, 0, 0)");
        expect(style.outlineStyle).toBe("none");
        searchBox.querySelector("input")!.focus();
        expect(getComputedStyle(searchBox).outlineStyle).toBe("solid");
        expect(getComputedStyle(searchBox).outlineWidth).toBe("2px");
        expect(getComputedStyle(searchBox).outlineOffset).toBe("-2px");
        expect(getComputedStyle(searchBox).outlineColor).toBe(tokenColor("--cpd-color-border-focused"));
        // Unfocused again, the pill stays filled
        searchBox.querySelector("input")!.blur();
        searchBox.classList.add("mx_SearchBox_blurred");
        expect(getComputedStyle(searchBox).backgroundColor).toBe(fill);
    });

    // As in SearchFieldView, where the input spans the pill and the magnifier lets clicks through to it
    it("focuses the input from a click anywhere in the pill but the clear button", async () => {
        const searchBox = renderSearchBox(["cpd-theme-light", "mx_Dialog"], true);
        const input = searchBox.querySelector("input")!;
        const pill = searchBox.getBoundingClientRect();
        const clearButton = searchBox.querySelector(".mx_SearchBox_closeButton")!.getBoundingClientRect();
        const middle = pill.top + pill.height / 2;

        const points = [
            ["just inside the start", pill.left + 2, middle],
            ["on the magnifier", pill.left + 22, middle],
            ["between the text and the clear button", clearButton.left - 4, middle],
            ["past the clear button", pill.right - 2, middle],
            ["above the clear button", clearButton.left + clearButton.width / 2, pill.top + 2],
            ["above the text", pill.left + 100, pill.top + 2],
            ["below the text", pill.left + 100, pill.bottom - 2],
        ] as const;
        const missed = points.filter(([, x, y]) => document.elementFromPoint(x, y) !== input).map(([where]) => where);
        expect(missed).toEqual([]);

        await userEvent.click(searchBox, { position: { x: 22, y: pill.height / 2 } });
        expect(document.activeElement).toBe(input);
    });

    it("keeps the magnifier and the clear button's cross in forced colors", async () => {
        const searchBox = renderSearchBox(["cpd-theme-light", "mx_Dialog"], true);
        const cross = searchBox.querySelector(".mx_SearchBox_closeButton svg")!;
        const probe = document.createElement("div");
        probe.style.color = "CanvasText";
        document.body.append(probe);

        await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
        try {
            expect(matchMedia("(forced-colors: active)").matches).toBe(true);
            const canvasText = getComputedStyle(probe).color;
            expect(getComputedStyle(searchBox, "::before").backgroundColor).toBe(canvasText);
            expect(getComputedStyle(cross).color).toBe(canvasText);
        } finally {
            await cdp().send("Emulation.setEmulatedMedia", { features: [] });
        }
    });

    it("draws the clear button as a 16px gray circle in a 28px target 4px from the end of the pill", () => {
        const searchBox = renderSearchBox(["cpd-theme-light", "mx_Dialog"], true);
        const clearButton = searchBox.querySelector<HTMLElement>(".mx_SearchBox_closeButton")!;
        const pill = searchBox.getBoundingClientRect();
        const target = clearButton.getBoundingClientRect();
        const style = getComputedStyle(clearButton);

        expect([target.width, target.height]).toEqual([28, 28]);
        expect(pill.right - target.right).toBe(4);
        expect(target.top - pill.top).toBe(4);
        const input = searchBox.querySelector("input")!;
        const textEnd = input.getBoundingClientRect().right - parseFloat(getComputedStyle(input).paddingRight);
        expect(target.left - textEnd).toBe(8);
        expect(style.backgroundClip).toBe("content-box");
        expect(target.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)).toBe(16);
        expect(cornerRadii(clearButton)).toEqual({ x: 14, y: 14 });
        expect(style.backgroundColor).toBe(tokenColor("--cpd-color-icon-tertiary"));
        expect(getComputedStyle(clearButton.querySelector("svg")!).color).toBe(
            tokenColor("--cpd-color-icon-on-solid-primary"),
        );
    });
});
