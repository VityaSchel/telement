/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InlineField, Label, RadioControl, Root, ToggleControl } from "@vector-im/compound-web";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import tabbedViewStyles from "../../res/css/structures/_TabbedView.pcss?raw";
import settingsDialogStyles from "../../res/css/views/dialogs/_SettingsDialog.pcss?raw";
import themeChoicePanelStyles from "../../res/css/views/settings/_ThemeChoicePanel.pcss?raw";
import deviceSecurityCardStyles from "../../res/css/components/views/settings/devices/_DeviceSecurityCard.pcss?raw";
import settingsSearchStyles from "../../res/css/telement/_SettingsSearch.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import { cornerRadii, toBrowserCss } from "../test/telement/browserCss";
import { settledStyle, tokenColor } from "../test/telement/computedStyle";

const TAB_NAMES = ["Account", "Sessions", "Appearance", "Notifications"];

/**
 * A settings dialog as BaseDialog, UserSettingsDialog and TabbedView render it, with the first tab selected. The
 * dialog's padding, where its title starts, is _common.pcss's .mx_Dialog padding.
 *
 * @param responsive - Whether the tabs collapse to their icons in a narrow window.
 * @param alertTabs - The tabs showing the red dot, as the Encryption tab does until recovery is set up.
 * @param search - Whether the settings search is above the tabs, as in the user settings.
 */
function renderSettingsDialog({
    responsive,
    alertTabs = [],
    search = false,
}: {
    responsive: boolean;
    alertTabs?: string[];
    search?: boolean;
}): HTMLElement {
    const tabs = TAB_NAMES.map(
        (name, index) => `
            <li class="mx_AccessibleButton mx_TabbedView_tabLabel ${index === 0 ? "mx_TabbedView_tabLabel_active" : ""}
                ${alertTabs.includes(name) ? "mx_SettingsDialog_tabLabelsAlert" : ""}"
                role="tab" data-testid="settings-tab-${name}" tabindex="${index === 0 ? 0 : -1}">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
                <span class="mx_TabbedView_tabLabel_text">${name}</span>
            </li>`,
    ).join("");
    document.body.innerHTML = `
        <div class="mx_Dialog mx_UserSettingsDialog" style="position: relative; box-sizing: border-box; width: 900px; height: 600px; padding: 16px 24px 24px">
            <div class="mx_Dialog_header"><h1 class="mx_Dialog_title" style="margin: 0">Settings</h1></div>
            <div class="mx_TabbedView mx_TabbedView_tabsOnLeft ${responsive ? "mx_TabbedView_responsive" : ""}">
                ${search ? `<div class="mx_TabbedView_tabsHeader"><div id="search" style="height: 36px"></div></div>` : ""}
                <ul class="mx_TabbedView_tabLabels" role="tablist">${tabs}</ul>
                <div class="mx_TabbedView_tabPanel"><div class="mx_TabbedView_tabPanelContent"></div></div>
            </div>
        </div>
    `;
    return document.querySelector(".mx_Dialog")!;
}

function tabs(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>(".mx_TabbedView_tabLabel")];
}

let stylesheet: HTMLStyleElement;

