/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CheckboxInput, Glass, MenuTitle, RadioInput, ToggleInput } from "@vector-im/compound-web";
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
import autocompleteInputStyles from "../../res/css/structures/_AutocompleteInput.pcss?raw";
import contextualMenuStyles from "../../res/css/structures/_ContextualMenu.pcss?raw";
import genericDropdownMenuStyles from "../../res/css/structures/_GenericDropdownMenu.pcss?raw";
import kebabContextMenuStyles from "../../res/css/components/views/context_menus/_KebabContextMenu.pcss?raw";
import iconizedContextMenuStyles from "../../res/css/views/context_menus/_IconizedContextMenu.pcss?raw";
import compoundOverrides from "../../res/css/telement/_CompoundOverrides.pcss?raw";
import spotlightDialogStyles from "../../res/css/views/dialogs/_SpotlightDialog.pcss?raw";
import dropdownStyles from "../../res/css/views/elements/_Dropdown.pcss?raw";
import styledRadioButtonStyles from "../../res/css/views/elements/_StyledRadioButton.pcss?raw";
import toggleSwitchStyles from "../../res/css/views/elements/_ToggleSwitch.pcss?raw";
import baseCardStyles from "../../res/css/views/right_panel/_BaseCard.pcss?raw";
import autocompleteStyles from "../../res/css/views/rooms/_Autocomplete.pcss?raw";
import presenceLabelStyles from "../../res/css/views/rooms/_PresenceLabel.pcss?raw";
import joinRuleSettingsStyles from "../../res/css/views/settings/_JoinRuleSettings.pcss?raw";
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
    autocompleteInputStyles +
    contextualMenuStyles +
    iconizedContextMenuStyles +
    genericDropdownMenuStyles +
    spotlightDialogStyles +
    autocompleteStyles +
    dropdownStyles +
    styledRadioButtonStyles +
    toggleSwitchStyles +
    baseCardStyles +
    joinRuleSettingsStyles +
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

/** The `rgb()` color the screen shows for `rgb()` or `rgba()` colors painted over each other, the bottom one first. */
function composite(bottom: string, ...layers: string[]): string {
    const channels = (color: string): number[] => color.match(/\d+(\.\d+)?/g)!.map(Number);
    const result = channels(bottom).slice(0, 3);
    for (const layer of layers) {
        const [r, g, b, alpha = 1] = channels(layer);
        [r, g, b].forEach((channel, i) => (result[i] = alpha * channel + (1 - alpha) * result[i]));
    }
    return `rgb(${result.join(", ")})`;
}

