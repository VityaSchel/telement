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
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundLightHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-base.css?raw";
import compoundLightHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-semantic.css?raw";
import compoundDarkHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-hc-base.css?raw";
import compoundDarkHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-hc-semantic.css?raw";
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
import darkTheme from "../../../../res/themes/dark/css/_dark.pcss?raw";
import lightHighContrastTheme from "../../../../res/themes/light-high-contrast/css/_light-high-contrast.pcss?raw";
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

const THEMES: [string, string[]][] = [
    ["cpd-theme-light", [lightTheme]],
    ["cpd-theme-dark", [lightTheme, darkTheme]],
    ["cpd-theme-light-hc", [lightTheme, lightHighContrastTheme]],
    ["cpd-theme-dark-hc", [lightTheme, darkTheme]],
];

let stylesheet: HTMLStyleElement;
let unloadInter: () => void;

beforeAll(async () => {
    unloadInter = await loadInter();
    const themed = THEMES.map(
        ([theme, sources]) => `.${theme} {
            ${APP_STYLES.map((styles) => toBrowserCss(styles, ...sources, commonStyles, fontSizes)).join("\n")}
        }`,
    ).join("\n");
    stylesheet = document.createElement("style");
    stylesheet.textContent = `
        @layer compound-tokens, shared-components, app-web;
        @layer compound-tokens {
            ${compoundBase} ${compoundSemantic}
            ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
            ${compoundLightHcTheme} ${compoundLightHcSemantic} ${compoundDarkHcTheme} ${compoundDarkHcSemantic}
        }
        @layer shared-components { ${telementTokens} }
        @layer app-web {
            body { margin: 0; }
            ${themed}
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

const pillButton = (title: string): string => `
    <div class="mx_AccessibleButton mx_SpacePillButton" role="button">
        <svg viewBox="0 0 24 24"></svg>
        <h3>${title}</h3>
        <div>Anyone can join.</div>
    </div>
`;

interface Placement {
    /** The space panel's end and top, under the macOS app's title bar. */
    panelEnd: number;
    panelTop: number;
    /** The + button's top. */
    buttonTop: number;
}

const PLACEMENT: Placement = { panelEnd: 68, panelTop: 32, buttonTop: 120 };

/**
 * The popover as ContextMenu draws SpaceCreateMenu's steps in its focus lock, placed by usePlacementBesideSpacePanel's
 * properties.
 */
function render(body: string, placement: Partial<Placement> = {}, theme = "cpd-theme-light"): HTMLElement {
    const { panelEnd, panelTop, buttonTop } = { ...PLACEMENT, ...placement };
    const stage = document.createElement("div");
    stage.className = theme;
    // The theme defines the emoji font, which the app's font stack refers to; without it, Compound's font tokens fail
    stage.style.cssText = "--emoji-font-family: ''; font-family: Inter";
    stage.innerHTML = `
        <div class="mx_ContextualMenu_wrapper mx_SpaceCreateMenu_wrapper" style="--space-panel-end: ${panelEnd}px;
            --space-panel-top: ${panelTop}px; --space-panel-button-top: ${buttonTop}px">
            <div class="mx_ContextualMenu_background"></div>
            <div class="mx_ContextualMenu">
                <div data-focus-guard="true" tabindex="0" style="width: 1px; height: 0px; padding: 0px;
                    overflow: hidden; position: fixed; top: 1px; left: 1px"></div>
                <div data-focus-lock-disabled="false">${body}</div>
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
    <form class="mx_SpaceBasicSettings" style="height: 300px"></form>
    <div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary" role="button">
        Create
    </div>
`;

/** A step taller than the window. */
const TALL_STEP = SECOND_STEP.replace("height: 300px", "height: 2000px");

describe("The Create a space popover", () => {
    it("lays its content out on the dialogs' 24px edge, with corners following its 8px cards", () => {
        const panel = render(FIRST_STEP);
        const outer = panel.getBoundingClientRect();
        const content = [
            ...panel.querySelectorAll<HTMLElement>("p, .mx_SpacePillButton, .mx_AccessibleButton_kind_primary_outline"),
        ];

        expect(outer.width).toBe(480);
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

    it("titles itself in Compound's 20px semibold, 16px from the top", () => {
        const panel = render(FIRST_STEP);
        const title = panel.querySelector("h2")!;
        const style = getComputedStyle(title);

        expect([style.fontSize, style.fontWeight, style.lineHeight]).toEqual(["20px", "600", "28px"]);
        expect(title.getBoundingClientRect().top - panel.getBoundingClientRect().top).toBe(16);
        expect(title.getBoundingClientRect().left + parseFloat(style.paddingInlineStart)).toBe(
            panel.getBoundingClientRect().left + 24,
        );
    });

    it("puts the second step's back button on the title's line, 16px from the top and the start", () => {
        const panel = render(SECOND_STEP);
        const outer = panel.getBoundingClientRect();
        const back = panel.querySelector(".mx_SpaceCreateMenu_back")!.getBoundingClientRect();
        const title = panel.querySelector("h2")!;
        const textStart = title.getBoundingClientRect().left + parseFloat(getComputedStyle(title).paddingInlineStart);

        expect([back.width, back.height, back.top - outer.top, back.left - outer.left]).toEqual([28, 28, 16, 16]);
        expect(title.getBoundingClientRect().top - outer.top).toBe(16);
        expect(textStart - back.right).toBe(8);
    });

    it.each(THEMES.map(([theme]) => theme))("floats over the app without dimming it (%s)", (theme) => {
        const panel = render(FIRST_STEP, {}, theme);
        const style = getComputedStyle(panel);
        const background = panel.parentElement!.querySelector(".mx_ContextualMenu_background")!;
        // A menu, such as a space's
        const menu = document.createElement("div");
        menu.className = "mx_ContextualMenu";
        panel.parentElement!.parentElement!.append(menu);
        const menuStyle = getComputedStyle(menu);

        expect(getComputedStyle(background).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(style.boxShadow).toBe(menuStyle.boxShadow);
        expect(style.boxShadow).not.toBe("none");
        expect(style.backgroundColor).toBe(menuStyle.backgroundColor);
        expect([style.borderTopWidth, style.borderTopColor]).toEqual([
            menuStyle.borderTopWidth,
            menuStyle.borderTopColor,
        ]);
    });

    it("closes on a click anywhere but the macOS app's title bar, which still drags the window", () => {
        const panel = render(FIRST_STEP);
        const background = panel.parentElement!.querySelector(".mx_ContextualMenu_background")!;
        const { left, top, right, bottom } = background.getBoundingClientRect();

        // The space panel too, whose + button is among what closes it
        expect([left, top, right, bottom]).toEqual([0, 32, innerWidth, innerHeight]);
        expect(document.elementFromPoint(34, 130)).toBe(background);
        expect(document.elementFromPoint(34, 16)).not.toBe(background);
        expect(document.elementFromPoint(panel.getBoundingClientRect().left + 100, 130)).not.toBe(background);
    });

    it("opens 4px beside the space panel, level with the + button, at either step", () => {
        for (const step of [FIRST_STEP, SECOND_STEP]) {
            const box = render(step).getBoundingClientRect();
            expect([box.left, box.top]).toEqual([72, 120]);
            document.body.innerHTML = "";
        }
    });

    it("moves up to stay 8px inside the window, as far as each step needs", () => {
        const buttonTop = innerHeight - 60;
        const first = render(FIRST_STEP, { buttonTop }).getBoundingClientRect();
        document.body.innerHTML = "";
        const second = render(SECOND_STEP, { buttonTop }).getBoundingClientRect();

        expect([first.bottom, second.bottom]).toEqual([innerHeight - 8, innerHeight - 8]);
        expect(second.top).toBeLessThan(first.top);
    });

    it("scrolls in a window too small for it, 8px clear of the title bar and the window's bottom", () => {
        const panel = render(TALL_STEP);
        const box = panel.getBoundingClientRect();
        const scroller = panel.querySelector("[data-focus-lock-disabled]")!;
        const back = panel.querySelector(".mx_SpaceCreateMenu_back")!;

        expect([box.top, box.bottom]).toEqual([40, innerHeight - 8]);
        expect(getComputedStyle(panel).overflow).toBe("hidden");
        expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);

        scroller.scrollTop = scroller.scrollHeight;
        // Its end is on the bottom edge and the back button has scrolled away with the title
        const create = panel.querySelector(".mx_AccessibleButton_kind_primary")!.getBoundingClientRect();
        expect(box.bottom - create.bottom).toBe(24);
        expect(back.getBoundingClientRect().bottom).toBeLessThan(box.top);
    });

    it("narrows in a narrow window, with its cards", () => {
        const panelEnd = innerWidth - 400;
        const panel = render(FIRST_STEP, { panelEnd });
        const box = panel.getBoundingClientRect();

        expect([box.left, box.right]).toEqual([panelEnd + 4, innerWidth - 8]);
        for (const card of panel.querySelectorAll(".mx_SpacePillButton")) {
            const { left, right } = card.getBoundingClientRect();
            expect([left - box.left, box.right - right]).toEqual([24, 24]);
        }
        const scroller = panel.querySelector("[data-focus-lock-disabled]")!;
        expect(scroller.scrollWidth).toBe(scroller.clientWidth);
    });
});
