/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../../../res/css/_common.pcss?raw";
import fontSizes from "../../../../res/css/_font-sizes.pcss?raw";
import contextualMenuStyles from "../../../../res/css/structures/_ContextualMenu.pcss?raw";
import spacePillButtonStyles from "../../../../res/css/structures/_SpacePillButton.pcss?raw";
import spaceCreateMenuStyles from "../../../../res/css/views/spaces/_SpaceCreateMenu.pcss?raw";
import accessibleButtonStyles from "../../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../../test/telement/browserCss";
import { loadInter } from "../../../test/telement/fonts";

/** In the order _components.pcss imports them. */
const APP_STYLES = [
    commonStyles,
    contextualMenuStyles,
    spacePillButtonStyles,
    accessibleButtonStyles,
    spaceCreateMenuStyles,
];

let stylesheet: HTMLStyleElement;
let unloadInter: () => void;

beforeAll(async () => {
    unloadInter = await loadInter();
    stylesheet = document.createElement("style");
    stylesheet.textContent = `
        @layer compound-tokens, shared-components, app-web;
        @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} }
        @layer shared-components { ${telementTokens} }
        @layer app-web {
            body { margin: 0; }
            .cpd-theme-light {
                ${APP_STYLES.map((styles) => toBrowserCss(styles, lightTheme, commonStyles, fontSizes)).join("\n")}
            }
        }
    `;
    document.head.append(stylesheet);
});

afterAll(() => {
    stylesheet.remove();
    unloadInter();
});

afterEach(() => {
    document.body.innerHTML = "";
});

const CLOSE_BUTTON = `
    <div class="mx_AccessibleButton mx_Dialog_cancelButton" role="button" aria-label="Close dialog">
        <svg viewBox="0 0 24 24"></svg>
    </div>
`;

const pillButton = (title: string): string => `
    <div class="mx_AccessibleButton mx_SpacePillButton" role="button">
        <svg viewBox="0 0 24 24"></svg>
        <h3>${title}</h3>
        <div>Anyone can join.</div>
    </div>
`;

/** The panel as ContextMenu draws SpaceCreateMenu's steps: the step's body, then the close button. */
function render(body: string): HTMLElement {
    const stage = document.createElement("div");
    stage.className = "cpd-theme-light";
    // The theme defines the emoji font, which the app's font stack refers to; without it, Compound's font tokens fail
    stage.style.cssText = "--emoji-font-family: ''; font-family: Inter";
    stage.innerHTML = `
        <div class="mx_ContextualMenu_wrapper mx_SpaceCreateMenu_wrapper" style="top: 62px; left: 72px">
            <div class="mx_ContextualMenu_background"></div>
            <div class="mx_ContextualMenu mx_ContextualMenu_left" role="menu">
                <div>${body}${CLOSE_BUTTON}</div>
            </div>
        </div>
    `;
    document.body.append(stage);
    return stage.querySelector(".mx_ContextualMenu")!;
}

const FIRST_STEP = `
    <h2>Create a space</h2>
    <p>Spaces are a way to organize and discover rooms.</p>
    ${pillButton("Public")}
    ${pillButton("Private")}
    <div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary_outline" role="button">
        Search for public spaces
    </div>
`;

const SECOND_STEP = `
    <div class="mx_AccessibleButton mx_SpaceCreateMenu_back" role="button" aria-label="Go back">
        <svg viewBox="0 0 24 24"></svg>
    </div>
    <h2>Your public space</h2>
    <p>Add some details to help people recognize it.</p>
    <div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary" role="button">
        Create
    </div>
`;

describe("The Create a space panel", () => {
    it("lays its content out on the dialogs' 24px edge, with corners following its 8px cards", () => {
        const panel = render(FIRST_STEP);
        const outer = panel.getBoundingClientRect();
        const content = [
            ...panel.querySelectorAll<HTMLElement>("p, .mx_SpacePillButton, .mx_AccessibleButton_kind_primary_outline"),
        ];

        expect(getComputedStyle(panel).borderRadius).toBe("32px");
        expect(getComputedStyle(panel.querySelector(".mx_SpacePillButton")!).borderRadius).toBe("8px");
        for (const element of content) {
            expect(element.getBoundingClientRect().left - outer.left).toBe(24);
        }
        for (const card of panel.querySelectorAll(".mx_SpacePillButton")) {
            expect(outer.right - card.getBoundingClientRect().right).toBe(24);
        }
        expect(outer.bottom - content.at(-1)!.getBoundingClientRect().bottom).toBe(24);
    });

    it("titles itself in Compound's 20px semibold on the close button's line, 16px from the top", () => {
        const panel = render(FIRST_STEP);
        const outer = panel.getBoundingClientRect();
        const title = panel.querySelector("h2")!;
        const close = panel.querySelector(".mx_Dialog_cancelButton")!.getBoundingClientRect();
        const style = getComputedStyle(title);

        expect([style.fontSize, style.fontWeight, style.lineHeight]).toEqual(["20px", "600", "28px"]);
        expect(title.getBoundingClientRect().top - outer.top).toBe(16);
        expect([close.width, close.height, close.top - outer.top, outer.right - close.right]).toEqual([28, 28, 16, 16]);
        expect(close.left - (title.getBoundingClientRect().right - parseFloat(style.paddingInlineEnd))).toBe(8);
    });

    it("puts the second step's back button on the title's line, as far from the start as the close button from the end", () => {
        const panel = render(SECOND_STEP);
        const outer = panel.getBoundingClientRect();
        const back = panel.querySelector(".mx_SpaceCreateMenu_back")!.getBoundingClientRect();
        const close = panel.querySelector(".mx_Dialog_cancelButton")!.getBoundingClientRect();
        const title = panel.querySelector("h2")!;
        const textStart = title.getBoundingClientRect().left + parseFloat(getComputedStyle(title).paddingInlineStart);

        expect([back.width, back.height, back.top, back.left - outer.left]).toEqual([28, 28, close.top, 16]);
        expect(title.getBoundingClientRect().top - outer.top).toBe(16);
        expect(textStart - back.right).toBe(8);
    });
});
