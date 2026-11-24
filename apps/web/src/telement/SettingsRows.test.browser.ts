/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Form, SettingsToggleInput } from "@vector-im/compound-web";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundLightHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-base.css?raw";
import compoundLightHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundDarkHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-hc-base.css?raw";
import compoundDarkHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-hc-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
// The package doesn't export its stylesheets on their own
// eslint-disable-next-line no-restricted-imports
import actionRowStyles from "../../../../packages/shared-components/src/telement/settings/ActionRowView/ActionRowView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import settingsRowStyles from "../../../../packages/shared-components/src/telement/settings/SettingsRow.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import tabbedViewStyles from "../../res/css/structures/_TabbedView.pcss?raw";
import settingsSubsectionStyles from "../../res/css/components/views/settings/shared/_SettingsSubsection.pcss?raw";
import settingsSubsectionHeadingStyles from "../../res/css/components/views/settings/shared/_SettingsSubsectionHeading.pcss?raw";
import settingsDialogStyles from "../../res/css/views/dialogs/_SettingsDialog.pcss?raw";
import settingsFieldsetStyles from "../../res/css/views/settings/_SettingsFieldset.pcss?raw";
import settingsSectionStyles from "../../res/css/views/settings/tabs/_SettingsSection.pcss?raw";
import settingsTabStyles from "../../res/css/views/settings/tabs/_SettingsTab.pcss?raw";
import headingStyles from "../../res/css/views/typography/_Heading.pcss?raw";
import compoundOverrides from "../../res/css/telement/_CompoundOverrides.pcss?raw";
import notificationTargetsStyles from "../../res/css/telement/_NotificationTargets.pcss?raw";
import settingsSearchStyles from "../../res/css/telement/_SettingsSearch.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import lightHcTheme from "../../res/themes/light-high-contrast/css/_light-high-contrast.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import { cornerRadii, toBrowserCss } from "../test/telement/browserCss";
import { composite, contrastOver, sendCdp, tokenColor } from "../test/telement/computedStyle";
import { loadInter } from "../test/telement/fonts";
import { FOUND_CLASS, revealSetting } from "./settings/revealSetting";

/** In the order _components.pcss imports them, after _common.pcss, as in the app's bundle. */
const APP_STYLES = [
    commonStyles,
    tabbedViewStyles,
    settingsSubsectionStyles,
    settingsSubsectionHeadingStyles,
    settingsDialogStyles,
    settingsFieldsetStyles,
    settingsSectionStyles,
    settingsTabStyles,
    headingStyles,
    compoundOverrides,
    notificationTargetsStyles,
    settingsSearchStyles,
];

/** Each theme's class with the theme stylesheets it is built from, in the order its entry point imports them. */
const THEMES: [string, string[]][] = [
    ["cpd-theme-light", [lightTheme]],
    ["cpd-theme-dark", [lightTheme, darkTheme]],
    ["cpd-theme-light-hc", [lightTheme, lightHcTheme]],
    ["cpd-theme-dark-hc", [lightTheme, darkTheme]],
];

/** A CSS module's stylesheet with its local class names prefixed by the module's name, as the library build does. */
function moduleCss(source: string, name: string): string {
    return source.replace(/\.(-?[_a-zA-Z][\w-]*)/g, `.${name}_$1`);
}

/** The id of the tab the tests render, as TabbedView ids its panel. */
const TAB_ID = "USER_HELP_TAB";

let stylesheet: HTMLStyleElement;
let removeInter: () => void;

