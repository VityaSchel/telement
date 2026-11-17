/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { Button } from "@vector-im/compound-web";
import LinkIcon from "@vector-im/compound-design-tokens/assets/web/icons/link";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
// eslint-disable-next-line no-restricted-imports
import flexStyles from "../../../../packages/shared-components/src/core/utils/Flex/Flex.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import pillInputStyles from "../../../../packages/shared-components/src/core/pill-input/PillInput/PillInput.module.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import compoundOverrides from "../../res/css/telement/_CompoundOverrides.pcss?raw";
import successDialogStyles from "../../res/css/compound/_SuccessDialog.pcss?raw";
import filterDropdownStyles from "../../res/css/components/views/elements/_FilterDropdown.pcss?raw";
import enableLiveShareStyles from "../../res/css/components/views/location/_EnableLiveShare.pcss?raw";
import filteredDeviceListStyles from "../../res/css/components/views/settings/devices/_FilteredDeviceList.pcss?raw";
import filteredDeviceListHeaderStyles from "../../res/css/components/views/settings/devices/_FilteredDeviceListHeader.pcss?raw";
import spaceHierarchyStyles from "../../res/css/structures/_SpaceHierarchy.pcss?raw";
import spaceRoomViewStyles from "../../res/css/structures/_SpaceRoomView.pcss?raw";
import authBodyStyles from "../../res/css/views/auth/_AuthBody.pcss?raw";
import countryDropdownStyles from "../../res/css/views/auth/_CountryDropdown.pcss?raw";
import authHeaderStyles from "../../res/css/views/auth/_AuthHeader.pcss?raw";
import languageSelectorStyles from "../../res/css/views/auth/_LanguageSelector.pcss?raw";
import loginWithQrStyles from "../../res/css/views/auth/_LoginWithQR.pcss?raw";
import betaCardStyles from "../../res/css/views/beta/_BetaCard.pcss?raw";
import addExistingStyles from "../../res/css/views/dialogs/_AddExistingToSpaceDialog.pcss?raw";
import createSubspaceStyles from "../../res/css/views/dialogs/_CreateSubspaceDialog.pcss?raw";
import devtoolsDialogStyles from "../../res/css/views/dialogs/_DevtoolsDialog.pcss?raw";
import exportDialogStyles from "../../res/css/views/dialogs/_ExportDialog.pcss?raw";
import inviteDialogStyles from "../../res/css/views/dialogs/_InviteDialog.pcss?raw";
import joinRuleDropdownStyles from "../../res/css/views/dialogs/_JoinRuleDropdown.pcss?raw";
import accessibleButtonStyles from "../../res/css/views/elements/_AccessibleButton.pcss?raw";
import dropdownStyles from "../../res/css/views/elements/_Dropdown.pcss?raw";
import fieldStyles from "../../res/css/views/elements/_Field.pcss?raw";
import autocompleteInputStyles from "../../res/css/structures/_AutocompleteInput.pcss?raw";
import roomAliasFieldStyles from "../../res/css/views/elements/_RoomAliasField.pcss?raw";
import spinnerStyles from "../../res/css/views/elements/_Spinner.pcss?raw";
import ssoButtonStyles from "../../res/css/views/elements/_SSOButtons.pcss?raw";
import tagComposerStyles from "../../res/css/views/elements/_TagComposer.pcss?raw";
import locationPickerStyles from "../../res/css/views/location/_LocationPicker.pcss?raw";
import verificationPanelStyles from "../../res/css/views/right_panel/_VerificationPanel.pcss?raw";
import roomPreviewBarStyles from "../../res/css/views/rooms/_RoomPreviewBar.pcss?raw";
import roomPreviewCardStyles from "../../res/css/views/rooms/_RoomPreviewCard.pcss?raw";
import incomingCallToastStyles from "../../res/css/views/toasts/_IncomingLegacyCallToast.pcss?raw";
import notificationSettingsStyles from "../../res/css/views/settings/_NotificationSettings2.pcss?raw";
import roomProfileSettingsStyles from "../../res/css/views/settings/_RoomProfileSettings.pcss?raw";
import settingsFieldsetStyles from "../../res/css/views/settings/_SettingsFieldset.pcss?raw";
import settingsTabStyles from "../../res/css/views/settings/tabs/_SettingsTab.pcss?raw";
import spaceCreateMenuStyles from "../../res/css/views/spaces/_SpaceCreateMenu.pcss?raw";
import callViewButtonsStyles from "../../res/css/views/voip/LegacyCallView/_LegacyCallViewButtons.pcss?raw";
import { cornerRadii, toBrowserCss } from "../test/telement/browserCss";
import { settledStyle, tokenColor } from "../test/telement/computedStyle";
import { loadInter } from "../test/telement/fonts";

const APP_STYLES = [
    commonStyles,
    filterDropdownStyles,
    enableLiveShareStyles,
    filteredDeviceListStyles,
    filteredDeviceListHeaderStyles,
    successDialogStyles,
    compoundOverrides,
    spaceHierarchyStyles,
    spaceRoomViewStyles,
    authBodyStyles,
    authHeaderStyles,
    languageSelectorStyles,
    countryDropdownStyles,
    loginWithQrStyles,
    betaCardStyles,
    addExistingStyles,
    createSubspaceStyles,
    devtoolsDialogStyles,
    exportDialogStyles,
    inviteDialogStyles,
    joinRuleDropdownStyles,
    accessibleButtonStyles,
    dropdownStyles,
    fieldStyles,
    autocompleteInputStyles,
    roomAliasFieldStyles,
    spinnerStyles,
    ssoButtonStyles,
    tagComposerStyles,
    locationPickerStyles,
    verificationPanelStyles,
    roomPreviewBarStyles,
    roomPreviewCardStyles,
    incomingCallToastStyles,
    notificationSettingsStyles,
    roomProfileSettingsStyles,
    settingsFieldsetStyles,
    settingsTabStyles,
    spaceCreateMenuStyles,
    callViewButtonsStyles,
];

const PRIMARY = `<div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary" role="button">Join</div>`;

let stylesheet: HTMLStyleElement;
let unloadInter: () => void;
let root: Root | undefined;

function stage(): HTMLElement {
    const container = document.createElement("div");
    container.className = "cpd-theme-light";
    // The theme defines the emoji font, which the app's font stack refers to; without it, Compound's font tokens fail
    container.style.cssText = "--emoji-font-family: ''; font-family: Inter; width: 640px";
    document.body.append(container);
    return container;
}

/** Puts `html` on the page, in the light theme and the app's font. */
function render(html: string): void {
    stage().innerHTML = html;
}

/** Renders real Compound components, so the hashed class names are the installed compound-web's. */
function renderReact(node: ReactNode): void {
    root = createRoot(stage());
    flushSync(() => root!.render(node));
}

function get(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`nothing matches ${selector}`);
    return element;
}

function byText(text: string): HTMLElement {
    return [...document.querySelectorAll<HTMLElement>("button")].find((element) => element.textContent === text)!;
}

function box(element: Element): DOMRect {
    return element.getBoundingClientRect();
}

function center(element: Element): number {
    const { top, height } = box(element);
    return top + height / 2;
}

/** The outline's style, width, offset and color. */
function ring(element: Element): string {
    const style = getComputedStyle(element);
    return [style.outlineStyle, style.outlineWidth, style.outlineOffset, style.outlineColor].join(" ");
}

/** What a color token resolves to in the light theme the tests render in. */
function colorOf(token: string): string {
    return tokenColor(token, document.querySelector(".cpd-theme-light")!);
}

function padding(element: Element): string {
    const style = getComputedStyle(element);
    return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].join(" ");
}

/** A legacy text field as Field renders it; given a value, its label floats onto the border. */
function field(label: string, value = "", element: "input" | "textarea" = "input", className = ""): string {
    const control =
        element === "input"
            ? `<input id="${label}" placeholder="${label}" type="text" value="${value}">`
            : `<textarea id="${label}" placeholder="${label}" rows="3">${value}</textarea>`;
    return `<div class="mx_Field mx_Field_${element} ${className}">${control}<label for="${label}">${label}</label></div>`;
}