/** Compound's own menu class, so that a menu drawn with it has Compound's shadow for Telement's to replace. */
const COMPOUND_MENU_CLASS = compoundStyles.match(/\.(_menu_[\da-z]+_\d+)\s*\{/)![1];

/** Compound's menu shadow, which light themes keep, and the much darker one menus have in dark themes. */
const FLOATING_SHADOW = {
    light: "rgba(0, 0, 0, 0.1) 0px 4px 24px 0px",
    dark: "rgba(0, 0, 0, 0.5) 0px 4px 16px 0px",
};

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
                      "--cpd-color-bg-canvas-disabled": color("--cpd-color-gray-400"),
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
                          "--cpd-color-bg-canvas-disabled",
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

        it("sets menus, pickers and the autocomplete off what they cover with a shadow, much darker in dark themes", () => {
            // A raised dark menu is the incoming bubble's gray, so over a bubble only its shadow and border show its edge
            const container = render(
                theme,
                `<div class="mx_ContextualMenu" data-menu="menu"></div>
                <div class="mx_ContextualMenu_wrapper mx_BaseCard_header_title">
                    <div class="mx_ContextualMenu" data-menu="right panel menu"></div>
                </div>
                <div class="mx_Autocomplete" data-menu="autocomplete"></div>
                <div class="mx_AutocompleteInput_matches" data-menu="invite suggestions"></div>
                <div class="${COMPOUND_MENU_CLASS}" role="menu" data-menu="compound menu"></div>`,
            );
            const menus = [...container.querySelectorAll<HTMLElement>("[data-menu]")];
            const shadow = isDark(theme) ? FLOATING_SHADOW.dark : FLOATING_SHADOW.light;

            expect(
                Object.fromEntries(menus.map((menu) => [menu.dataset.menu, getComputedStyle(menu).boxShadow])),
            ).toEqual(Object.fromEntries(menus.map((menu) => [menu.dataset.menu, shadow])));
        });

        it("keeps a dialog's Glass frame apart from the dialog's body, which dark themes raise", () => {
            const container = render(
                theme,
                `<div class="mx_Dialog_background"></div>
                <div class="mx_Dialog_wrapper">
                    ${renderToStaticMarkup(
                        createElement(Glass, {
                            className: "mx_Dialog_border",
                            children: createElement("div", { className: "mx_Dialog" }),
                        }),
                    )}
                </div>`,
            );
            const page = tokenColor("--cpd-color-bg-canvas-default", container);
            const backdrop = getComputedStyle(container.querySelector(".mx_Dialog_background")!).backgroundColor;
            const frame = getComputedStyle(container.querySelector(".mx_Dialog_border")!).backgroundColor;
            const body = getComputedStyle(container.querySelector(".mx_Dialog")!).backgroundColor;

            // Light themes keep Compound's frame
            expect(frame).toBe(
                tokenColor(isDark(theme) ? "--cpd-color-alpha-gray-600" : "--cpd-color-alpha-gray-400", container),
            );
            // The frame shows over the dimmed page at least as far from the body as before dark dialogs were raised
            expect(contrast(composite(page, backdrop, frame), body)).toBeGreaterThanOrEqual(1.2);
        });

        it("keeps a disabled switch's track on the same side of a dialog's gray as of the page's", () => {
            const toggles =
                renderToStaticMarkup(createElement(ToggleInput, { disabled: true })) +
                `<div class="mx_ToggleSwitch"><div class="mx_ToggleSwitch_ball"></div></div>`;
            const container = render(theme, `<div>${toggles}</div><div class="mx_Dialog">${toggles}</div>`);
            const [page, dialog] = [...container.children] as HTMLElement[];
            const tracks = (scope: HTMLElement): string[] =>
                [scope.querySelector("input + div")!, scope.querySelector(".mx_ToggleSwitch")!].map(
                    (track) => getComputedStyle(track).backgroundColor,
                );
            const side = (track: string, surface: string): number => Math.sign(luminance(track) - luminance(surface));
            const pageGray = tokenColor("--cpd-color-bg-canvas-default", container);
            const dialogGray = getComputedStyle(dialog).backgroundColor;

            // The separator a disabled track is filled with is a step lighter than a dark page, so a dark dialog raises it
            expect(tracks(dialog)).toEqual(
                tracks(page).map((track) => (isDark(theme) ? tokenColor("--cpd-color-gray-500", container) : track)),
            );
            expect(tracks(dialog).map((track) => side(track, dialogGray))).toEqual(
                tracks(page).map((track) => side(track, pageGray)),
            );
        });

        /** Compound's switch and the legacy one, off and on, enabled and disabled, on the page and in a dialog. */
        function renderSwitches(): { page: HTMLElement; dialog: HTMLElement } {
            const legacy = (classes: string): string =>
                `<div class="mx_ToggleSwitch ${classes}"><div class="mx_ToggleSwitch_ball"></div></div>`;
            const switches = [
                renderToStaticMarkup(createElement(ToggleInput, { "aria-label": "off" })),
                renderToStaticMarkup(createElement(ToggleInput, { "aria-label": "on", "defaultChecked": true })),
                renderToStaticMarkup(createElement(ToggleInput, { "aria-label": "disabled off", "disabled": true })),
                renderToStaticMarkup(
                    createElement(ToggleInput, {
                        "aria-label": "disabled on",
                        "disabled": true,
                        "defaultChecked": true,
                    }),
                ),
                legacy("mx_ToggleSwitch_enabled"),
                legacy("mx_ToggleSwitch_enabled mx_ToggleSwitch_on"),
                legacy(""),
                legacy("mx_ToggleSwitch_on"),
            ].join("");
            const container = render(theme, `<div>${switches}</div><div class="mx_Dialog">${switches}</div>`);
            const [page, dialog] = [...container.children] as HTMLElement[];
            return { page, dialog };
        }

        /** The track and knob of each switch in `scope`, in the order renderSwitches() draws them. */
        function switchParts(scope: HTMLElement): { track: HTMLElement; knob: CSSStyleDeclaration }[] {
            const compound = [...scope.querySelectorAll<HTMLElement>("input[role='switch'] + div")].map((track) => ({
                track,
                knob: getComputedStyle(track, "::after"),
            }));
            const legacy = [...scope.querySelectorAll<HTMLElement>(".mx_ToggleSwitch")].map((track) => ({
                track,
                knob: getComputedStyle(track.querySelector(".mx_ToggleSwitch_ball")!),
            }));
            return [...compound, ...legacy];
        }

        it("fills an off switch's track with the separator gray, Compound's outline gray in high contrast", () => {
            const { page, dialog } = renderSwitches();

            for (const scope of [page, dialog]) {
                // A dialog's color is also the settings cards' (telement/tokens.css)
                const surface =
                    scope === dialog
                        ? getComputedStyle(dialog).backgroundColor
                        : tokenColor("--cpd-color-bg-canvas-default", scope);
                const fill = tokenColor(
                    theme.endsWith("-hc") ? "--cpd-color-border-interactive-primary" : "--cpd-color-separator-primary",
                    scope,
                );
                const [compoundOff, , , , legacyOff] = switchParts(scope);

                for (const { track } of [compoundOff, legacyOff]) {
                    const style = getComputedStyle(track);
                    expect(style.backgroundColor).toBe(fill);
                    // The border stays for forced colors, in the track's color
                    expect([style.borderTopWidth, style.borderTopColor]).toEqual(["1px", fill]);
                    // Telegram's track is under 3:1, so high contrast themes have the outline's 3:1 instead
                    expect(contrast(fill, surface)).toBeGreaterThanOrEqual(theme.endsWith("-hc") ? 3 : 1.2);
                }
            }
        });

        it("draws a white knob with a soft shadow on an enabled switch, off and on alike", () => {
            const { page, dialog } = renderSwitches();

            for (const scope of [page, dialog]) {
                const [compoundOff, compoundOn, , , legacyOff, legacyOn] = switchParts(scope);
                for (const { knob } of [compoundOff, compoundOn, legacyOff, legacyOn]) {
                    expect(knob.backgroundColor).toBe("rgb(255, 255, 255)");
                    expect(knob.boxShadow).toBe(
                        "rgba(0, 0, 0, 0.25) 0px 1px 3px 0px, rgba(0, 0, 0, 0.2) 0px 0px 1px 0px",
                    );
                }
            }
        });

        it("keeps a disabled switch's knob flat, in Compound's disabled gray when off, on the filled track", () => {
            const { page, dialog } = renderSwitches();

            for (const scope of [page, dialog]) {
                const separator = tokenColor("--cpd-color-separator-primary", scope);
                const disabledGray = tokenColor("--cpd-color-bg-action-primary-disabled", scope);
                const [, , compoundOff, compoundOn, , , legacyOff, legacyOn] = switchParts(scope);

                for (const { track, knob } of [compoundOff, legacyOff]) {
                    expect(getComputedStyle(track).backgroundColor).toBe(separator);
                    expect(getComputedStyle(track).borderTopColor).toBe(separator);
                    expect([knob.backgroundColor, knob.boxShadow]).toEqual([disabledGray, "none"]);
                }
                for (const { track, knob } of [compoundOn, legacyOn]) {
                    expect(getComputedStyle(track).backgroundColor).toBe(disabledGray);
                    expect([knob.backgroundColor, knob.boxShadow]).toEqual(["rgb(255, 255, 255)", "none"]);
                }
            }
        });

        it("draws the settings' join rule dividers in a dialog as its other separators", () => {
            const settings = `
                <label class="mx_StyledRadioButton mx_JoinRuleSettings_radioButton"></label>
                <span>Anyone can find and join.</span>
                <label class="mx_StyledRadioButton mx_JoinRuleSettings_radioButton" data-divider="join rule"></label>
            `;
            const container = render(theme, `<div>${settings}</div><div class="mx_Dialog">${settings}</div>`);
            const [page, dialog] = [...container.children] as HTMLElement[];
            const dividers = (scope: HTMLElement): Record<string, string> =>
                Object.fromEntries(
                    [...scope.querySelectorAll<HTMLElement>("[data-divider]")].map((divider) => [
                        divider.dataset.divider,
                        getComputedStyle(divider).borderTopColor,
                    ]),
                );
            const all = (color: string): Record<string, string> => ({ "join rule": color });

            expect(dividers(page)).toEqual(all(tokenColor("--cpd-color-separator-primary", container)));
            expect(dividers(dialog)).toEqual(all(tokenColor("--cpd-color-separator-primary", dialog)));
            expect(tokenColor("--cpd-color-separator-primary", dialog)).toBe(
                tokenColor(isDark(theme) ? "--cpd-color-gray-500" : "--cpd-color-separator-primary", container),
            );
        });

        it("fills the legacy radio when checked like Compound's, with a white dot, and outlines its option in the accent", () => {
            const container = render(
                theme,
                `<div class="mx_Dialog">
                    <label class="mx_StyledRadioButton mx_StyledRadioButton_enabled mx_StyledRadioButton_outlined
                        mx_StyledRadioButton_checked">
                        <input type="radio" checked />
                        <div><div></div></div>
                        <div class="mx_StyledRadioButton_content">Noisy</div>
                        <div class="mx_StyledRadioButton_spacer"></div>
                    </label>
                </div>`,
            );
            const radio = container.querySelector<HTMLElement>(".mx_StyledRadioButton")!;
            const ring = radio.querySelector("input + div")!;
            const accent = tokenColor("--tl-accent-900", container);
            const fill = tokenColor("--cpd-color-bg-accent-rest", container);
            // Dark high contrast's deeper fill is under 3:1 against dark surfaces, so its ring is the accent's border
            const edge =
                theme === "cpd-theme-dark-hc" ? tokenColor("--cpd-color-border-accent-primary", container) : fill;

            expect({
                ring: getComputedStyle(ring).borderTopColor,
                fill: getComputedStyle(ring).backgroundColor,
                dot: getComputedStyle(ring.firstElementChild!).backgroundColor,
                outline: getComputedStyle(radio).borderTopColor,
            }).toEqual({ ring: edge, fill, dot: tokenColor("--tl-color-on-accent", container), outline: accent });
        });

        it("fills the search dialog's selected recent room with the subtle fill, a step further in a dark dialog", () => {
            const container = render(
                theme,
                `<div class="mx_Dialog_wrapper mx_SpotlightDialog_wrapper">
                    <div class="mx_Dialog_border">
                        <div class="mx_Dialog">
                            <div class="mx_SpotlightDialog" role="dialog">
                                <div class="mx_SpotlightDialog_searchBox mx_textinput"><input type="text" /></div>
                                <div id="mx_SpotlightDialog_content" role="listbox">
                                    <div class="mx_SpotlightDialog_section mx_SpotlightDialog_recentlyViewed">
                                        <div>
                                            <div class="mx_SpotlightDialog_option" role="option" aria-selected="true">
                                                Design
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`,
            );
            // The options show which is selected only while the search field has the focus
            container.querySelector("input")!.focus();
            const option = container.querySelector(".mx_SpotlightDialog_option")!;

            // Light themes keep the gray it had; a dark theme's raised dialog moves it a step further, as the dialog
            expect(getComputedStyle(option).backgroundColor).toBe(
                tokenColor(isDark(theme) ? "--cpd-color-gray-500" : "--cpd-color-gray-400", container),
            );
        });
    });
});
