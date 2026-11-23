/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChevronDownIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import fontSizes from "../../../../res/css/_font-sizes.pcss?raw";
import accessibleButtonStyles from "../../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import jumpToBottomButtonStyles from "../../../../res/css/views/rooms/_JumpToBottomButton.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../../test/telement/browserCss";
import { tokenColor } from "../../../test/telement/computedStyle";

/** The DOM JumpToBottomButton renders with an unread count, inside the positioned timeline it sits on. */
function render(style = "", count = 12, states = ""): void {
    const chevron = renderToStaticMarkup(createElement(ChevronDownIcon));
    document.body.innerHTML = `
        <div class="cpd-theme-light" id="timeline" style="position: relative; width: 320px; height: 240px; ${style}">
            <div class="mx_JumpToBottomButton ${states}">
                <div class="mx_AccessibleButton mx_JumpToBottomButton_scrollDown" role="button" tabindex="0"
                    aria-label="Scroll to most recent messages">${chevron}</div>
                <div class="mx_JumpToBottomButton_badge">${count}</div>
            </div>
        </div>
    `;
}

function element(selector: string): HTMLElement {
    return document.querySelector<HTMLElement>(selector)!;
}

function rect(selector: string): DOMRect {
    return element(selector).getBoundingClientRect();
}

function centerX(box: DOMRect): number {
    return box.left + box.width / 2;
}

function centerY(box: DOMRect): number {
    return box.top + box.height / 2;
}

let stylesheet: HTMLStyleElement;

describe("JumpToBottomButton styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} }
            @layer app-web {
                ${accessibleButtonStyles}
                ${toBrowserCss(jumpToBottomButtonStyles, fontSizes, lightTheme)}
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

    it("makes the button a 36px circle, as high as the other controls", () => {
        render();

        const button = rect(".mx_JumpToBottomButton_scrollDown");
        expect(button.width).toBe(36);
        expect(button.height).toBe(36);
        expect(cornerRadii(element(".mx_JumpToBottomButton_scrollDown"))).toEqual({ x: 18, y: 18 });
    });

    it("keeps the button 24px above the timeline's bottom, with room below it for the badge", () => {
        render();

        expect(rect(".mx_JumpToBottomButton").height).toBe(48);
        expect(rect("#timeline").bottom - rect(".mx_JumpToBottomButton_scrollDown").bottom).toBe(24);
    });

    it("takes the button's size from --tl-control-size", () => {
        render("--tl-control-size: 40px");

        const button = rect(".mx_JumpToBottomButton_scrollDown");
        expect(button.width).toBe(40);
        expect(button.height).toBe(40);
        expect(rect("#timeline").bottom - button.bottom).toBe(24);
    });

    it("centers the badge and the 24px chevron on the button", () => {
        render();

        const button = rect(".mx_JumpToBottomButton_scrollDown");
        expect(centerX(rect(".mx_JumpToBottomButton_badge"))).toBeCloseTo(centerX(button), 1);

        const icon = element(".mx_JumpToBottomButton_scrollDown svg");
        const iconStyle = getComputedStyle(icon);
        const iconBox = icon.getBoundingClientRect();
        expect(iconBox.width - parseFloat(iconStyle.paddingLeft) - parseFloat(iconStyle.paddingRight)).toBe(24);
        expect(iconBox.height - parseFloat(iconStyle.paddingTop) - parseFloat(iconStyle.paddingBottom)).toBe(24);
        expect(iconBox.left + parseFloat(iconStyle.paddingLeft) + 12).toBeCloseTo(centerX(button), 0);
    });

    it.each<[number, (width: number) => void]>([
        [1, (width) => expect(width).toBe(20)],
        [12, (width) => expect(width).toBeGreaterThan(20)],
        [120, (width) => expect(width).toBeGreaterThan(20)],
    ])(
        "makes the badge for %i unread messages 20px tall, a circle for one digit and a pill for more",
        (count, checkWidth) => {
            render("", count);
            const badge = element(".mx_JumpToBottomButton_badge");
            const { width, height } = badge.getBoundingClientRect();

            expect(height).toBe(20);
            checkWidth(width);
            expect(cornerRadii(badge)).toEqual({ x: 10, y: 10 });
        },
    );

    it.each([1, 12, 120])("centers the badge for %i on the middle of the button's bottom edge", (count) => {
        render("", count);
        const button = rect(".mx_JumpToBottomButton_scrollDown");
        const badge = rect(".mx_JumpToBottomButton_badge");

        expect(centerX(badge)).toBeCloseTo(centerX(button), 1);
        expect(centerY(badge)).toBeCloseTo(button.bottom, 1);
    });

    it.each([1, 12, 120])("centers the digits of %i in the badge, as far from its top as from its bottom", (count) => {
        render("", count);
        const badge = element(".mx_JumpToBottomButton_badge");
        // A box with no height on the text's baseline, and one as tall as the digits in the badge's font
        badge.insertAdjacentHTML("beforeend", '<span style="display: inline-block; width: 0; height: 0"></span>');
        const baseline = badge.lastElementChild!.getBoundingClientRect().top;
        const capHeightProbe = document.createElement("div");
        capHeightProbe.style.cssText = "position: absolute; height: 1cap";
        badge.append(capHeightProbe);
        const capHeight = capHeightProbe.getBoundingClientRect().height;
        const box = badge.getBoundingClientRect();

        expect(Math.abs(baseline - capHeight - box.top - (box.bottom - baseline))).toBeLessThanOrEqual(0.5);
    });

    it.each([
        ["", "a room that isn't muted"],
        ["mx_JumpToBottomButton_highlight", "a room with mentions"],
        ["mx_JumpToBottomButton_highlight mx_JumpToBottomButton_muted", "a muted room with mentions"],
    ])("draws the count as the room list's accent counter, white on the accent (%j: %s)", (states) => {
        render("", 12, states);
        const timeline = element("#timeline");
        const badge = getComputedStyle(element(".mx_JumpToBottomButton_badge"));

        expect(badge.backgroundColor).toBe(tokenColor("--cpd-color-bg-accent-rest", timeline));
        expect(badge.color).toBe(tokenColor("--tl-color-on-accent", timeline));
    });

    it("draws the count of a muted room as the room list's gray counter", () => {
        render("", 12, "mx_JumpToBottomButton_muted");
        const timeline = element("#timeline");
        const badge = getComputedStyle(element(".mx_JumpToBottomButton_badge"));

        expect(badge.backgroundColor).toBe(tokenColor("--cpd-color-icon-secondary", timeline));
        expect(badge.color).toBe(tokenColor("--cpd-color-text-on-solid-primary", timeline));
    });

    it("centers the chevron vertically too, inside the button's border", () => {
        render();

        const button = rect(".mx_JumpToBottomButton_scrollDown");
        const icon = element(".mx_JumpToBottomButton_scrollDown svg");
        const iconBox = icon.getBoundingClientRect();
        expect(iconBox.top + parseFloat(getComputedStyle(icon).paddingTop) + 12).toBeCloseTo(centerY(button), 1);
    });
});
