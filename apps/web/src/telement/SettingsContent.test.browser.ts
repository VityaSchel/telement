/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Alert, Form, IconButton, SettingsToggleInput } from "@vector-im/compound-web";
import { ChevronDownIcon, CopyIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
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
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import autocompleteInputStyles from "../../res/css/structures/_AutocompleteInput.pcss?raw";
import viewSourceStyles from "../../res/css/structures/_ViewSource.pcss?raw";
import settingsSubsectionStyles from "../../res/css/components/views/settings/shared/_SettingsSubsection.pcss?raw";
import settingsSubsectionHeadingStyles from "../../res/css/components/views/settings/shared/_SettingsSubsectionHeading.pcss?raw";
import deviceSecurityCardStyles from "../../res/css/components/views/settings/devices/_DeviceSecurityCard.pcss?raw";
import deviceDetailsStyles from "../../res/css/components/views/settings/devices/_DeviceDetails.pcss?raw";
import filteredDeviceListStyles from "../../res/css/components/views/settings/devices/_FilteredDeviceList.pcss?raw";
import filteredDeviceListHeaderStyles from "../../res/css/components/views/settings/devices/_FilteredDeviceListHeader.pcss?raw";
import encryptionCardStyles from "../../res/css/views/settings/encryption/_EncryptionCard.pcss?raw";
import aliasSettingsStyles from "../../res/css/views/room_settings/_AliasSettings.pcss?raw";
import betaCardStyles from "../../res/css/views/beta/_BetaCard.pcss?raw";
import createRoomDialogStyles from "../../res/css/views/dialogs/_CreateRoomDialog.pcss?raw";
import exportDialogStyles from "../../res/css/views/dialogs/_ExportDialog.pcss?raw";
import accessibleButtonStyles from "../../res/css/views/elements/_AccessibleButton.pcss?raw";
import copyableTextStyles from "../../res/css/views/elements/_CopyableText.pcss?raw";
import dropdownStyles from "../../res/css/views/elements/_Dropdown.pcss?raw";
import fieldStyles from "../../res/css/views/elements/_Field.pcss?raw";
import settingsDropdownStyles from "../../res/css/views/elements/_SettingsDropdown.pcss?raw";
import styledRadioButtonStyles from "../../res/css/views/elements/_StyledRadioButton.pcss?raw";
import imageSizePanelStyles from "../../res/css/views/settings/_ImageSizePanel.pcss?raw";
import joinRuleSettingsStyles from "../../res/css/views/settings/_JoinRuleSettings.pcss?raw";
import keyboardShortcutStyles from "../../res/css/views/settings/_KeyboardShortcut.pcss?raw";
import settingsFieldsetStyles from "../../res/css/views/settings/_SettingsFieldset.pcss?raw";
import advancedPanelStyles from "../../res/css/views/settings/encryption/_AdvancedPanel.pcss?raw";
import settingsHeaderStyles from "../../res/css/views/settings/_SettingsHeader.pcss?raw";
import settingsSectionStyles from "../../res/css/views/settings/tabs/_SettingsSection.pcss?raw";
import settingsTabStyles from "../../res/css/views/settings/tabs/_SettingsTab.pcss?raw";
import helpTabStyles from "../../res/css/views/settings/tabs/user/_HelpUserSettingsTab.pcss?raw";
import keyboardTabStyles from "../../res/css/views/settings/tabs/user/_KeyboardUserSettingsTab.pcss?raw";
import headingStyles from "../../res/css/views/typography/_Heading.pcss?raw";
import compoundOverrides from "../../res/css/telement/_CompoundOverrides.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import { cornerRadii, toBrowserCss } from "../test/telement/browserCss";
import { settledStyle, tokenColor } from "../test/telement/computedStyle";
import { loadInter } from "../test/telement/fonts";

const APP_STYLES = [
    // Before the copy field and radio rules they override, as in the app's bundle (_components.pcss)
    viewSourceStyles,
    exportDialogStyles,
    accessibleButtonStyles,
    fieldStyles,
    dropdownStyles,
    settingsDropdownStyles,
    copyableTextStyles,
    styledRadioButtonStyles,
    headingStyles,
    settingsTabStyles,
    settingsSectionStyles,
    settingsSubsectionStyles,
    settingsSubsectionHeadingStyles,
    settingsHeaderStyles,
    settingsFieldsetStyles,
    advancedPanelStyles,
    autocompleteInputStyles,
    helpTabStyles,
    keyboardTabStyles,
    keyboardShortcutStyles,
    joinRuleSettingsStyles,
    aliasSettingsStyles,
    betaCardStyles,
    deviceSecurityCardStyles,
    deviceDetailsStyles,
    filteredDeviceListStyles,
    filteredDeviceListHeaderStyles,
    encryptionCardStyles,
    imageSizePanelStyles,
    createRoomDialogStyles,
    compoundOverrides,
    // A dialog's surface, raised a gray step in dark themes, as .mx_Dialog is (_common.pcss)
    ".raised { @mixin floatingSurface; }",
].join("\n");

/** Each theme's class with the theme stylesheets it is built from, in the order its entry point imports them. */
const THEMES: [string, string[]][] = [
    ["cpd-theme-light", [lightTheme]],
    ["cpd-theme-dark", [lightTheme, darkTheme]],
];

let stylesheet: HTMLStyleElement;
let removeInter: () => void;

beforeAll(async () => {
    removeInter = await loadInter();
    // Each theme's variables apply within its own class, as each theme is a separate stylesheet in the app
    const themed = THEMES.map(
        ([theme, sources]) => `.${theme} { ${toBrowserCss(APP_STYLES, ...sources, commonStyles, fontSizes)} }`,
    ).join("\n");
    stylesheet = document.createElement("style");
    stylesheet.textContent = `
        @layer compound-tokens, shared-components, compound-web, app-web;
        @layer compound-tokens {
            ${compoundBase} ${compoundSemantic}
            ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
        }
        @layer shared-components { ${telementTokens} }
        @layer compound-web { ${compoundStyles} }
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

afterEach(async () => {
    await userEvent.unhover(document.body);
    document.body.innerHTML = "";
});

/**
 * Renders settings content in a container of the theme, on a raised dialog surface 648px wide, as a tab's content.
 * @returns The dialog's surface, where its colors resolve.
 */
function render(theme: string, html: string): HTMLElement {
    document.body.innerHTML = `
        <div class="${theme}">
            <div class="raised"
                style="width: 648px; padding: 24px; font: var(--cpd-font-body-md-regular); color: var(--cpd-color-text-primary)">
                ${html}
            </div>
        </div>
    `;
    return document.querySelector<HTMLElement>(".raised")!;
}

function box(selector: string): DOMRect {
    return document.querySelector(selector)!.getBoundingClientRect();
}

/** A range over the text directly in an element. */
function textRange(selector: string): Range {
    const text = [...document.querySelector(selector)!.childNodes].find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim(),
    )!;
    const range = document.createRange();
    range.selectNodeContents(text);
    return range;
}

/** Where the text directly in an element starts, as drawn. */
function textStart(selector: string): number {
    return textRange(selector).getClientRects()[0].left;
}

/**
 * Where one line of text directly in a right-to-left element starts, as drawn: its right edge, over all of its runs,
 * as a sentence's final stop is a run of its own.
 */
function textEnd(selector: string): number {
    return textRange(selector).getBoundingClientRect().right;
}

const COPY_BUTTON = renderToStaticMarkup(
    createElement(
        IconButton,
        { size: "28px", style: { padding: "4px" }, className: "mx_CopyableText_copyButton" },
        createElement(CopyIcon),
    ),
);

/** CopyableText with a border, as the Username, room ID and invite link fields render it. */
const copyField = (text: string, id = "copy"): string =>
    `<span class="mx_CopyableText mx_CopyableText_border" id="${id}">${text}${COPY_BUTTON}</span>`;

describe.each(THEMES.map(([theme]) => theme))("Settings content in %s", (theme) => {
    describe("a copy field", () => {
        it("is a 36px read-only text field: its border and radius, the text 12px in, the button 4px from its ends", () => {
            const container = render(theme, copyField("@alice:localhost"));
            const field = box("#copy");
            const button = box(".mx_CopyableText_copyButton");
            const style = getComputedStyle(document.querySelector("#copy")!);

            expect(field.height).toBe(36);
            expect(cornerRadii(document.querySelector("#copy")!)).toEqual({ x: 8, y: 8 });
            expect(style.borderTopColor).toBe(tokenColor("--cpd-color-border-interactive-secondary", container));
            expect(style.borderTopWidth).toBe("1px");
            expect([style.marginTop, style.marginBottom]).toEqual(["0px", "0px"]);
            expect(textStart("#copy") - field.left).toBe(13);
            expect([button.top - field.top, field.bottom - button.bottom, field.right - button.right]).toEqual([
                4, 4, 4,
            ]);
            expect(getComputedStyle(document.querySelector(".mx_CopyableText_copyButton svg")!).color).toBe(
                tokenColor("--cpd-color-icon-secondary", container),
            );
        });

        it("darkens its border on hover, as a text field does", async () => {
            const container = render(theme, copyField("@alice:localhost"));

            await userEvent.hover(document.querySelector("#copy")!);
            expect(settledStyle(document.querySelector("#copy")!).borderTopColor).toBe(
                tokenColor("--cpd-color-border-interactive-hovered", container),
            );
        });

        it("draws the copy icon in the primary icon color on hover, as other icon buttons do", async () => {
            const container = render(theme, copyField("@alice:localhost"));

            await userEvent.hover(document.querySelector(".mx_CopyableText_copyButton")!);
            expect(getComputedStyle(document.querySelector(".mx_CopyableText_copyButton svg")!).color).toBe(
                tokenColor("--cpd-color-icon-primary", container),
            );
        });

        it("grows by a line for each more line, keeping the button in its middle", () => {
            render(theme, copyField("Telement version: 1.12.33<br>Crypto version: Rust SDK 0.19.1<br>"));
            const field = box("#copy");
            const button = box(".mx_CopyableText_copyButton");
            const lineHeight = parseFloat(getComputedStyle(document.querySelector("#copy")!).lineHeight);

            expect(field.height).toBe(36 + lineHeight);
            expect(button.top - field.top).toBe(field.bottom - button.bottom);
        });

        it("keeps the event source 8px under its label in the view source dialog, and 12px above what follows", () => {
            render(
                theme,
                `<div class="mx_ViewSource">
                    <div class="mx_ViewSource_heading">Original event source</div>
                    ${copyField("<pre>{}</pre>", "source")}
                </div>`,
            );
            const style = getComputedStyle(document.querySelector("#source")!);

            expect([style.marginTop, style.marginBottom]).toEqual(["8px", "12px"]);
        });

        it("floats its label on the middle of its top border, the label's text where the field's starts", () => {
            const container = render(
                theme,
                `<div class="mx_CopyableText_field">
                    <div class="mx_CopyableText_label" id="label">Username</div>
                    ${copyField("@alice:localhost")}
                </div>`,
            );
            const field = box("#copy");
            const label = box("#label");
            const style = getComputedStyle(document.querySelector("#label")!);

            expect(Math.abs((label.top + label.bottom) / 2 - (field.top + 0.5))).toBeLessThanOrEqual(0.5);
            expect(textStart("#label")).toBe(textStart("#copy"));
            expect(style.fontSize).toBe("11px");
            expect(style.color).toBe(tokenColor("--cpd-color-text-secondary", container));
            expect(style.backgroundColor).toBe(tokenColor("--cpd-color-bg-canvas-default", container));
        });
    });

    it("floats a dropdown's shown label on its top border, like a text field's", () => {
        render(
            theme,
            `<div class="mx_Dropdown" style="width: 360px">
                <span class="mx_Dropdown_label" id="label" aria-hidden="true">Set timezone</span>
                <div class="mx_AccessibleButton mx_Dropdown_input mx_no_textinput" role="button" tabindex="0" id="input">
                    <div class="mx_Dropdown_option" id="value">Browser default</div>
                    ${renderToStaticMarkup(createElement(ChevronDownIcon, { className: "mx_Dropdown_arrow" }))}
                </div>
            </div>`,
        );
        const input = box("#input");
        const label = box("#label");

        expect(Math.abs((label.top + label.bottom) / 2 - (input.top + 0.5))).toBeLessThanOrEqual(0.5);
        expect(textStart("#label")).toBe(textStart("#value"));
        expect(getComputedStyle(document.querySelector("#label")!).fontSize).toBe("11px");
    });

    it("puts a labelled settings dropdown, such as the desktop app's start-up one, 8px under its label", () => {
        render(
            theme,
            `<div class="mx_SettingsSubsection_content" id="card">
                <div class="mx_SettingsDropdown">
                    <label class="mx_SettingsDropdown_label" for="autolaunch">
                        <span class="mx_SettingsDropdown_labelText" id="label">Open Telement when you log in to your computer</span>
                    </label>
                    <div class="mx_Dropdown">
                        <div class="mx_AccessibleButton mx_Dropdown_input mx_no_textinput" role="button" id="autolaunch">
                            <div class="mx_Dropdown_option">No</div>
                        </div>
                    </div>
                </div>
            </div>`,
        );
        const label = textRange("#label").getBoundingClientRect();
        const input = box("#autolaunch");
        const card = box("#card");

        expect(input.top - box(".mx_SettingsDropdown_label").bottom).toBe(8);
        expect(input.top).toBeGreaterThanOrEqual(label.bottom + 8);
        expect(card.bottom - input.bottom).toBe(12);
        expect(input.width).toBe(card.width - 32);
    });

    it("draws the encryption details as rows 4px from the card's edge, their text on its 16px edge, 8px above and below", () => {
        const container = render(
            theme,
            `<div class="mx_SettingsSection_content" id="card">
                <div class="mx_EncryptionDetails">
                    <div class="mx_EncryptionDetails_session">
                        <h3 class="mx_EncryptionDetails_session_title" id="title">Encryption details</h3>
                        <div id="id-row"><span id="id-label">Session ID:</span><span>ZQJLABSBRL</span></div>
                        <div id="key-row"><span id="key-label">Session key:</span><span id="key">UevnplOqEMHJabLsBNsPU7qUKwbo5SvTg0+oo2mPS/A</span></div>
                    </div>
                </div>
            </div>`,
        );
        const card = box("#card");

        for (const row of ["#id-row", "#key-row"]) {
            const rowBox = box(row);
            expect([rowBox.left - card.left, card.right - rowBox.right]).toEqual([4, 4]);
            expect(cornerRadii(document.querySelector(row)!)).toEqual({ x: 8, y: 8 });
        }
        expect(textStart("#id-label") - card.left).toBe(16);
        expect(textStart("#key-label") - card.left).toBe(16);
        expect(textStart("#title") - card.left).toBe(16);
        expect(box("#id-label").top - box("#id-row").top).toBe(8);
        expect(box("#key-row").bottom - box("#key").bottom).toBe(8);
        expect(box("#id-row").top - box("#title").bottom).toBe(8);
        expect(box("#key-row").top).toBe(box("#id-row").bottom);
        expect(getComputedStyle(document.querySelector("#key-row")!).backgroundColor).toBe(
            tokenColor("--cpd-color-bg-subtle-secondary", container),
        );
    });

    it("bands the other sessions' header 4px from the card's edge like a menu row, the sessions on its 16px edge", () => {
        render(
            theme,
            `<div class="mx_SettingsSubsection_content mx_SettingsSubsection_contentStretch" id="card">
                <div class="mx_FilteredDeviceList">
                    <div class="mx_FilteredDeviceListHeader" id="header">
                        <span id="select-all" style="display: inline-block; width: 20px; height: 20px"></span>
                        <span class="mx_FilteredDeviceListHeader_label">Devices</span>
                    </div>
                    <ol class="mx_FilteredDeviceList_list">
                        <li class="mx_FilteredDeviceList_listItem">
                            <span id="select-one" style="display: inline-block; width: 20px; height: 20px"></span>
                        </li>
                    </ol>
                </div>
            </div>`,
        );
        const card = box("#card");
        const header = box("#header");

        expect([header.left - card.left, card.right - header.right]).toEqual([4, 4]);
        expect(cornerRadii(document.querySelector("#header")!)).toEqual({ x: 8, y: 8 });
        expect(box("#select-all").left - card.left).toBe(16);
        expect(box("#select-one").left - card.left).toBe(16);
    });

    it("draws a session's details as a card inside the session's card, padded 12 × 16 and rounded to the 4px floor", () => {
        render(
            theme,
            `<div class="mx_SettingsSubsection_content" id="card">
                <div class="mx_DeviceDetails" id="details">
                    <section class="mx_DeviceDetails_section">
                        <p class="mx_DeviceDetails_sectionHeading" id="heading">Push notifications
                            <small class="mx_DeviceDetails_sectionSubheading" id="help">Receive push notifications on this device.</small>
                        </p>
                    </section>
                </div>
            </div>`,
        );
        const details = box("#details");

        expect(cornerRadii(document.querySelector("#details")!)).toEqual({ x: 4, y: 4 });
        expect(textStart("#heading") - details.left).toBe(17);
        expect(box("#heading").top - details.top).toBe(13);
    });

    it("writes a session detail's help in the 13px of help text rather than 12px", () => {
        render(
            theme,
            `<div class="mx_DeviceDetails">
                <p class="mx_DeviceDetails_sectionHeading">Push notifications
                    <small class="mx_DeviceDetails_sectionSubheading" id="help">Receive push notifications on this device.</small>
                </p>
            </div>`,
        );
        const help = getComputedStyle(document.querySelector("#help")!);

        expect([help.fontSize, help.lineHeight]).toEqual(["13px", "19.5px"]);
    });

    it("draws the Encryption tab's reset and recovery cards as the tab's other cards, without a border or shadow", () => {
        render(
            theme,
            `<div class="mx_SettingsTab mx_EncryptionUserSettingsTab">
                <div class="mx_SettingsSection_content" id="other-card">Key storage</div>
                <div class="mx_EncryptionCard" id="card"><div class="mx_EncryptionCard_header" id="header">Reset</div></div>
            </div>`,
        );
        const card = getComputedStyle(document.querySelector("#card")!);
        const other = getComputedStyle(document.querySelector("#other-card")!);

        expect(card.backgroundColor).toBe(other.backgroundColor);
        expect(cornerRadii(document.querySelector("#card")!)).toEqual({ x: 12, y: 12 });
        expect([card.paddingTop, card.paddingRight, card.paddingBottom, card.paddingLeft]).toEqual([
            "12px",
            "16px",
            "12px",
            "16px",
        ]);
        expect([card.borderTopStyle, card.boxShadow]).toEqual(["none", "none"]);
    });

    it("writes a beta card in Compound's sizes: a 20px title, body text, and 13px help with semibold questions", () => {
        render(
            theme,
            `<div class="mx_BetaCard"><div class="mx_BetaCard_columns"><div class="mx_BetaCard_columns_description">
                <h3 class="mx_BetaCard_title" id="title"><span>Video rooms</span></h3>
                <div class="mx_BetaCard_caption" id="caption"><p>A new way to chat over voice and video.</p></div>
                <div class="mx_BetaCard_refreshWarning" id="warning">Joining the beta will reload Telement.</div>
                <div class="mx_BetaCard_faq"><h4 id="question">How can I create a video room?</h4><p id="answer">Use the “+” button.</p></div>
            </div></div></div>`,
        );
        const style = (id: string): string[] => {
            const { fontSize, fontWeight, lineHeight } = getComputedStyle(document.querySelector(id)!);
            return [fontSize, fontWeight, lineHeight];
        };

        expect(style("#title")).toEqual(["20px", "600", "25px"]);
        expect(style("#caption")).toEqual(["15px", "400", "22.5px"]);
        expect(style("#warning")).toEqual(["13px", "400", "19.5px"]);
        expect(style("#question")).toEqual(["13px", "600", "19.5px"]);
        expect(style("#answer")).toEqual(["13px", "400", "19.5px"]);
    });

    it("writes bold text in the settings semibold", () => {
        render(
            theme,
            `<div class="mx_SettingsTab"><p>Your access token gives <strong id="bold">full access</strong></p></div>`,
        );

        expect(getComputedStyle(document.querySelector("#bold")!).fontWeight).toBe("600");
    });

    describe("Help & About", () => {
        function renderHelp(): void {
            render(
                theme,
                `<div class="mx_SettingsSubsection" id="versions">
                    <div class="mx_SettingsSubsectionHeading">
                        <h3 class="mx_Heading_h4 mx_SettingsSubsectionHeading_heading">Versions</h3>
                    </div>
                    <div class="mx_SettingsSubsection_content">
                        <div class="mx_SettingsSubsection_text">
                            ${copyField("Telement version: 1.12.33<br>Crypto version: Rust SDK 0.19.1<br>")}
                        </div>
                        <div role="button" tabindex="0" id="update"
                            class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary_outline">
                            Check for update
                        </div>
                    </div>
                </div>
                <div class="mx_SettingsSubsection" id="credits">
                    <div class="mx_SettingsSubsectionHeading">
                        <h3 class="mx_Heading_h4 mx_SettingsSubsectionHeading_heading">Credits</h3>
                    </div>
                    <div class="mx_SettingsSubsection_content">
                        <div class="mx_SettingsSubsection_text">
                            <ul class="mx_HelpUserSettingsTab_credits"><li id="bullet">The default cover photo</li></ul>
                        </div>
                    </div>
                </div>
                <div class="mx_SettingsSubsection" id="advanced">
                    <div class="mx_SettingsSubsectionHeading">
                        <h3 class="mx_Heading_h4 mx_SettingsSubsectionHeading_heading">Advanced</h3>
                    </div>
                    <div class="mx_SettingsSubsection_content">
                        <div class="mx_SettingsSubsection_text" id="homeserver">Homeserver is localhost</div>
                    </div>
                </div>`,
            );
        }

        it("starts the version box and the credits list as far under their labels as other content", () => {
            renderHelp();
            const underHeading = (id: string, content: string): number =>
                box(content).top - box(`#${id} .mx_SettingsSubsectionHeading`).bottom;

            const expected = underHeading("advanced", "#homeserver");
            // The label's 8px over its card and the card's 12px padding
            expect(expected).toBe(20);
            expect(underHeading("versions", "#copy")).toBe(expected);
            expect(underHeading("credits", "#bullet")).toBe(expected);
        });

        it("keeps the access token's field 8px under the warning above it", () => {
            render(
                theme,
                `<div class="mx_SettingsSubsection_content">
                    <div class="mx_SettingsSubsection_text">
                        <details open>
                            <summary class="mx_HelpUserSettingsTab_accessTokenDetails" id="token-summary">Access token</summary>
                            <strong>Do not share it with anyone.</strong>
                            ${copyField("syt_token", "token")}
                        </details>
                    </div>
                </div>`,
            );
            const summary = box("#token-summary");
            const summaryGap = parseFloat(getComputedStyle(document.querySelector("#token-summary")!).marginBottom);
            const warningLine = parseFloat(getComputedStyle(document.querySelector("#token-summary")!).lineHeight);

            expect(box("#token").top - (summary.bottom + summaryGap + warningLine)).toBe(8);
        });

        it("puts Check for update 16px under the versions and indents the credits' bullets 20px", () => {
            renderHelp();

            const card = document.querySelector("#credits .mx_SettingsSubsection_content")!;

            expect(box("#update").top - box("#copy").bottom).toBe(16);
            expect(
                box("#bullet").left -
                    (card.getBoundingClientRect().left + parseFloat(getComputedStyle(card).paddingLeft)),
            ).toBe(20);
        });
    });

    describe("radios", () => {
        const radio = (value: string, checked: boolean, extraClass = ""): string => `
            <label class="mx_StyledRadioButton mx_StyledRadioButton_enabled ${checked ? "mx_StyledRadioButton_checked" : ""} ${extraClass}"
                id="radio-${value}">
                <input type="radio" name="size" value="${value}" ${checked ? "checked" : ""}>
                <div><div></div></div>
                <div class="mx_StyledRadioButton_content">${value}</div>
                <div class="mx_StyledRadioButton_spacer"></div>
            </label>
        `;

        it("are Compound's 20px rings on the label's line, filled with the accent and a white dot when checked", () => {
            const container = render(theme, radio("Default", true) + radio("Large", false));
            const ring = (value: string): HTMLElement =>
                document.querySelector<HTMLElement>(`#radio-${value} input + div`)!;
            const checked = getComputedStyle(ring("Default"));
            const dot = ring("Default").firstElementChild!;

            for (const value of ["Default", "Large"]) {
                const rect = ring(value).getBoundingClientRect();
                const row = box(`#radio-${value}`);
                const label = box(`#radio-${value} .mx_StyledRadioButton_content`);
                expect([rect.width, rect.height]).toEqual([20, 20]);
                // On the content's edge, with no room kept for the focus ring
                expect(rect.left).toBe(row.left);
                // The larger ring doesn't push the label down from the row's top
                expect(label.top).toBe(row.top);
                expect(Math.abs((rect.top + rect.bottom) / 2 - (label.top + label.bottom) / 2)).toBeLessThanOrEqual(1);
            }
            expect(checked.backgroundColor).toBe(tokenColor("--cpd-color-bg-accent-rest", container));
            expect(checked.borderTopColor).toBe(tokenColor("--cpd-color-bg-accent-rest", container));
            expect([dot.getBoundingClientRect().width, dot.getBoundingClientRect().height]).toEqual([8, 8]);
            expect(getComputedStyle(dot).backgroundColor).toBe("rgb(255, 255, 255)");
            expect(getComputedStyle(ring("Large")).borderTopColor).toBe(
                tokenColor("--cpd-color-border-interactive-primary", container),
            );
            expect(getComputedStyle(ring("Large")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        });

        it("fill the export dialog's checked radio with Compound's disabled fill while it exports", () => {
            const container = render(
                theme,
                `<div class="mx_ExportDialog mx_ExportDialog_Exporting">
                    <div class="mx_ExportDialog_options">${radio("Default", true)}</div>
                </div>`,
            );
            const ring = document.querySelector("#radio-Default input + div")!;
            const disabled = tokenColor("--cpd-color-bg-action-primary-disabled", container);

            expect([getComputedStyle(ring).borderTopColor, getComputedStyle(ring).backgroundColor]).toEqual([
                disabled,
                disabled,
            ]);
            expect(getComputedStyle(ring.firstElementChild!).backgroundColor).toBe(
                tokenColor("--tl-color-on-accent", container),
            );
        });

        it("ring the focused radio as Compound does", async () => {
            const container = render(theme, radio("Default", true));

            await userEvent.tab();
            const ring = getComputedStyle(document.querySelector("#radio-Default input + div")!);
            expect([ring.outlineStyle, ring.outlineWidth, ring.outlineOffset]).toEqual(["solid", "2px", "1px"]);
            expect(ring.outlineColor).toBe(tokenColor("--cpd-color-border-focused", container));
        });

        /** The Security tab's Access options, as StyledRadioGroup renders them in a SettingsFieldset. */
        const joinRules = (dir: "ltr" | "rtl" = "ltr"): string => `
            <fieldset class="mx_SettingsFieldset" dir="${dir}">
                <legend class="mx_SettingsFieldset_legend">Access</legend>
                <div class="mx_SettingsFieldset_content">
                    ${radio("Invite only", true, "mx_JoinRuleSettings_radioButton")}
                    <span id="description-1">Only invited people can join.</span>
                    ${radio("Anyone", false, "mx_JoinRuleSettings_radioButton")}
                    <span id="description-2">Anyone can join.</span>
                </div>
            </fieldset>
        `;

        it.each<"ltr" | "rtl">(["ltr", "rtl"])(
            "line a join rule's label and description up 32px in, the description 4px under its label (%s)",
            (dir) => {
                const container = render(theme, joinRules(dir));
                const description = document.querySelector("#description-1")!;
                const style = getComputedStyle(description);
                const label = box("#radio-Invite\\ only .mx_StyledRadioButton_content");
                const row = box("#radio-Invite\\ only");
                const inset = (selector: string): number =>
                    dir === "ltr" ? textStart(selector) - row.left : row.right - textEnd(selector);

                expect(inset("#radio-Invite\\ only .mx_StyledRadioButton_content")).toBe(32);
                expect(inset("#description-1")).toBe(32);
                expect(box("#description-1").top - label.bottom).toBe(4);
                expect(style.fontSize).toBe("13px");
                expect(style.color).toBe(tokenColor("--cpd-color-text-secondary", container));
            },
        );

        it("pad each join rule row 16px above its label's line and below its description's, between separators", () => {
            render(theme, joinRules());
            const description = box("#description-1");
            const descriptionLine = parseFloat(getComputedStyle(document.querySelector("#description-1")!).lineHeight);
            const next = box("#radio-Anyone");
            const separator = parseFloat(getComputedStyle(document.querySelector("#radio-Anyone")!).borderTopWidth);

            expect(separator).toBe(1);
            expect(box("#radio-Anyone .mx_StyledRadioButton_content").top - (next.top + separator)).toBe(16);
            expect(next.top - (description.top + descriptionLine)).toBe(16);
        });

        it("end the join rules' card 16px under Show advanced, as under the last option", () => {
            render(
                theme,
                `<fieldset class="mx_SettingsFieldset">
                    <legend class="mx_SettingsFieldset_legend">Access</legend>
                    <div class="mx_SettingsFieldset_content" id="access-card">
                        ${radio("Anyone", true, "mx_JoinRuleSettings_radioButton")}
                        <span id="description">Anyone can join.</span>
                        <div>
                            <div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_link mx_SettingsTab_showAdvanced"
                                role="button" id="show-advanced">Show advanced</div>
                        </div>
                    </div>
                </fieldset>`,
            );

            const descriptionLine = parseFloat(getComputedStyle(document.querySelector("#description")!).lineHeight);

            expect(box("#show-advanced").top - (box("#description").top + descriptionLine)).toBe(16);
            expect(box("#access-card").bottom - box("#show-advanced").bottom).toBe(16);
        });
    });

    describe("disclosures", () => {
        it("are text buttons like Show advanced: semibold in the accent, without an underline or the browser's marker", () => {
            const container = render(
                theme,
                `<details><summary class="mx_AliasSettings_localAddresses" id="show-more">Show more</summary></details>
                <div class="mx_SettingsSubsection_content">
                    <details><summary class="mx_HelpUserSettingsTab_accessTokenDetails" id="token">Access token</summary></details>
                </div>`,
            );
            const accent = tokenColor("--cpd-color-text-action-accent", container);

            for (const id of ["#show-more", "#token"]) {
                const style = getComputedStyle(document.querySelector(id)!);
                expect([style.color, style.fontWeight, style.textDecorationLine]).toEqual([accent, "600", "none"]);
                expect(style.listStyleType).toBe("none");
                expect(textStart(id)).toBe(box(id).left);
            }
        });
    });

    it("draws the BETA pill as a 24px accent badge with 11px white capitals", () => {
        const container = render(theme, `<span class="mx_BetaCard_betaPill" id="pill">Beta</span>`);
        const style = getComputedStyle(document.querySelector("#pill")!);

        expect(box("#pill").height).toBe(24);
        expect(style.backgroundColor).toBe(tokenColor("--cpd-color-bg-accent-rest", container));
        expect(style.color).toBe("rgb(255, 255, 255)");
        expect([style.fontSize, style.fontWeight, style.textTransform]).toEqual(["11px", "600", "uppercase"]);
    });

    it("colors Compound's info alert with the accent's info tokens, not Compound's own blue", () => {
        const container = render(
            theme,
            renderToStaticMarkup(createElement(Alert, { type: "info", title: "Allow access" }, "To make calls")),
        );
        const alert = document.querySelector("[data-type='info']")!;
        const style = getComputedStyle(alert);

        expect(style.backgroundColor).toBe(tokenColor("--cpd-color-bg-info-subtle", container));
        expect(style.borderTopColor).toBe(tokenColor("--cpd-color-border-info-subtle", container));
        expect(getComputedStyle(alert.querySelector(":scope > svg")!).color).toBe(
            tokenColor("--cpd-color-icon-info-primary", container),
        );
    });

    // Light themes' fixed gray already is their separator; dark themes' raised dialogs move separators a step further
    it.runIf(theme === "cpd-theme-dark")(
        "outlines the session card and the image size drawings with the dialog's separator",
        () => {
            const container = render(
                theme,
                `<div class="mx_DeviceSecurityCard" id="card"><div class="mx_DeviceSecurityCard_content">Unverified</div></div>
            <div class="mx_ImageSizePanel_radios"><label><svg class="mx_ImageSizePanel_size" id="size"></svg></label></div>`,
            );
            const separator = tokenColor("--cpd-color-separator-primary", container);

            expect(getComputedStyle(document.querySelector("#card")!).borderTopColor).toBe(separator);
            expect(getComputedStyle(document.querySelector("#size")!).color).toBe(separator);
        },
    );

    describe("keyboard shortcuts", () => {
        /** Keys with the spaces KeyboardShortcut puts around each name, which keep tooltips' keys apart. */
        function renderShortcuts(): HTMLElement {
            return render(
                theme,
                `<ul class="mx_KeyboardShortcut_shortcutList">
                    <li class="mx_KeyboardShortcut_shortcutRow" id="row-1">Toggle Bold
                        <div class="mx_KeyboardShortcut"><kbd id="key"> ⌘ </kbd>+<kbd> B </kbd></div>
                    </li>
                    <li class="mx_KeyboardShortcut_shortcutRow" id="row-2">Next unread room
                        <div class="mx_KeyboardShortcut"><kbd id="spaced"> Shift </kbd>+<kbd> ↓ </kbd></div>
                    </li>
                </ul>
                <div class="mx_KeyboardShortcut"><kbd id="bare">Shift</kbd></div>`,
            );
        }

        it("draws keys as the search dialog's flat 24px tiles, in the app's font", () => {
            const container = renderShortcuts();
            const key = document.querySelector<HTMLElement>("#key")!;
            const style = getComputedStyle(key);

            expect(box("#key").height).toBe(24);
            expect(box("#key").width).toBeGreaterThanOrEqual(24);
            expect(cornerRadii(key)).toEqual({ x: 4, y: 4 });
            expect([style.borderTopWidth, style.boxShadow]).toEqual(["0px", "none"]);
            expect([style.paddingInlineStart, style.paddingInlineEnd]).toEqual(["8px", "8px"]);
            expect(style.fontFamily).toMatch(/^Inter\b/);
            expect([style.fontSize, style.fontWeight]).toEqual(["13px", "500"]);
            expect(style.backgroundColor).toBe(tokenColor("--cpd-color-bg-subtle-primary", container));
            // The spaces around a key's name don't widen its tile
            expect(box("#spaced").width).toBe(box("#bare").width);
        });

        it("puts the shortcuts on 32px rows, one after another, each key in the middle of its row", () => {
            renderShortcuts();
            const [first, second] = [box("#row-1"), box("#row-2")];
            const key = box("#key");

            expect(first.height).toBe(32);
            expect(second.top).toBe(first.bottom);
            expect((key.top + key.bottom) / 2).toBe((first.top + first.bottom) / 2);
        });
    });

    it("draws a new-style section's heading as its group's label and its subheader as the help under its card", () => {
        const container = render(
            theme,
            `<div class="mx_SettingsSection mx_SettingsSection_newUi">
                <h2 class="mx_SettingsHeader" id="heading">Device not verified</h2>
                <div class="mx_SettingsSection_content" id="card"><button>Verify this device</button></div>
                <div class="mx_SettingsSection_help" id="subheader">Verify this device to access all messages</div>
            </div>`,
        );
        const secondary = tokenColor("--cpd-color-text-secondary", container);

        for (const id of ["#heading", "#subheader"]) {
            const style = getComputedStyle(document.querySelector(id)!);
            expect([style.fontSize, style.fontWeight, style.color]).toEqual(["13px", "400", secondary]);
        }
        expect(box("#card").top - box("#heading").bottom).toBe(8);
        expect(box("#subheader").top - box("#card").bottom).toBe(8);
        expect(cornerRadii(document.querySelector("#card")!)).toEqual({ x: 12, y: 12 });
    });

    it("puts the Roles tab's stacked fields 16px apart, the user search and nested power selectors included", () => {
        const powerSelector = (id: string, label: string): string => `
            <div class="mx_PowerSelector"><div class="mx_Field mx_Field_select" id="${id}">
                <select id="${id}-select"><option>Default</option></select><label for="${id}-select">${label}</label>
            </div></div>
        `;
        render(
            theme,
            `<div class="mx_SettingsTab">
                <fieldset class="mx_SettingsFieldset">
                    <legend class="mx_SettingsFieldset_legend">Add privileged users</legend>
                    <div class="mx_SettingsFieldset_content">
                        <div class="mx_AutocompleteInput" id="search">
                            <div class="mx_AutocompleteInput_editor"><input placeholder="Search users in this room…"></div>
                        </div>
                        ${powerSelector("level", "Power level")}
                    </div>
                </fieldset>
                <fieldset class="mx_SettingsFieldset">
                    <legend class="mx_SettingsFieldset_legend">Permissions</legend>
                    <div class="mx_SettingsFieldset_content">
                        <div>${powerSelector("send", "Send messages")}</div>
                        <div>${powerSelector("invite", "Invite users")}</div>
                    </div>
                </fieldset>
            </div>`,
        );

        expect(box("#level").top - box("#search").bottom).toBe(16);
        expect(box("#invite").top - box("#send").bottom).toBe(16);
    });

    it("draws the publish toggle 12px under the main address field", () => {
        render(
            theme,
            `<div class="mx_SettingsTab">
                <fieldset class="mx_SettingsFieldset">
                    <legend class="mx_SettingsFieldset_legend">Published addresses</legend>
                    <div class="mx_SettingsFieldset_content">
                        <div class="mx_Field mx_Field_select" id="address">
                            <select id="address-select"><option>not specified</option></select>
                            <label for="address-select">Main address</label>
                        </div>
                        ${renderToStaticMarkup(
                            createElement(
                                Form.Root,
                                { className: "mx_RoomPublishSetting" },
                                createElement(SettingsToggleInput, {
                                    name: "room-publish",
                                    label: "Publish this room to the public",
                                    disabled: true,
                                }),
                            ),
                        )}
                    </div>
                </fieldset>
            </div>`,
        );
        const toggle = document.querySelector("input[role='switch']")!.nextElementSibling!.getBoundingClientRect();

        expect(toggle.top - box("#address").bottom).toBe(12);
    });

    describe("the create room dialog", () => {
        function renderCreateRoom(): HTMLElement {
            return render(
                theme,
                `<div class="mx_CreateRoomDialog" style="width: 432px">
                    <div class="mx_Field mx_Field_select" id="join-rule">
                        <select id="join-rule-select"><option>Invite only</option></select>
                        <label for="join-rule-select">Join rule</label>
                    </div>
                    <p id="help">Only people invited will be able to find and join this room. You can change this at any time from room settings.</p>
                    <details class="mx_CreateRoomDialog_details" id="details">
                        <summary class="mx_CreateRoomDialog_details_summary" id="summary">Show advanced${renderToStaticMarkup(
                            createElement(ChevronDownIcon, { className: "mx_CreateRoomDialog_details_chevron" }),
                        )}</summary>
                        <div>Block anyone not part of localhost from ever joining this room.</div>
                    </details>
                </div>`,
            );
        }

        it("writes the join rule's help in 13px secondary text across the fields' width", () => {
            const container = renderCreateRoom();
            const style = getComputedStyle(document.querySelector("#help")!);

            expect(style.fontSize).toBe("13px");
            expect(style.color).toBe(tokenColor("--cpd-color-text-secondary", container));
            expect(box("#help").right).toBe(box("#join-rule").right);
        });

        it("draws Show advanced without an underline, with a chevron after it that turns up when open", () => {
            renderCreateRoom();
            const chevron = document.querySelector<SVGElement>(".mx_CreateRoomDialog_details_chevron")!;

            expect(getComputedStyle(document.querySelector("#summary")!).textDecorationLine).toBe("none");
            expect([chevron.getBoundingClientRect().width, chevron.getBoundingClientRect().height]).toEqual([20, 20]);
            expect(chevron.getBoundingClientRect().left).toBeGreaterThan(textStart("#summary"));
            expect(getComputedStyle(chevron).transform).toBe("none");

            document.querySelector<HTMLDetailsElement>("#details")!.open = true;
            for (const animation of chevron.getAnimations()) animation.finish();
            expect(new DOMMatrix(getComputedStyle(chevron).transform).a).toBe(-1);
        });
    });
});
