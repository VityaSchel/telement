/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CheckboxInput, MenuTitle, RadioInput, ToggleInput } from "@vector-im/compound-web";
import { OverflowHorizontalIcon, ReactionIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
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
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import contextualMenuStyles from "../../res/css/structures/_ContextualMenu.pcss?raw";
import genericDropdownMenuStyles from "../../res/css/structures/_GenericDropdownMenu.pcss?raw";
import kebabContextMenuStyles from "../../res/css/components/views/context_menus/_KebabContextMenu.pcss?raw";
import iconizedContextMenuStyles from "../../res/css/views/context_menus/_IconizedContextMenu.pcss?raw";
import compoundOverrides from "../../res/css/telement/_CompoundOverrides.pcss?raw";
import dropdownStyles from "../../res/css/views/elements/_Dropdown.pcss?raw";
import toggleSwitchStyles from "../../res/css/views/elements/_ToggleSwitch.pcss?raw";
import autocompleteStyles from "../../res/css/views/rooms/_Autocomplete.pcss?raw";
import presenceLabelStyles from "../../res/css/views/rooms/_PresenceLabel.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import lightHighContrastTheme from "../../res/themes/light-high-contrast/css/_light-high-contrast.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";

/**
 * Each theme's class with the theme stylesheets it is built from, in the order its entry point imports them. Dark high
 * contrast is the dark theme on a system that asks for more contrast.
 */
const THEMES: [string, string[]][] = [
    ["cpd-theme-light", [lightTheme]],
    ["cpd-theme-dark", [lightTheme, darkTheme]],
    ["cpd-theme-light-hc", [lightTheme, lightHighContrastTheme]],
    ["cpd-theme-dark-hc", [lightTheme, darkTheme]],
];

const isDark = (theme: string): boolean => theme.startsWith("cpd-theme-dark");

// A button drawn with _common.pcss's icon button mixin, as the composer's buttons call it
const ICON_BUTTON = `
    .iconButton {
        @mixin composerButton 50%, var(--cpd-color-icon-primary), var(--cpd-color-bg-subtle-primary);
    }
`;

const APP_STYLES =
    ICON_BUTTON +
    kebabContextMenuStyles +
    presenceLabelStyles +
    commonStyles +
    contextualMenuStyles +
    iconizedContextMenuStyles +
    genericDropdownMenuStyles +
    autocompleteStyles +
    dropdownStyles +
    toggleSwitchStyles +
    compoundOverrides;

/**
 * Every kind of floating surface: a legacy menu, the server picker's menu, the autocomplete, a dropdown, a dialog and a
 * Compound menu, with the dividers between their groups or under their title.
 */
const FLOATING_SURFACES = `
    <div class="mx_ContextualMenu" data-surface="menu">
        <ul class="mx_IconizedContextMenu">
            <li class="mx_IconizedContextMenu_optionList"></li>
            <li class="mx_IconizedContextMenu_optionList" data-divider></li>
        </ul>
    </div>
    <div class="mx_ContextualMenu_wrapper mx_GenericDropdownMenu_wrapper">
        <div class="mx_ContextualMenu" data-surface="server picker">
            <span class="mx_GenericDropdownMenu_divider" data-divider></span>
        </div>
    </div>
    <div class="mx_Autocomplete" data-surface="autocomplete">
        <div class="mx_Autocomplete_ProviderSection"></div>
        <div class="mx_Autocomplete_ProviderSection" data-divider></div>
    </div>
    <ul class="mx_Dropdown_menu" data-surface="dropdown"></ul>
    <div class="mx_Dialog" data-surface="dialog"></div>
    <div class="_menu_1x5h1_8" role="menu" data-surface="compound menu">
        ${renderToStaticMarkup(createElement(MenuTitle, { title: "Title" }))}
    </div>
`;

const icon = (Icon: typeof ReactionIcon, className?: string): string =>
    renderToStaticMarkup(createElement(Icon, { className }));

/** The relative luminance of an `rgb()` color, as WCAG defines it. */
function luminance(color: string): number {
    const [r, g, b] = color
        .match(/\d+(\.\d+)?/g)!
        .slice(0, 3)
        .map((channel) => {
            const value = Number(channel) / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG's contrast ratio between two `rgb()` colors. */
function contrast(a: string, b: string): number {
    const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (lighter + 0.05) / (darker + 0.05);
}

let stylesheet: HTMLStyleElement;

describe("Telement's chrome colors", () => {
    beforeAll(() => {
        // Each theme's variables apply within its own class, as each theme is a separate stylesheet in the app
        const themed = THEMES.map(
            ([theme, sources]) => `.${theme} {
                ${toBrowserCss(APP_STYLES, commonStyles, fontSizes, ...sources)}
            }`,
        ).join("\n");
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic}
                ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
                ${compoundLightHcTheme} ${compoundLightHcSemantic} ${compoundDarkHcTheme} ${compoundDarkHcSemantic}
            }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} }
            @layer app-web { ${themed} }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(async () => {
        await userEvent.unhover(document.body);
        document.body.innerHTML = "";
    });

    function render(theme: string, html: string): HTMLElement {
        const container = document.createElement("div");
        container.className = theme;
        container.innerHTML = html;
        document.body.append(container);
        return container;
    }

    describe.each(THEMES.map(([theme]) => theme))("in %s", (theme) => {
        it("draws icon buttons in the secondary icon gray, and the primary one on hover", async () => {
            const container = render(
                theme,
                `<div class="iconButton" role="button" aria-label="Emoji">${icon(ReactionIcon)}</div>`,
            );
            const button = container.querySelector<HTMLElement>(".iconButton")!;
            const glyph = button.querySelector("svg")!;

            expect(getComputedStyle(glyph).color).toBe(tokenColor("--cpd-color-icon-secondary", container));
            await userEvent.hover(button);
            expect(getComputedStyle(glyph).color).toBe(tokenColor("--cpd-color-icon-primary", container));
        });

        it("draws the kebab menu's icon in the same gray", () => {
            const container = render(theme, icon(OverflowHorizontalIcon, "mx_KebabContextMenu_icon"));

            expect(getComputedStyle(container.querySelector("svg")!).color).toBe(
                tokenColor("--cpd-color-icon-secondary", container),
            );
        });

        it("writes the online presence label in the accent", () => {
            const container = render(theme, `<div class="mx_PresenceLabel mx_PresenceLabel_online">Online</div>`);

            expect(getComputedStyle(container.firstElementChild!).color).toBe(
                tokenColor("--cpd-color-text-action-accent", container),
            );
        });

        it("draws white on the accent fills, 4:1 or 7:1 in high contrast, not on Compound's primary buttons", () => {
            const container = render(theme, "");
            const fill = tokenColor("--cpd-color-bg-accent-rest", container);
            const onAccent = tokenColor("--tl-color-on-accent", container);

            expect(onAccent).toBe("rgb(255, 255, 255)");
            expect(contrast(onAccent, fill)).toBeGreaterThanOrEqual(theme.endsWith("-hc") ? 6.8 : 4);
            // Text, icons and lines keep the accent itself
            expect(tokenColor("--cpd-color-text-action-accent", container)).toBe(
                tokenColor("--tl-accent-900", container),
            );
            // A dark theme's primary button is a light fill with the page's color on it
            expect(tokenColor("--cpd-color-text-on-solid-primary", container)).toBe(
                tokenColor("--cpd-color-bg-canvas-default", container),
            );
        });

        it("draws the check, dot and knob on Compound's checked controls and the legacy toggle in white", () => {
            const container = render(
                theme,
                renderToStaticMarkup(createElement(CheckboxInput, { defaultChecked: true })) +
                    renderToStaticMarkup(createElement(RadioInput, { defaultChecked: true })) +
                    renderToStaticMarkup(createElement(ToggleInput, { defaultChecked: true })) +
                    `<div class="mx_ToggleSwitch mx_ToggleSwitch_on mx_ToggleSwitch_enabled">
                        <div class="mx_ToggleSwitch_ball"></div>
                    </div>`,
            );
            const fill = tokenColor("--cpd-color-bg-accent-rest", container);
            const [checkbox, radio, toggle] = container.querySelectorAll<HTMLElement>("input + div");

            for (const control of [checkbox, radio, toggle]) {
                expect(getComputedStyle(control).backgroundColor).toBe(fill);
            }
            expect(getComputedStyle(checkbox.querySelector("svg")!).color).toBe("rgb(255, 255, 255)");
            expect(getComputedStyle(radio, "::after").backgroundColor).toBe("rgb(255, 255, 255)");
            expect(getComputedStyle(toggle, "::after").backgroundColor).toBe("rgb(255, 255, 255)");

            expect(getComputedStyle(container.querySelector(".mx_ToggleSwitch")!).backgroundColor).toBe(fill);
            expect(getComputedStyle(container.querySelector(".mx_ToggleSwitch_ball")!).backgroundColor).toBe(
                "rgb(255, 255, 255)",
            );
        });

        it("draws Compound's info blue in the accent, so that it is the only blue", () => {
            const container = render(theme, "");
            const color = (token: string): string => tokenColor(token, container);

            expect({
                icon: color("--cpd-color-icon-info-primary"),
                text: color("--cpd-color-text-info-primary"),
                badge: color("--cpd-color-bg-badge-info"),
                badgeText: color("--cpd-color-text-badge-info"),
                subtle: color("--cpd-color-bg-info-subtle"),
                border: color("--cpd-color-border-info-subtle"),
            }).toEqual({
                icon: color("--cpd-color-icon-accent-primary"),
                text: color("--tl-accent-1100"),
                badge: color("--cpd-color-bg-badge-accent"),
                badgeText: color("--cpd-color-text-badge-accent"),
                subtle: color("--tl-accent-200"),
                border: color("--tl-accent-700"),
            });
        });

        it("rings focus in the accent, a step deeper in light themes so that a focused label is 4.5:1", () => {
            const container = render(theme, "");
            const focused = tokenColor("--cpd-color-border-focused", container);

            expect(focused).toBe(tokenColor(isDark(theme) ? "--tl-accent-900" : "--tl-accent-1000", container));
            expect(contrast(focused, tokenColor("--cpd-color-bg-canvas-default", container))).toBeGreaterThanOrEqual(
                4.5,
            );
        });

        it("raises menus, the autocomplete, dropdowns and dialogs above a dark page, and the fills in them", () => {
            const container = render(theme, FLOATING_SURFACES);
            const color = (token: string, scope: Element = container): string => tokenColor(token, scope);
            const page = color("--cpd-color-bg-canvas-default");
            const raised = color("--cpd-color-bg-canvas-default-level-1");
            // In dark themes, each fill inside a surface is a gray step further than on the page, so that it shows
            const fills = isDark(theme)
                ? {
                      "--cpd-color-bg-action-secondary-rest": raised,
                      "--cpd-color-bg-action-secondary-hovered": color("--cpd-color-gray-400"),
                      "--cpd-color-bg-action-secondary-pressed": color("--cpd-color-gray-500"),
                      "--cpd-color-bg-action-tertiary-rest": raised,
                      "--cpd-color-bg-action-tertiary-hovered": color("--cpd-color-gray-400"),
                      "--cpd-color-bg-action-tertiary-selected": color("--cpd-color-gray-500"),
                      "--cpd-color-bg-subtle-secondary": color("--cpd-color-gray-400"),
                      "--cpd-color-bg-subtle-primary": color("--cpd-color-gray-500"),
                      "--cpd-color-separator-primary": color("--cpd-color-gray-500"),
                  }
                : Object.fromEntries(
                      [
                          "--cpd-color-bg-action-secondary-rest",
                          "--cpd-color-bg-action-secondary-hovered",
                          "--cpd-color-bg-action-secondary-pressed",
                          "--cpd-color-bg-action-tertiary-rest",
                          "--cpd-color-bg-action-tertiary-hovered",
                          "--cpd-color-bg-action-tertiary-selected",
                          "--cpd-color-bg-subtle-secondary",
                          "--cpd-color-bg-subtle-primary",
                          "--cpd-color-separator-primary",
                      ].map((token) => [token, color(token)]),
                  );

            const surfaces = [...container.querySelectorAll<HTMLElement>("[data-surface]")];
            // What a surface holds in the page's color, such as a field's floated label, takes the surface's color
            const drawn = (surface: HTMLElement): Record<string, string> => ({
                "background": getComputedStyle(surface).backgroundColor,
                "--cpd-color-bg-canvas-default": color("--cpd-color-bg-canvas-default", surface),
                ...Object.fromEntries(Object.keys(fills).map((token) => [token, color(token, surface)])),
            });

            // The lines between groups, and the one under the title of Compound's menu
            const dividers = [
                ...[...container.querySelectorAll("[data-divider]")].map(
                    (divider) => getComputedStyle(divider).borderTopColor,
                ),
                getComputedStyle(container.querySelector("[class*='_menu-title_']")!).borderBottomColor,
            ];

            expect(raised === page).toBe(!isDark(theme));
            expect(dividers).toEqual(dividers.map(() => fills["--cpd-color-separator-primary"]));
            expect(Object.fromEntries(surfaces.map((surface) => [surface.dataset.surface, drawn(surface)]))).toEqual(
                Object.fromEntries(
                    surfaces.map((surface) => [
                        surface.dataset.surface,
                        { "background": raised, "--cpd-color-bg-canvas-default": raised, ...fills },
                    ]),
                ),
            );
        });
    });
});
