/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
    EditInPlace,
    Field,
    Form,
    InlineField,
    Label,
    RadioControl,
    RadioInput,
    SettingsToggleInput,
    ToggleControl,
} from "@vector-im/compound-web";
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
import dialogFooterStyles from "../../../../packages/shared-components/src/telement/core/DialogFooterView/DialogFooterView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import settingsRowStyles from "../../../../packages/shared-components/src/telement/settings/SettingsRow.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import tabbedViewStyles from "../../res/css/structures/_TabbedView.pcss?raw";
import settingsSubsectionStyles from "../../res/css/components/views/settings/shared/_SettingsSubsection.pcss?raw";
import settingsSubsectionHeadingStyles from "../../res/css/components/views/settings/shared/_SettingsSubsectionHeading.pcss?raw";
import loginWithQrStyles from "../../res/css/views/auth/_LoginWithQR.pcss?raw";
import addRemoveThreepidsStyles from "../../res/css/components/views/settings/_AddRemoveThreepids.pcss?raw";
import betaCardStyles from "../../res/css/views/beta/_BetaCard.pcss?raw";
import roomSettingsDialogStyles from "../../res/css/views/dialogs/_RoomSettingsDialog.pcss?raw";
import settingsDialogStyles from "../../res/css/views/dialogs/_SettingsDialog.pcss?raw";
import accessibleButtonStyles from "../../res/css/views/elements/_AccessibleButton.pcss?raw";
import copyableTextStyles from "../../res/css/views/elements/_CopyableText.pcss?raw";
import dropdownStyles from "../../res/css/views/elements/_Dropdown.pcss?raw";
import fieldStyles from "../../res/css/views/elements/_Field.pcss?raw";
import settingsDropdownStyles from "../../res/css/views/elements/_SettingsDropdown.pcss?raw";
import settingsFlagStyles from "../../res/css/views/elements/_SettingsFlag.pcss?raw";
import styledRadioButtonStyles from "../../res/css/views/elements/_StyledRadioButton.pcss?raw";
import tagComposerStyles from "../../res/css/views/elements/_TagComposer.pcss?raw";
import avatarSettingStyles from "../../res/css/views/settings/_AvatarSetting.pcss?raw";
import fontScalingPanelStyles from "../../res/css/views/settings/_FontScalingPanel.pcss?raw";
import imageSizePanelStyles from "../../res/css/views/settings/_ImageSizePanel.pcss?raw";
import joinRuleSettingsStyles from "../../res/css/views/settings/_JoinRuleSettings.pcss?raw";
import layoutSwitcherStyles from "../../res/css/views/settings/_LayoutSwitcher.pcss?raw";
import notificationsStyles from "../../res/css/views/settings/_Notifications.pcss?raw";
import phoneNumbersStyles from "../../res/css/views/settings/_PhoneNumbers.pcss?raw";
import roomProfileSettingsStyles from "../../res/css/views/settings/_RoomProfileSettings.pcss?raw";
import setIntegrationManagerStyles from "../../res/css/views/settings/_SetIntegrationManager.pcss?raw";
import settingsFieldsetStyles from "../../res/css/views/settings/_SettingsFieldset.pcss?raw";
import settingsHeaderStyles from "../../res/css/views/settings/_SettingsHeader.pcss?raw";
import themeChoicePanelStyles from "../../res/css/views/settings/_ThemeChoicePanel.pcss?raw";
import userProfileSettingsStyles from "../../res/css/views/settings/_UserProfileSettings.pcss?raw";
import settingsSectionStyles from "../../res/css/views/settings/tabs/_SettingsSection.pcss?raw";
import settingsTabStyles from "../../res/css/views/settings/tabs/_SettingsTab.pcss?raw";
import notificationSettingsTabStyles from "../../res/css/views/settings/tabs/room/_NotificationSettingsTab.pcss?raw";
import appearanceTabStyles from "../../res/css/views/settings/tabs/user/_AppearanceUserSettingsTab.pcss?raw";
import mediaPreviewAccountSettingsStyles from "../../res/css/views/settings/tabs/user/_MediaPreviewAccountSettings.pcss?raw";
import sidebarTabStyles from "../../res/css/views/settings/tabs/user/_SidebarUserSettingsTab.pcss?raw";
import headingStyles from "../../res/css/views/typography/_Heading.pcss?raw";
import compoundOverrides from "../../res/css/telement/_CompoundOverrides.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import lightHcTheme from "../../res/themes/light-high-contrast/css/_light-high-contrast.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import imageSizeNormal from "../../res/img/element-icons/settings/img-size-normal.svg?raw";
import imageSizeLarge from "../../res/img/element-icons/settings/img-size-large.svg?raw";
import { cornerRadii, toBrowserCss } from "../test/telement/browserCss";
import { composite, contrastOver, hoveredFill, mouseButton, tokenColor } from "../test/telement/computedStyle";
import { loadInter } from "../test/telement/fonts";

/** In the order _components.pcss imports them, after _common.pcss, as in the app's bundle. */
const APP_STYLES = [
    commonStyles,
    addRemoveThreepidsStyles,
    tabbedViewStyles,
    settingsSubsectionStyles,
    settingsSubsectionHeadingStyles,
    loginWithQrStyles,
    betaCardStyles,
    roomSettingsDialogStyles,
    settingsDialogStyles,
    accessibleButtonStyles,
    copyableTextStyles,
    dropdownStyles,
    fieldStyles,
    settingsDropdownStyles,
    settingsFlagStyles,
    styledRadioButtonStyles,
    tagComposerStyles,
    avatarSettingStyles,
    fontScalingPanelStyles,
    imageSizePanelStyles,
    joinRuleSettingsStyles,
    layoutSwitcherStyles,
    notificationsStyles,
    phoneNumbersStyles,
    roomProfileSettingsStyles,
    setIntegrationManagerStyles,
    settingsFieldsetStyles,
    settingsHeaderStyles,
    themeChoicePanelStyles,
    userProfileSettingsStyles,
    settingsSectionStyles,
    settingsTabStyles,
    notificationSettingsTabStyles,
    appearanceTabStyles,
    mediaPreviewAccountSettingsStyles,
    sidebarTabStyles,
    headingStyles,
    compoundOverrides,
];

/** Each theme's class with the theme stylesheets it is built from, in the order its entry point imports them. */
const THEMES: [string, string[]][] = [
    ["cpd-theme-light", [lightTheme]],
    ["cpd-theme-dark", [lightTheme, darkTheme]],
    ["cpd-theme-light-hc", [lightTheme, lightHcTheme]],
    ["cpd-theme-dark-hc", [lightTheme, darkTheme]],
];

const isDark = (theme: string): boolean => theme.startsWith("cpd-theme-dark");
const isHighContrast = (theme: string): boolean => theme.endsWith("-hc");

/** A CSS module's stylesheet with its local class names prefixed by the module's name, as the library build does. */
function moduleCss(source: string, name: string): string {
    return source.replace(/\.(-?[_a-zA-Z][\w-]*)/g, `.${name}_$1`);
}

let stylesheet: HTMLStyleElement;
let removeInter: () => void;