beforeAll(async () => {
    removeInter = await loadInter();
    // Each theme's variables apply within its own class, as each theme is a separate stylesheet in the app. Keyframes
    // are global, so their rules stay outside
    const themed = THEMES.map(
        ([theme, sources]) =>
            `.${theme} { ${APP_STYLES.map((styles) => toBrowserCss(styles, ...sources, commonStyles, fontSizes))
                .join("\n")
                .replace(/@keyframes [^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "")} }`,
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
        @layer shared-components {
            ${telementTokens} ${moduleCss(settingsRowStyles, "SettingsRow")} ${moduleCss(actionRowStyles, "ActionRow")}
        }
        @layer app-web {
            body { margin: 0; }
            ${themed}
        }
        ${[...settingsSearchStyles.matchAll(/@keyframes [^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g)].join("\n")}
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

/** Renders `sections` as a tab of the user settings dialog, as BaseDialog, TabbedView and SettingsTab lay it out. */
function renderTab(theme: string, sections: string): void {
    document.body.innerHTML = `
        <div class="${theme}" style="--emoji-font-family: ''; font-family: Inter">
            <div class="mx_Dialog" style="width: 932px; height: 680px; box-sizing: border-box">
                <div class="mx_UserSettingsDialog" role="dialog">
                    <div class="mx_SettingsDialog_content">
                        <div class="mx_TabbedView mx_TabbedView_tabsOnLeft">
                            <ul class="mx_TabbedView_tabLabels" role="tablist"></ul>
                            <div class="mx_TabbedView_tabPanel" role="tabpanel" id="mx_tabpanel_${TAB_ID}">
                                <div class="mx_AutoHideScrollbar mx_TabbedView_tabPanelContent">
                                    <div class="mx_SettingsTab"><div class="mx_SettingsTab_sections">${sections}</div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function get(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`nothing matches ${selector}`);
    return element;
}

function box(selector: string): DOMRect {
    return get(selector).getBoundingClientRect();
}

/** Where the text of an element is drawn. */
function textBox(element: Element): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect();
}

/** A SettingsSubsection as it renders inside a section, with the heading its group is labelled by. */
const subsection = (heading: string, content: string, description = ""): string => `
    <div class="mx_SettingsSubsection">
        <div class="mx_SettingsSubsectionHeading">
            <h3 class="mx_Heading_h4 mx_SettingsSubsectionHeading_heading">${heading}</h3>
        </div>
        ${content && `<div class="mx_SettingsSubsection_content" data-card>${content}</div>`}
        ${
            description &&
            `<div class="mx_SettingsSubsection_description" ${content ? "" : "data-card"}>
                <div class="mx_SettingsSubsection_text">${description}</div>
            </div>`
        }
    </div>
`;

/** A legacy SettingsSection, whose whole content is a card when it holds no groups. */
const section = (heading: string, children: string, card = false): string => `
    <div class="mx_SettingsSection">
        ${heading && `<h2 class="mx_Heading_h3">${heading}</h2>`}
        <div class="mx_SettingsSection_subSections" ${card ? "data-card" : ""}>${children}</div>
    </div>
`;

/** A settings row (ActionRowView, ValueRowView): its label, and a value in secondary text. */
const row = (label: string, kind = "", value = ""): string => `
    <button type="button" class="SettingsRow_row SettingsRow_interactive ${kind && `ActionRow_${kind}`}" data-settings-row="">
        <span class="SettingsRow_text"><span class="SettingsRow_label" data-text>${label}</span></span>
        ${value && `<span class="SettingsRow_end"><span class="SettingsRow_value" data-text>${value}</span></span>`}
    </button>
`;

/** A toggle with a help message, in the form it needs. */
const toggle = (label: string): string =>
    renderToStaticMarkup(
        createElement(
            Form.Root,
            {},
            createElement(SettingsToggleInput, { name: label, label, helpMessage: "Only applies to new messages" }),
        ),
    );

describe.each(THEMES.map(([theme]) => theme))("Settings rows in %s", (theme) => {
    describe("a setting search opened", () => {
        /** What each kind of place search opens is drawn on, and where search finds it. */
        const PLACES: [string, string, string | undefined, string | undefined][] = [
            [
                "an action row",
                subsection("Advanced", row("Clear cache and reload", "critical")),
                "Advanced",
                "Clear cache and reload",
            ],
            [
                "an accent row",
                subsection("Versions", row("Check for update", "accent", "No update available.")),
                "Versions",
                "Check for update",
            ],
            [
                "a value row",
                subsection("Language", row("Application language", "", "English")),
                "Language",
                "Application language",
            ],
            ["a toggle", subsection("Composer", toggle("Enable Markdown")), "Composer", "Enable Markdown"],
            ["a group's card", subsection("Composer", toggle("Enable Markdown")), "Composer", undefined],
            ["a group without content", subsection("FAQ", "", "For help, see here."), "FAQ", undefined],
            ["a section's card", section("Microphone", toggle("Noise suppression"), true), "Microphone", undefined],
            [
                "a section that holds groups",
                section(
                    "Moderation",
                    `${subsection("Invites", toggle("Hide avatars"))}${subsection("Rooms", "<p>Rooms</p>")}`,
                ),
                "Moderation",
                undefined,
            ],
        ];

        /** Opens the place, and gives what is found with its fill as it is painted over the card. */
        function reveal(
            content: string,
            group?: string,
            label?: string,
        ): { found: HTMLElement; fill: CSSStyleDeclaration; card: string; ground: string } {
            renderTab(
                theme,
                content.startsWith('\n    <div class="mx_SettingsSection"') ? content : section("", content),
            );
            revealSetting(TAB_ID, group, label);
            const found = get(`.${FOUND_CLASS}`);
            const card = getComputedStyle(found.closest("[data-card]")!).backgroundColor;
            const fill = getComputedStyle(found, "::before");
            const [red, green, blue] = composite(fill.backgroundColor, card);
            return { found, fill, card, ground: `rgb(${red}, ${green}, ${blue})` };
        }

        it.each(PLACES)("fills %s apart from its card and from the pane around it", (_name, content, group, label) => {
            const { fill, card, ground } = reveal(content, group, label);
            const pane = getComputedStyle(get(".mx_TabbedView_tabPanel")).backgroundColor;

            expect(card).not.toBe("rgba(0, 0, 0, 0)");
            expect(contrastOver(ground, card)).toBeGreaterThanOrEqual(1.4);
            expect(contrastOver(ground, pane)).toBeGreaterThanOrEqual(1.25);
            // The browser tests run with reduced motion, which holds the fill
            expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
            expect([fill.animationName, fill.opacity, fill.content]).toEqual(["none", "1", '""']);
        });

        it.each(PLACES.filter(([, content]) => content.includes("data-text") || content.includes("label")))(
            "keeps the text of %s at 4.5:1 on the fill",
            (_name, content, group, label) => {
                const { found, ground } = reveal(content, group, label);
                const texts = [
                    ...found.querySelectorAll<HTMLElement>("[data-text], label, [id$='help'], span, p"),
                ].filter((element) => !element.children.length && element.textContent?.trim());

                expect(texts.length).toBeGreaterThan(0);
                const unreadable = texts.filter((text) => contrastOver(getComputedStyle(text).color, ground) < 4.5);
                expect(unreadable.map((text) => text.textContent)).toEqual([]);
            },
        );

        it("reaches 4px from the card's sides, rounded like a row, and fills a group's whole card", () => {
            reveal(subsection("Composer", toggle("Enable Markdown")), "Composer", "Enable Markdown");
            const fill = getComputedStyle(get(`.${FOUND_CLASS}`), "::before");
            const rowBox = box(`.${FOUND_CLASS}`);
            const card = box("[data-card]");
            expect(rowBox.left + parseFloat(fill.left) - card.left).toBeCloseTo(4, 2);
            expect(card.right - (rowBox.right - parseFloat(fill.right))).toBeCloseTo(4, 2);
            expect(fill.borderTopLeftRadius).toBe("8px");

            const { found } = reveal(subsection("Composer", toggle("Enable Markdown")), "Composer");
            expect([getComputedStyle(found, "::before").borderTopLeftRadius, cornerRadii(found).x]).toEqual([
                "12px",
                12,
            ]);
        });

        describe("without reduced motion", () => {
            beforeAll(async () => {
                await sendCdp("Emulation.setEmulatedMedia", {
                    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
                });
            });

            // Back to the browser tests' own
            afterAll(async () => {
                await sendCdp("Emulation.setEmulatedMedia", {
                    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
                });
            });

            it("starts and holds at the whole fill, then fades out", () => {
                const { found } = reveal(subsection("Composer", toggle("Enable Markdown")), "Composer");
                const flash = document
                    .getAnimations()
                    .find((animation) => (animation as CSSAnimation).animationName === "mx_SettingsSearch_flash")!;
                const opacityAt = (time: number): number => {
                    flash.currentTime = time;
                    return Number(getComputedStyle(found, "::before").opacity);
                };

                flash.pause();
                expect([opacityAt(0), opacityAt(1000)]).toEqual([1, 1]);
                expect(opacityAt(1700)).toBeLessThan(1);
                expect(opacityAt(2000)).toBe(0);
            });
        });
    });

    describe("notification targets", () => {
        /** A target as NotificationTargets renders it: a value row without a menu. */
        const target = (device: string, app: string): string => `
            <li>
                <div class="SettingsRow_row" data-settings-row="" aria-disabled="true">
                    <span class="SettingsRow_text"><span class="SettingsRow_label">${device}</span></span>
                    <span class="SettingsRow_end"><span class="SettingsRow_value">${app}</span></span>
                </div>
            </li>
        `;

        it("are 44px rows one after another on a card labelled like the others, the app at the end in secondary text", () => {
            renderTab(
                theme,
                section(
                    "",
                    subsection(
                        "Notification targets",
                        `<ul class="mx_NotificationTargets" data-settings-row="">
                            ${target("Pixel 8", "Element X")}
                            ${target("alice@example.org", "Email Notifications, sent by a homeserver with a very long name indeed")}
                        </ul>`,
                    ),
                ),
            );
            const card = box("[data-card]");
            const rows = [...document.querySelectorAll<HTMLElement>(".SettingsRow_row")].map((element) =>
                element.getBoundingClientRect(),
            );

            expect(card.top - box(".mx_SettingsSubsectionHeading").bottom).toBe(8);
            expect(rows.map(({ height }) => height)).toEqual([44, 44]);
            // 4px from the card's top and bottom, as the rows' fill is from its sides, and touching each other
            expect([rows[0].top - card.top, rows[1].top - rows[0].bottom, card.bottom - rows[1].bottom]).toEqual([
                4, 0, 4,
            ]);
            expect([rows[0].left - card.left, card.right - rows[0].right]).toEqual([4, 4]);
            expect(getComputedStyle(get("li")).listStyleType).toBe("none");

            const device = get(".SettingsRow_label");
            const app = get(".SettingsRow_value");
            expect(textBox(device).left - card.left).toBe(16);
            expect(card.right - textBox(app).right).toBeCloseTo(16, 0);
            expect([getComputedStyle(device).fontSize, getComputedStyle(app).fontSize]).toEqual(["15px", "15px"]);
            expect(getComputedStyle(app).color).toBe(tokenColor("--cpd-color-text-secondary", get("[data-card]")));
            // A long name stays on its line, within half the row
            const long = document.querySelectorAll<HTMLElement>(".SettingsRow_value")[1];
            expect(long.scrollWidth).toBeGreaterThan(long.clientWidth);
        });
    });
});
