/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InlineField, Label, RadioControl, Root } from "@vector-im/compound-web";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import tabbedViewStyles from "../../res/css/structures/_TabbedView.pcss?raw";
import themeChoicePanelStyles from "../../res/css/views/settings/_ThemeChoicePanel.pcss?raw";
import deviceSecurityCardStyles from "../../res/css/components/views/settings/devices/_DeviceSecurityCard.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { cornerRadii, toBrowserCss } from "../test/telement/browserCss";

const TAB_NAMES = ["Account", "Sessions", "Appearance", "Notifications"];

/**
 * A settings dialog as BaseDialog and TabbedView render it. The dialog's 40px inline padding, where its title starts,
 * is _common.pcss's .mx_Dialog padding.
 */
function renderSettingsDialog({ responsive }: { responsive: boolean }): HTMLElement {
    const tabs = TAB_NAMES.map(
        (name, index) => `
            <li class="mx_AccessibleButton mx_TabbedView_tabLabel ${index === 0 ? "mx_TabbedView_tabLabel_active" : ""}"
                role="tab" tabindex="${index === 0 ? 0 : -1}">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
                <span class="mx_TabbedView_tabLabel_text">${name}</span>
            </li>`,
    ).join("");
    document.body.innerHTML = `
        <div class="mx_Dialog" style="position: relative; box-sizing: border-box; width: 900px; height: 600px; padding: 32px 40px">
            <div class="mx_Dialog_header"><h1 class="mx_Dialog_title" style="margin: 0; font-size: 24px">Settings</h1></div>
            <div class="mx_TabbedView mx_TabbedView_tabsOnLeft ${responsive ? "mx_TabbedView_responsive" : ""}">
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
                ${toBrowserCss(themeChoicePanelStyles, lightTheme, fontSizes)}
                ${toBrowserCss(deviceSecurityCardStyles, lightTheme, fontSizes)}
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

    describe("theme choices", () => {
        it("are 44px chips rounded as rows, with the radio 12px from their top, bottom and start", () => {
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
                expect(cornerRadii(chip)).toEqual({ x: 8, y: 8 });
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
    });

    describe("session security card", () => {
        it("is a 12px card holding its icon tile rounded to the 4px floor, 17px from its corner", () => {
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

            expect(cornerRadii(card)).toEqual({ x: 12, y: 12 });
            expect(cornerRadii(icon)).toEqual({ x: 4, y: 4 });
            const cardRect = card.getBoundingClientRect();
            const iconRect = icon.getBoundingClientRect();
            // 12 less the inset is below zero, so the tile takes the inline radius rather than a concentric one
            expect([iconRect.left - cardRect.left, iconRect.top - cardRect.top]).toEqual([17, 17]);
        });
    });
});