/** Dropdown's closed input, with the chosen option and the arrow. */
function dropdown(option: string): string {
    return `
        <div class="mx_AccessibleButton mx_Dropdown_input mx_no_textinput" role="button">
            <div class="mx_Dropdown_option">${option}</div>
            <svg class="mx_Dropdown_arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>
        </div>
    `;
}

describe("App controls", () => {
    beforeAll(async () => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} ${flexStyles} ${pillInputStyles} }
            @layer app-web { ${APP_STYLES.map((styles) => toBrowserCss(styles, commonStyles, fontSizes, lightTheme)).join("\n")} }
        `;
        document.head.append(stylesheet);
        unloadInter = await loadInter();
    });

    afterAll(() => {
        stylesheet.remove();
        unloadInter();
    });

    afterEach(() => {
        root?.unmount();
        root = undefined;
        document.body.innerHTML = "";
    });

    describe("Compound's Button", () => {
        it("gives a button without a size the 36px geometry of size md", () => {
            renderReact([
                createElement(Button, { key: "lg" }, "Default"),
                createElement(Button, { key: "md", size: "md" }, "Medium"),
                createElement(Button, { key: "lg-icon", Icon: LinkIcon }, "Default icon"),
                createElement(Button, { key: "md-icon", Icon: LinkIcon, size: "md" }, "Medium icon"),
                createElement(Button, {
                    "key": "lg-only",
                    "Icon": LinkIcon,
                    "iconOnly": true,
                    "aria-label": "lg only",
                }),
                createElement(Button, {
                    "key": "md-only",
                    "Icon": LinkIcon,
                    "iconOnly": true,
                    "size": "md",
                    "aria-label": "md only",
                }),
            ]);
            const geometry = (button: HTMLElement): object => ({
                height: box(button).height,
                padding: padding(button),
                radius: cornerRadii(button),
                icon: button.querySelector("svg") && [
                    box(button.querySelector("svg")!).width,
                    box(button.querySelector("svg")!).height,
                ],
            });

            expect(geometry(byText("Default"))).toEqual({ ...geometry(byText("Medium")), height: 36 });
            expect(geometry(byText("Default icon"))).toEqual({ ...geometry(byText("Medium icon")), icon: [20, 20] });
            expect(padding(byText("Default icon"))).toBe("4px 20px 4px 16px");
            expect(geometry(get("[aria-label='lg only']"))).toEqual({
                ...geometry(get("[aria-label='md only']")),
                height: 36,
            });
            expect(box(get("[aria-label='lg only']")).width).toBe(36);
            expect(box(get("[aria-label='lg only'] svg")).width).toBe(20);
        });

        it("leaves the app's own rules for a button ahead of the size, the SSO logos centered in it", () => {
            // SSOButtons: a row of logos, Compound icon-only buttons of size lg holding a 24px logo that the app sizes,
            // and labelled buttons of size md with the logo at their start
            const sso = (key: string, props: object, label?: string): ReactNode =>
                createElement(
                    Button,
                    { key, ...props },
                    createElement("svg", { "viewBox": "0 0 24 24", "aria-label": `${key} logo` }),
                    label,
                );
            renderReact(
                createElement(
                    "div",
                    { className: "mx_SSOButtons" },
                    createElement("div", { className: "mx_SSOButtons_row" }, [
                        sso("mini", {
                            "iconOnly": true,
                            "className": "mx_SSOButton mx_SSOButton_mini",
                            "kind": "secondary",
                            "aria-label": "logo",
                        }),
                        sso("secondary", { className: "mx_SSOButton", kind: "secondary", size: "md" }, "Continue"),
                        sso("primary", { className: "mx_SSOButton", kind: "primary", size: "md" }, "Sign in"),
                    ]),
                ),
            );

            // The row of logos is a row of 36px icon buttons
            expect([box(get("[aria-label='logo']")).width, box(get("[aria-label='logo']")).height]).toEqual([36, 36]);
            for (const key of ["mini", "secondary", "primary"]) {
                const button = box(get(`[aria-label='${key} logo']`).closest("button")!);
                const logo = box(get(`[aria-label='${key} logo']`));
                expect([logo.width, logo.height]).toEqual([24, 24]);
                expect([logo.top - button.top, button.bottom - logo.bottom]).toEqual([6, 6]);
            }
            const mini = box(get("[aria-label='logo']"));
            const miniLogo = box(get("[aria-label='mini logo']"));
            expect(miniLogo.left - mini.left).toBe(6);
        });

        it("puts an SSO button's logo as far from its start as from its top, and spaces the logo row, either way", () => {
            const sso = (key: string, kind: "primary" | "secondary"): ReactNode =>
                createElement(
                    Button,
                    { key, className: "mx_SSOButton", kind, size: "md" },
                    createElement("svg", { "viewBox": "0 0 24 24", "aria-label": `${key} logo` }),
                    "Continue with Google",
                );
            const mini = (key: string): ReactNode =>
                createElement(
                    Button,
                    {
                        key,
                        "iconOnly": true,
                        "className": "mx_SSOButton mx_SSOButton_mini",
                        "kind": "secondary",
                        "aria-label": key,
                    },
                    createElement("svg", { viewBox: "0 0 24 24" }),
                );
            const ssoButtons = (direction: string): ReactNode =>
                createElement("div", { key: direction, className: "mx_SSOButtons", dir: direction }, [
                    sso(`${direction} secondary`, "secondary"),
                    sso(`${direction} primary`, "primary"),
                    createElement("div", { key: "row", className: "mx_SSOButtons_row" }, [
                        mini(`${direction} first`),
                        mini(`${direction} second`),
                    ]),
                ]);
            renderReact([ssoButtons("ltr"), ssoButtons("rtl")]);

            for (const direction of ["ltr", "rtl"]) {
                for (const kind of ["secondary", "primary"]) {
                    const button = box(get(`[aria-label='${direction} ${kind} logo']`).closest("button")!);
                    const logo = box(get(`[aria-label='${direction} ${kind} logo']`));
                    const start = direction === "rtl" ? button.right - logo.right : logo.left - button.left;
                    expect([start, logo.top - button.top]).toEqual([6, 6]);
                }
                // The row of logos keeps 16px between them, reading either way
                const [first, second] = [
                    box(get(`[aria-label='${direction} first']`)),
                    box(get(`[aria-label='${direction} second']`)),
                ];
                expect(direction === "rtl" ? first.left - second.right : second.left - first.right).toBe(16);
            }
        });
    });

    describe("legacy buttons that set their own padding or height", () => {
        it.each([
            [
                "Add existing rooms footer",
                `<div class="mx_AddExistingToSpace"><div class="mx_AddExistingToSpace_footer"><span></span>@</div></div>`,
            ],
            [
                "Create subspace footer",
                `<div class="mx_CreateSubspaceDialog"><div class="mx_CreateSubspaceDialog_footer"><span></span>@</div></div>`,
            ],
            [
                "beta card",
                `<div class="mx_BetaCard"><div class="mx_BetaCard_columns"><div class="mx_BetaCard_columns_description"><div class="mx_BetaCard_buttons">@</div></div></div></div>`,
            ],
            [
                "verification in a dialog",
                `<div class="mx_Dialog"><div class="mx_VerificationPanel_reciprocate_section">@</div></div>`,
            ],
            [
                "verification in the user info",
                `<div class="mx_UserInfo mx_BaseCard"><div class="mx_VerificationPanel_reciprocate_section">@</div></div>`,
            ],
            [
                "space home",
                `<div class="mx_SpaceRoomView"><div class="mx_MainSplit"><div><div class="mx_SpaceRoomView_buttons">@</div></div></div></div>`,
            ],
            [
                "space create menu",
                `<div class="mx_SpaceCreateMenu_wrapper"><div class="mx_ContextualMenu" style="position: static">@</div></div>`,
            ],
            [
                "room preview",
                `<div class="mx_RoomPreviewBar mx_RoomPreviewBar_dialog"><div class="mx_RoomPreviewBar_actions">@</div></div>`,
            ],
            [
                "space preview",
                `<div class="mx_RoomPreviewCard"><div class="mx_RoomPreviewCard_joinButtons">@</div></div>`,
            ],
            ["sign in with QR", `<div class="mx_LoginWithQR"><div class="mx_LoginWithQR_buttons">@</div></div>`],
            ["keyword field", `<div class="mx_TagComposer"><form class="mx_TagComposer_input">@</form></div>`],
        ])("are 36px pills with Compound's md padding: %s", (_, html) => {
            render(html.replace("@", PRIMARY));
            const button = get(".mx_AccessibleButton_kind_primary");

            expect(box(button).height).toBe(36);
            expect(padding(button)).toBe("3px 19px 3px 19px");
            expect(cornerRadii(button)).toEqual({ x: 18, y: 18 });
        });

        it("drops the 48px heights left on the location sharing and success dialog buttons", () => {
            renderReact(
                createElement(
                    "div",
                    { className: "mx_EnableLiveShare" },
                    createElement(Button, { className: "mx_EnableLiveShare_button" }, "OK"),
                ),
            );
            render(`
                <div class="mx_LocationPicker"><div class="mx_LocationPicker_footer"><form>
                    <div class="mx_AccessibleButton mx_LocationPicker_submitButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary" role="button">Share location</div>
                </form></div></div>
                <div class="mx_Dialog"><div class="mx_SuccessDialog"><div class="mx_Dialog_buttons"><span class="mx_Dialog_buttons_row">
                    <button class="mx_LegacyDialogButton mx_Dialog_primary" type="button">Done</button>
                </span></div></div></div>
            `);

            for (const selector of [
                ".mx_EnableLiveShare_button",
                ".mx_LocationPicker_submitButton",
                ".mx_SuccessDialog .mx_Dialog_primary",
            ]) {
                expect(box(get(selector)).height).toBe(36);
                expect(cornerRadii(get(selector))).toEqual({ x: 18, y: 18 });
            }
        });

        it("pads the outline buttons above a space's room list like every other button", () => {
            render(`
                <div class="mx_SpaceRoomView_landing"><div class="mx_SpaceHierarchy_listHeader">
                    <h4 class="mx_SpaceHierarchy_listHeader_header">Rooms and spaces</h4>
                    <div class="mx_SpaceHierarchy_listHeader_buttons">
                        <div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_danger_outline" role="button">Remove</div>
                        <div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary_outline" role="button">Mark as not suggested</div>
                    </div>
                </div></div>
            `);

            for (const button of document.querySelectorAll(".mx_SpaceHierarchy_listHeader_buttons > *")) {
                expect(box(button).height).toBe(36);
                expect(padding(button)).toBe("3px 19px 3px 19px");
            }
        });

        it("pads the buttons on a space's room tiles like every other button, also while joining", () => {
            const tile = (testId: string, button: string, joining = false): string => `
                <li class="mx_SpaceHierarchy_roomTileWrapper" role="treeitem">
                    <div class="mx_AccessibleButton mx_SpaceHierarchy_roomTile${joining ? " mx_SpaceHierarchy_joining" : ""}" data-testid="${testId}">
                        <div class="mx_SpaceHierarchy_actions">${button}</div>
                    </div>
                </li>
            `;
            const outline = (content: string, disabled = false): string =>
                `<div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary_outline${disabled ? " mx_AccessibleButton_disabled" : ""}" role="button">${content}</div>`;
            // SpaceHierarchy swaps Join for a disabled outline button around a 24px spinner while it joins
            const spinner = `<div class="mx_Spinner"><svg style="width: 24px; height: 24px" viewBox="0 0 24 24"></svg></div>`;
            render(`
                <div class="mx_SpaceRoomView_landing"><ul class="mx_SpaceHierarchy_list" role="tree">
                    ${tile("join", PRIMARY)}${tile("view", outline("View"))}${tile("joining", outline(spinner, true), true)}
                </ul></div>
            `);

            for (const testId of ["join", "view", "joining"]) {
                const button = get(`[data-testid=${testId}] .mx_AccessibleButton_hasKind`);
                expect(box(button).height).toBe(36);
                expect(padding(button)).toBe("3px 19px 3px 19px");
            }
            const joining = box(get("[data-testid=joining] .mx_AccessibleButton_hasKind"));
            const icon = box(get("[data-testid=joining] svg"));
            expect([icon.top - joining.top, joining.bottom - icon.bottom]).toEqual([6, 6]);
        });

        it("makes the incoming call toast's buttons 36px pills with Compound's md padding", () => {
            render(`
                <div class="mx_Toast_body mx_IncomingLegacyCallToast"><div class="mx_IncomingLegacyCallToast_content">
                    <div class="mx_IncomingLegacyCallToast_buttons">
                        <div class="mx_AccessibleButton mx_IncomingLegacyCallToast_button mx_AccessibleButton_hasKind mx_AccessibleButton_kind_danger" role="button"><svg viewBox="0 0 24 24"></svg>Decline</div>
                        <div class="mx_AccessibleButton mx_IncomingLegacyCallToast_button mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary" role="button"><svg viewBox="0 0 24 24"></svg>Accept</div>
                    </div>
                </div></div>
            `);

            for (const button of document.querySelectorAll(".mx_IncomingLegacyCallToast_button")) {
                const icon = button.querySelector("svg")!;
                expect(box(button).height).toBe(36);
                expect(padding(button)).toBe("3px 19px 3px 19px");
                expect(cornerRadii(button)).toEqual({ x: 18, y: 18 });
                expect(center(icon)).toBe(center(button));
            }
        });

        it("makes the privileged users picker a 36px field with its matches in a menu 4px under it", () => {
            render(`
                <div class="mx_AutocompleteInput" style="inline-size: 400px">
                    <div class="mx_AutocompleteInput_editor mx_AutocompleteInput_editor--focused">
                        <svg class="mx_AutocompleteInput_search_icon" width="20px" height="20px" viewBox="0 0 24 24"></svg>
                        <input type="text" placeholder="Add people">
                    </div>
                    <div class="mx_AutocompleteInput_matches">
                        <div class="mx_AutocompleteInput_suggestion" id="alice">
                            <span class="mx_AutocompleteInput_suggestion_title">Alice</span>
                            <span class="mx_AutocompleteInput_suggestion_description">@alice:example.org</span>
                        </div>
                        <div class="mx_AutocompleteInput_suggestion mx_AutocompleteInput_suggestion--selected" id="bob">
                            <span class="mx_AutocompleteInput_suggestion_title">Bob</span>
                            <span class="mx_AutocompleteInput_suggestion_description">@bob:example.org</span>
                        </div>
                    </div>
                </div>
            `);
            const editor = get(".mx_AutocompleteInput_editor");
            const matches = get(".mx_AutocompleteInput_matches");
            // AutocompleteInput puts the matches at the field's height inside its border
            matches.style.top = `${editor.clientHeight}px`;
            const icon = box(get(".mx_AutocompleteInput_search_icon"));
            const input = get(".mx_AutocompleteInput_editor input");

            expect(box(editor).height).toBe(36);
            expect(getComputedStyle(editor).borderRadius).toBe("8px");
            expect(settledStyle(editor).borderTopColor).toBe(colorOf("--cpd-color-border-focused"));
            expect([icon.width, icon.left - box(editor).left]).toEqual([20, 13]);
            expect(box(input).left + parseFloat(getComputedStyle(input).paddingLeft) - icon.right).toBe(8);
            expect(center(get(".mx_AutocompleteInput_search_icon"))).toBe(center(editor));

            const menu = box(matches);
            expect(menu.top - box(editor).bottom).toBe(4);
            expect(getComputedStyle(matches).borderRadius).toBe("12px");
            for (const id of ["alice", "bob"]) {
                const row = box(get(`#${id}`));
                expect(row.height).toBe(40);
                expect([row.left - menu.left, menu.right - row.right]).toEqual([4, 4]);
                expect(box(get(`#${id} .mx_AutocompleteInput_suggestion_title`)).left - menu.left).toBe(16);
            }
            // Someone already added has the darker fill
            expect(getComputedStyle(get("#bob")).backgroundColor).not.toBe(
                getComputedStyle(get("#alice")).backgroundColor,
            );
        });

        it("makes the invite dialog's address bar a 36px field, with its button beside the first row as pills grow it", () => {
            const flex = (direction: string, align: string, wrap: string): string =>
                `--mx-flex-display: flex; --mx-flex-direction: ${direction}; --mx-flex-align: ${align}; --mx-flex-justify: start; --mx-flex-gap: var(--cpd-space-2x); --mx-flex-wrap: ${wrap};`;
            // PillInput, with rows of 24px pills once someone is picked: three 200px pills take two rows
            const editor = (pills: number): string => `
                <div class="flex pillInput mx_InviteDialog_editor" style="${flex("column", "start", "nowrap")}">
                    ${pills ? `<div class="flex" style="${flex("row", "center", "wrap")}">${'<div class="pill" style="width: 200px; height: 24px"></div>'.repeat(pills)}</div>` : ""}
                    <input class="input" placeholder="Search">
                </div>
            `;
            const bar = (testId: string, pills: number): string => `
                <div class="mx_InviteDialog_addressBar" data-testid="${testId}">
                    ${editor(pills)}
                    <div class="mx_AccessibleButton mx_InviteDialog_goButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary" role="button">Invite</div>
                </div>
            `;
            render(
                `<div class="mx_InviteDialog_other">${bar("empty", 0)}${bar("one-row", 1)}${bar("two-rows", 3)}</div>`,
            );

            for (const [testId, height] of [
                ["empty", 36],
                ["one-row", 36 + 8 + 24],
                ["two-rows", 36 + 2 * (8 + 24)],
            ] as const) {
                const editorElement = get(`[data-testid=${testId}] .mx_InviteDialog_editor`);
                const editorBox = box(editorElement);
                const input = get(`[data-testid=${testId}] .mx_InviteDialog_editor input`);
                const go = get(`[data-testid=${testId}] .mx_InviteDialog_goButton`);
                // On the dialog's content edge, with its title and help text
                expect(editorBox.left).toBe(box(get(`[data-testid=${testId}]`)).left);
                expect(editorBox.height).toBe(height);
                // A pill while it holds one row, and concentric with the 24px pills 6px inside it as it grows
                expect(cornerRadii(editorElement)).toEqual({ x: 18, y: 18 });
                // The search text starts 12px inside the border, as in a text field
                expect(box(input).left + parseFloat(getComputedStyle(input).paddingLeft) - editorBox.left).toBe(13);
                expect(box(go).height).toBe(36);
                expect(cornerRadii(go)).toEqual({ x: 18, y: 18 });
                // The first row: 24px pills, or the search line, inside 5px of padding and the border
                expect(center(go) - editorBox.top).toBe(1 + 5 + 24 / 2);
                expect(box(go).left - editorBox.right).toBe(12);
            }
            for (const testId of ["one-row", "two-rows"]) {
                const editorBox = box(get(`[data-testid=${testId}] .mx_InviteDialog_editor`));
                const pill = box(get(`[data-testid=${testId}] .pill`));
                expect([pill.left - editorBox.left, pill.top - editorBox.top]).toEqual([6, 6]);
            }
        });

        it("makes the legacy call buttons 36px circles around a 20px icon", () => {
            render(`
                <div class="mx_LegacyCallViewButtons" style="position: static">
                    <div class="mx_AccessibleButton mx_LegacyCallViewButtons_button mx_LegacyCallViewButtons_button_hangup" role="button">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>
                    </div>
                </div>
            `);
            const button = get(".mx_LegacyCallViewButtons_button");
            const icon = button.querySelector("svg")!;

            expect([box(button).width, box(button).height]).toEqual([36, 36]);
            expect(cornerRadii(button)).toEqual({ x: 18, y: 18 });
            expect([box(icon).width, box(icon).top - box(button).top, box(icon).left - box(button).left]).toEqual([
                20, 8, 8,
            ]);
        });
    });

    describe("legacy text fields", () => {
        it("are 36px with the label on the input's line, its text where the input's starts", () => {
            render(field("Room name"));
            const input = get("input");
            const label = get("label");

            expect(box(get(".mx_Field")).height).toBe(36);
            expect(getComputedStyle(input).paddingTop).toBe(getComputedStyle(input).paddingBottom);
            expect(getComputedStyle(input).paddingLeft).toBe("12px");
            expect(center(label)).toBe(center(input));
            expect(box(label).left + parseFloat(getComputedStyle(label).paddingLeft)).toBe(
                box(input).left + parseFloat(getComputedStyle(input).paddingLeft),
            );
        });

        it("float the label onto the middle of the top border", () => {
            render(field("Topic", "A room for designers"));
            const border = parseFloat(getComputedStyle(get(".mx_Field")).borderTopWidth);

            expect(getComputedStyle(get("label")).fontSize).toBe("11px");
            expect(center(get("label"))).toBe(box(get(".mx_Field")).top + border / 2);
        });

        it("darken the border on hover and turn it Compound's focus blue when focused", async () => {
            render(field("Room name"));
            const fieldBox = get(".mx_Field");
            const border = (): string => settledStyle(fieldBox).borderTopColor;
            const rest = border();

            await userEvent.hover(fieldBox);
            expect(border()).toBe(colorOf("--cpd-color-border-interactive-hovered"));
            expect(border()).not.toBe(rest);
            get("input").focus();
            expect(border()).toBe(colorOf("--cpd-color-border-focused"));
        });

        it("show Compound's disabled and invalid looks", async () => {
            render(`
                <div data-testid="disabled">${field("Disabled", "Value")}</div>
                <div data-testid="invalid">${field("Invalid", "Value", "input", "mx_Field_invalid")}</div>
            `);
            get("[data-testid=disabled] input").setAttribute("disabled", "");
            const disabled = get("[data-testid=disabled] .mx_Field");
            const invalid = get("[data-testid=invalid] .mx_Field");

            expect(settledStyle(disabled).borderTopColor).toBe(colorOf("--cpd-color-border-disabled"));
            expect(getComputedStyle(get("[data-testid=disabled] input")).backgroundColor).toBe(
                colorOf("--cpd-color-bg-canvas-disabled"),
            );
            expect(getComputedStyle(get("[data-testid=disabled] input")).color).toBe(
                colorOf("--cpd-color-text-disabled"),
            );
            // Hovering a disabled field or an invalid one doesn't change its border
            await userEvent.hover(invalid);
            expect(settledStyle(invalid).borderTopColor).toBe(colorOf("--cpd-color-border-critical-primary"));
            expect(getComputedStyle(get("[data-testid=invalid] label")).color).toBe(
                colorOf("--cpd-color-text-critical-primary"),
            );
        });

        it("put a text area's label on its first line", () => {
            render(field("Reason", "", "textarea"));
            const textarea = get("textarea");

            expect(box(get("label")).top).toBe(box(textarea).top + parseFloat(getComputedStyle(textarea).paddingTop));
        });

        it("are as tall as dropdowns, also with a dropdown inside", () => {
            render(`
                <div class="mx_Dropdown" data-testid="plain">${dropdown("Europe/London")}</div>
                <div class="mx_Dropdown mx_JoinRuleDropdown" data-testid="join-rule">${dropdown("<div>Invite only</div>")}</div>
                <div class="mx_Field mx_Field_input mx_Field_labelAlwaysTopLeft" data-testid="phone">
                    <span class="mx_Field_prefix"><div class="mx_Dropdown mx_CountryDropdown">${dropdown("+44")}</div></span>
                    <input id="phone" placeholder="Phone Number" type="text"><label for="phone">Phone Number</label>
                </div>
                <div class="mx_Field mx_Field_input mx_RoomAliasField" data-testid="alias">
                    <span class="mx_Field_prefix">#</span>
                    <input id="alias" placeholder="Address" type="text"><label for="alias">Address</label>
                    <span class="mx_Field_postfix">:example.org</span>
                </div>
                <div class="mx_ExportDialog"><div class="mx_Field mx_Field_input" data-testid="export-size">
                    <input id="size" placeholder="Size Limit" type="number" value="8"><label for="size">Size Limit</label>
                    <span class="mx_Field_postfix"><span>MB</span></span>
                </div></div>
            `);

            for (const testId of ["plain", "join-rule"]) {
                expect(box(get(`[data-testid=${testId}] .mx_Dropdown_input`)).height).toBe(36);
            }
            for (const testId of ["phone", "alias", "export-size"]) {
                expect(box(get(`[data-testid=${testId}]`)).height).toBe(36);
            }
            expect(center(get("[data-testid=alias] .mx_Field_prefix"))).toBe(center(get("[data-testid=alias] input")));
            expect(center(get("[data-testid=export-size] .mx_Field_postfix"))).toBe(
                center(get("[data-testid=export-size] input")),
            );
        });

        it("start their text where dropdowns, their menus and the country code start theirs", () => {
            const option = (content: string, highlight = false): string =>
                `<li class="mx_Dropdown_option${highlight ? " mx_Dropdown_option_highlight" : ""}" role="option">${content}</li>`;
            const flag = `<div class="mx_Dropdown_option_emoji">🇬🇧</div>`;
            render(`
                ${field("Name")}
                <div class="mx_Dropdown" data-testid="language">
                    <div class="mx_AccessibleButton mx_Dropdown_input mx_no_textinput" role="button">
                        <div class="mx_Dropdown_option"><div>English</div></div>
                        <svg class="mx_Dropdown_arrow" viewBox="0 0 24 24"></svg>
                        <ul class="mx_Dropdown_menu" role="listbox">${option("<div>English</div>", true)}${option("<div>Deutsch</div>")}</ul>
                    </div>
                </div>
                <div class="mx_Field mx_Field_input mx_Field_labelAlwaysTopLeft" data-testid="phone">
                    <span class="mx_Field_prefix"><div class="mx_Dropdown mx_CountryDropdown">
                        <div class="mx_AccessibleButton mx_Dropdown_input mx_no_textinput" role="button">
                            <div class="mx_Dropdown_option"><span class="mx_CountryDropdown_shortOption">${flag}+44</span></div>
                            <svg class="mx_Dropdown_arrow" viewBox="0 0 24 24"></svg>
                            <ul class="mx_Dropdown_menu" role="listbox">${option(`<div class="mx_CountryDropdown_option">${flag}United Kingdom (+44)</div>`)}</ul>
                        </div>
                    </div></span>
                    <input id="phone" placeholder="Phone Number" type="text"><label for="phone">Phone Number</label>
                </div>
            `);
            const input = get("[placeholder=Name]");
            const fieldInset =
                box(input).left + parseFloat(getComputedStyle(input).paddingLeft) - box(get(".mx_Field")).left;
            const inset = (content: Element, outer: Element): number => box(content).left - box(outer).left;

            expect(fieldInset).toBe(13);
            expect(
                inset(
                    get("[data-testid=language] .mx_Dropdown_input > .mx_Dropdown_option > div"),
                    get("[data-testid=language] .mx_Dropdown_input"),
                ),
            ).toBe(fieldInset);
            for (const text of document.querySelectorAll(
                "[data-testid=language] .mx_Dropdown_menu .mx_Dropdown_option > div",
            )) {
                expect(inset(text, get("[data-testid=language] .mx_Dropdown_menu"))).toBe(fieldInset);
            }
            // The flag starts the country code, in the closed prefix and in the menu, with 8px before what follows it
            const prefixFlag = get("[data-testid=phone] .mx_CountryDropdown_shortOption .mx_Dropdown_option_emoji");
            const menuFlag = get("[data-testid=phone] .mx_CountryDropdown_option .mx_Dropdown_option_emoji");
            expect(inset(prefixFlag, get("[data-testid=phone]"))).toBe(fieldInset);
            expect(inset(menuFlag, get("[data-testid=phone] .mx_Dropdown_menu"))).toBe(fieldInset);
            expect(getComputedStyle(prefixFlag).marginInlineEnd).toBe("8px");
        });

        it("put the join rule's icon where a field's text starts, 12px before its label and centered on the row", () => {
            const joinRule = (testId: string): string => `
                <div class="mx_Dropdown mx_JoinRuleDropdown" data-testid="${testId}">
                    <div class="mx_AccessibleButton mx_Dropdown_input mx_no_textinput" role="button">
                        <div class="mx_Dropdown_option"><div class="mx_JoinRuleDropdown_invite"><svg viewBox="0 0 24 24"></svg>Invite only</div></div>
                        <svg class="mx_Dropdown_arrow" viewBox="0 0 24 24"></svg>
                        <ul class="mx_Dropdown_menu" role="listbox">
                            <li class="mx_Dropdown_option mx_Dropdown_option_highlight" role="option"><div class="mx_JoinRuleDropdown_public"><svg viewBox="0 0 24 24"></svg>Public</div></li>
                        </ul>
                    </div>
                </div>
            `;
            render(`${field("Name")}${joinRule("ltr")}<div dir="rtl">${joinRule("rtl")}</div>`);
            const input = get(".mx_Field input");
            const fieldInset =
                box(input).left + parseFloat(getComputedStyle(input).paddingLeft) - box(get(".mx_Field")).left;
            const labelBox = (option: Element): DOMRect => {
                const range = document.createRange();
                range.selectNodeContents(option.lastChild!);
                return range.getBoundingClientRect();
            };

            for (const testId of ["ltr", "rtl"]) {
                const scope = `[data-testid=${testId}]`;
                const closed = box(get(`${scope} .mx_Dropdown_input`));
                const value = get(`${scope} .mx_Dropdown_input > .mx_Dropdown_option`);
                const option = get(`${scope} .mx_JoinRuleDropdown_invite`);
                const icon = box(option.querySelector("svg")!);
                const [iconInset, labelGap] =
                    testId === "ltr"
                        ? [icon.left - closed.left, labelBox(option).left - icon.right]
                        : [closed.right - icon.right, icon.left - labelBox(option).right];

                expect([iconInset, labelGap]).toEqual([fieldInset, 12]);
                expect(icon.top + icon.height / 2).toBe(center(value));
                // In the menu, the icon and the label's line share the row's middle, under the closed value's icon
                const row = get(`${scope} .mx_Dropdown_menu .mx_Dropdown_option`);
                const rowIcon = box(get(`${scope} .mx_JoinRuleDropdown_public svg`));
                expect(box(row).height).toBe(40);
                expect([rowIcon.top + rowIcon.height / 2, center(get(`${scope} .mx_JoinRuleDropdown_public`))]).toEqual(
                    [center(row), center(row)],
                );
                expect([rowIcon.left, rowIcon.right]).toEqual([icon.left, icon.right]);
            }
        });

        it("put the arrow as far from the end as from the top and bottom, and write in the text fields' font", () => {
            render(`
                ${field("Name")}
                <div class="mx_Dropdown" data-testid="plain">${dropdown("Europe/London")}</div>
                <div class="mx_Field mx_Field_input mx_Field_labelAlwaysTopLeft" data-testid="phone">
                    <span class="mx_Field_prefix"><div class="mx_Dropdown mx_CountryDropdown">${dropdown("+44")}</div></span>
                    <input id="phone" placeholder="Phone Number" type="text"><label for="phone">Phone Number</label>
                </div>
            `);
            const fieldFont = getComputedStyle(get(".mx_Field input"));

            // A dropdown's own border, and the phone field's around the country code, which ends at the prefix
            for (const [outer, end] of [
                ["[data-testid=plain] .mx_Dropdown_input", "[data-testid=plain] .mx_Dropdown_input"],
                ["[data-testid=phone]", "[data-testid=phone] .mx_Field_prefix"],
            ]) {
                const arrow = box(get(`${outer} .mx_Dropdown_arrow`));
                expect([box(get(end)).right - arrow.right, arrow.top - box(get(outer)).top]).toEqual([9, 9]);
                expect(box(get(outer)).bottom - arrow.bottom).toBe(9);
            }
            for (const testId of ["plain", "phone"]) {
                const value = getComputedStyle(get(`[data-testid=${testId}] .mx_Dropdown_option`));
                expect([value.fontSize, value.fontWeight, value.fontFamily]).toEqual([
                    fieldFont.fontSize,
                    fieldFont.fontWeight,
                    fieldFont.fontFamily,
                ]);
            }
        });

        describe("menus", () => {
            const option = (content: string, highlight = false): string =>
                `<li class="mx_Dropdown_option${highlight ? " mx_Dropdown_option_highlight" : ""}" role="option" tabindex="-1">${content}</li>`;
            /** An open dropdown; given a width, the input and menu take it, as SettingsDropdown's menuWidth does. */
            const openDropdown = (names: string[], width?: number): string => `
                <div class="mx_Dropdown">
                    <div class="mx_AccessibleButton mx_Dropdown_input mx_no_textinput" role="button"${width ? ` style="width: ${width}px"` : ""}>
                        <div class="mx_Dropdown_option"><div>${names[0]}</div></div>
                        <svg class="mx_Dropdown_arrow" viewBox="0 0 24 24"></svg>
                        <ul class="mx_Dropdown_menu" role="listbox"${width ? ` style="width: ${width}px"` : ""}>
                            ${names.map((name, index) => option(`<div>${name}</div>`, index === 1)).join("")}
                        </ul>
                    </div>
                </div>
            `;
            const rows = (): HTMLElement[] => [
                ...document.querySelectorAll<HTMLElement>(".mx_Dropdown_menu .mx_Dropdown_option"),
            ];

            it("float 4px under the field, 12px menus with 40px rows inset 4px and rounded 8px", () => {
                render(openDropdown(["English", "Deutsch", "Español"], 360));
                const closed = box(get(".mx_Dropdown_input"));
                const menuElement = get(".mx_Dropdown_menu");
                const menu = box(menuElement);

                expect(menu.top - closed.bottom).toBe(4);
                expect([menu.left, menu.right]).toEqual([closed.left, closed.right]);
                expect(cornerRadii(menuElement)).toEqual({ x: 12, y: 12 });
                expect([box(rows()[0]).top - menu.top, menu.bottom - box(rows().at(-1)!).bottom]).toEqual([4, 4]);
                for (const row of rows()) {
                    expect([box(row).left - menu.left, menu.right - box(row).right, box(row).height]).toEqual([
                        4, 4, 40,
                    ]);
                    expect(cornerRadii(row)).toEqual({ x: 8, y: 8 });
                    expect(center(row.firstElementChild!)).toBe(center(row));
                }
                expect(getComputedStyle(rows()[1]).backgroundColor).not.toBe(
                    getComputedStyle(rows()[0]).backgroundColor,
                );
            });

            it("draw the keyboard focus ring inside the highlighted row", async () => {
                render(openDropdown(["English", "Deutsch", "Español"]));
                const row = rows()[1];

                await userEvent.keyboard("{Shift}");
                row.focus();
                expect(row.matches(":focus-visible")).toBe(true);
                const style = getComputedStyle(row);
                expect(`${style.outlineStyle} ${style.outlineWidth} ${style.outlineOffset}`).toBe("solid 2px -2px");
            });

            it("cut a row at the bottom of a list that scrolls", () => {
                render(
                    openDropdown([
                        "United Kingdom",
                        "United States",
                        "Afghanistan",
                        "Åland Islands",
                        "Albania",
                        "Algeria",
                        "Andorra",
                        "Angola",
                    ]),
                );
                const menu = get(".mx_Dropdown_menu");
                const visibleBottom = box(menu).top + menu.clientTop + menu.clientHeight;
                const sixth = box(rows()[5]);

                expect(menu.scrollHeight).toBeGreaterThan(menu.clientHeight);
                expect(visibleBottom - sixth.top).toBeGreaterThanOrEqual(16);
                expect(sixth.bottom).toBeGreaterThan(visibleBottom);
                // An always-on scrollbar is cut along the 12px corners instead of running over them
                expect(getComputedStyle(menu).clipPath).toBe("border-box");
            });
        });

        describe("sessions filter", () => {
            const filterOption = (label: string, description = "", selected = false, highlight = false): string =>
                `<li class="mx_Dropdown_option${highlight ? " mx_Dropdown_option_highlight" : ""}" role="option" tabindex="-1"><div class="mx_FilterDropdown_option"><input type="radio" class="mx_FilterDropdown_optionSelectedIcon" style="inline-size: 20px; block-size: 20px; margin-inline: 0"${selected ? " checked" : ""}><span class="mx_FilterDropdown_optionLabel">${label}</span>${description ? `<span class="mx_FilterDropdown_optionDescription">${description}</span>` : ""}</div></li>`;
            /** FilteredDeviceList's header with the FilterDropdown, as SessionManagerTab shows it. */
            const sessionsHeader = (open: boolean): string => `
                <div class="mx_FilteredDeviceList">
                    <div class="mx_FilteredDeviceListHeader">
                        <span class="mx_FilteredDeviceListHeader_label">Sessions</span>
                        <div class="mx_Dropdown mx_FilterDropdown">
                            <div class="mx_AccessibleButton mx_Dropdown_input mx_no_textinput" role="button">
                                <div class="mx_Dropdown_option">Show: Unverified</div>
                                <svg class="mx_Dropdown_arrow" viewBox="0 0 24 24"></svg>
                                ${
                                    open
                                        ? `<ul class="mx_Dropdown_menu" role="listbox">
                                            ${filterOption("All", "", false, true)}
                                            ${filterOption("Verified", "Ready for secure messaging")}
                                            ${filterOption("Unverified", "Not ready for secure messaging", true)}
                                        </ul>`
                                        : ""
                                }
                            </div>
                        </div>
                    </div>
                </div>
            `;

            it("is a 36px chip in the middle of the header, its arrow as far from its end as from its top", () => {
                render(sessionsHeader(false));
                const chipElement = get(".mx_FilterDropdown .mx_Dropdown_input");
                const chip = box(chipElement);
                const value = box(get(".mx_FilterDropdown .mx_Dropdown_option"));
                const arrow = box(get(".mx_FilterDropdown .mx_Dropdown_arrow"));

                expect(chip.height).toBe(36);
                expect(cornerRadii(chipElement)).toEqual({ x: 18, y: 18 });
                expect(center(chipElement)).toBe(center(get(".mx_FilteredDeviceListHeader")));
                expect([value.top - chip.top, chip.bottom - value.bottom]).toEqual([1, 1]);
                expect([chip.right - arrow.right, arrow.top - chip.top]).toEqual([9, 9]);
            });

            it("opens a 12px menu under the chip's end, its rows on the grid, inset 4px and the content 16px in", () => {
                render(sessionsHeader(true));
                const chip = box(get(".mx_FilterDropdown .mx_Dropdown_input"));
                const menuElement = get(".mx_Dropdown_menu");
                const menu = box(menuElement);
                const filterRows = [...document.querySelectorAll<HTMLElement>(".mx_Dropdown_menu .mx_Dropdown_option")];

                expect([menu.right, menu.top - chip.bottom]).toEqual([chip.right, 4]);
                expect(cornerRadii(menuElement)).toEqual({ x: 12, y: 12 });
                // Clipped to its corners like the other dropdown menus, so a shadow outside them would never show
                expect([getComputedStyle(menuElement).clipPath, getComputedStyle(menuElement).boxShadow]).toEqual([
                    "border-box",
                    "none",
                ]);
                expect(filterRows.map((row) => box(row).height)).toEqual([40, 60, 60]);
                for (const row of filterRows) {
                    expect([box(row).left - menu.left, menu.right - box(row).right]).toEqual([4, 4]);
                    expect(cornerRadii(row)).toEqual({ x: 8, y: 8 });
                    const content = row.querySelector<HTMLElement>(".mx_FilterDropdown_option")!;
                    expect(box(content).left - menu.left).toBe(16);
                    // The descriptions don't wrap, so the menu is wide enough for them beside the radio
                    expect(content.scrollWidth).toBeLessThanOrEqual(content.clientWidth);
                }
                expect(box(get(".mx_FilterDropdown_optionSelectedIcon")).left - menu.left).toBe(16);
                // The radio is centered on the label's line
                expect(center(filterRows[2].querySelector(".mx_FilterDropdown_optionSelectedIcon")!)).toBe(
                    center(filterRows[2].querySelector(".mx_FilterDropdown_optionLabel")!),
                );
                // The highlight shows on the menu, as in the other dropdowns
                expect(getComputedStyle(filterRows[0]).backgroundColor).not.toBe(
                    getComputedStyle(menuElement).backgroundColor,
                );
            });

            it("keeps the chip filled, without the other dropdowns' accent border, while its open menu has the focus", () => {
                render(sessionsHeader(true));
                const chip = get(".mx_FilterDropdown .mx_Dropdown_input");
                const look = (): string[] => {
                    const style = settledStyle(chip);
                    return [style.backgroundColor, style.borderTopColor];
                };
                chip.tabIndex = 0;
                chip.focus();
                const focused = look();
                expect(focused[1]).toBe(focused[0]);

                // The arrow keys move the focus into the menu
                get(".mx_Dropdown_menu .mx_Dropdown_option").focus();
                expect(look()).toEqual(focused);
            });
        });

        it("line up with the keyword field's Add button", () => {
            render(`
                <div class="mx_SettingsTab"><div class="mx_TagComposer"><form class="mx_TagComposer_input">
                    ${field("Keyword")}${PRIMARY}
                </form></div></div>
            `);

            expect(box(get(".mx_Field")).height).toBe(36);
            expect(box(get(".mx_AccessibleButton")).height).toBe(36);
            expect(center(get(".mx_Field"))).toBe(center(get(".mx_AccessibleButton")));
        });

        it("are 36px on the sign in page, in a modal padded on the grid", () => {
            render(`
                <div class="mx_AuthPage_modalContent" style="display: flex">
                    <div class="mx_AuthHeader"></div>
                    <main class="mx_AuthBody"><form>${field("Username", "", "input", "mx_Login_field")}</form></main>
                </div>
            `);

            expect(box(get(".mx_Login_field")).height).toBe(36);
            expect(padding(get(".mx_AuthHeader"))).toBe("24px 24px 24px 24px");
            expect(padding(get(".mx_AuthBody"))).toBe("24px 60px 24px 60px");
        });

        describe("one under another", () => {
            /** A select field, as PowerSelector renders one; its label is always on the border. */
            const select = (label: string): string =>
                `<div class="mx_Field mx_Field_select"><select id="${label}"><option>Default</option></select><label for="${label}">${label}</label></div>`;

            /** The gap between two boxes, and between the upper one and the text of the lower one's floated label. */
            function spacing(upper: Element, lower: Element): { gap: number; label: number } {
                const label = lower.querySelector(":scope > label");
                const text = document.createRange();
                text.selectNodeContents(label!);
                return {
                    gap: box(lower).top - box(upper).bottom,
                    label: text.getBoundingClientRect().top - box(upper).bottom,
                };
            }

            /** The gaps down a column of fields, each with the clearance of its floated label. */
            function column(selector: string): Array<{ gap: number; label: number }> {
                const fields = [...document.querySelectorAll(selector)].map(
                    (element) => (element.matches(".mx_Field") ? element : element.querySelector(".mx_Field"))!,
                );
                return fields.slice(1).map((field, index) => spacing(fields[index], field));
            }

            // The 11px floated label clears the field above by about 9px
            const apart16 = { gap: 16, label: expect.closeTo(9, 0) };

            it("are 16px apart in a dialog's 15px text and in the sign in page's 12px text", () => {
                render(`
                    <div class="mx_Dialog" data-testid="dialog">${field("Name", "Design")}${field("Topic", "Designers")}</div>
                    <main class="mx_AuthBody" data-testid="login">${field("Username", "alice")}${field("Password", "hunter2")}</main>
                `);

                expect(column("[data-testid=dialog] .mx_Field")).toEqual([apart16]);
                expect(column("[data-testid=login] .mx_Field")).toEqual([apart16]);
            });

            it("are 16px apart down and across the registration form's rows", () => {
                render(`
                    <main class="mx_AuthBody"><form>
                        <div class="mx_AuthBody_fieldRow">${field("Username", "alice")}</div>
                        <div class="mx_AuthBody_fieldRow">${field("Password", "hunter2")}${field("Confirm password", "hunter2")}</div>
                        <div class="mx_AuthBody_fieldRow">${field("Email", "alice@example.org")}</div>
                    </form></main>
                `);
                const [username, password, confirm, email] = document.querySelectorAll(".mx_Field");

                expect([spacing(username, password), spacing(password, email)]).toEqual([apart16, apart16]);
                expect(box(confirm).left - box(password).right).toBe(16);
                expect([box(password).left, box(confirm).right]).toEqual([box(username).left, box(username).right]);
            });

            it("are 16px apart in a settings form and fieldset, which keep their gap before the button", () => {
                render(`
                    <div class="mx_SettingsTab">
                        <form data-testid="password">
                            <div>${field("Current password", "old")}</div>
                            <div>${field("New password", "new")}</div>
                            ${field("Confirm password", "new")}
                            ${PRIMARY}
                        </form>
                        <fieldset class="mx_SettingsFieldset"><div class="mx_SettingsFieldset_content" data-testid="levels">
                            <div class="mx_PowerSelector">${select("@bob:example.org")}</div>
                            <div class="mx_PowerSelector">${select("@alice:example.org")}</div>
                            ${PRIMARY}
                        </div></fieldset>
                    </div>
                `);

                expect(column("[data-testid=password] .mx_Field")).toEqual([apart16, apart16]);
                expect(column("[data-testid=levels] .mx_PowerSelector")).toEqual([apart16]);
                expect(
                    box(get("[data-testid=password] .mx_AccessibleButton")).top -
                        box(get("[data-testid=password] > .mx_Field")).bottom,
                ).toBe(12);
                expect(
                    box(get("[data-testid=levels] .mx_AccessibleButton")).top -
                        box(get("[data-testid=levels] .mx_PowerSelector:nth-child(2)")).bottom,
                ).toBe(8);
            });

            it("are 16px apart in a room's profile settings and the developer tools' event editor", () => {
                render(`
                    <div class="mx_SettingsTab"><form class="mx_RoomProfileSettings"><div class="mx_RoomProfileSettings_profile">
                        <div class="mx_RoomProfileSettings_profile_controls" data-testid="profile">
                            ${field("Room Name", "Design")}
                            ${field("Room Topic", "Where the designers meet", "textarea", "mx_RoomProfileSettings_profile_controls_topic")}
                        </div>
                    </div></form></div>
                    <div class="mx_Dialog"><div class="mx_DevTools_content" data-testid="devtools">
                        <div class="mx_DevTools_eventTypeStateKeyGroup">${field("Event Type", "m.room.message")}</div>
                        ${field("Event Content", "{}", "textarea", "mx_DevTools_textarea")}
                    </div></div>
                `);

                expect(column("[data-testid=profile] .mx_Field")).toEqual([apart16]);
                expect(column("[data-testid=devtools] .mx_Field").map(({ gap }) => gap)).toEqual([16]);
            });
        });

        it("give a dropdown the text field's border at rest and focused, also from the keyboard and with its menu open", async () => {
            render(`
                ${field("Name")}
                <div class="mx_Dropdown" data-testid="closed">${dropdown("Invite only")}</div>
                <div class="mx_Dropdown" data-testid="open">
                    <div class="mx_AccessibleButton mx_Dropdown_input mx_no_textinput" role="button" tabindex="0" aria-expanded="true">
                        <div class="mx_Dropdown_option">Invite only</div>
                        <svg class="mx_Dropdown_arrow" viewBox="0 0 24 24"></svg>
                        <ul class="mx_Dropdown_menu" role="listbox">
                            <li class="mx_Dropdown_option mx_Dropdown_option_highlight" role="option" tabindex="-1">Public room</li>
                        </ul>
                    </div>
                </div>
            `);
            const fieldBox = get(".mx_Field");
            const closed = get("[data-testid=closed] .mx_Dropdown_input");
            const open = get("[data-testid=open] .mx_Dropdown_input");
            closed.tabIndex = 0;
            const border = (element: HTMLElement): string => settledStyle(element).borderTopColor;
            const restColor = border(fieldBox);
            expect(border(closed)).toBe(restColor);

            get(".mx_Field input").focus();
            const focusColor = border(fieldBox);
            expect(focusColor).not.toBe(restColor);

            // From the keyboard, the dropdown shows the same border: the ring replacing the browser's lies on it
            await userEvent.keyboard("{Shift}");
            closed.focus();
            expect(closed.matches(":focus-visible")).toBe(true);
            expect(border(closed)).toBe(focusColor);
            expect(ring(closed)).toBe(`solid 1px -1px ${focusColor}`);

            // The arrow keys move the focus into the open menu: the dropdown stays focused, and its menu has the border
            // of every other menu
            get("[data-testid=open] .mx_Dropdown_menu .mx_Dropdown_option").focus();
            expect(border(open)).toBe(focusColor);
            expect(border(get("[data-testid=open] .mx_Dropdown_menu"))).toBe(restColor);
        });

        it("keep the focus visible from the keyboard on a dropdown without a border, the language and space pickers", async () => {
            render(`
                ${field("Name")}
                <div class="mx_Dropdown mx_LanguageDropdown mx_AuthBody_language">${dropdown("English")}</div>
                <div class="mx_SubspaceSelector"><div>
                    <h1>Add existing rooms</h1>
                    <div class="mx_Dropdown">${dropdown("Design team")}</div>
                </div></div>
            `);
            get(".mx_Field input").focus();
            const focusColor = settledStyle(get(".mx_Field")).borderTopColor;
            const pickers = [...document.querySelectorAll<HTMLElement>(".mx_Dropdown_input")];

            await userEvent.keyboard("{Shift}");
            expect(pickers).toHaveLength(2);
            for (const picker of pickers) {
                picker.tabIndex = 0;
                picker.focus();
                expect(picker.matches(":focus-visible")).toBe(true);
                expect(getComputedStyle(picker).borderTopStyle).toBe("none");
                expect(ring(picker)).toBe(`solid 1px -1px ${focusColor}`);
            }
        });
    });

    describe("chips and cards", () => {
        // The default notification settings and the labs ones (NotificationSettings2) share TagComposer
        it.each([
            ["notification settings", "mx_UserNotifSettings"],
            ["labs notification settings", "mx_NotificationSettings2"],
        ])(
            "makes the keywords 36px chips with the remove button as far from the end as from the top: %s",
            (_, page) => {
                render(`
                    <div class="mx_SettingsTab"><div class="${page}"><div class="mx_TagComposer">
                        <div class="mx_TagComposer_tags" role="list">
                            <div class="mx_Tag" role="listitem">mention<div class="mx_AccessibleButton mx_Tag_delete" role="button"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg></div></div>
                        </div>
                    </div></div></div>
                `);
                const tag = box(get(".mx_Tag"));
                const remove = box(get(".mx_Tag_delete"));

                expect(tag.height).toBe(36);
                expect(cornerRadii(get(".mx_Tag"))).toEqual({ x: 18, y: 18 });
                expect(getComputedStyle(get(".mx_Tag")).paddingLeft).toBe("12px");
                expect(tag.right - remove.right).toBeCloseTo(10, 1);
                expect(remove.top - tag.top).toBeCloseTo(10, 1);
                expect(tag.bottom - remove.bottom).toBeCloseTo(10, 1);
            },
        );

        it("keeps the keyword's remove button 10px from the chip's end in right-to-left text", () => {
            render(`
                <div class="mx_SettingsTab" dir="rtl"><div class="mx_UserNotifSettings"><div class="mx_TagComposer">
                    <div class="mx_TagComposer_tags" role="list">
                        <div class="mx_Tag" role="listitem">אזכור<div class="mx_AccessibleButton mx_Tag_delete" role="button"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg></div></div>
                    </div>
                </div></div></div>
            `);
            const tag = box(get(".mx_Tag"));
            const remove = box(get(".mx_Tag_delete"));

            expect(remove.left - tag.left).toBeCloseTo(10, 1);
            expect(getComputedStyle(get(".mx_Tag")).paddingRight).toBe("12px");
        });

        it("rounds the beta card like a card, with a 24px pill for its badge", () => {
            render(`
                <div class="mx_BetaCard"><div class="mx_BetaCard_columns"><div class="mx_BetaCard_columns_description">
                    <h3 class="mx_BetaCard_title"><span>Video rooms</span><span class="mx_BetaCard_betaPill">Beta</span></h3>
                </div></div></div>
            `);
            const pill = get(".mx_BetaCard_betaPill");

            expect(cornerRadii(get(".mx_BetaCard"))).toEqual({ x: 12, y: 12 });
            expect(box(pill).height).toBe(24);
            expect(cornerRadii(pill)).toEqual({ x: 12, y: 12 });
            expect(padding(pill)).toBe("4px 8px 4px 8px");
        });

        it("rounds the verification options like cards", () => {
            render(`
                <div class="mx_Dialog"><div class="mx_VerificationPanel_QRPhase_startOptions">
                    <div class="mx_VerificationPanel_QRPhase_startOption"><p>Compare unique emoji</p>${PRIMARY}</div>
                </div></div>
            `);

            expect(cornerRadii(get(".mx_VerificationPanel_QRPhase_startOption"))).toEqual({ x: 12, y: 12 });
        });

        it("puts the spinner of a verification code that is loading in the middle of its card, level with 'or'", () => {
            const qrCard = (code: string): string =>
                `<div class="mx_VerificationPanel_QRPhase_startOption"><p>Scan this unique code</p><div class="mx_QRCode mx_VerificationQRCode">${code}</div></div>`;
            render(`
                <div class="mx_Dialog" style="width: 800px"><div class="mx_VerificationPanel_QRPhase_startOptions">
                    ${qrCard(`<div class="mx_Spinner"><svg style="width: 32px; height: 32px" viewBox="0 0 24 24"></svg></div>`)}
                    <div class="mx_VerificationPanel_QRPhase_betweenText">or</div>
                    <div class="mx_VerificationPanel_QRPhase_startOption">
                        <p>Compare unique emoji</p>
                        <span class="mx_VerificationPanel_QRPhase_helpText">Compare a unique set of emoji if you don't have a camera on either device</span>
                        ${PRIMARY}
                    </div>
                </div></div>
                <div class="mx_Dialog" style="width: 800px" data-testid="loaded"><div class="mx_VerificationPanel_QRPhase_startOptions">
                    ${qrCard(`<img class="mx_VerificationQRCode" alt="" style="width: 196px; height: 196px">`)}
                </div></div>
            `);
            const card = get(".mx_VerificationPanel_QRPhase_startOption");
            const spinner = get(".mx_Spinner svg");
            const title = get(".mx_VerificationPanel_QRPhase_startOption > p");
            const middle = (element: Element): number => box(element).left + box(element).width / 2;

            expect(center(spinner)).toBeCloseTo(center(card), 1);
            expect(middle(spinner)).toBeCloseTo(middle(card), 1);
            expect(center(spinner)).toBeCloseTo(center(get(".mx_VerificationPanel_QRPhase_betweenText")), 1);
            // The title stays at the top of the card, in the middle of its width
            expect(box(title).top - box(card).top).toBe(20);
            expect(middle(title)).toBeCloseTo(middle(card), 1);
            // Once the code has loaded, the card lays it out under the title as before
            expect(
                getComputedStyle(get("[data-testid=loaded] .mx_VerificationPanel_QRPhase_startOption")).display,
            ).toBe("flex");
        });
    });
});