beforeAll(async () => {
    removeInter = await loadInter();
    // Each theme's variables apply within its own class, as each theme is a separate stylesheet in the app
    const themed = THEMES.map(
        ([theme, sources]) =>
            `.${theme} { ${APP_STYLES.map((styles) => toBrowserCss(styles, ...sources, commonStyles, fontSizes)).join("\n")} }`,
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
            ${telementTokens} ${moduleCss(settingsRowStyles, "SettingsRow")}
            ${moduleCss(dialogFooterStyles, "DialogFooterView")}
        }
        @layer app-web {
            body { margin: 0; }
            ${themed}
        }
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

/**
 * Renders `sections` as a tab of the user settings dialog, as BaseDialog, TabbedView and SettingsTab lay it out, in a
 * container of the theme.
 * @returns The theme's container, where its colors resolve.
 */
function renderTab(theme: string, sections: string, dir: "ltr" | "rtl" = "ltr"): HTMLElement {
    return renderPanel(
        theme,
        `<div class="mx_SettingsTab"><div class="mx_SettingsTab_sections">${sections}</div></div>`,
        dir,
    );
}

/**
 * Renders `tab`, a tab's own markup, in the user settings dialog's tab panel, as BaseDialog and TabbedView lay it out,
 * in a container of the theme.
 * @returns The theme's container, where its colors resolve.
 */
function renderPanel(theme: string, tab: string, dir: "ltr" | "rtl" = "ltr"): HTMLElement {
    document.body.innerHTML = `
        <div class="${theme}" dir="${dir}" style="--emoji-font-family: ''; font-family: Inter">
            <div class="mx_Dialog" style="width: 932px; height: 680px; box-sizing: border-box">
                <div class="mx_UserSettingsDialog" role="dialog">
                    <div class="mx_SettingsDialog_content">
                        <div class="mx_TabbedView mx_TabbedView_tabsOnLeft">
                            <ul class="mx_TabbedView_tabLabels" role="tablist">
                                <li class="mx_AccessibleButton mx_TabbedView_tabLabel mx_TabbedView_tabLabel_active" role="tab">
                                    <span class="mx_TabbedView_tabLabel_text">Account</span>
                                </li>
                            </ul>
                            <div class="mx_TabbedView_tabPanel" role="tabpanel">
                                <div class="mx_AutoHideScrollbar mx_TabbedView_tabPanelContent">
                                    ${tab}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    return document.querySelector<HTMLElement>(`.${theme}`)!;
}

function get(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`nothing matches ${selector}`);
    return element;
}

function box(selector: string): DOMRect {
    return get(selector).getBoundingClientRect();
}

/** Where the first line of text in an element starts and ends, as drawn. */
function textBox(selector: string): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(get(selector));
    return range.getClientRects()[0];
}

/** The edges of an element's content box, inside its padding. */
function contentBox(selector: string): { left: number; right: number; top: number } {
    const element = get(selector);
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
        left: rect.left + parseFloat(style.paddingLeft),
        right: rect.right - parseFloat(style.paddingRight),
        top: rect.top + parseFloat(style.paddingTop),
    };
}

/** A Compound form field's markup, rendered in the form it needs and taken out of it. */
function fieldMarkup(field: ReturnType<typeof createElement>): string {
    return renderToStaticMarkup(createElement(Form.Root, {}, field)).replace(/^<form[^>]*>|<\/form>$/g, "");
}

/** A SettingsSubsection with a heading, as it renders inside a section. */
const subsection = (id: string, heading: string, content: string, description = ""): string => `
    <div class="mx_SettingsSubsection" id="${id}">
        <div class="mx_SettingsSubsectionHeading">
            <h3 class="mx_Heading_h4 mx_SettingsSubsectionHeading_heading" id="${id}-label">${heading}</h3>
        </div>
        ${content ? `<div class="mx_SettingsSubsection_content" id="${id}-card">${content}</div>` : ""}
        ${
            description
                ? `<div class="mx_SettingsSubsection_description" id="${id}-help">
                    <div class="mx_SettingsSubsection_text">${description}</div>
                </div>`
                : ""
        }
    </div>
`;

/** A legacy SettingsSection, its heading a size 3 Heading. */
const section = (id: string, heading: string, children: string): string => `
    <div class="mx_SettingsSection" id="${id}">
        ${heading ? `<h2 class="mx_Heading_h3" id="${id}-label">${heading}</h2>` : ""}
        <div class="mx_SettingsSection_subSections" id="${id}-content">${children}</div>
    </div>
`;

describe.each(THEMES.map(([theme]) => theme))("Settings groups in %s", (theme) => {
    /** The settings card's color: the dialog's own, white in light themes and raised a gray step in dark ones. */
    const cardColor = (container: HTMLElement): string => tokenColor("--tl-color-bg-floating", container);

    function expectCard(selector: string, container: HTMLElement): void {
        const style = getComputedStyle(get(selector));
        expect(style.backgroundColor).toBe(cardColor(container));
        expect(cornerRadii(get(selector))).toEqual({ x: 12, y: 12 });
        expect([style.paddingTop, style.paddingInlineStart, style.paddingBottom, style.paddingInlineEnd]).toEqual([
            "12px",
            "16px",
            "12px",
            "16px",
        ]);
    }

    it("puts the tab on a gray pane from the tabs' top, its first corner rounded like the cards, 16px around them", () => {
        const container = renderTab(theme, section("language", "", subsection("sub", "Language", "English")));
        const pane = get(".mx_TabbedView_tabPanel");
        const style = getComputedStyle(pane);

        expect(style.backgroundColor).toBe(
            tokenColor(isDark(theme) ? "--cpd-color-theme-bg" : "--cpd-color-gray-300", container),
        );
        expect(style.backgroundColor).not.toBe(cardColor(container));
        expect(style.borderStartStartRadius).toBe("12px");
        expect([style.borderStartEndRadius, style.borderEndStartRadius, style.borderEndEndRadius]).toEqual([
            "0px",
            "0px",
            "0px",
        ]);
        expect(pane.getBoundingClientRect().top).toBe(box(".mx_TabbedView_tabLabel").top);
        expect(box("#sub-card").left - pane.getBoundingClientRect().left).toBe(16);
        expect(box("#sub-label").top - pane.getBoundingClientRect().top).toBe(16);
    });

    it("ends the tab 24px under its last card, on the dialog's edge, so a tab that fits doesn't scroll", () => {
        renderTab(
            theme,
            section("notifications", "", subsection("sound", "Sounds", `<div style="height: 400px"></div>`)),
        );
        const scroller = get(".mx_TabbedView_tabPanelContent");

        expect(box(".mx_SettingsTab").bottom - box("#sound-card").bottom).toBe(24);
        expect(scroller.scrollHeight).toBe(scroller.clientHeight);
    });

    it("draws a subsection as a 13px secondary label 8px over its card, with its help 8px under the card", () => {
        const container = renderTab(
            theme,
            section(
                "preferences",
                "",
                subsection(
                    "keyboard",
                    "Keyboard shortcuts",
                    `<div id="row">Use Ctrl + F to search timeline</div>`,
                    "To view all keyboard shortcuts, click here.",
                ) + subsection("time", "Displaying time", `<div>Show timestamps in 12 hour format</div>`),
            ),
        );
        const secondary = tokenColor("--cpd-color-text-secondary", container);
        const card = box("#keyboard-card");

        for (const id of ["#keyboard-label", "#keyboard-help"]) {
            const style = getComputedStyle(get(id));
            expect([style.fontSize, style.fontWeight, style.color]).toEqual(["13px", "400", secondary]);
            expect(textBox(id).left - card.left).toBe(16);
        }
        expectCard("#keyboard-card", container);
        expect(card.top - box("#keyboard-label").bottom).toBe(8);
        expect(box("#row").top - card.top).toBe(12);
        expect(box("#keyboard-help").top - card.bottom).toBe(8);
        expect(box("#time-label").top - box("#keyboard-help").bottom).toBe(24);
    });

    it("draws a section's heading as a label too, at any heading level, 8px over a first group without a label", () => {
        const container = renderTab(
            theme,
            section(
                "deactivate",
                "Deactivate account",
                `<div class="mx_SettingsSubsection">
                    <div class="mx_SettingsSubsection_content" id="deactivate-card"><div>Deactivate account</div></div>
                </div>`,
            ),
        );
        const style = getComputedStyle(get("#deactivate-label"));

        expect([style.fontSize, style.fontWeight, style.color]).toEqual([
            "13px",
            "400",
            tokenColor("--cpd-color-text-secondary", container),
        ]);
        expect(box("#deactivate-card").top - box("#deactivate-label").bottom).toBe(8);
    });

    describe("one label per group", () => {
        it.each([
            ["a subsection's heading", subsection("emails", "Email addresses", "<div>Email address</div>")],
            [
                "a subsection's heading in a form",
                `<form>${subsection("emails", "Email addresses", "<div>Email address</div>")}</form>`,
            ],
            [
                "a fieldset's legend",
                `<fieldset class="mx_SettingsFieldset">
                    <legend class="mx_SettingsFieldset_legend" id="emails-label">Email addresses</legend>
                    <div class="mx_SettingsFieldset_content" id="emails-card"><div>Email address</div></div>
                </fieldset>`,
            ],
            [
                "a fieldset's legend in a form",
                `<form><fieldset class="mx_SettingsFieldset">
                    <legend class="mx_SettingsFieldset_legend" id="emails-label">Email addresses</legend>
                    <div class="mx_SettingsFieldset_content" id="emails-card"><div>Email address</div></div>
                </fieldset></form>`,
            ],
        ])("draws no section heading over a first group labelled by %s, which stands alone", (_name, group) => {
            renderTab(
                theme,
                section("personal", "Personal info", group + subsection("phones", "Phone numbers", "<div>+1</div>")),
            );
            const pane = get(".mx_TabbedView_tabPanel").getBoundingClientRect();

            expect(getComputedStyle(get("#personal-label")).display).toBe("none");
            expect(box("#emails-label").top - pane.top).toBe(16);
            expect(getComputedStyle(get("#phones-label")).display).not.toBe("none");
        });

        it("keeps a section's heading over a first group that has no label, such as a toggle above subsections", () => {
            renderTab(
                theme,
                section(
                    "legacy",
                    "Legacy calls",
                    `<div id="lone">Enable legacy voice/video calls</div>` +
                        subsection("voice", "Voice settings", "<div>Automatically adjust the microphone volume</div>"),
                ),
            );

            expect(getComputedStyle(get("#legacy-label")).display).not.toBe("none");
            expect(box("#lone").top - box("#legacy-label").bottom).toBe(8);
        });
    });

    it("writes a subsection without content of its own, such as the FAQ, on its card in the size of other cards' text", () => {
        const container = renderTab(
            theme,
            section("help", "", subsection("faq", "FAQ", "", "For help with using Telement, see here.")),
        );

        expectCard("#faq-help", container);
        expect(getComputedStyle(get("#faq-help")).fontSize).toBe("15px");
        expect(box("#faq-help").top - box("#faq-label").bottom).toBe(8);
    });

    it("puts a section's own rows, without groups of their own, on one card, 16px apart", () => {
        const container = renderTab(
            theme,
            section(
                "processing",
                "Audio processing",
                `<div id="noise" style="height: 40px">Noise suppression</div>
                <div id="echo" style="height: 40px">Echo cancellation</div>`,
            ),
        );

        expectCard("#processing-content", container);
        expect(box("#echo").top - box("#noise").bottom).toBe(16);
        expect(box("#processing-content").top - box("#processing-label").bottom).toBe(8);
    });

    it("puts a row beside subsections on a card of its own, and the subsections on theirs", () => {
        const container = renderTab(
            theme,
            section(
                "legacy",
                "Legacy calls",
                `<div id="lone" style="height: 40px">Enable legacy voice/video calls</div>` +
                    subsection("voice", "Voice settings", "<div>Automatically adjust the microphone volume</div>"),
            ),
        );

        expectCard("#lone", container);
        expectCard("#voice-card", container);
        expect(getComputedStyle(get("#legacy-content")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(box("#voice-label").top - box("#lone").bottom).toBe(24);
    });

    it("keeps sections 24px apart when a form holds them, as on Voice & Video", () => {
        renderTab(
            theme,
            `<form>${section("input", "Audio input", "<div>Microphone</div>")}${section("calls", "Legacy calls", "<div>Enable</div>")}</form>`,
        );

        expect(box("#calls-label").top - box("#input-content").bottom).toBe(24);
    });

    it("draws a fieldset as a group, and inside another group's card without a card of its own", () => {
        const container = renderTab(
            theme,
            section(
                "security",
                "",
                `<fieldset class="mx_SettingsFieldset">
                    <legend class="mx_SettingsFieldset_legend" id="access-label">Access</legend>
                    <div class="mx_SettingsFieldset_content" id="access-card"><div>Invite only</div></div>
                    <div class="mx_SettingsFieldset_description" id="access-help">
                        <div class="mx_SettingsSubsection_text">Decide who can join.</div>
                    </div>
                </fieldset>` +
                    subsection(
                        "find",
                        "How to find you",
                        `<fieldset class="mx_SettingsFieldset">
                            <legend class="mx_SettingsFieldset_legend" id="server-label">Identity server</legend>
                            <div class="mx_SettingsFieldset_content" id="server-card"><div id="server-row">Enter a new identity server</div></div>
                            <div class="mx_SettingsFieldset_description" id="server-help">
                                <div class="mx_SettingsSubsection_text">You are not using an identity server.</div>
                            </div>
                        </fieldset>`,
                    ),
            ),
        );
        const card = box("#access-card");

        expectCard("#access-card", container);
        expect(textBox("#access-label").left - card.left).toBe(16);
        expect(card.top - box("#access-label").bottom).toBe(8);
        expect(box("#access-help").top - card.bottom).toBe(8);
        expect(getComputedStyle(get("#access-help")).fontSize).toBe("13px");

        const nested = getComputedStyle(get("#server-card"));
        expect([nested.backgroundColor, nested.paddingTop, nested.paddingInlineStart]).toEqual([
            "rgba(0, 0, 0, 0)",
            "0px",
            "0px",
        ]);
        // The nested label, row and help stay on the outer card's content edge
        const edge = contentBox("#find-card").left;
        expect([textBox("#server-label").left, box("#server-row").left, textBox("#server-help").left]).toEqual([
            edge,
            edge,
            edge,
        ]);
    });

    it("draws a new-style section's content on a card, as Encryption's panels", () => {
        const container = renderTab(
            theme,
            `<div class="mx_SettingsSection mx_SettingsSection_newUi">
                <h2 class="mx_SettingsHeader" id="storage-label">Key storage</h2>
                <div class="mx_SettingsSection_content" id="storage-card"><div>Allow key storage</div></div>
                <div class="mx_SettingsSection_help" id="storage-help">This will allow you to view your chat history.</div>
            </div>`,
        );

        expectCard("#storage-card", container);
        expect(box("#storage-help").top - box("#storage-card").bottom).toBe(8);
        expect(textBox("#storage-help").left - box("#storage-card").left).toBe(16);
    });

    it("labels the integration manager with its heading and name, its toggle on a card and its texts as help", () => {
        const container = renderTab(
            theme,
            `<form class="mx_SetIntegrationManager">
                <div class="mx_SettingsFlag">
                    <div class="mx_SetIntegrationManager_heading_manager" id="manager-label">
                        <h2 class="mx_Heading_h3" id="manager-title">Manage integrations</h2>
                        <h3 class="mx_Heading_h4" id="manager-name">(scalar.vector.im)</h3>
                    </div>
                </div>
                ${fieldMarkup(
                    createElement(SettingsToggleInput, {
                        name: "enable_im",
                        label: "Enable the integration manager",
                        className: "mx_SetIntegrationManager_toggle",
                    }),
                )}
                <div class="mx_SettingsSubsection_text" id="manager-help">Use an integration manager to manage bots.</div>
                <div class="mx_SettingsSubsection_text" id="manager-explainer">Integration managers receive configuration data.</div>
            </form>`,
        );
        const secondary = tokenColor("--cpd-color-text-secondary", container);
        const card = box(".mx_SetIntegrationManager_toggle");

        for (const id of ["#manager-title", "#manager-name", "#manager-help"]) {
            const style = getComputedStyle(get(id));
            expect([style.fontSize, style.fontWeight, style.color]).toEqual(["13px", "400", secondary]);
        }
        expectCard(".mx_SetIntegrationManager_toggle", container);
        expect(textBox("#manager-title").left - card.left).toBe(16);
        expect(card.top - box("#manager-label").bottom).toBe(8);
        expect(box("#manager-help").top - card.bottom).toBe(8);
        expect(box("#manager-explainer").top - box("#manager-help").bottom).toBe(8);
        expect(box("#manager-help").right).toBe(card.right);
    });

    it("puts the profiles on their section's card, with no line under them", () => {
        const container = renderTab(
            theme,
            section(
                "account",
                "Profile",
                `<div class="mx_UserProfileSettings" id="account-profile">
                    <div class="mx_UserProfileSettings_profile_buttons" id="account-buttons" style="height: 36px"></div>
                </div>`,
            ) +
                section(
                    "room",
                    "",
                    `<form class="mx_RoomProfileSettings" id="room-profile">
                        <div class="mx_RoomProfileSettings_buttons" id="room-buttons" style="height: 36px"></div>
                    </form>`,
                ),
        );

        for (const id of ["account", "room"]) {
            expectCard(`#${id}-content`, container);
            expect(getComputedStyle(get(`#${id}-profile`)).borderBottomStyle).toBe("none");
            expect(box(`#${id}-content`).bottom - box(`#${id}-buttons`).bottom).toBe(12);
        }
    });

    describe("profiles", () => {
        /** The avatar editor (AvatarSetting), as it renders with its file input after it. */
        const avatar = `
            <div class="mx_AvatarSetting_avatar" id="avatar" role="group"></div>
            <input type="file" style="display: none">
        `;
        const displayName = renderToStaticMarkup(
            createElement(EditInPlace, {
                className: "mx_UserProfileSettings_profile_displayName",
                label: "Display name",
                saveButtonLabel: "Save",
                cancelButtonLabel: "Cancel",
                savingLabel: "Updating",
                defaultValue: "Alice",
                onSave: async () => {},
            }),
        );
        const field = (id: string): string => `
            <div class="mx_Field mx_RoomProfileSettings_profile_controls_${id}" id="${id}">
                <input type="text" placeholder="${id}"><label>${id}</label>
            </div>
        `;

        /** The account's profile, as UserProfileSettings lays it out in its section. */
        const account = section(
            "account",
            "Profile",
            `<div class="mx_UserProfileSettings">
                <div class="mx_UserProfileSettings_profile" id="profile">
                    ${avatar}
                    <div class="mx_UserProfileSettings_profile_nameAndStatus" id="fields"
                        style="display: flex; flex-direction: column">
                        ${displayName}
                        <span class="mx_CopyableText mx_UserProfileSettings_username" id="username" role="group">
                            @alice:example.org
                            <button class="mx_CopyableText_copyButton" id="copy"
                                style="box-sizing: border-box; width: 28px; height: 28px; padding: 4px"></button>
                        </span>
                        <div id="status" style="height: 28px">What's your status?</div>
                    </div>
                </div>
                <button data-settings-row="" class="mx_UserProfileSettings_signOut" id="sign-out"
                    style="display: block; box-sizing: border-box; height: 44px; width: calc(100% + 24px); margin-inline: -12px">
                    Sign out
                </button>
            </div>`,
        );
        /** A room's profile, as RoomProfileSettings lays it out, on its section's card. */
        const roomForm = `
            <form class="mx_RoomProfileSettings">
                <div class="mx_RoomProfileSettings_profile" id="profile">
                    ${avatar}
                    <div class="mx_RoomProfileSettings_profile_controls" id="fields">${field("name")}${field("topic")}</div>
                </div>
                <div class="mx_RoomProfileSettings_buttons" id="buttons"><button style="height: 36px">Save</button></div>
            </form>
        `;
        const room = section("room", "", roomForm);
        /** A space's, whose form is a card of its own beside the Leave space card. */
        const space = section("space", "", roomForm + subsection("leave", "", "<div>Leave space</div>"));

        it.each([
            ["the account's", account, "#account-content", "form"],
            ["a room's", room, "#room-content", "#name"],
            ["a space's", space, "#space-content > form", "#name"],
        ])(
            "lays out %s: the photo 16px from its card's start and top, the fields 16px after it",
            (_, tab, card, first) => {
                renderTab(theme, tab);
                const cardBox = box(card);

                expect([box("#avatar").width, box("#avatar").height]).toEqual([120, 120]);
                expect([box("#avatar").left - cardBox.left, box("#avatar").top - cardBox.top]).toEqual([16, 16]);
                // The first field, 36px tall, starts where the photo does and spans the rest of the card
                const firstField = box(`#fields ${first === "form" ? "input" : first}`);
                expect([firstField.left - box("#avatar").right, firstField.top - cardBox.top]).toEqual([16, 16]);
                expect(firstField.height).toBe(36);
                expect(cardBox.right - firstField.right).toBe(16);
            },
        );

        it("mirrors right to left", () => {
            renderTab(theme, room, "rtl");
            const cardBox = box("#room-content");

            expect(cardBox.right - box("#avatar").right).toBe(16);
            expect(box("#avatar").left - box("#name").right).toBe(16);
        });

        it.each([
            ["the account's", account, "#account-content"],
            ["a room's", room, "#room-content"],
        ])("wraps %s fields under the photo in a narrow dialog", (_, tab, card) => {
            renderTab(theme, tab);
            get("#profile").style.width = "260px";

            expect(box("#avatar").left - box(card).left).toBe(16);
            expect(box("#fields").left).toBe(box("#avatar").left);
            expect(box("#fields").top - box("#avatar").bottom).toBe(16);
            expect(box("#fields").width).toBe(260);
        });

        it("writes the username under the display name, in 13px secondary text on the field's edge", () => {
            const container = renderTab(theme, account);
            const style = getComputedStyle(get("#username"));
            const input = box("#fields input");

            expect([style.fontSize, style.fontWeight, style.color]).toEqual([
                "13px",
                "400",
                tokenColor("--cpd-color-text-secondary", container),
            ]);
            expect(style.borderStyle).toBe("none");
            expect(box("#username").top - input.bottom).toBe(4);
            expect(textBox("#username").left).toBe(input.left);
            // The copy button is centered on the line and makes it no taller
            const line = parseFloat(style.lineHeight);
            expect(box("#username").height).toBeCloseTo(line, 1);
            expect((box("#copy").top + box("#copy").bottom) / 2).toBeCloseTo(
                (box("#username").top + box("#username").bottom) / 2,
                1,
            );
            expect(box("#status").top - box("#username").bottom).toBe(16);
        });

        it("breaks a long username rather than running past the card", () => {
            renderTab(theme, account.replace("@alice:example.org", `@${"alice".repeat(40)}:example.org`));

            expect(box("#username").right).toBeLessThanOrEqual(box("#fields").right);
            expect(box("#copy").right).toBeLessThanOrEqual(box("#fields").right);
            expect(box("#username").height).toBeGreaterThan(30);
        });

        it("ends the account's card with the Sign out row, 16px under the photo and 4px over the card's edge", () => {
            renderTab(theme, account);

            expect(box("#sign-out").top - box("#avatar").bottom).toBe(16);
            expect(box("#account-content").bottom - box("#sign-out").bottom).toBe(4);
        });

        it("keeps a room's fields 16px apart, and its buttons 16px under them", () => {
            renderTab(theme, room);

            expect(box("#topic").top - box("#name").bottom).toBe(16);
            expect(box("#buttons").top - box("#profile").bottom).toBe(16);
            expect(box("#room-content").bottom - box("#buttons").bottom).toBe(12);
        });
    });

    it("draws the Labs tab's beta cards as settings cards on the pane, padded 12 × 16 like the others", () => {
        const container = renderTab(
            theme,
            section(
                "labs",
                "Upcoming features",
                `<div class="mx_SettingsSubsection_text" id="labs-text">What's next?</div>
                <div class="mx_BetaCard" id="beta"><div class="mx_BetaCard_columns" id="beta-content">Video rooms</div></div>`,
            ),
        );
        const beta = getComputedStyle(get("#beta"));

        expect(beta.backgroundColor).toBe(cardColor(container));
        expect(cornerRadii(get("#beta"))).toEqual({ x: 12, y: 12 });
        expect([beta.paddingTop, beta.paddingRight, beta.paddingBottom, beta.paddingLeft]).toEqual([
            "12px",
            "16px",
            "12px",
            "16px",
        ]);
        // Its content on the content edge of the card above it, which starts where it does
        const labsText = get("#labs-text");
        expect(get("#beta").getBoundingClientRect().left).toBe(labsText.getBoundingClientRect().left);
        expect(get("#beta-content").getBoundingClientRect().left - get("#beta").getBoundingClientRect().left).toBe(
            parseFloat(getComputedStyle(labsText).paddingLeft),
        );
        expectCard("#labs-text", container);
    });

    it("outlines the cards only in high contrast themes, where the fills are closer", () => {
        const container = renderTab(theme, section("sub", "", subsection("keyboard", "Keyboard", "<div>Row</div>")));
        const style = getComputedStyle(get("#keyboard-card"));

        expect([style.outlineStyle, style.outlineWidth, style.outlineOffset]).toEqual(["solid", "1px", "-1px"]);
        expect(style.outlineColor).toBe(
            isHighContrast(theme)
                ? tokenColor("--cpd-color-border-interactive-secondary", container)
                : "rgba(0, 0, 0, 0)",
        );
    });

    describe("rows", () => {
        /** A settings row (ValueRowView, ActionRowView) as it lays itself out: 44px, its fill 4px from the card's sides. */
        const row = (id: string): string => `
            <button data-settings-row="" id="${id}"
                style="display: block; box-sizing: border-box; height: 44px; width: calc(100% + 24px); margin: 0 -12px">
                Leave room
            </button>
        `;

        it("puts a row alone on its card 4px from the card's top and bottom, as from its sides", () => {
            renderTab(theme, section("general", "", subsection("leave", "", row("leave-row"))));
            const card = box("#leave-card");
            const style = getComputedStyle(get("#leave-card"));

            expect([style.paddingTop, style.paddingBottom]).toEqual(["4px", "4px"]);
            expect([box("#leave-row").top - card.top, card.bottom - box("#leave-row").bottom]).toEqual([4, 4]);
            expect([box("#leave-row").left - card.left, card.right - box("#leave-row").right]).toEqual([4, 4]);
            expect(card.height).toBe(52);
        });

        it("keeps the card's 12px padding at an edge where something else is", () => {
            renderTab(
                theme,
                section(
                    "help",
                    "",
                    subsection("advanced", "Advanced", `<div id="advanced-text">Homeserver</div>${row("clear-row")}`),
                ),
            );
            const style = getComputedStyle(get("#advanced-card"));

            expect([style.paddingTop, style.paddingBottom]).toEqual(["12px", "4px"]);
            expect(box("#clear-row").top - box("#advanced-text").bottom).toBe(16);
        });

        it("puts a list of rows 4px from a fieldset's card, and a section's card that is its whole content", () => {
            renderTab(
                theme,
                `<fieldset class="mx_SettingsFieldset" id="permissions">
                    <legend class="mx_SettingsFieldset_legend">Permissions</legend>
                    <div class="mx_SettingsFieldset_content" id="permissions-card">
                        <div data-settings-row="" id="permissions-list">${row("first")}${row("second")}</div>
                    </div>
                </fieldset>` + section("voice", "Audio input", row("microphone")),
            );

            for (const [card, content] of [
                ["#permissions-card", "#permissions-list"],
                ["#voice-content", "#microphone"],
            ]) {
                expect(box(content).top - box(card).top).toBe(4);
                expect(box(card).bottom - box(content).bottom).toBe(4);
            }
        });
    });

    describe("value rows", () => {
        /** A person's row (ValueRowView): the name over the Matrix ID, and the role at the end. */
        function renderRow(attributes = ""): HTMLElement {
            renderTab(
                theme,
                section(
                    "roles",
                    "",
                    subsection(
                        "users",
                        "Privileged users",
                        `<button class="SettingsRow_row SettingsRow_twoLine SettingsRow_interactive" type="button"
                            data-settings-row="" id="person" ${attributes}>
                            <span class="SettingsRow_text">
                                <span class="SettingsRow_label">Alice</span>
                                <span class="SettingsRow_description" id="user-id">@alice:example.org</span>
                            </span>
                            <span class="SettingsRow_end"><span class="SettingsRow_value" id="role">Admin</span></span>
                        </button>`,
                    ),
                ),
            );
            return get("#person");
        }

        /** The lowest contrast of the row's secondary text, the value and the Matrix ID, on its fill over the card. */
        function textContrast(fill: string): number {
            const [red, green, blue] = composite(fill, getComputedStyle(get("#users-card")).backgroundColor);
            const ground = `rgb(${red}, ${green}, ${blue})`;
            return Math.min(
                ...["#role", "#user-id"].map((id) => contrastOver(getComputedStyle(get(id)).color, ground)),
            );
        }

        it("keeps the secondary text at 4.5:1 while the row is hovered", async () => {
            const person = renderRow();
            const fill = await hoveredFill(person);

            expect(fill).toBe(tokenColor("--cpd-color-bg-action-secondary-hovered", person));
            expect(textContrast(fill)).toBeGreaterThanOrEqual(4.5);
        });

        it("keeps the secondary text at 4.5:1 while the keyboard is on the row", async () => {
            const person = renderRow();
            await userEvent.unhover(person);
            await userEvent.tab();
            const fill = getComputedStyle(person).backgroundColor;

            expect(person.matches(":focus-visible:not(:hover)")).toBe(true);
            expect(fill).toBe(tokenColor("--cpd-color-bg-action-secondary-hovered", person));
            expect(textContrast(fill)).toBeGreaterThanOrEqual(4.5);
        });

        it("keeps the secondary text at 4.5:1 while the row's menu is open", () => {
            const person = renderRow('data-state="open"');
            const fill = getComputedStyle(person).backgroundColor;

            expect(fill).toBe(tokenColor("--cpd-color-bg-action-secondary-pressed", person));
            expect(textContrast(fill)).toBeGreaterThanOrEqual(4.5);
        });

        it("keeps the secondary text at 4.5:1 while the row is pressed", async () => {
            const person = renderRow();
            await mouseButton("mousePressed", person);
            const pressed = person.matches(":active");
            const fill = getComputedStyle(person).backgroundColor;
            const contrast = textContrast(fill);
            await mouseButton("mouseReleased", person);

            expect(pressed).toBe(true);
            expect(fill).toBe(tokenColor("--cpd-color-bg-action-secondary-pressed", person));
            expect(contrast).toBeGreaterThanOrEqual(4.5);
        });

        it("keeps the secondary text's color on a disabled row, which has no fill, while the row is hovered", async () => {
            const person = renderRow("disabled");
            const fill = await hoveredFill(person);

            expect(person.matches(":hover")).toBe(true);
            expect(fill).toBe("rgba(0, 0, 0, 0)");
            for (const id of ["#role", "#user-id"]) {
                expect(getComputedStyle(get(id)).color).toBe(
                    tokenColor("--cpd-color-text-secondary", get("#users-card")),
                );
            }
        });
    });

    describe("fields", () => {
        it("spans the startup dropdown and the system font field across the card", () => {
            renderTab(
                theme,
                section(
                    "preferences",
                    "",
                    subsection(
                        "startup",
                        "Startup",
                        `<div class="mx_SettingsDropdown">
                            <label class="mx_SettingsDropdown_label">Start</label>
                            <div class="mx_Dropdown">
                                <span class="mx_Dropdown_label" aria-hidden="true">Start</span>
                                <div class="mx_AccessibleButton mx_Dropdown_input mx_no_textinput" role="button" id="startup-input">
                                    <div class="mx_Dropdown_option">No</div>
                                </div>
                            </div>
                        </div>`,
                    ),
                ) +
                    `<div class="mx_SettingsSubsection">
                        <div class="mx_SettingsSubsection_content mx_SettingsSubsection_contentStretch" id="font-card">
                            <form>
                                <div class="mx_Field mx_Field_input mx_AppearanceUserSettingsTab_checkboxControlledField" id="custom">
                                    <input id="custom-input"><label for="custom-input">Font</label>
                                </div>
                            </form>
                        </div>
                    </div>`,
            );

            for (const [card, field] of [
                ["#startup-card", "#startup-input"],
                ["#font-card", "#custom"],
            ]) {
                const edges = contentBox(card);
                expect([box(field).left, box(field).right]).toEqual([edges.left, edges.right]);
            }
        });

        it("spans a copy field with a label, such as the room's ID, across the card", () => {
            renderTab(
                theme,
                section(
                    "advanced",
                    "",
                    subsection(
                        "info",
                        "Room information",
                        `<div class="mx_CopyableText_field">
                            <span class="mx_CopyableText_label">Internal room ID</span>
                            <span class="mx_CopyableText mx_CopyableText_border" id="room-id">!room:server.org</span>
                        </div>`,
                    ),
                ),
            );
            const edges = contentBox("#info-card");

            expect([box("#room-id").left, box("#room-id").right]).toEqual([edges.left, edges.right]);
        });

        it("draws no floated label on a field named only by its group's label, such as the font size", () => {
            renderTab(
                theme,
                section(
                    "appearance",
                    "",
                    subsection(
                        "font-size",
                        "Font size",
                        `<div class="mx_Field mx_Field_select" id="size-field">
                            <select id="size-select" aria-label="Font size"><option>16 (default)</option></select>
                            <label for="size-select" id="size-floated-label"></label>
                        </div>`,
                    ),
                ),
            );

            expect(getComputedStyle(get("#size-floated-label")).display).toBe("none");
            expect(box("#size-field").height).toBe(36);
        });

        it("draws the phone number's country code inside the one field, with no line between it and the number", () => {
            renderTab(
                theme,
                section(
                    "account",
                    "",
                    subsection(
                        "phone-numbers",
                        "Phone numbers",
                        `<form>
                            <div class="mx_Field mx_Field_input mx_Field_labelAlwaysTopLeft" id="phone-field">
                                <span class="mx_Field_prefix" id="prefix">
                                    <div class="mx_Dropdown mx_PhoneNumbers_country mx_CountryDropdown">+1</div>
                                </span>
                                <input type="text" id="phone-input" placeholder="Phone number" />
                                <label for="phone-input">Phone number</label>
                            </div>
                        </form>`,
                    ),
                ),
            );
            const prefix = getComputedStyle(get("#prefix"));

            expect([prefix.borderLeftStyle, prefix.borderRightStyle]).toEqual(["none", "none"]);
            expect(box("#phone-field").height).toBe(36);
        });

        it.each([
            [
                "the phone number, whose label always floats",
                `<form>
                    <div class="mx_Field mx_Field_input mx_Field_labelAlwaysTopLeft" id="field">
                        <span class="mx_Field_prefix">
                            <div class="mx_Dropdown mx_PhoneNumbers_country mx_CountryDropdown">+1</div>
                        </span>
                        <input type="text" id="input" placeholder="Phone number" />
                        <label for="input" id="label">Phone number</label>
                    </div>
                    <div class="mx_AccessibleButton" id="last">Add</div>
                </form>`,
            ],
            [
                "an email address",
                `<form>
                    <div class="mx_Field mx_Field_input" id="field">
                        <input type="text" id="input" placeholder="Email address" value="a@example.org" />
                        <label for="input" id="label">Email address</label>
                    </div>
                    <div class="mx_AccessibleButton" id="last">Add</div>
                </form>`,
            ],
            [
                "a password on a row of its own",
                `<form>
                    <div class="">
                        <div class="mx_Field mx_Field_input" id="field">
                            <input type="password" id="input" placeholder="Current password" value="secret" />
                            <label for="input" id="label">Current password</label>
                        </div>
                    </div>
                    <div class="mx_AccessibleButton" id="last">Change password</div>
                </form>`,
            ],
            [
                "the room's main address",
                `<div class="mx_Field mx_Field_select" id="field">
                    <select id="input"><option>not specified</option></select>
                    <label for="input" id="label">Main address</label>
                </div>
                <div id="last">Publish this room</div>`,
            ],
            [
                "the room's ID",
                `<div class="mx_CopyableText_field" id="field">
                    <span class="mx_CopyableText_label" id="label">Internal room ID</span>
                    <span class="mx_CopyableText mx_CopyableText_border">!room:server.org</span>
                </div>
                <div id="last">This room isn’t bridging messages</div>`,
            ],
        ])(
            "puts %s 16px under its card's edge when it is first on it, its floating label as far inside as other content",
            (_name, content) => {
                for (const card of [
                    subsection("group", "Phone numbers", content),
                    `<fieldset class="mx_SettingsFieldset">
                        <legend class="mx_SettingsFieldset_legend">Phone numbers</legend>
                        <div class="mx_SettingsFieldset_content" id="group-card">${content}</div>
                    </fieldset>`,
                ]) {
                    renderTab(theme, section("account", "", card));

                    expect(box("#field").top - box("#group-card").top).toBe(16);
                    expect(box("#label").top - box("#group-card").top).toBeGreaterThanOrEqual(8);
                    expect(box("#group-card").bottom - box("#last").bottom).toBe(12);
                }
            },
        );

        it("leaves a field under a card's other content, and one in a fieldset inside a card, where they are", () => {
            const field = (id: string): string => `
                <div class="mx_Field mx_Field_input mx_Field_labelAlwaysTopLeft" id="${id}">
                    <input type="text" id="${id}-input" placeholder="Phone number" />
                    <label for="${id}-input">Phone number</label>
                </div>
            `;
            renderTab(
                theme,
                section(
                    "account",
                    "",
                    subsection(
                        "numbers",
                        "Phone numbers",
                        `<div id="number">+1 555</div><form>${field("new")}</form>`,
                    ) +
                        subsection(
                            "discovery",
                            "Discovery",
                            `<fieldset class="mx_SettingsFieldset">
                                <div class="mx_SettingsFieldset_content" id="nested">${field("server")}</div>
                            </fieldset>`,
                        ),
                ),
            );

            expect(box("#number").top - box("#numbers-card").top).toBe(12);
            expect(box("#new").top - box("#number").bottom).toBe(16);
            expect(box("#server").top - box("#nested").top).toBe(0);
        });
    });

    it("draws the media choices as a group of their own: labelled above their card, the help under it", () => {
        const choice = (id: string, label: string): ReturnType<typeof createElement> =>
            createElement(
                InlineField,
                {
                    key: id,
                    name: id,
                    className: "mx_MediaPreviewAccountSetting_Radio",
                    control: createElement(RadioInput, { id }),
                },
                createElement(Label, { htmlFor: id }, label),
            );
        const choices = renderToStaticMarkup(
            createElement(
                Form.Root,
                { className: "mx_MediaPreviewAccountSetting_Form" },
                createElement(
                    Field,
                    { "name": "media_previews", "role": "radiogroup", "aria-label": "Show media in timeline" },
                    choice("off", "Always hide"),
                    choice("private", "In private rooms"),
                    choice("on", "Always show"),
                ),
            ),
        );
        const container = renderTab(
            theme,
            section(
                "privacy",
                "",
                subsection(
                    "media",
                    "Show media in timeline",
                    choices,
                    "Hidden media can always be shown by selecting it",
                ),
            ),
        );
        const card = box("#media-card");
        const rows = [...document.querySelectorAll(".mx_MediaPreviewAccountSetting_Radio")].map((row) =>
            row.getBoundingClientRect(),
        );

        expectCard("#media-card", container);
        expect(card.top - box("#media-label").bottom).toBe(8);
        expect(box("#media-help").top - card.bottom).toBe(8);
        expect(getComputedStyle(get("#media-help")).fontSize).toBe("13px");
        // On the card's 12px content edges, 12px apart, as a settings list of radios
        expect(rows[0].top - card.top).toBe(12);
        expect(card.bottom - rows[2].bottom).toBe(12);
        expect(rows[1].top - rows[0].bottom).toBe(12);
        expect(rows[2].top - rows[1].bottom).toBe(12);
    });

    describe("email addresses and phone numbers", () => {
        /** An address's row, as AddRemoveThreepids renders it, with its buttons' labels. */
        const address = (id: string, text: string, actions: string[], description = ""): string => `
            <div class="mx_AddRemoveThreepids_row" id="${id}">
                <div class="mx_AddRemoveThreepids_row_text">
                    <span id="${id}-text">${text}</span>
                    ${description && `<span class="mx_AddRemoveThreepids_row_description" id="${id}-state">${description}</span>`}
                </div>
                <div class="DialogFooterView_footer mx_AddRemoveThreepids_row_actions">
                    ${actions
                        .map(
                            (label) =>
                                `<button class="DialogFooterView_button DialogFooterView_destructive" id="${id}-${label}">${label}</button>`,
                        )
                        .join("")}
                </div>
            </div>
        `;
        const addRow = `
            <button class="SettingsRow_row SettingsRow_interactive" data-settings-row="" id="add">
                <span class="SettingsRow_text"><span class="SettingsRow_label">Add email address</span></span>
            </button>
        `;
        const buttons = `
            <div class="mx_AddRemoveThreepids_buttons" id="buttons">
                <div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary_outline">Cancel</div>
                <div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary">Add</div>
            </div>
        `;
        const form = `
            <form class="mx_AddRemoveThreepids_add" id="form">
                <div class="mx_Field" id="field"><input id="email" placeholder="Email address"><label>Email address</label></div>
                ${buttons}
            </form>
        `;
        /** The group's card around what its list (ValueRowList) holds. */
        function renderList(rows: string): DOMRect {
            renderTab(
                theme,
                section(
                    "personal",
                    "",
                    `<div class="mx_SettingsSubsection">
                        <div class="mx_SettingsSubsection_content mx_SettingsSubsection_contentStretch" id="card">
                            <div class="SettingsRow_list mx_AddRemoveThreepids" data-settings-row="" id="list">${rows}</div>
                        </div>
                    </div>`,
                ),
            );
            return box("#card");
        }

        it("are 44px rows one after another, the address and what can be done with it on the card's edges", () => {
            const card = renderList(
                address("first", "alice@example.org", ["Remove"]) +
                    address("second", "+447700900000", ["Remove"]) +
                    addRow,
            );

            expect([box("#first").height, box("#second").height, box("#add").height]).toEqual([44, 44, 44]);
            expect(box("#first").top - card.top).toBe(4);
            expect(box("#second").top).toBe(box("#first").bottom);
            expect(box("#add").top).toBe(box("#second").bottom);
            expect(card.bottom - box("#add").bottom).toBe(4);
            expect(textBox("#first-text").left - card.left).toBe(16);
            expect(textBox("#add .SettingsRow_label").left - card.left).toBe(16);
            expect(card.right - textBox("#first-Remove").right).toBeCloseTo(16, 0);
            // The button is the 36px text button of the dialogs' footers, in the menus' red
            expect(box("#first-Remove").height).toBe(36);
            expect(card.right - box("#first-Remove").right).toBe(4);
            const style = getComputedStyle(get("#first-Remove"));
            expect(style.color).toBe(tokenColor("--cpd-color-text-critical-primary", get("#card")));
            expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
            // Centered on its row
            expect((box("#first-Remove").top + box("#first-Remove").bottom) / 2).toBe(box("#first").top + 22);
        });

        it("keep their height while asking to confirm, so that nothing moves", () => {
            renderList(address("first", "Remove alice@example.org?", ["Remove", "Cancel"]) + addRow);

            expect(box("#first").height).toBe(44);
            expect(box("#first-Cancel").left - box("#first-Remove").right).toBe(8);
        });

        it("break a long address rather than running under its button", () => {
            renderList(address("first", `${"alice".repeat(40)}@example.org`, ["Remove"]));

            expect(box("#first-text").right).toBeLessThanOrEqual(box("#first-Remove").left);
            expect(box("#first").height).toBeGreaterThan(44);
        });

        it("show the one to verify as a 52px row, its state in 13px secondary text under it", () => {
            renderList(address("first", "bob@example.org", [], "Unverified"));
            const style = getComputedStyle(get("#first-state"));

            expect(box("#first").height).toBe(52);
            expect([style.fontSize, style.color]).toEqual([
                "13px",
                tokenColor("--cpd-color-text-secondary", get("#card")),
            ]);
            expect(box("#first-state").top).toBe(box("#first-text").bottom);
        });

        it("put the form that adds one 16px under the card's top, and its buttons 12px over its bottom, 8px apart", () => {
            const card = renderList(form);
            const [cancel, add] = [...get("#buttons").children].map((button) => button.getBoundingClientRect());

            expect(box("#field").top - card.top).toBe(16);
            expect([box("#field").left - card.left, card.right - box("#field").right]).toEqual([16, 16]);
            expect(box("#field").height).toBe(36);
            expect(box("#buttons").top - box("#field").bottom).toBe(16);
            expect(card.bottom - box("#buttons").bottom).toBe(12);
            expect(add.left - cancel.right).toBe(8);
            expect([cancel.height, add.height]).toEqual([36, 36]);
        });

        it("put it 12px under the last address", () => {
            renderList(address("first", "alice@example.org", ["Remove"]) + form);

            expect(box("#field").top - box("#first").bottom).toBe(12);
        });
    });

    describe("the Appearance tab", () => {
        /** The message layout choices, as LayoutSwitcher renders them in its subsection that stretches its content. */
        const layouts = renderToStaticMarkup(
            createElement(
                Form.Root,
                { className: "mx_LayoutSwitcher_LayoutSelector" },
                ["Modern", "Message bubbles", "IRC"].map((name) =>
                    createElement(
                        Field,
                        { key: name, name: "layout", className: "mxLayoutSwitcher_LayoutSelector_LayoutRadio" },
                        createElement(
                            Label,
                            {},
                            createElement(
                                "div",
                                { className: "mxLayoutSwitcher_LayoutSelector_LayoutRadio_inline" },
                                createElement(RadioControl, { name: "layout", value: name }),
                                createElement("span", {}, name),
                            ),
                            createElement("hr", { className: "mxLayoutSwitcher_LayoutSelector_LayoutRadio_separator" }),
                            createElement("div", {
                                className: "mxLayoutSwitcher_LayoutSelector_LayoutRadio_EventTilePreview",
                                style: { height: "40px" },
                            }),
                        ),
                    ),
                ),
            ),
        );

        /** The image sizes, as ImageSizePanel renders them, the drawings inline as SVGR inlines them. */
        const imageSize = (id: string, drawing: string, checked: boolean): string => `
            <label class="mx_ImageSizePanel_choice" id="${id}">
                <span class="mx_ImageSizePanel_header" id="${id}-header">
                    ${renderToStaticMarkup(
                        createElement(RadioInput, { name: "image_size", value: id, defaultChecked: checked }),
                    )}
                    <span id="${id}-label">${id}</span>
                </span>
                ${drawing.replace("<svg ", `<svg class="mx_ImageSizePanel_size" id="${id}-drawing" `)}
            </label>
        `;
        const imageSizes = `
            <div class="mx_ImageSizePanel_choices">
                ${imageSize("default", imageSizeNormal, true)}${imageSize("large", imageSizeLarge, false)}
            </div>
        `;

        /** The switch and the choices of the theme, as ThemeChoicePanel renders them. */
        const systemTheme = renderToStaticMarkup(
            createElement(
                Form.Root,
                { id: "system" },
                createElement(
                    InlineField,
                    { name: "systemTheme", control: createElement(ToggleControl, { name: "systemTheme" }) },
                    createElement(Label, {}, "Match system theme"),
                ),
            ),
        );
        const themes = renderToStaticMarkup(
            createElement(
                Form.Root,
                { className: "mx_ThemeChoicePanel_ThemeSelectors", id: "themes" },
                createElement(
                    InlineField,
                    {
                        name: "themeSelector",
                        className: "mx_ThemeChoicePanel_themeSelector",
                        id: "theme",
                        control: createElement(RadioControl, { name: "themeSelector", value: "light" }),
                    },
                    createElement(Label, { className: "mx_ThemeChoicePanel_themeSelector_Label" }, "Light"),
                ),
            ),
        );

        /** A subsection whose content is stretched across its card, as `stretchContent` renders it. */
        const stretched = (id: string, heading: string, content: string): string => `
            <div class="mx_SettingsSubsection" id="${id}">
                <div class="mx_SettingsSubsectionHeading">
                    <h3 class="mx_Heading_h4 mx_SettingsSubsectionHeading_heading">${heading}</h3>
                </div>
                <div class="mx_SettingsSubsection_content mx_SettingsSubsection_contentStretch" id="${id}-card">
                    ${content}
                </div>
            </div>
        `;

        it("stretches the layout cards across their group's card", () => {
            renderTab(theme, section("appearance", "", stretched("layout", "Message layout", layouts)));
            const edges = contentBox("#layout-card");

            for (const card of document.querySelectorAll(".mxLayoutSwitcher_LayoutSelector_LayoutRadio")) {
                const rect = card.getBoundingClientRect();
                expect([rect.left, rect.right]).toEqual([edges.left, edges.right]);
            }
        });

        it("puts what is boxed 16px from its card's edges, top and bottom too, and rows of text 12px from them", () => {
            const compact = `<form id="compact"><div style="height: 24px">Show compact text and messages</div></form>`;
            renderTab(
                theme,
                section(
                    "appearance",
                    "",
                    stretched("theme-group", "Theme", systemTheme + themes) +
                        stretched("theme-alone", "Theme", themes.replaceAll('id="theme', 'id="alone')) +
                        stretched("layout", "Message layout", layouts + compact) +
                        stretched(
                            "font",
                            "",
                            `<div data-settings-row="" id="slider" style="height: 64px"></div>
                            <div class="mx_FontScalingPanel_preview" id="preview">Hey you.</div>`,
                        ) +
                        stretched("size", "Image size in the timeline", imageSizes),
                ),
            );
            const insets = (card: string, first: string, last: string): number[] => {
                const cardBox = box(card);
                return [
                    box(first).left - cardBox.left,
                    box(first).top - cardBox.top,
                    cardBox.bottom - box(last).bottom,
                ];
            };
            const firstLayout = ".mxLayoutSwitcher_LayoutSelector_LayoutRadio";

            expect(insets("#theme-group-card", "#system", "#theme")).toEqual([16, 12, 16]);
            expect(insets("#theme-alone-card", "#alone", "#alone")).toEqual([16, 16, 16]);
            expect(insets("#layout-card", firstLayout, "#compact")).toEqual([16, 16, 12]);
            expect(insets("#font-card", "#slider", "#preview").slice(1)).toEqual([4, 16]);
            expect(box("#preview").left - box("#font-card").left).toBe(16);
            expect(insets("#size-card", "#default", "#default")).toEqual([16, 16, 16]);

            // The cards are the groups' own, and what they hold is 16px apart in all of them
            for (const card of ["#theme-group-card", "#layout-card", "#size-card"]) {
                expect(cornerRadii(get(card))).toEqual({ x: 12, y: 12 });
            }
            expect(box("#theme").top - box("#system").bottom).toBe(16);
            const layoutCards = [...document.querySelectorAll(firstLayout)].map((card) => card.getBoundingClientRect());
            expect(layoutCards[1].top - layoutCards[0].bottom).toBe(16);
            expect(box("#compact").top - layoutCards[2].bottom).toBe(16);
            expect(box("#large").left - box("#default").right).toBe(16);
            expect(box("#preview").top - box("#slider").bottom).toBe(16);
        });

        it("draws the layouts and the image sizes as the same cards: 1px outlines rounded by 8 under a 44px header", () => {
            renderTab(
                theme,
                section(
                    "appearance",
                    "",
                    stretched("layout", "Message layout", layouts) +
                        stretched("size", "Image size in the timeline", imageSizes),
                ),
            );
            const cards: [string, string, string][] = [
                [
                    ".mxLayoutSwitcher_LayoutSelector_LayoutRadio",
                    ".mxLayoutSwitcher_LayoutSelector_LayoutRadio_inline > span",
                    ".mxLayoutSwitcher_LayoutSelector_LayoutRadio_separator",
                ],
                ["#large", "#large-label", "#large-drawing"],
            ];

            for (const [card, label, below] of cards) {
                const cardBox = box(card);
                const radio = get(card).querySelector("input")!.getBoundingClientRect();
                const style = getComputedStyle(get(card));

                expect([style.borderTopStyle, style.borderTopWidth]).toEqual(["solid", "1px"]);
                expect(style.borderTopColor).toBe(tokenColor("--cpd-color-border-interactive-primary", get(card)));
                expect(cornerRadii(get(card))).toEqual({ x: 8, y: 8 });
                expect([radio.left - cardBox.left, radio.top - cardBox.top]).toEqual([12, 12]);
                expect([radio.width, radio.height]).toEqual([20, 20]);
                expect(textBox(label).left - radio.right).toBe(12);
                expect(getComputedStyle(get(label)).fontSize).toBe("15px");
                expect(getComputedStyle(get(label)).fontWeight).toBe("500");
                // The 1px separator ends the header
                const header = below.endsWith("drawing") ? box(below).top : box(below).bottom;
                expect(header - cardBox.top).toBe(44);
            }
        });

        it.each<"ltr" | "rtl">(["ltr", "rtl"])(
            "lays the image sizes out as two equal cards 16px apart, each drawing flush with its card's edges (%s)",
            (dir) => {
                renderTab(theme, section("appearance", "", stretched("size", "Image size", imageSizes)), dir);
                const edges = contentBox("#size-card");
                const [first, second] = dir === "ltr" ? ["#default", "#large"] : ["#large", "#default"];

                expect(box(first).left).toBe(edges.left);
                expect(box(second).right).toBe(edges.right);
                expect(box(second).left - box(first).right).toBe(16);
                expect(box("#default").width).toBe(box("#large").width);
                for (const id of ["#default", "#large"]) {
                    const drawing = box(`${id}-drawing`);
                    // Inside the 1px outline
                    expect([drawing.left - box(id).left, box(id).right - drawing.right]).toEqual([1, 1]);
                    expect(box(id).bottom - drawing.bottom).toBe(1);
                    // Scaled with its 221 × 148 drawing, and following the card's end corners
                    expect(Math.abs(drawing.height - (drawing.width * 148) / 221)).toBeLessThanOrEqual(0.5);
                    expect(getComputedStyle(get(`${id}-drawing`)).borderEndEndRadius).toBe("7px");
                }
            },
        );

        it.each([
            ["layout", ".mxLayoutSwitcher_LayoutSelector_LayoutRadio", layouts],
            ["image size", ".mx_ImageSizePanel_choice", imageSizes],
        ])(
            "makes a %s card a button all over: hover and pressed fills, and the focus ring around it",
            async (_, card, group) => {
                renderTab(theme, section("appearance", "", stretched("group", "Group", group)));
                const [first, choice] = [...document.querySelectorAll<HTMLElement>(card)];
                const fill = (token: string): string =>
                    `linear-gradient(${tokenColor(token, choice)}, ${tokenColor(token, choice)})`;

                await userEvent.hover(choice);
                expect(getComputedStyle(choice).backgroundImage).toBe(fill("--cpd-color-bg-action-secondary-hovered"));
                await mouseButton("mousePressed", choice);
                expect(getComputedStyle(choice).backgroundImage).toBe(fill("--cpd-color-bg-action-secondary-pressed"));
                await mouseButton("mouseReleased", choice);

                first.querySelector("input")!.focus();
                await userEvent.keyboard("{ArrowRight}");
                const ring = getComputedStyle(choice, "::after");
                expect(document.activeElement).toBe(choice.querySelector("input"));
                expect([ring.outlineStyle, ring.outlineWidth, ring.outlineOffset]).toEqual(["solid", "2px", "1px"]);
                expect(ring.outlineColor).toBe(tokenColor("--cpd-color-border-focused", choice));
                expect(ring.borderTopLeftRadius).toBe("8px");
                expect(getComputedStyle(choice.querySelector("input + *")!).outlineStyle).toBe("none");
            },
        );
    });

    describe("the user Notifications tab", () => {
        /** A rule's row, as Notifications renders the grid's radios. */
        const radio = (value: string): string => `
            <label class="mx_StyledRadioButton mx_StyledRadioButton_enabled">
                <input type="radio" name="keywords" value="${value}" aria-label="${value}" />
                <div><div></div></div>
                <div class="mx_StyledRadioButton_content"></div>
                <div class="mx_StyledRadioButton_spacer"></div>
            </label>
        `;
        /** The Mentions and keywords group and the Mark all as read card, as Notifications renders them. */
        const notifications = `
            <div class="mx_SettingsSection">
                <div class="mx_SettingsSection_subSections">
                    <div class="mx_SettingsSubsection">
                        <div class="mx_SettingsSubsectionHeading">
                            <h2 class="mx_Heading_h4 mx_SettingsSubsectionHeading_heading" id="mentions-label">Mentions and keywords</h2>
                        </div>
                        <div class="mx_SettingsSubsection_content mx_SettingsSubsection_contentStretch" id="mentions-card">
                            <div class="mx_UserNotifSettings_grid" id="grid">
                                <span class="mx_UserNotifSettings_gridColumnLabel" id="off">Off</span>
                                <span class="mx_UserNotifSettings_gridColumnLabel">Silent</span>
                                <span class="mx_UserNotifSettings_gridColumnLabel">On</span>
                                <fieldset class="mx_UserNotifSettings_gridRowContainer">
                                    <legend class="mx_UserNotifSettings_gridRowLabel" id="rule">Messages containing keywords</legend>
                                    ${radio("off")}${radio("silent")}${radio("on")}
                                </fieldset>
                            </div>
                            <div class="mx_TagComposer" id="keywords">
                                <form class="mx_TagComposer_input">
                                    <div class="mx_Field mx_Field_input" id="keyword-field">
                                        <input id="keyword-input" placeholder="New keyword" /><label for="keyword-input">Keyword</label>
                                    </div>
                                    <div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary">Add</div>
                                </form>
                                <div class="mx_TagComposer_tags" role="list"></div>
                            </div>
                        </div>
                    </div>
                    <div class="mx_SettingsSubsection">
                        <div class="mx_SettingsSubsection_content" id="clear-card">
                            <div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary_outline" id="clear">Mark all as read</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        it("labels each group above its card, the column names on the card's first row over their columns", () => {
            renderTab(theme, notifications);
            const edges = contentBox("#mentions-card");

            expect(box("#mentions-card").top - box("#mentions-label").bottom).toBe(8);
            expect(box("#off").top).toBe(edges.top);
            expect(box("#off").left).toBeGreaterThan(box("#rule").right);
            expect([box("#grid").left, box("#grid").right]).toEqual([edges.left, edges.right]);
        });

        it("puts the keyword field 16px under the table and ends the card 12px under it", () => {
            renderTab(theme, notifications);

            expect(box("#keywords").top - box("#grid").bottom).toBe(16);
            expect(box("#mentions-card").bottom - box("#keyword-field").bottom).toBe(12);
        });

        it("puts Mark all as read on a card of its own", () => {
            const container = renderTab(theme, notifications);

            expectCard("#clear-card", container);
            expect(box("#clear").left - box("#clear-card").left).toBe(16);
        });

        it.each<"ltr" | "rtl">(["ltr", "rtl"])(
            "indents a toggle that needs the one above it 24px under that one, as Sidebar does (%s)",
            (dir) => {
                const toggle = (id: string, label: string, disabled = false): string =>
                    fieldMarkup(createElement(SettingsToggleInput, { name: id, label, id, disabled }));
                renderTab(
                    theme,
                    `<div class="mx_SettingsSection"><div class="mx_SettingsSection_subSections">
                        <div class="mx_SettingsSubsection"><div class="mx_SettingsSubsection_content" id="top-card"><form>
                            ${toggle("desktop", "Enable desktop notifications for this device")}
                            <div class="mx_UserNotifSettings_dependentToggle" id="body-row">
                                ${toggle("body", "Show message in desktop notification", true)}
                            </div>
                            ${toggle("audio", "Enable audible notifications for this device")}
                        </form></div></div>
                    </div></div>`,
                    dir,
                );
                const start = (id: string): number => box(`#${id}`)[dir === "ltr" ? "left" : "right"];

                expect(Math.abs(start("body") - start("desktop"))).toBe(24);
                expect(start("audio")).toBe(start("desktop"));
            },
        );
    });

    it("ends the Link new device card 12px under its last line", () => {
        renderTab(
            theme,
            section(
                "sessions",
                "",
                subsection(
                    "qr",
                    "Link new device",
                    `<div class="mx_LoginWithQRSection">
                        <div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary">Show QR code</div>
                        <p class="_typography_6v6n8_153 _font-body-sm-regular_6v6n8_31" id="unsupported">Not supported by your account provider</p>
                    </div>`,
                    "Use a QR code to sign in to another device and set up secure messaging.",
                ),
            ),
        );

        expect(box("#qr-card").bottom - box("#unsupported").bottom).toBe(12);
    });

    describe("the room Notifications tab", () => {
        const option = (value: string, label: string, description: string): string => `
            <label class="mx_StyledRadioButton mx_StyledRadioButton_enabled" id="${value}">
                <input type="radio" value="${value}" name="roomNotificationSetting">
                <div><div></div></div>
                <div class="mx_StyledRadioButton_content">${label}<div class="mx_NotificationSettingsTab_microCopy" id="${value}-description">${description}</div></div>
                <div class="mx_StyledRadioButton_spacer"></div>
            </label>
        `;

        const renderNotifications = (dir: "ltr" | "rtl" = "ltr"): HTMLElement =>
            renderTab(
                theme,
                section(
                    "notifications",
                    "",
                    `<div class="mx_NotificationSettingsTab_notificationsSection" id="options">
                        ${option("default", "Default", "Get notifications as set up in your settings")}
                        ${option("all", "All messages", "Get notified for every message")}
                    </div>
                    <fieldset class="mx_SettingsFieldset">
                        <legend class="mx_SettingsFieldset_legend">Access</legend>
                        <div class="mx_SettingsFieldset_content">
                            <label class="mx_StyledRadioButton mx_StyledRadioButton_enabled mx_JoinRuleSettings_radioButton" id="join">
                                <input type="radio" name="joinRule"><div><div></div></div>
                                <div class="mx_StyledRadioButton_content">Invite only</div>
                                <div class="mx_StyledRadioButton_spacer"></div>
                            </label>
                            <span>Only invited people can join.</span>
                        </div>
                    </fieldset>` +
                        `<div class="mx_SettingsSubsection mx_NotificationSettingsTab_sounds">
                            <div class="mx_SettingsSubsectionHeading">
                                <h3 class="mx_Heading_h4 mx_SettingsSubsectionHeading_heading" id="sounds-label">Sounds</h3>
                            </div>
                            <div class="mx_SettingsSubsection_content" id="sounds-card">
                                <div>
                                    <div class="mx_SettingsTab_subsectionText" id="sound"><span>Notification sound: <code id="sound-name">default</code></span></div>
                                    <div class="mx_AccessibleButton mx_NotificationSound_resetSound mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary" role="button" id="reset">Reset</div>
                                </div>
                                <div>
                                    <h4 class="mx_Heading_h4" id="prompt">Set a new custom sound</h4>
                                    <div class="mx_SettingsFlag"><form><input class="mx_NotificationSound_soundUpload" type="file"></form></div>
                                    <div class="mx_AccessibleButton mx_NotificationSound_browse mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary_outline" role="button" id="browse">Browse…</div>
                                </div>
                            </div>
                        </div>`,
                ),
                dir,
            );

        it.each<"ltr" | "rtl">(["ltr", "rtl"])(
            "starts the options' radios on the card's content edge, their labels 12px after them (%s)",
            (dir) => {
                renderNotifications(dir);
                const edges = contentBox("#options");
                /** How far a box starts from the card's content edge, on the side the text starts. */
                const inset = (rect: DOMRect): number =>
                    dir === "ltr" ? rect.left - edges.left : edges.right - rect.right;

                for (const value of ["default", "all"]) {
                    const ring = box(`#${value} input + div`);
                    const label = textBox(`#${value} .mx_StyledRadioButton_content`);
                    const description = textBox(`#${value}-description`);
                    expect(inset(ring)).toBe(0);
                    expect(inset(label) - inset(ring) - ring.width).toBe(12);
                    expect(inset(description)).toBe(inset(label));
                    // On the label's line as the Security tab's join rules put their radios
                    const joinRing = box("#join input + div");
                    const joinLabel = textBox("#join .mx_StyledRadioButton_content");
                    expect(ring.top - label.top).toBe(joinRing.top - joinLabel.top);
                }
            },
        );

        it("writes the options like the Security tab's join rules, between separators on a card", () => {
            const container = renderNotifications();
            const label = getComputedStyle(get("#default .mx_StyledRadioButton_content"));
            const description = getComputedStyle(get("#default-description"));

            expect(getComputedStyle(get("#options")).backgroundColor).toBe(cardColor(container));
            expect(cornerRadii(get("#options"))).toEqual({ x: 12, y: 12 });
            expect([label.fontSize, label.fontWeight]).toEqual(["15px", "600"]);
            expect([description.fontSize, description.fontWeight, description.color]).toEqual([
                "13px",
                "400",
                tokenColor("--cpd-color-text-secondary", container),
            ]);
            expect(getComputedStyle(get("#all")).borderTopColor).toBe(
                tokenColor("--cpd-color-separator-primary", get(".mx_Dialog")),
            );
            expect(box("#all .mx_StyledRadioButton_content").top - box("#all").top).toBe(17);
            // Rows 16px from the card's top and bottom, the rows' own padding, on both tabs
            expect(box("#default .mx_StyledRadioButton_content").top - box("#options").top).toBe(16);
            expect(box("#options").bottom - box("#all-description").bottom).toBe(16);
            expect(box("#join .mx_StyledRadioButton_content").top - box(".mx_SettingsFieldset_content").top).toBe(16);
        });

        it("writes the sound's name in the line's regular secondary text, and the prompt as a 15px label 8px over Browse…", () => {
            const container = renderNotifications();
            const line = getComputedStyle(get("#sound"));
            const name = getComputedStyle(get("#sound-name"));
            const prompt = getComputedStyle(get("#prompt"));

            expect([name.fontFamily, name.fontSize, name.color]).toEqual([line.fontFamily, line.fontSize, line.color]);
            expect([line.fontWeight, line.color]).toEqual(["400", tokenColor("--cpd-color-text-secondary", container)]);
            expect(name.backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect([prompt.fontSize, prompt.fontWeight]).toEqual(["15px", "600"]);
            expect(box("#browse").top - box("#prompt").bottom).toBe(8);
            expect(box("#sounds-card").top - box("#sounds-label").bottom).toBe(8);
            expect(box("#sounds-label").top - box(".mx_SettingsFieldset_content").bottom).toBe(24);
        });
    });

    it("indents Show all rooms under Home's toggle in the Sidebar tab", () => {
        const sidebarToggle = (id: string, extraClass = ""): string =>
            fieldMarkup(
                createElement(SettingsToggleInput, {
                    name: id,
                    label: id,
                    className: `mx_SidebarUserSettingsTab_toggle ${extraClass} sidebar-${id}`,
                }),
            );
        renderTab(
            theme,
            section(
                "sidebar",
                "",
                subsection(
                    "spaces",
                    "Spaces to show",
                    `<form>${sidebarToggle("home")}${sidebarToggle("all", "mx_SidebarUserSettingsTab_homeAllRoomsToggle")}${sidebarToggle("orphans")}</form>`,
                ),
            ),
        );
        const start = (id: string): number => box(`.sidebar-${id}`).left;

        expect(start("home")).toBe(contentBox("#spaces-card").left);
        expect(start("all") - start("home")).toBe(24);
        expect(start("orphans")).toBe(start("home"));
    });
});
