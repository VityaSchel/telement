/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Field, Form, Label, RadioControl, SettingsToggleInput } from "@vector-im/compound-web";
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
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import filterTabGroupStyles from "../../res/css/components/views/elements/_FilterTabGroup.pcss?raw";
import tabbedViewStyles from "../../res/css/structures/_TabbedView.pcss?raw";
import settingsSubsectionStyles from "../../res/css/components/views/settings/shared/_SettingsSubsection.pcss?raw";
import settingsSubsectionHeadingStyles from "../../res/css/components/views/settings/shared/_SettingsSubsectionHeading.pcss?raw";
import loginWithQrStyles from "../../res/css/views/auth/_LoginWithQR.pcss?raw";
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
import pollHistoryStyles from "../../res/css/views/polls/pollHistory/_PollHistory.pcss?raw";
import pollHistoryListStyles from "../../res/css/views/polls/pollHistory/_PollHistoryList.pcss?raw";
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
import userProfileSettingsStyles from "../../res/css/views/settings/_UserProfileSettings.pcss?raw";
import settingsSectionStyles from "../../res/css/views/settings/tabs/_SettingsSection.pcss?raw";
import settingsTabStyles from "../../res/css/views/settings/tabs/_SettingsTab.pcss?raw";
import notificationSettingsTabStyles from "../../res/css/views/settings/tabs/room/_NotificationSettingsTab.pcss?raw";
import appearanceTabStyles from "../../res/css/views/settings/tabs/user/_AppearanceUserSettingsTab.pcss?raw";
import sidebarTabStyles from "../../res/css/views/settings/tabs/user/_SidebarUserSettingsTab.pcss?raw";
import headingStyles from "../../res/css/views/typography/_Heading.pcss?raw";
import compoundOverrides from "../../res/css/telement/_CompoundOverrides.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import lightHcTheme from "../../res/themes/light-high-contrast/css/_light-high-contrast.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import imageSizeNormal from "../../res/img/element-icons/settings/img-size-normal.svg?raw";
import imageSizeLarge from "../../res/img/element-icons/settings/img-size-large.svg?raw";
import { cornerRadii, toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";
import { loadInter } from "../test/telement/fonts";

/** In the order _components.pcss imports them, after _common.pcss, as in the app's bundle. */
const APP_STYLES = [
    commonStyles,
    filterTabGroupStyles,
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
    pollHistoryStyles,
    pollHistoryListStyles,
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
    userProfileSettingsStyles,
    settingsSectionStyles,
    settingsTabStyles,
    notificationSettingsTabStyles,
    appearanceTabStyles,
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

    describe("fields", () => {
        it("spans a subsection's dropdown, the startup dropdown and the font size across the card", () => {
            const dropdown = (id: string): string => `
                <div class="mx_Dropdown">
                    <span class="mx_Dropdown_label" aria-hidden="true">Application language</span>
                    <div class="mx_AccessibleButton mx_Dropdown_input mx_no_textinput" role="button" id="${id}">
                        <div class="mx_Dropdown_option">English</div>
                    </div>
                </div>
            `;
            renderTab(
                theme,
                section(
                    "preferences",
                    "",
                    subsection(
                        "language",
                        "Language",
                        `<div class="mx_SettingsSubsection_dropdown">${dropdown("language-input")}</div>`,
                    ) +
                        subsection(
                            "startup",
                            "Startup",
                            `<div class="mx_SettingsDropdown"><label class="mx_SettingsDropdown_label">Start</label>${dropdown("startup-input")}</div>`,
                        ),
                ) +
                    `<div class="mx_SettingsSubsection">
                        <div class="mx_SettingsSubsection_content mx_SettingsSubsection_contentStretch" id="font-card">
                            <div class="mx_Field mx_Field_select mx_FontScalingPanel_Dropdown" id="font">
                                <select id="font-select"><option>16 (default)</option></select>
                                <label for="font-select">Font size</label>
                            </div>
                            <form>
                                <div class="mx_Field mx_Field_input mx_AppearanceUserSettingsTab_checkboxControlledField" id="custom">
                                    <input id="custom-input"><label for="custom-input">Font</label>
                                </div>
                            </form>
                        </div>
                    </div>`,
            );

            for (const [card, field] of [
                ["#language-card", "#language-input"],
                ["#startup-card", "#startup-input"],
                ["#font-card", "#font"],
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
            <label id="${id}">
                ${drawing.replace("<svg ", `<svg class="mx_ImageSizePanel_size" id="${id}-drawing" `)}
                <label class="mx_StyledRadioButton mx_StyledRadioButton_enabled" id="${id}-radio">
                    <input type="radio" name="image_size" value="${id}" ${checked ? "checked" : ""} />
                    <div><div></div></div>
                    <div class="mx_StyledRadioButton_content">${id}</div>
                    <div class="mx_StyledRadioButton_spacer"></div>
                </label>
            </label>
        `;

        /** A subsection whose content is stretched across its card, as `stretchContent` renders it. */
        const stretched = (id: string, heading: string, content: string, newUi = false): string => `
            <div class="mx_SettingsSubsection${newUi ? " mx_SettingsSubsection_newUi" : ""}" id="${id}">
                <div class="mx_SettingsSubsectionHeading">
                    <h3 class="mx_Heading_h4 mx_SettingsSubsectionHeading_heading">${heading}</h3>
                </div>
                <div class="mx_SettingsSubsection_content mx_SettingsSubsection_contentStretch${newUi ? " mx_SettingsSubsection_content_newUi" : ""}"
                    id="${id}-card">${content}</div>
            </div>
        `;

        it("stretches the layout cards across their group's card", () => {
            renderTab(theme, section("appearance", "", stretched("layout", "Message layout", layouts, true)));
            const edges = contentBox("#layout-card");

            for (const card of document.querySelectorAll(".mxLayoutSwitcher_LayoutSelector_LayoutRadio")) {
                const rect = card.getBoundingClientRect();
                expect([rect.left, rect.right]).toEqual([edges.left, edges.right]);
            }
        });

        it.each<"ltr" | "rtl">(["ltr", "rtl"])(
            "lays the image sizes out as two equal columns 16px apart, each drawing as wide as its column and 12px over its radio (%s)",
            (dir) => {
                renderTab(
                    theme,
                    section(
                        "appearance",
                        "",
                        stretched(
                            "size",
                            "Image size in the timeline",
                            `<div class="mx_ImageSizePanel_radios">${imageSize("default", imageSizeNormal, true)}${imageSize("large", imageSizeLarge, false)}</div>`,
                        ),
                    ),
                    dir,
                );
                const edges = contentBox("#size-card");
                const [first, second] = dir === "ltr" ? ["#default", "#large"] : ["#large", "#default"];

                expect(box(first).left).toBe(edges.left);
                expect(box(second).right).toBe(edges.right);
                expect(box(second).left - box(first).right).toBe(16);
                expect(box("#default").width).toBe(box("#large").width);
                for (const id of ["#default", "#large"]) {
                    const drawing = box(`${id}-drawing`);
                    expect([drawing.left, drawing.right]).toEqual([box(id).left, box(id).right]);
                    // Scaled with its 221 × 148 drawing
                    expect(Math.abs(drawing.height - (drawing.width * 148) / 221)).toBeLessThanOrEqual(0.5);
                    expect(box(`${id}-radio`).top - drawing.bottom).toBe(12);
                }
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
                                <span class="mx_UserNotifSettings_gridColumnLabel">On</span>
                                <span class="mx_UserNotifSettings_gridColumnLabel" id="noisy">Noisy</span>
                                <fieldset class="mx_UserNotifSettings_gridRowContainer">
                                    <legend class="mx_UserNotifSettings_gridRowLabel" id="rule">Messages containing keywords</legend>
                                    ${radio("off")}${radio("on")}${radio("noisy")}
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

    describe("the Polls tab", () => {
        /** The room settings' Polls tab, as PollHistoryTab, PollHistory and PollHistoryList render it. */
        const pollsTab = (list: string, heading = "Polls"): string => `
            <div class="mx_SettingsTab">
                <div class="mx_PollHistory_content">
                    <h2 class="mx_Heading_h2 mx_PollHistory_header" id="heading">${heading}</h2>
                    <div class="mx_PollHistoryList">
                        <fieldset class="mx_FilterTabGroup" id="filter">
                            <label id="active">
                                <input type="radio" name="PollHistory_filter" value="ACTIVE" checked /><span>Active polls</span>
                            </label>
                            <label id="past">
                                <input type="radio" name="PollHistory_filter" value="ENDED" /><span>Past polls</span>
                            </label>
                        </fieldset>
                        ${list}
                    </div>
                </div>
            </div>
        `;
        const noPolls = `<span class="mx_PollHistoryList_noResults" id="list">There are no active polls in this room</span>`;

        it("leaves the tab's name to the title, keeping the way back from a poll", () => {
            renderPanel(theme, pollsTab(noPolls));
            expect(getComputedStyle(get("#heading")).display).toBe("none");

            renderPanel(
                theme,
                pollsTab(noPolls, `<div class="mx_AccessibleButton mx_PollDetailHeader">Active polls</div>`),
            );
            expect(getComputedStyle(get("#heading")).display).not.toBe("none");
        });

        it("draws the filter as the room list's 28px chips 8px apart, the selected one filled, from the card's edge", () => {
            const container = renderPanel(theme, pollsTab(noPolls));
            const active = getComputedStyle(get("#active span"));
            const past = getComputedStyle(get("#past span"));

            expect(box("#active").height).toBe(28);
            expect(box("#past").height).toBe(28);
            expect(box("#active span").height).toBe(28);
            expect(box("#active").top - box(".mx_TabbedView_tabPanel").top).toBe(16);
            expect(box("#past").left - box("#active").right).toBe(8);
            expect(box("#active").left).toBe(box("#list").left);
            expect(active.borderTopLeftRadius).toBe(past.borderTopLeftRadius);
            expect(parseFloat(past.borderTopLeftRadius)).toBeGreaterThanOrEqual(14);
            expect([past.fontSize, past.fontWeight, active.fontWeight]).toEqual(["13px", "500", "500"]);
            expect(past.borderTopColor).toBe(tokenColor("--cpd-color-border-interactive-secondary", container));
            expect(past.backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect(past.color).toBe(tokenColor("--cpd-color-text-primary", container));
            expect(active.backgroundColor).toBe(tokenColor("--cpd-color-bg-action-primary-rest", container));
            expect(active.color).toBe(tokenColor("--cpd-color-text-on-solid-primary", container));
            expect(active.boxShadow).toBe("none");
        });

        it("puts the empty state on a card 8px under the filter, filling the pane down to the tab's edge", () => {
            const container = renderPanel(theme, pollsTab(noPolls));
            const scroller = get(".mx_TabbedView_tabPanelContent");

            expectCard("#list", container);
            expect(box("#list").top - box("#filter").bottom).toBe(8);
            expect(box(".mx_SettingsTab").bottom - box("#list").bottom).toBe(24);
            expect(scroller.scrollHeight).toBe(scroller.clientHeight);
        });

        it("scrolls a long list on its card rather than the pane", () => {
            const container = renderPanel(
                theme,
                pollsTab(
                    `<ol class="mx_PollHistoryList_list mx_PollHistoryList_list_ACTIVE" id="list">
                        ${'<li style="height: 40px">Which accent for your own bubbles?</li>'.repeat(30)}
                    </ol>`,
                ),
            );
            const scroller = get(".mx_TabbedView_tabPanelContent");

            expectCard("#list", container);
            expect(box(".mx_SettingsTab").bottom - box("#list").bottom).toBe(24);
            expect(scroller.scrollHeight).toBe(scroller.clientHeight);
            expect(get("#list").scrollHeight).toBeGreaterThan(get("#list").clientHeight);
        });
    });
});