describe("Settings dialogs", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} ${telementTokens}
            }
            @layer compound-web { ${compoundStyles} }
            @layer app-web {
                body { margin: 0; }
                ${toBrowserCss(tabbedViewStyles, lightTheme, fontSizes)}
                ${toBrowserCss(settingsDialogStyles, lightTheme, fontSizes)}
                ${toBrowserCss(themeChoicePanelStyles, lightTheme, fontSizes)}
                ${toBrowserCss(deviceSecurityCardStyles, lightTheme, fontSizes)}
                ${toBrowserCss(settingsSearchStyles, lightTheme, fontSizes)}
            }
        `;
        document.head.append(stylesheet);
        document.documentElement.classList.add("cpd-theme-light");
    });

    afterAll(() => {
        stylesheet.remove();
        document.documentElement.classList.remove("cpd-theme-light");
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    describe("tabs", () => {
        it("are 36px pills with the icon centered in their rounded start, on the title's edge", () => {
            const dialog = renderSettingsDialog({ responsive: false });
            const title = dialog.querySelector(".mx_Dialog_title")!.getBoundingClientRect();

            for (const tab of tabs()) {
                const rect = tab.getBoundingClientRect();
                expect(rect.height).toBe(36);
                expect(cornerRadii(tab)).toEqual({ x: 18, y: 18 });
                const icon = tab.querySelector("svg")!.getBoundingClientRect();
                expect([icon.width, icon.height]).toEqual([20, 20]);
                expect([icon.left - rect.left, icon.top - rect.top, rect.bottom - icon.bottom]).toEqual([8, 8, 8]);
                expect(icon.left).toBe(title.left);
                const label = tab.querySelector(".mx_TabbedView_tabLabel_text")!.getBoundingClientRect();
                expect(label.top - rect.top).toBe(rect.bottom - label.bottom);
            }
        });

        it("are 36px circles around their icon when the narrow dialog hides their labels", () => {
            renderSettingsDialog({ responsive: true });
            // The test viewport is narrower than the 1024px below which the labels are hidden
            expect(window.matchMedia("(max-width: 1024px)").matches).toBe(true);

            for (const tab of tabs()) {
                const rect = tab.getBoundingClientRect();
                expect([rect.width, rect.height]).toEqual([36, 36]);
                expect(cornerRadii(tab)).toEqual({ x: 18, y: 18 });
                const icon = tab.querySelector("svg")!.getBoundingClientRect();
                expect([icon.left - rect.left, icon.top - rect.top]).toEqual([8, 8]);
            }
        });
    });

    describe("search", () => {
        it("sits above the tabs at their width, on their edge, the tabs 16px under it", () => {
            renderSettingsDialog({ responsive: false });
            const tabsTop = tabs()[0].getBoundingClientRect().top;
            renderSettingsDialog({ responsive: false, search: true });
            const header = document.querySelector(".mx_TabbedView_tabsHeader")!.getBoundingClientRect();
            const firstTab = tabs()[0].getBoundingClientRect();

            expect(header.top).toBe(tabsTop);
            expect([header.left, header.width, header.height]).toEqual([firstTab.left, 220, 36]);
            expect(firstTab.top - header.bottom).toBe(16);
            expect(getComputedStyle(document.querySelector(".mx_TabbedView_tabsHeader")!).zIndex).toBe("1");
        });

        it("is as wide as the tabs when the narrow dialog shows only their icons, the tabs 16px under it", () => {
            renderSettingsDialog({ responsive: true });
            // The test viewport is narrower than the 1024px up to which the labels are hidden
            expect(window.matchMedia("(max-width: 1024px)").matches).toBe(true);
            const tabsTop = tabs()[0].getBoundingClientRect().top;
            renderSettingsDialog({ responsive: true, search: true });
            const header = document.querySelector(".mx_TabbedView_tabsHeader")!.getBoundingClientRect();
            const firstTab = tabs()[0].getBoundingClientRect();

            expect(header.top).toBe(tabsTop);
            expect([header.left, header.width, header.height]).toEqual([firstTab.left, 36, 36]);
            expect(firstTab.width).toBe(36);
            expect(firstTab.top - header.bottom).toBe(16);
        });

        describe("at the width up to which the tabs' labels are hidden", () => {
            afterEach(async () => {
                await page.viewport(960, 720);
            });

            it.each([
                [1024, 36],
                [1025, 220],
            ])("in a %ipx wide window, is %ipx wide like the tabs", async (windowWidth, width) => {
                await page.viewport(windowWidth, 720);
                renderSettingsDialog({ responsive: true, search: true });

                expect(tabs()[0].getBoundingClientRect().width).toBe(width);
                expect(document.querySelector(".mx_TabbedView_tabsHeader")!.getBoundingClientRect().width).toBe(width);
            });
        });

        it("fills the setting it opened with the accent's tint, to 4px from its card, without flashing under reduced motion", () => {
            document.body.innerHTML = `
                <div class="mx_SettingsSearch_found" id="found"
                    style="--mx-settings-found-start: 12px; --mx-settings-found-end: 12px; --mx-settings-found-block: 10px">
                    Enable Markdown
                </div>
            `;
            const fill = getComputedStyle(document.querySelector("#found")!, "::before");

            expect(fill.backgroundColor).toBe(tokenColor("--tl-accent-500", document.body));
            expect([fill.left, fill.right, fill.top, fill.bottom]).toEqual(["-12px", "-12px", "-10px", "-10px"]);
            expect(fill.borderTopLeftRadius).toBe("8px");
            expect(fill.zIndex).toBe("-1");
            // The browser tests run with reduced motion
            expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
            expect(fill.animationName).toBe("none");
        });
    });

    describe("theme choices", () => {
        it("are 44px pills, concentric with the radio 12px from their top, bottom and start", () => {
            document.body.innerHTML = renderToStaticMarkup(
                createElement(
                    Root,
                    { className: "mx_ThemeChoicePanel_ThemeSelectors" },
                    ["Light", "Dark", "High contrast"].map((name, index) =>
                        createElement(
                            InlineField,
                            {
                                key: name,
                                name: "themeSelector",
                                className: `mx_ThemeChoicePanel_themeSelector ${index === 0 ? "mx_ThemeChoicePanel_themeSelector_enabled" : ""}`,
                                control: createElement(RadioControl, {
                                    name: "themeSelector",
                                    value: name,
                                    defaultChecked: index === 0,
                                }),
                            },
                            createElement(Label, { className: "mx_ThemeChoicePanel_themeSelector_Label" }, name),
                        ),
                    ),
                ),
            );

            const chips = [...document.querySelectorAll<HTMLElement>(".mx_ThemeChoicePanel_themeSelector")];
            expect(chips).toHaveLength(3);
            for (const chip of chips) {
                const rect = chip.getBoundingClientRect();
                expect(rect.height).toBe(44);
                // The radio's 10px radius and the 12px around it
                expect(cornerRadii(chip)).toEqual({ x: 22, y: 22 });
                const radio = chip.querySelector("input")!.getBoundingClientRect();
                expect([radio.width, radio.height]).toEqual([20, 20]);
                // From the chip's outer edge, its 1px border included
                expect([radio.left - rect.left, radio.top - rect.top, rect.bottom - radio.bottom]).toEqual([
                    12, 12, 12,
                ]);
                const body = chip.lastElementChild!.getBoundingClientRect();
                expect(rect.right - body.right).toBe(12);
            }
        });

        it("label their options in the size and weight of the panel's Match system theme switch", () => {
            document.body.innerHTML =
                renderToStaticMarkup(
                    createElement(
                        Root,
                        {},
                        createElement(
                            InlineField,
                            { name: "systemTheme", control: createElement(ToggleControl, { name: "systemTheme" }) },
                            createElement(Label, { id: "other" }, "Match system theme"),
                        ),
                    ),
                ) +
                renderToStaticMarkup(
                    createElement(
                        Root,
                        { className: "mx_ThemeChoicePanel_ThemeSelectors" },
                        createElement(
                            InlineField,
                            {
                                name: "themeSelector",
                                className: "mx_ThemeChoicePanel_themeSelector",
                                control: createElement(RadioControl, { name: "themeSelector", value: "light" }),
                            },
                            createElement(
                                Label,
                                { id: "theme", className: "mx_ThemeChoicePanel_themeSelector_Label" },
                                "Light",
                            ),
                        ),
                    ),
                );

            const [theme, other] = ["theme", "other"].map((id) => getComputedStyle(document.getElementById(id)!));
            expect([theme.fontSize, theme.fontWeight]).toEqual([other.fontSize, other.fontWeight]);
        });
    });

    describe("session security card", () => {
        it("rounds as a row (8px) like the other boxes in settings cards, its icon tile to 4px 17px from its corner", () => {
            document.body.innerHTML = `
                <div class="mx_DeviceSecurityCard" style="width: 600px">
                    <div class="mx_DeviceSecurityCard_icon Verified"><svg width="16" height="16"></svg></div>
                    <div class="mx_DeviceSecurityCard_content">
                        <p class="mx_DeviceSecurityCard_heading">Verified session</p>
                    </div>
                </div>
            `;
            const card = document.querySelector(".mx_DeviceSecurityCard")!;
            const icon = document.querySelector(".mx_DeviceSecurityCard_icon")!;

            expect(cornerRadii(card)).toEqual({ x: 8, y: 8 });
            expect(cornerRadii(icon)).toEqual({ x: 4, y: 4 });
            const cardRect = card.getBoundingClientRect();
            const iconRect = icon.getBoundingClientRect();
            // 12 less the inset is below zero, so the tile takes the inline radius rather than a concentric one
            expect([iconRect.left - cardRect.left, iconRect.top - cardRect.top]).toEqual([17, 17]);
        });
    });
});

/** Each theme's class with the theme stylesheets it is built from, in the order its entry point imports them. */
const THEMES: [string, string[]][] = [
    ["cpd-theme-light", [lightTheme]],
    ["cpd-theme-dark", [lightTheme, darkTheme]],
];

describe("Settings dialog tab selection", () => {
    beforeAll(() => {
        // Each theme's variables apply within its own class, as each theme is a separate stylesheet in the app
        const themed = THEMES.map(
            ([theme, sources]) =>
                `.${theme} { ${toBrowserCss(tabbedViewStyles + settingsDialogStyles, ...sources, fontSizes)} }`,
        ).join("\n");
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, shared-components, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic}
                ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
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
    });

    afterEach(async () => {
        await userEvent.unhover(document.body);
        document.body.innerHTML = "";
    });

    /** Renders the dialog inside a container of the theme, as the app's root carries the theme's class. */
    function renderInTheme(theme: string, alertTabs?: string[]): HTMLElement {
        renderSettingsDialog({ responsive: false, alertTabs });
        const container = document.createElement("div");
        container.className = theme;
        container.append(...document.body.childNodes);
        document.body.append(container);
        return container;
    }

    function tab(name: string): HTMLElement {
        return document.querySelector<HTMLElement>(`[data-testid="settings-tab-${name}"]`)!;
    }

    describe.each(THEMES.map(([theme]) => theme))("in %s", (theme) => {
        it("marks the selected tab with the room list's selection plate, its label and icon in white", () => {
            const container = renderInTheme(theme);
            const selected = settledStyle(tab("Account"));
            const onSelection = tokenColor("--tl-color-on-selection", container);

            expect(selected.backgroundColor).toBe(tokenColor("--tl-color-bg-selection", container));
            expect(selected.color).toBe(onSelection);
            expect(getComputedStyle(tab("Account").querySelector("svg")!).color).toBe(onSelection);
            expect(settledStyle(tab("Sessions")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        });

        it("fills a hovered tab in the room list's hover gray, and darkens the selected plate on hover", async () => {
            const container = renderInTheme(theme);

            await userEvent.hover(tab("Sessions"));
            const hovered = settledStyle(tab("Sessions"));
            expect(hovered.backgroundColor).toBe(tokenColor("--cpd-color-bg-action-tertiary-hovered", container));
            expect(hovered.color).toBe(tokenColor("--cpd-color-text-primary", container));

            await userEvent.hover(tab("Account"));
            const selected = settledStyle(tab("Account"));
            expect(selected.backgroundColor).toBe(tokenColor("--tl-color-bg-selection-hovered", container));
            expect(selected.color).toBe(tokenColor("--tl-color-on-selection", container));
        });

        it("draws the alert dot in white on the selected tab, and red on the others", () => {
            const container = renderInTheme(theme, ["Account", "Notifications"]);
            const dot = (name: string): string => getComputedStyle(tab(name), "::after").backgroundColor;

            expect(dot("Account")).toBe(tokenColor("--tl-color-on-selection", container));
            expect(dot("Notifications")).toBe(tokenColor("--cpd-color-icon-critical-primary", container));
        });
    });
});
