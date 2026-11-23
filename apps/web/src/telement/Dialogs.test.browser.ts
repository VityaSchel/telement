/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
// The shared dialog footer's own stylesheet, its classes unhashed, as DialogFooterView's markup below names them
// eslint-disable-next-line no-restricted-imports
import dialogFooterStyles from "../../../../packages/shared-components/src/telement/core/DialogFooterView/DialogFooterView.module.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import pollListItemStyles from "../../res/css/components/views/dialogs/polls/_PollListItem.pcss?raw";
import pollListItemEndedStyles from "../../res/css/components/views/dialogs/polls/_PollListItemEnded.pcss?raw";
import filterTabGroupStyles from "../../res/css/components/views/elements/_FilterTabGroup.pcss?raw";
import successDialogStyles from "../../res/css/compound/_SuccessDialog.pcss?raw";
import spacePillButtonStyles from "../../res/css/structures/_SpacePillButton.pcss?raw";
import tabbedViewStyles from "../../res/css/structures/_TabbedView.pcss?raw";
import viewSourceStyles from "../../res/css/structures/_ViewSource.pcss?raw";
import completeSecurityStyles from "../../res/css/structures/auth/_CompleteSecurity.pcss?raw";
import setupEncryptionBodyStyles from "../../res/css/structures/auth/_SetupEncryptionBody.pcss?raw";
import completeSecurityBodyStyles from "../../res/css/views/auth/_CompleteSecurityBody.pcss?raw";
import interactiveAuthEntryStyles from "../../res/css/views/auth/_InteractiveAuthEntryComponents.pcss?raw";
import addExistingToSpaceDialogStyles from "../../res/css/views/dialogs/_AddExistingToSpaceDialog.pcss?raw";
import compoundDialogStyles from "../../res/css/views/dialogs/_CompoundDialog.pcss?raw";
import confirmKeyStorageOffDialogStyles from "../../res/css/views/dialogs/_ConfirmKeyStorageOffDialog.pcss?raw";
import createRoomDialogStyles from "../../res/css/views/dialogs/_CreateRoomDialog.pcss?raw";
import createSubspaceDialogStyles from "../../res/css/views/dialogs/_CreateSubspaceDialog.pcss?raw";
import deactivateAccountDialogStyles from "../../res/css/views/dialogs/_DeactivateAccountDialog.pcss?raw";
import devtoolsDialogStyles from "../../res/css/views/dialogs/_DevtoolsDialog.pcss?raw";
import exportDialogStyles from "../../res/css/views/dialogs/_ExportDialog.pcss?raw";
import inviteDialogStyles from "../../res/css/views/dialogs/_InviteDialog.pcss?raw";
import leaveRoomDialogStyles from "../../res/css/views/dialogs/_LeaveRoomDialog.pcss?raw";
import leaveSpaceDialogStyles from "../../res/css/views/dialogs/_LeaveSpaceDialog.pcss?raw";
import logoutDialogStyles from "../../res/css/views/dialogs/_LogoutDialog.pcss?raw";
import pollCreateDialogStyles from "../../res/css/views/dialogs/_PollCreateDialog.pcss?raw";
import registrationEmailPromptDialogStyles from "../../res/css/views/dialogs/_RegistrationEmailPromptDialog.pcss?raw";
import reportRoomDialogStyles from "../../res/css/views/dialogs/_ReportRoomDialog.pcss?raw";
import roomSettingsDialogStyles from "../../res/css/views/dialogs/_RoomSettingsDialog.pcss?raw";
import roomUpgradeWarningDialogStyles from "../../res/css/views/dialogs/_RoomUpgradeWarningDialog.pcss?raw";
import settingsDialogStyles from "../../res/css/views/dialogs/_SettingsDialog.pcss?raw";
import shareDialogStyles from "../../res/css/views/dialogs/_ShareDialog.pcss?raw";
import unpinAllDialogStyles from "../../res/css/views/dialogs/_UnpinAllDialog.pcss?raw";
import userSettingsDialogStyles from "../../res/css/views/dialogs/_UserSettingsDialog.pcss?raw";
import widgetCapabilitiesPromptDialogStyles from "../../res/css/views/dialogs/_WidgetCapabilitiesPromptDialog.pcss?raw";
import accessSecretStorageDialogStyles from "../../res/css/views/dialogs/security/_AccessSecretStorageDialog.pcss?raw";
import keyBackupFailedDialogStyles from "../../res/css/views/dialogs/security/_KeyBackupFailedDialog.pcss?raw";
import accessibleButtonStyles from "../../res/css/views/elements/_AccessibleButton.pcss?raw";
import copyableTextStyles from "../../res/css/views/elements/_CopyableText.pcss?raw";
import fieldStyles from "../../res/css/views/elements/_Field.pcss?raw";
import roomAliasFieldStyles from "../../res/css/views/elements/_RoomAliasField.pcss?raw";
import pollHistoryStyles from "../../res/css/views/polls/pollHistory/_PollHistory.pcss?raw";
import pollHistoryListStyles from "../../res/css/views/polls/pollHistory/_PollHistoryList.pcss?raw";
import linkModalStyles from "../../res/css/views/rooms/wysiwyg_composer/components/_LinkModal.pcss?raw";
import roomProfileSettingsStyles from "../../res/css/views/settings/_RoomProfileSettings.pcss?raw";
import settingsSectionStyles from "../../res/css/views/settings/tabs/_SettingsSection.pcss?raw";
import settingsTabStyles from "../../res/css/views/settings/tabs/_SettingsTab.pcss?raw";
import encryptionCardStyles from "../../res/css/views/settings/encryption/_EncryptionCard.pcss?raw";
import encryptionCardEmphasisedContentStyles from "../../res/css/views/settings/encryption/_EncryptionCardEmphasisedContent.pcss?raw";
import headingStyles from "../../res/css/views/typography/_Heading.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";
import { loadInter } from "../test/telement/fonts";

/** In the order _components.pcss imports them, Heading's last, as BaseDialog's title has to win over it. */
const APP_STYLES = [
    commonStyles,
    pollListItemStyles,
    pollListItemEndedStyles,
    filterTabGroupStyles,
    successDialogStyles,
    spacePillButtonStyles,
    tabbedViewStyles,
    viewSourceStyles,
    completeSecurityStyles,
    setupEncryptionBodyStyles,
    completeSecurityBodyStyles,
    interactiveAuthEntryStyles,
    addExistingToSpaceDialogStyles,
    compoundDialogStyles,
    confirmKeyStorageOffDialogStyles,
    createRoomDialogStyles,
    createSubspaceDialogStyles,
    deactivateAccountDialogStyles,
    devtoolsDialogStyles,
    exportDialogStyles,
    inviteDialogStyles,
    leaveRoomDialogStyles,
    leaveSpaceDialogStyles,
    logoutDialogStyles,
    pollCreateDialogStyles,
    registrationEmailPromptDialogStyles,
    reportRoomDialogStyles,
    roomSettingsDialogStyles,
    roomUpgradeWarningDialogStyles,
    settingsDialogStyles,
    shareDialogStyles,
    unpinAllDialogStyles,
    userSettingsDialogStyles,
    widgetCapabilitiesPromptDialogStyles,
    accessSecretStorageDialogStyles,
    keyBackupFailedDialogStyles,
    accessibleButtonStyles,
    copyableTextStyles,
    fieldStyles,
    roomAliasFieldStyles,
    pollHistoryStyles,
    pollHistoryListStyles,
    linkModalStyles,
    roomProfileSettingsStyles,
    settingsSectionStyles,
    settingsTabStyles,
    encryptionCardStyles,
    encryptionCardEmphasisedContentStyles,
    headingStyles,
];

/** The size of the app window in the screenshots the dialogs were measured in. */
const WINDOW = { width: 1280, height: 800 };
/** The browser project's own viewport (vitest.config.ts), restored for the files after this one. */
const TEST_VIEWPORT = { width: 960, height: 720 };

let stylesheet: HTMLStyleElement;
let unloadInter: () => void;

/** Puts `html` on the page, in the light theme and the app's font. */
function render(html: string): void {
    const stage = document.createElement("div");
    stage.className = "cpd-theme-light";
    // The theme defines the emoji font, which the app's font stack refers to; without it, Compound's font tokens fail
    stage.style.cssText = "--emoji-font-family: ''; font-family: Inter";
    stage.innerHTML = html;
    document.body.append(stage);
}

/**
 * A dialog as Modal and BaseDialog render it: the wrapper and Glass frame, the body, the title as a size 3 Heading, the
 * close button after the children, and `className` on BaseDialog's own element, which is fixed width by default.
 */
function renderDialog(className: string, title: string, children: string, titleClass = "", fixedWidth = true): void {
    render(`
        <div class="mx_Dialog_wrapper">
            <div class="mx_Dialog_border">
                <div class="mx_Dialog" data-testid="body">
                    <div class="${className} ${fixedWidth ? "mx_Dialog_fixedWidth" : ""}" role="dialog">
                        <div class="mx_Dialog_header">
                            <h1 class="mx_Heading_h3 mx_Dialog_title ${titleClass}" id="mx_BaseDialog_title">${title}</h1>
                        </div>
                        ${children}
                        <div class="mx_AccessibleButton mx_Dialog_cancelButton" role="button" aria-label="Close dialog">
                            <svg viewBox="0 0 24 24"></svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
}

/** The class of Compound's form (Root), which the test's stylesheet lays out as Compound does. */
const COMPOUND_FORM = "compoundFormRoot";

interface FooterButton {
    label: string;
    /** The classes DialogButtons gives the button, which tests look it up by. */
    classes?: string;
    destructive?: boolean;
    disabled?: boolean;
    testId?: string;
}

/**
 * The shared dialog footer as DialogFooterView renders it, with the given class (DialogButtons' mx_Dialog_buttons by
 * default), its buttons in order and, optionally, what sits at its start.
 */
function footer(buttons: FooterButton[], className = "mx_Dialog_buttons", start = ""): string {
    const html = buttons.map(
        ({ label, classes = "", destructive, disabled, testId }) =>
            `<button type="button" class="button ${destructive ? "destructive" : ""} ${classes}" ` +
            `${disabled ? "disabled" : ""} ${testId ? `data-testid="${testId}"` : ""}>${label}</button>`,
    );
    return `<div class="footer ${className}">${start ? `<div class="start">${start}</div>` : ""}${html.join("")}</div>`;
}

/** DialogButtons: Cancel, then the primary action. */
const FOOTER = footer([
    { label: "Cancel", classes: "cancel" },
    { label: "Create room", classes: "mx_Dialog_primary" },
]);

/** The box of a button's label, as drawn. */
function labelBox(selector: string): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(get(selector));
    return range.getBoundingClientRect();
}

/**
 * Where a footer's last button sits in the dialog: its label's distance from the body's end edge, its box's from the
 * end and bottom edges, and how far the footer's line, as tall as the labels, is under what comes above it. The label
 * is centered in its 36px box (DialogFooterView.test.tsx), so a box 12px from the bottom puts the label as far from the
 * bottom as from the end.
 */
function footerEdges(button: string, above: string, footerSelector = ".mx_Dialog_buttons"): number[] {
    const body = box("[data-testid=body]");
    const buttonBox = box(button);
    return [
        Math.round(body.right - labelBox(button).right),
        body.right - buttonBox.right,
        body.bottom - buttonBox.bottom,
        box(footerSelector).top - box(above).bottom,
    ];
}

/** A footer label 24px from the end and bottom edges and 24px under what is above: the button's box 12px inside. */
const ON_THE_EDGES = [24, 12, 12, 24];

function get(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`nothing matches ${selector}`);
    return element;
}

function box(selector: string): DOMRect {
    return get(selector).getBoundingClientRect();
}

function middle({ top, height }: DOMRect): number {
    return top + height / 2;
}

function colorOf(token: string): string {
    return tokenColor(token, get(".cpd-theme-light"));
}

/** Adds `className` to the dialog's wrapper, as Modal does with the class a dialog is opened with. */
function addWrapperClass(className: string): void {
    get(".mx_Dialog_wrapper").classList.add(className);
}

describe("Dialogs", () => {
    beforeAll(async () => {
        await page.viewport(WINDOW.width, WINDOW.height);
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} }
            /* Compound's pill radius and its form (Root), a column of its fields 20px apart */
            @layer compound-web {
                :root { --cpd-radius-pill-effect: 9999px; }
                .${COMPOUND_FORM} { display: flex; flex-direction: column; gap: var(--cpd-space-5x); }
            }
            @layer shared-components { ${telementTokens} ${dialogFooterStyles} }
            @layer app-web {
                body { margin: 0; }
                ${APP_STYLES.map((styles) => toBrowserCss(styles, commonStyles, fontSizes, lightTheme)).join("\n")}
            }
            /* A placeholder fades in, and a script can't finish a pseudo-element's transitions */
            ::placeholder { transition: none !important; }
        `;
        document.head.append(stylesheet);
        unloadInter = await loadInter();
    });

    afterAll(async () => {
        stylesheet.remove();
        unloadInter();
        await page.viewport(TEST_VIEWPORT.width, TEST_VIEWPORT.height);
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    describe("anatomy", () => {
        function renderForm(): void {
            renderDialog(
                "mx_CreateRoomDialog",
                "Create a private room",
                `<div class="mx_Dialog_content"><p style="margin: 0" data-testid="text">Only invited people can join.</p></div>${FOOTER}`,
            );
        }

        it("puts the title, the content and the footer's labels on a 24px edge", () => {
            renderForm();
            const body = box("[data-testid=body]");

            expect(box(".mx_Dialog_title").left - body.left).toBe(24);
            expect(box("[data-testid=text]").left - body.left).toBe(24);
            expect(footerEdges(".mx_Dialog_primary", ".mx_Dialog_content")).toEqual(ON_THE_EDGES);
        });

        it("draws the footer as text buttons in the accent, Cancel before the action, the last box concentric with the corner", () => {
            renderForm();
            const [cancel, create] = [get(".cancel"), get(".mx_Dialog_primary")];
            const radius = parseFloat(getComputedStyle(get("[data-testid=body]")).borderBottomRightRadius);

            expect(cancel.compareDocumentPosition(create) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            for (const button of [cancel, create]) {
                expect(getComputedStyle(button).color).toBe(colorOf("--cpd-color-text-action-accent"));
                expect(getComputedStyle(button).backgroundColor).toBe("rgba(0, 0, 0, 0)");
            }
            expect(12 + box(".mx_Dialog_primary").height / 2).toBe(radius);
        });

        it("writes the title in Compound's heading-sm, on the close button's line 16px from the top", () => {
            renderForm();
            const body = box("[data-testid=body]");
            const title = box(".mx_Dialog_title");
            const close = box(".mx_Dialog_cancelButton");
            const style = getComputedStyle(get(".mx_Dialog_title"));

            expect([style.fontSize, style.fontWeight]).toEqual(["20px", "600"]);
            expect(title.top - body.top).toBe(16);
            expect(title.height).toBe(28);
            expect([close.width, close.height, close.top - body.top, body.right - close.right]).toEqual([
                28, 28, 16, 16,
            ]);
            expect(middle(title)).toBe(middle(close));
            expect(close.left - title.right).toBe(8);
        });

        it("starts the content 16px under the title and the footer 24px under the content", () => {
            renderForm();

            expect(box(".mx_Dialog_content").top - box(".mx_Dialog_title").bottom).toBe(16);
            expect(box(".mx_Dialog_buttons").top - box(".mx_Dialog_content").bottom).toBe(24);
        });

        it("keeps the footer 24px under content that isn't wrapped in .mx_Dialog_content", () => {
            renderDialog(
                "mx_CreateRoomDialog",
                "Leave room",
                `<p style="margin: 0" data-testid="text">Sure?</p>${FOOTER}`,
            );

            expect(box(".mx_Dialog_buttons").top - box("[data-testid=text]").bottom).toBe(24);
        });

        it("sizes footer buttons to their labels, 8px apart, with no 156px minimum", () => {
            renderForm();
            const cancel = box(".cancel");
            const primary = box(".mx_Dialog_primary");

            expect(cancel.width).toBeLessThan(100);
            expect(primary.width).toBeLessThan(140);
            expect(primary.left - cancel.right).toBe(8);
        });

        it("makes the create room dialog a 480px form", () => {
            renderForm();

            expect(box("[data-testid=body]").width).toBe(480);
        });

        it("makes the unpin all dialog a 400px confirmation, with the shared title on the close button's line", () => {
            renderDialog("mx_UnpinAllDialog", "Unpin all messages?", "", "mx_UnpinAllDialog_title", false);
            const title = box(".mx_Dialog_title");

            expect(box("[data-testid=body]").width).toBe(400);
            expect([title.height, getComputedStyle(get(".mx_Dialog_title")).fontSize]).toEqual([28, "20px"]);
            expect(middle(title)).toBe(middle(box(".mx_Dialog_cancelButton")));
        });
    });

    describe("alerts", () => {
        /** ErrorDialog, its OK button placed straight in the footer rather than in DialogButtons' row. */
        function renderAlert(): void {
            renderDialog(
                "mx_ErrorDialog",
                "Unable to access your microphone",
                `<div class="mx_Dialog_content" id="mx_Dialog_content">
                    <p style="margin: 0" data-testid="text">We were unable to access your microphone. Please check your browser settings and try again.</p>
                </div>
                ${footer([{ label: "OK", classes: "mx_Dialog_primary" }])}`,
            );
        }

        it("are 400px confirmation dialogs, the title on the close button's line and the text on the 24px edge", () => {
            renderAlert();
            const body = box("[data-testid=body]");

            expect(body.width).toBe(400);
            expect(box(".mx_Dialog_title").left - body.left).toBe(24);
            expect(box("[data-testid=text]").left - body.left).toBe(24);
            expect(middle(box(".mx_Dialog_title"))).toBe(middle(box(".mx_Dialog_cancelButton")));
        });

        it("keep their OK button's label 24px from the bottom and end, and 24px under the text", () => {
            renderAlert();

            expect(footerEdges(".mx_Dialog_primary", "[data-testid=text]")).toEqual(ON_THE_EDGES);
        });
    });

    describe("widths", () => {
        it.each([
            { kind: "a confirmation", className: "mx_QuestionDialog", wrapper: "", fixedWidth: true, width: 400 },
            {
                kind: "the confirmation to leave a room",
                className: "mx_QuestionDialog",
                wrapper: "mx_LeaveRoomDialog",
                fixedWidth: true,
                width: 400,
            },
            {
                kind: "the confirmation to remove a message",
                className: "mx_TextInputDialog",
                wrapper: "",
                fixedWidth: true,
                width: 400,
            },
            {
                kind: "the confirmation to remove a member",
                className: "mx_ConfirmUserActionDialog",
                wrapper: "",
                fixedWidth: true,
                width: 400,
            },
            {
                kind: "the confirmation to sign out",
                className: "mx_LogoutDialog",
                wrapper: "",
                fixedWidth: true,
                width: 400,
            },
            {
                kind: "a dialog nobody sized",
                className: "mx_ReportEventDialog",
                wrapper: "",
                fixedWidth: true,
                width: 480,
            },
            {
                kind: "the report of a room",
                className: "mx_ReportRoomDialog",
                wrapper: "",
                fixedWidth: true,
                width: 480,
            },
            { kind: "the export of a chat", className: "mx_ExportDialog", wrapper: "", fixedWidth: true, width: 480 },
            {
                kind: "the deactivation of the account",
                className: "mx_DeactivateAccountDialog",
                wrapper: "",
                fixedWidth: true,
                width: 480,
            },
            {
                kind: "the upgrade of a room",
                className: "mx_RoomUpgradeWarningDialog",
                wrapper: "",
                fixedWidth: false,
                width: 480,
            },
            { kind: "a message's source", className: "mx_ViewSource", wrapper: "", fixedWidth: true, width: 640 },
            {
                kind: "developer tools",
                className: "mx_QuestionDialog",
                wrapper: "mx_DevtoolsDialog_wrapper",
                fixedWidth: true,
                width: 640,
            },
            {
                kind: "a widget's own dialog",
                className: "mx_ModalWidgetDialog",
                wrapper: "",
                fixedWidth: true,
                width: 640,
            },
            {
                kind: "the screen sharing picker",
                className: "mx_desktopCapturerSourcePicker",
                wrapper: "",
                fixedWidth: true,
                width: 640,
            },
            {
                kind: "a message's edits",
                className: "mx_MessageEditHistoryDialog",
                wrapper: "",
                fixedWidth: true,
                width: 640,
            },
            {
                kind: "the rooms to add to a space",
                className: "mx_AddExistingToSpaceDialog",
                wrapper: "mx_AddExistingToSpaceDialog_wrapper",
                fixedWidth: false,
                width: 640,
            },
        ])("makes $kind ($className) $width wide", ({ className, wrapper, fixedWidth, width }) => {
            renderDialog(
                className,
                "Title",
                `<div class="mx_Dialog_content"><p>Text</p></div>${FOOTER}`,
                "",
                fixedWidth,
            );
            if (wrapper) addWrapperClass(wrapper);

            expect(box("[data-testid=body]").width).toBe(width);
        });

        it("makes the link dialog, which has no padding around it, a 480px form too", () => {
            renderDialog("mx_LinkModal", "Create a link", `<form class="mx_LinkModal_content"></form>`);
            addWrapperClass("mx_CompoundDialog");

            expect(box("[data-testid=body]").width).toBe(480);
        });

        it("keeps the search dialog at upstream's width", () => {
            renderDialog("mx_SpotlightDialog", "Search", "");
            expect(box(".mx_SpotlightDialog").width).toBe(704);
        });
    });

    describe("disabled buttons", () => {
        function colorIn(token: string): string {
            return tokenColor(token, get("[data-testid=body]"));
        }

        /** The look of a button as Compound Button draws it while disabled. */
        function look(element: HTMLElement): string[] {
            const style = getComputedStyle(element);
            return [style.color, style.backgroundColor, style.borderTopColor, style.opacity];
        }

        it("draw a filled action, a red one and a submit input in Compound's disabled fill", () => {
            renderDialog(
                "mx_DeactivateAccountDialog",
                "Deactivate account",
                `<input type="submit" class="mx_LegacyDialogButton mx_Dialog_primary" value="Continue" disabled data-testid="input">
                <button class="mx_LegacyDialogButton danger" type="button" disabled data-testid="danger">Leave</button>`,
            );
            const filled = [
                colorIn("--cpd-color-text-disabled"),
                colorIn("--cpd-color-bg-subtle-primary"),
                colorIn("--cpd-color-bg-subtle-primary"),
                "1",
            ];

            expect(look(get("[data-testid=input]"))).toEqual(filled);
            expect(look(get("[data-testid=danger]"))).toEqual(filled);
        });

        it("write a disabled footer button's label in the disabled color, without a fill, red ones included", () => {
            renderDialog(
                "mx_ReportEventDialog",
                "Report content",
                footer([
                    { label: "Cancel", classes: "cancel", disabled: true, testId: "cancel" },
                    { label: "Send report", destructive: true, disabled: true, testId: "action" },
                ]),
            );

            for (const id of ["cancel", "action"]) {
                const style = getComputedStyle(get(`[data-testid=${id}]`));
                expect([style.color, style.backgroundColor]).toEqual([
                    colorIn("--cpd-color-text-disabled"),
                    "rgba(0, 0, 0, 0)",
                ]);
            }
        });
    });

    describe("report dialogs", () => {
        /** Compound's switch row (SettingsToggleInput): the switch, then the label over its help. */
        function switchRow(className: string, label: string, help = ""): string {
            return `
                <div class="${className}" data-testid="option" style="display: flex; gap: 12px">
                    <input type="checkbox" role="switch" id="option">
                    <div><label for="option">${label}</label>${help ? `<span>${help}</span>` : ""}</div>
                </div>
            `;
        }

        /** The reason as Field draws a textarea whose label always sits on its top border. */
        const reasonField = (label: string): string => `
            <div class="mx_Field mx_Field_textarea mx_Field_labelAlwaysTopLeft mx_Field_placeholderIsHint" data-testid="field">
                <textarea id="reason" rows="5" placeholder=""></textarea>
                <label for="reason">${label}</label>
            </div>
        `;

        it("put Report room's help 4px under its field and the switch row 16px under the help", () => {
            renderDialog(
                "mx_ReportRoomDialog",
                "Report room",
                `<form class="${COMPOUND_FORM}">
                    ${reasonField("Describe the reason")}
                    <p class="mx_ReportRoomDialog_help" data-testid="help">Report this chat to your account provider.</p>
                    ${switchRow("mx_ReportRoomDialog_leaveRoom", "Leave room")}
                    ${FOOTER}
                </form>`,
            );
            const help = getComputedStyle(get("[data-testid=help]"));

            expect(box("[data-testid=help]").top - box("[data-testid=field]").bottom).toBe(4);
            expect(box("[data-testid=option]").top - box("[data-testid=help]").bottom).toBe(16);
            expect(box(".mx_Dialog_buttons").top - box("[data-testid=option]").bottom).toBe(24);
            expect([help.fontSize, help.color]).toEqual(["13px", colorOf("--cpd-color-text-secondary")]);
        });

        it("put Report message's field 16px under its text and the switch row 16px under the field", () => {
            renderDialog(
                "mx_ReportEventDialog",
                "Report content to your account provider",
                `<form class="${COMPOUND_FORM} mx_ReportEventDialog">
                    <p data-testid="text">Reporting this message will send its unique 'event ID' to your account provider.</p>
                    ${reasonField("Reason")}
                    ${switchRow("mx_ReportEventDialog_ignoreUser", "Ignore user", "Hide their messages.")}
                </form>
                ${FOOTER}`,
            );

            expect(box("[data-testid=field]").top - box("[data-testid=text]").bottom).toBe(16);
            expect(box("[data-testid=option]").top - box("[data-testid=field]").bottom).toBe(16);
            expect(box(".mx_Dialog_buttons").top - box("[data-testid=option]").bottom).toBe(24);
        });

        it("float both fields' labels onto their top border", () => {
            renderDialog(
                "mx_ReportRoomDialog",
                "Report room",
                `<form class="${COMPOUND_FORM}">${reasonField("Reason")}</form>`,
            );
            const field = box("[data-testid=field]");

            expect(Math.abs(middle(box("[data-testid=field] label")) - (field.top + 0.5))).toBeLessThanOrEqual(0.5);
        });
    });

    describe("text", () => {
        it("is primary in dialogs, labels included, rather than the legacy gray", () => {
            renderDialog(
                "mx_ExportDialog",
                "Export chat",
                `<p data-testid="subtitle">Select from the options below to export chats from your timeline</p>
                <div class="mx_ExportDialog_options">
                    <label data-testid="label"><input type="radio" name="format"> HTML</label>
                </div>`,
            );

            expect(getComputedStyle(get("[data-testid=body]")).color).toBe(colorOf("--cpd-color-text-primary"));
            expect(getComputedStyle(get("[data-testid=label]")).color).toBe(colorOf("--cpd-color-text-primary"));
            // A subtitle is secondary
            expect(getComputedStyle(get("[data-testid=subtitle]")).color).toBe(colorOf("--cpd-color-text-secondary"));
        });

        it("writes a confirmation's body in primary, the leave room one included", () => {
            renderDialog(
                "mx_QuestionDialog",
                "Leave Project 11?",
                `<div class="mx_Dialog_content" data-testid="text">You are the only person here.</div>${FOOTER}`,
            );
            addWrapperClass("mx_LeaveRoomDialog");

            expect(getComputedStyle(get("[data-testid=text]")).color).toBe(colorOf("--cpd-color-text-primary"));
        });

        it("writes the invite dialog's help in secondary", () => {
            renderDialog(
                "mx_InviteDialog_other",
                "Direct messages",
                `<div class="mx_InviteDialog_content">
                    <p class="mx_InviteDialog_helpText" data-testid="help">Start a conversation with someone.</p>
                </div>`,
            );

            expect(getComputedStyle(get("[data-testid=help]")).color).toBe(colorOf("--cpd-color-text-secondary"));
        });
    });

    describe("the footer in every kind of dialog", () => {
        const CANCEL_AND_ACTION = footer([
            { label: "Cancel", classes: "cancel" },
            { label: "Continue", classes: "mx_Dialog_primary", testId: "action" },
        ]);

        it.each([
            { kind: "a widget's permission prompt", className: "mx_WidgetCapabilitiesPromptDialog", wrapper: "" },
            { kind: "the key backup failure", className: "mx_KeyBackupFailedDialog", wrapper: "" },
            { kind: "the registration email prompt", className: "mx_RegistrationEmailPromptDialog", wrapper: "" },
            { kind: "a success dialog", className: "mx_SuccessDialog", wrapper: "" },
        ])("keeps $kind's labels 24px under the content and from the end and bottom", ({ className, wrapper }) => {
            renderDialog(
                className,
                "Title",
                `<div class="mx_Dialog_content"><p style="margin: 0" data-testid="text">Text</p></div>${CANCEL_AND_ACTION}`,
            );
            if (wrapper) addWrapperClass(wrapper);

            expect(footerEdges("[data-testid=action]", ".mx_Dialog_content")).toEqual(ON_THE_EDGES);
        });

        it("keeps developer tools' labels 24px under a tool and from the end and bottom", () => {
            renderDialog(
                "mx_QuestionDialog",
                "Developer tools",
                `<div class="mx_DevTools_content"><p style="margin: 0">Event type</p></div>
                ${footer([{ label: "Back" }, { label: "Send", testId: "action" }])}`,
            );
            addWrapperClass("mx_DevtoolsDialog_wrapper");

            expect(footerEdges("[data-testid=action]", ".mx_DevTools_content")).toEqual(ON_THE_EDGES);
        });

        it("ends Sign out's hero card on the edges, signing out last and in red", () => {
            renderDialog(
                "mx_LogoutDialog",
                "",
                `<div class="mx_EncryptionCard mx_EncryptionCard_noBorder">
                    <div class="mx_EncryptionCard_header"><h2>Set up recovery</h2></div>
                    <div class="mx_EncryptionCard_emphasisedContent" data-testid="text"><p>Without recovery you lose your messages.</p></div>
                    ${footer([
                        { label: "Set up recovery" },
                        { label: "Remove this device anyway", destructive: true, testId: "action" },
                    ])}
                </div>`,
            );

            expect(footerEdges("[data-testid=action]", "[data-testid=text]")).toEqual(ON_THE_EDGES);
            expect(getComputedStyle(get("[data-testid=action]")).color).toBe(
                colorOf("--cpd-color-text-critical-primary"),
            );
        });

        it("draws Turn off key storage's card as the dialog's body, its footer on the edges", () => {
            render(`
                <div class="mx_Dialog_wrapper mx_ConfirmKeyStorageOffDialog">
                    <div class="mx_Dialog_border">
                        <div class="mx_Dialog" data-testid="body">
                            <div class="mx_EncryptionCard">
                                <div class="mx_EncryptionCard_header"><h2>Are you sure you want to keep key storage turned off?</h2></div>
                                <span data-testid="text">If you sign out of all your devices you will lose your message history.</span>
                                ${footer([{ label: "Yes, dismiss" }, { label: "Go to Settings", testId: "action" }])}
                            </div>
                        </div>
                    </div>
                </div>
            `);
            const body = box("[data-testid=body]");

            expect(box("[data-testid=text]").left - body.left).toBe(24);
            expect(footerEdges("[data-testid=action]", "[data-testid=text]")).toEqual(ON_THE_EDGES);
        });

        describe("with a hero card for its body", () => {
            /** A hero card without a border in a dialog, as ResetIdentityDialog and the auth dialog's step draw it. */
            function renderHeroCard(className: string, title: string): void {
                renderDialog(
                    className,
                    title,
                    `<div class="mx_EncryptionCard mx_EncryptionCard_noBorder" data-testid="card">
                        <div class="mx_EncryptionCard_header" data-testid="text"><h2>Reset your digital identity</h2><span>You will lose your history.</span></div>
                        ${footer(
                            [{ label: "Go back" }, { label: "Continue", destructive: true, testId: "action" }],
                            "mx_EncryptionCard_buttons",
                        )}
                    </div>`,
                );
            }

            it.each([
                { step: "resetting the identity", className: "", title: "" },
                {
                    step: "resetting cross-signing in the auth dialog",
                    className: "mx_InteractiveAuthDialog",
                    title: "Setting up keys",
                },
            ])("puts the card and its footer on the edges: $step", ({ className, title }) => {
                renderHeroCard(className, title);

                expect(box("[data-testid=card]").left - box("[data-testid=body]").left).toBe(24);
                expect(footerEdges("[data-testid=action]", "[data-testid=text]", ".mx_EncryptionCard_buttons")).toEqual(
                    ON_THE_EDGES,
                );
            });

            it("starts the auth dialog's card 16px under its title", () => {
                renderHeroCard("mx_InteractiveAuthDialog", "Setting up keys");

                expect(box("[data-testid=card]").top - box(".mx_Dialog_title").bottom).toBe(16);
            });
        });

        describe("in the login flow's card", () => {
            /** CompleteSecurity's card, which holds a step of SetupEncryptionBody. */
            function renderStep(step: string): void {
                render(`
                    <div class="mx_Dialog_border" style="width: fit-content">
                        <div class="mx_CompleteSecurityBody" data-testid="body">
                            <h1 class="mx_CompleteSecurity_header"></h1>
                            <div class="mx_CompleteSecurity_body">${step}</div>
                        </div>
                    </div>
                `);
            }

            it("ends confirming the identity on the edges, the other ways before the best one", () => {
                renderStep(
                    `<div class="mx_EncryptionCard mx_EncryptionCard_noBorder mx_SetupEncryptionBody">
                        <div class="mx_EncryptionCard_header"><h2>Confirm your digital identity</h2></div>
                        <div class="mx_EncryptionCard_emphasisedContent" data-testid="text"><span>Verify this device.</span></div>
                        ${footer(
                            [
                                { label: "Sign out" },
                                { label: "Can't confirm?" },
                                { label: "Use recovery key" },
                                { label: "Use another device", testId: "action" },
                            ],
                            "mx_EncryptionCard_buttons",
                        )}
                    </div>`,
                );

                expect(footerEdges("[data-testid=action]", "[data-testid=text]", ".mx_EncryptionCard_buttons")).toEqual(
                    ON_THE_EDGES,
                );
                // On one line, as the card is 600px wide inside its edges
                expect(box(".mx_EncryptionCard_buttons").height).toBeLessThan(36);
            });

            it("ends a step without a hero card on the edges too", () => {
                renderStep(
                    `<div>
                        <p data-testid="text">Without verifying, you won't have access to all your messages.</p>
                        ${footer([{ label: "Go back" }, { label: "I'll verify later", destructive: true, testId: "action" }])}
                    </div>`,
                );

                expect(footerEdges("[data-testid=action]", "[data-testid=text]")).toEqual(ON_THE_EDGES);
            });
        });

        it("ends Unpin all on the edges, its action in red", () => {
            renderDialog(
                "mx_UnpinAllDialog",
                "Unpin all messages?",
                `<div data-testid="text">This can't be undone.</div>
                ${footer([{ label: "Cancel" }, { label: "Continue", destructive: true, testId: "action" }])}`,
                "mx_UnpinAllDialog_title",
                false,
            );

            expect(footerEdges("[data-testid=action]", "[data-testid=text]")).toEqual(ON_THE_EDGES);
            expect(getComputedStyle(get("[data-testid=action]")).color).toBe(
                colorOf("--cpd-color-text-critical-primary"),
            );
        });

        it("ends Share on the edges, under the social links", () => {
            renderDialog(
                "mx_ShareDialog",
                "Share room",
                `<div class="mx_ShareDialog_content">
                    <div class="mx_ShareDialog_top"><span>https://matrix.to/#/!1:example.org</span></div>
                    <div class="mx_ShareDialog_social" data-testid="text"><a href="#">X</a></div>
                    ${footer([{ label: "Copy link", testId: "action" }], "mx_ShareDialog_footer")}
                </div>`,
                "",
                false,
            );

            expect(footerEdges("[data-testid=action]", "[data-testid=text]", ".mx_ShareDialog_footer")).toEqual(
                ON_THE_EDGES,
            );
            expect(box("[data-testid=action]").width).toBeLessThan(120);
        });

        it("ends the recovery key prompt's form in the footer, Cancel before Continue", () => {
            renderDialog(
                "",
                "",
                `<div class="mx_EncryptionCard mx_AccessSecretStorageDialog">
                    <div class="mx_EncryptionCard_header"><h2>Enter your recovery key</h2></div>
                    <div>
                        <form class="mx_AccessSecretStorageDialog_primaryContainer">
                            <div class="mx_AccessSecretStorageDialog_recoveryKeyEntry" data-testid="text"><input></div>
                            ${footer([{ label: "Cancel" }, { label: "Continue", testId: "action" }])}
                        </form>
                    </div>
                </div>`,
                "",
                false,
            );

            expect(footerEdges("[data-testid=action]", "[data-testid=text]")).toEqual(ON_THE_EDGES);
        });

        it("puts the link dialog's Remove at the footer's start, its label on the start edge", () => {
            render(`
                <div class="mx_Dialog_wrapper mx_CompoundDialog">
                    <div class="mx_Dialog_border">
                        <div class="mx_Dialog" data-testid="body">
                            <div class="mx_LinkModal mx_Dialog_fixedWidth" role="dialog">
                                <div class="mx_Dialog_header"><h1 class="mx_Heading_h3 mx_Dialog_title">Edit link</h1></div>
                                <form class="mx_LinkModal_content">
                                    <div class="mx_Field mx_Field_input mx_LinkModal_Field" data-testid="text"><input id="link"><label for="link">Link</label></div>
                                    <div class="mx_LinkModal_buttons">
                                        ${footer(
                                            [
                                                { label: "Cancel", classes: "cancel" },
                                                { label: "Save", testId: "action" },
                                            ],
                                            "mx_Dialog_buttons",
                                            `<button type="button" class="button destructive" data-testid="remove">Remove</button>`,
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `);
            const body = box("[data-testid=body]");

            expect(Math.round(labelBox("[data-testid=remove]").left - body.left)).toBe(24);
            expect(Math.round(body.right - labelBox("[data-testid=action]").right)).toBe(24);
            expect(body.bottom - box("[data-testid=action]").bottom).toBe(12);
            // On the dialog anatomy's edges, as every dialog is
            expect([box(".mx_Dialog_title").top - body.top, box(".mx_Dialog_title").left - body.left]).toEqual([
                16, 24,
            ]);
            expect(middle(box("[data-testid=remove]"))).toBe(middle(box("[data-testid=action]")));
        });
    });

    describe("deactivating the account", () => {
        /** DeactivateAccountDialog at InteractiveAuth's password stage, which ends in the dialog's footer. */
        function renderDeactivate(): void {
            renderDialog(
                "mx_DeactivateAccountDialog",
                "Deactivate account",
                `<div class="mx_Dialog_content">
                    <p>Confirm that you would like to deactivate your account.</p>
                    <div class="mx_DeactivateAccountDialog_input_section">
                        <div>
                            <p>Confirm your identity by entering your account password below.</p>
                            <form class="mx_InteractiveAuthEntryComponents_passwordSection">
                                <div class="mx_Field mx_Field_input" data-testid="password">
                                    <input id="password" type="password" placeholder="Password">
                                    <label for="password">Password</label>
                                </div>
                                ${footer([
                                    { label: "Cancel", classes: "cancel", testId: "cancel" },
                                    {
                                        label: "Deactivate account",
                                        classes: "mx_Dialog_primary danger",
                                        destructive: true,
                                        testId: "deactivate",
                                    },
                                ])}
                            </form>
                        </div>
                    </div>
                </div>`,
            );
        }

        it("ends in a footer with Cancel, then a red action, its label 24px from the bottom and end", () => {
            renderDeactivate();

            expect(footerEdges("[data-testid=deactivate]", "[data-testid=password]")).toEqual(ON_THE_EDGES);
            expect(box("[data-testid=deactivate]").left - box("[data-testid=cancel]").right).toBe(8);
            expect(getComputedStyle(get("[data-testid=deactivate]")).color).toBe(
                colorOf("--cpd-color-text-critical-primary"),
            );
        });

        it("keeps the password field 300px wide, the footer 24px under it", () => {
            renderDeactivate();

            expect(box("[data-testid=password]").width).toBe(300);
            expect(box(".mx_Dialog_buttons").top - box("[data-testid=password]").bottom).toBe(24);
        });
    });

    describe("create poll", () => {
        /** PollCreateDialog as ScrollableBaseModal draws it, in Modal's wrapper of the class it is opened with. */
        function renderCreatePoll(options = 2): void {
            const rows = Array.from(
                { length: options },
                (_, i) => `
                    <div class="mx_PollCreateDialog_option">
                        <div class="mx_Field mx_Field_input"><input id="option${i}"><label for="option${i}">Option ${i + 1}</label></div>
                    </div>
                `,
            ).join("");
            render(`
                <div class="mx_Dialog_wrapper mx_CompoundDialog">
                    <div class="mx_Dialog_border">
                        <div class="mx_Dialog" data-testid="body">
                            <div class="mx_CompoundDialog mx_ScrollableBaseDialog" role="dialog">
                                <div class="mx_CompoundDialog_header"><h1>Create poll</h1></div>
                                <div class="mx_AccessibleButton mx_CompoundDialog_cancelButton" role="button" aria-label="Close dialog">
                                    <svg viewBox="0 0 24 24"></svg>
                                </div>
                                <form class="mx_CompoundDialog_form">
                                    <div class="mx_CompoundDialog_content">
                                        <div class="mx_PollCreateDialog">
                                            <h2 data-testid="first">Poll type</h2>
                                            <h2>Create options</h2>
                                            ${rows}
                                            <div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_link mx_PollCreateDialog_addOption" role="button" data-testid="last">Add option</div>
                                        </div>
                                    </div>
                                    <div class="mx_CompoundDialog_footer">
                                        ${footer(
                                            [
                                                { label: "Cancel", testId: "cancel" },
                                                { label: "Create poll", testId: "create" },
                                            ],
                                            "",
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        }

        it("is a 480px form with the title in heading-sm on the close button's line, on the 24px edge", () => {
            renderCreatePoll();
            const body = box("[data-testid=body]");
            const title = box(".mx_CompoundDialog_header h1");
            const style = getComputedStyle(get(".mx_CompoundDialog_header h1"));

            expect(body.width).toBe(480);
            expect([style.fontSize, style.fontWeight, title.height]).toEqual(["20px", "600", 28]);
            expect([title.top - body.top, title.left - body.left]).toEqual([16, 24]);
            expect(middle(title)).toBe(middle(box(".mx_CompoundDialog_cancelButton")));
            expect(box(".mx_CompoundDialog_cancelButton").left - title.right).toBe(8);
        });

        it("starts the content 16px under the title on the 24px edge", () => {
            renderCreatePoll();
            const body = box("[data-testid=body]");

            expect(box("[data-testid=first]").top - box(".mx_CompoundDialog_header h1").bottom).toBe(16);
            expect(box("[data-testid=first]").left - body.left).toBe(24);
        });

        it("puts Cancel and Create poll 8px apart, their labels 24px under the footer's edge and from the end and bottom", () => {
            renderCreatePoll();
            const create = box("[data-testid=create]");

            expect(create.left - box("[data-testid=cancel]").right).toBe(8);
            // The footer's line sits 24px under the edge it draws its shadow on, as under the content elsewhere
            expect(footerEdges("[data-testid=create]", ".mx_CompoundDialog_content", ".footer")).toEqual(ON_THE_EDGES);
        });

        it("is as tall as its content, and past the window's height scrolls it between the title and the footer", () => {
            renderCreatePoll();
            expect(box("[data-testid=body]").height).toBeLessThan(400);
            document.body.innerHTML = "";

            renderCreatePoll(30);
            const body = box("[data-testid=body]");
            const content = get(".mx_CompoundDialog_content");

            expect(body.bottom).toBeLessThanOrEqual(WINDOW.height);
            expect(content.scrollHeight).toBeGreaterThan(content.clientHeight);
            expect(body.bottom - box("[data-testid=create]").bottom).toBe(12);
        });
    });

    describe("leave space", () => {
        /** LeaveSpaceDialog, in Modal's wrapper of the class it is opened with, with the note for a space's only admin. */
        function renderLeaveSpace(): void {
            renderDialog(
                "mx_LeaveSpaceDialog",
                "Leave Studio",
                `<div class="mx_Dialog_content" id="mx_LeaveSpaceDialog">
                    <p data-testid="text">You are about to leave <strong>Studio</strong>. Would you like to leave the rooms in this space?</p>
                    <div class="mx_SpaceChildrenPicker" data-testid="picker" style="height: 100px"></div>
                    <div class="mx_LeaveSpaceDialog_section_warning" data-testid="note">
                        <svg viewBox="0 0 24 24" data-testid="icon"></svg>You're the only admin of this space. Leaving it will mean no one has control over it.
                    </div>
                </div>
                ${footer([
                    { label: "Cancel", classes: "cancel" },
                    { label: "Leave space", classes: "mx_Dialog_primary danger", destructive: true, testId: "leave" },
                ])}`,
                "",
                false,
            );
            addWrapperClass("mx_LeaveSpaceDialog_wrapper");
        }

        it("is a 480px form on the shared anatomy: the title on the close button's line, all on the 24px edge", () => {
            renderLeaveSpace();
            const body = box("[data-testid=body]");
            const title = box(".mx_Dialog_title");

            expect(body.width).toBe(480);
            expect([title.top - body.top, title.left - body.left]).toEqual([16, 24]);
            expect(middle(title)).toBe(middle(box(".mx_Dialog_cancelButton")));
            expect(box("[data-testid=text]").left - body.left).toBe(24);
            expect(box("[data-testid=text]").top - title.bottom).toBe(16);
        });

        it("is as tall as its content, its footer's labels 24px under the note and 24px from the bottom and end", () => {
            renderLeaveSpace();

            expect(footerEdges("[data-testid=leave]", "[data-testid=note]")).toEqual(ON_THE_EDGES);
        });

        it("writes the note in 13px, its icon on the first line and the lines after it indented past the icon", () => {
            renderLeaveSpace();
            const note = get("[data-testid=note]");
            const style = getComputedStyle(note);
            const icon = box("[data-testid=icon]");
            const range = document.createRange();
            range.selectNodeContents(note.lastChild!);
            const lines = [...range.getClientRects()];
            const firstLineMiddle =
                note.getBoundingClientRect().top + parseFloat(style.paddingTop) + parseFloat(style.lineHeight) / 2;

            expect(style.fontSize).toBe("13px");
            expect(lines.length).toBeGreaterThan(1);
            expect(new Set(lines.map(({ left }) => left)).size).toBe(1);
            expect(lines[0].left).toBeGreaterThan(icon.right);
            expect(middle(icon)).toBe(firstLineMiddle);
        });
    });

    describe("add existing rooms", () => {
        /**
         * AddExistingToSpaceDialog's list of rooms, each row an Entry with its avatar, name and checkbox. StyledCheckbox
         * puts the checkbox in Compound's inline field, a row with a 12px gap before its label's column, which a
         * checkbox without a label leaves empty.
         */
        function renderAddExisting(): void {
            const rows = ["Project 10", "Project 05"]
                .map(
                    (name) => `
                        <li class="mx_AddExistingToSpace_entry" data-testid="row">
                            <span class="mx_DecoratedRoomAvatar"><span class="mx_BaseAvatar" style="display: block; width: 36px; height: 36px" data-testid="avatar"></span></span>
                            <span class="mx_AddExistingToSpace_entry_name">${name}</span>
                            <form>
                                <div style="display: flex; gap: 12px">
                                    <div><span style="display: block; width: 20px; height: 20px" data-testid="checkbox"></span></div>
                                    <div style="flex: 1"></div>
                                </div>
                            </form>
                        </li>
                    `,
                )
                .join("");
            renderDialog(
                "mx_AddExistingToSpaceDialog",
                "Add existing rooms",
                `<div class="mx_AddExistingToSpace">
                    <div class="mx_AutoHideScrollbar mx_AddExistingToSpace_content">
                        <div class="mx_AddExistingToSpace_section">
                            <h3 data-testid="heading">Rooms</h3>
                            <ul>${rows}</ul>
                        </div>
                    </div>
                </div>`,
                "",
                false,
            );
            addWrapperClass("mx_AddExistingToSpaceDialog_wrapper");
        }

        it("lists the rooms in the Forward dialog's 52px rows, the avatar and checkbox on the 24px edge", () => {
            renderAddExisting();
            const body = box("[data-testid=body]");
            const [first, second] = [...document.querySelectorAll("[data-testid=row]")].map((row) =>
                row.getBoundingClientRect(),
            );

            expect([first.height, second.top - first.top]).toEqual([52, 52]);
            expect(box("[data-testid=avatar]").left - body.left).toBe(24);
            expect(body.right - box("[data-testid=checkbox]").right).toBe(24);
            expect(box("[data-testid=heading]").left - body.left).toBe(24);
        });

        it("highlights a hovered row on an 8px plate reaching 8px past the content edge", async () => {
            renderAddExisting();
            const body = box("[data-testid=body]");
            const row = get("[data-testid=row]");
            await userEvent.hover(row);

            expect([
                row.getBoundingClientRect().left - body.left,
                body.right - row.getBoundingClientRect().right,
            ]).toEqual([16, 16]);
            expect(getComputedStyle(row).borderRadius).toBe("8px");
            expect(getComputedStyle(row).backgroundColor).toBe(colorOf("--cpd-color-bg-action-secondary-hovered"));
        });
    });

    describe("view source", () => {
        function renderViewSource(): void {
            renderDialog(
                "mx_ViewSource",
                "View source",
                `<div class="mx_ViewSource_header">Event ID: $event</div>
                <div class="mx_ViewSource_heading" data-testid="heading">Original event source</div>
                <span class="mx_CopyableText mx_CopyableText_border" data-testid="source">
                    <pre><code>{\n  "content": {\n    "body": "Hello"\n  },\n  "type": "m.room.message"\n}</code></pre>
                    <button class="mx_CopyableText_copyButton" style="width: 28px; height: 28px; padding: 4px; border: 0; line-height: 0" data-testid="copy"><svg viewBox="0 0 24 24"></svg></button>
                </span>`,
            );
        }

        it("labels the source like a settings group: 13px secondary, 8px above it", () => {
            renderViewSource();
            const heading = getComputedStyle(get("[data-testid=heading]"));

            expect([heading.fontSize, heading.fontWeight]).toEqual(["13px", "400"]);
            expect(heading.color).toBe(colorOf("--cpd-color-text-secondary"));
            expect(box("[data-testid=source]").top - box("[data-testid=heading]").bottom).toBe(8);
        });

        it("keeps the copy button 4px from the top and end of the source, as on a one-line field", () => {
            renderViewSource();
            const source = box("[data-testid=source]");
            const copy = box("[data-testid=copy]");

            expect(source.height).toBeGreaterThan(100);
            expect([copy.top - source.top, source.right - copy.right]).toEqual([4, 4]);
        });
    });

    describe("polls", () => {
        /** PollHistoryDialog: the list of active polls under the dialog's title, one row per poll. */
        function renderPolls(): void {
            renderDialog(
                "mx_PollHistoryDialog",
                "Polls",
                `<div class="mx_PollHistory_content">
                    <div class="mx_PollHistoryList" data-testid="list">
                        <fieldset class="mx_FilterTabGroup" data-testid="filter">
                            <label data-testid="active">
                                <input type="radio" name="PollHistory_filter" value="ACTIVE" checked /><span>Active polls</span>
                            </label>
                            <label data-testid="past">
                                <input type="radio" name="PollHistory_filter" value="ENDED" /><span>Past polls</span>
                            </label>
                        </fieldset>
                        <ol class="mx_PollHistoryList_list" data-testid="polls">
                            <li class="mx_PollListItem">
                                <div class="mx_PollListItem_content">
                                    <span>11/20/26</span>
                                    <svg class="mx_PollListItem_icon" viewBox="0 0 24 24" data-testid="icon"></svg>
                                    <span class="mx_PollListItem_question">Which accent for your own bubbles?</span>
                                </div>
                            </li>
                        </ol>
                    </div>
                </div>`,
            );
        }

        it("is a 640px list dialog with its list 16px under the title", () => {
            renderPolls();

            expect(box("[data-testid=body]").width).toBe(640);
            expect(box("[data-testid=list]").top - box(".mx_Dialog_title").bottom).toBe(16);
        });

        it("filters with the room list's 28px chips 8px apart, the selected one filled, 20px above the polls", () => {
            renderPolls();
            const [active, past] = ["active", "past"].map((id) => getComputedStyle(get(`[data-testid=${id}] span`)));

            for (const chip of ["active", "past"]) {
                expect(box(`[data-testid=${chip}]`).height).toBe(28);
                expect(box(`[data-testid=${chip}] span`).height).toBe(28);
            }
            expect(box("[data-testid=active]").left - box("[data-testid=body]").left).toBe(24);
            expect(box("[data-testid=past]").left - box("[data-testid=active]").right).toBe(8);
            expect(box("[data-testid=polls]").top - box("[data-testid=filter]").bottom).toBe(20);
            expect(active.borderTopLeftRadius).toBe(past.borderTopLeftRadius);
            expect(parseFloat(past.borderTopLeftRadius)).toBeGreaterThanOrEqual(14);
            expect([past.fontSize, past.fontWeight, active.fontWeight]).toEqual(["13px", "500", "500"]);
            expect(past.borderTopColor).toBe(colorOf("--cpd-color-border-interactive-secondary"));
            expect(past.backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect(past.color).toBe(colorOf("--cpd-color-text-primary"));
            expect(active.backgroundColor).toBe(colorOf("--cpd-color-bg-action-primary-rest"));
            expect(active.color).toBe(colorOf("--cpd-color-text-on-solid-primary"));
            expect(active.boxShadow).toBe("none");
        });

        it("deepens a filter chip while it is pointed at, the selected one too", async () => {
            renderPolls();

            await userEvent.hover(get("[data-testid=past]"));
            expect(getComputedStyle(get("[data-testid=past] span")).backgroundColor).toBe(
                colorOf("--cpd-color-bg-subtle-primary"),
            );

            await userEvent.hover(get("[data-testid=active]"));
            expect(getComputedStyle(get("[data-testid=active] span")).backgroundColor).toBe(
                colorOf("--cpd-color-bg-action-primary-hovered"),
            );
        });

        it("rings the chip whose filter has the keyboard focus", async () => {
            renderPolls();

            get("[data-testid=active] input").focus();
            await userEvent.keyboard("{ArrowRight}");
            const past = getComputedStyle(get("[data-testid=past] span"));

            expect(get("[data-testid=past] input").matches(":focus-visible")).toBe(true);
            expect([past.outlineStyle, past.outlineWidth, past.outlineOffset]).toEqual(["solid", "2px", "1px"]);
        });

        it("marks each poll with a 16px icon in the secondary icon color", () => {
            renderPolls();
            const icon = getComputedStyle(get("[data-testid=icon]"));

            expect([icon.width, icon.height]).toEqual(["16px", "16px"]);
            expect(icon.color).toBe(colorOf("--cpd-color-icon-secondary"));
        });
    });

    describe("space dialogs titled with their space", () => {
        /** SubspaceSelector in BaseDialog's title, as Create a space (CreateSubspaceDialog) and Add existing rooms draw it. */
        function renderSpaceDialog(className: string, title: string): void {
            renderDialog(
                className,
                `<div class="mx_SubspaceSelector">
                    <span class="mx_BaseAvatar" style="display: inline-block; width: 40px; height: 40px"></span>
                    <div>
                        <h1 data-testid="title">${title}</h1>
                        <div class="mx_SubspaceSelector_onlySpace" data-testid="space">Studio</div>
                    </div>
                </div>`,
                `<div class="mx_Dialog_content"></div>`,
                "",
                false,
            );
        }

        it.each([
            ["mx_CreateSubspaceDialog", "Create a space"],
            ["mx_AddExistingToSpaceDialog", "Add existing rooms"],
        ])(
            "titles %s in Compound's heading-sm on the close button's line, the avatar on the 24px edge",
            (className, title) => {
                renderSpaceDialog(className, title);
                const body = box("[data-testid=body]");
                const heading = box("[data-testid=title]");
                const style = getComputedStyle(get("[data-testid=title]"));
                const space = getComputedStyle(get("[data-testid=space]"));

                expect([style.fontSize, style.fontWeight, style.lineHeight]).toEqual(["20px", "600", "28px"]);
                expect(heading.top - body.top).toBe(16);
                expect(middle(heading)).toBe(middle(box(".mx_Dialog_cancelButton")));
                expect(box(".mx_BaseAvatar").left - body.left).toBe(24);
                expect(heading.left - box(".mx_BaseAvatar").right).toBe(16);
                expect([space.fontSize, space.fontWeight]).toEqual(["15px", "400"]);
            },
        );

        it("writes their section headings, links and footer prompts in 13px rather than 12px", () => {
            render(`
                <div class="mx_AddExistingToSpace">
                    <div class="mx_AddExistingToSpace_section">
                        <h3 data-testid="section">Rooms</h3>
                        <div class="mx_AccessibleButton mx_AccessibleButton_kind_link" data-testid="more">Show more</div>
                    </div>
                    <div class="mx_AddExistingToSpace_footer"><span data-testid="add-footer">Want to add a new room instead?</span></div>
                </div>
                <div class="mx_CreateSubspaceDialog">
                    <div class="mx_CreateSubspaceDialog_footer">
                        <div class="mx_CreateSubspaceDialog_footer_prompt" data-testid="create-footer">Want to add an existing space instead?</div>
                    </div>
                </div>
            `);
            const sizes = ["section", "more", "add-footer", "create-footer"].map((id) => {
                const { fontSize, lineHeight } = getComputedStyle(get(`[data-testid=${id}]`));
                return [fontSize, lineHeight];
            });

            expect(sizes).toEqual(Array.from({ length: 4 }, () => ["13px", "19.5px"]));
        });
    });

    describe("fields", () => {
        /** A Field as Field.tsx renders it, the placeholder defaulted to the label. */
        function field(label: string, placeholder: string, className: string): string {
            return `
                <div class="mx_Field mx_Field_input ${className}">
                    <input id="${label}" type="text" placeholder="${placeholder}" value="">
                    <label for="${label}">${label}</label>
                </div>
            `;
        }

        async function placeholderColorOnFocus(id: string): Promise<string> {
            const input = get(`[id="${id}"]`) as HTMLInputElement;
            await userEvent.click(input);
            return getComputedStyle(input, "::placeholder").color;
        }

        it("shows no placeholder repeating the label that floated onto the border of an empty focused field", async () => {
            renderDialog(
                "mx_CreateRoomDialog",
                "Create a private room",
                `<div class="mx_Dialog_content">
                    ${field("Name", "Name", "mx_Field_placeholderIsLabel")}
                    ${field("Topic", "What the room is about", "")}
                </div>`,
            );

            expect(await placeholderColorOnFocus("Name")).toBe("rgba(0, 0, 0, 0)");
            // A placeholder of its own is a hint, and shows under the floated label
            expect(await placeholderColorOnFocus("Topic")).not.toBe("rgba(0, 0, 0, 0)");
        });

        it("draws the field of a text input dialog, such as Remove message's reason, as every 36px field", () => {
            renderDialog(
                "mx_TextInputDialog",
                "Confirm removal",
                `<div class="mx_Dialog_content">
                    ${field("Reason (optional)", "Reason (optional)", "mx_TextInputDialog_input")}
                    ${field("Other", "Other", "")}
                </div>`,
            );
            const [reason, other] = [...document.querySelectorAll(".mx_Field")].map((element) =>
                element.getBoundingClientRect(),
            );

            expect(reason.height).toBe(36);
            expect([reason.left, reason.width]).toEqual([other.left, other.width]);
        });

        it("spans the room address over the create room dialog, as the fields above it", () => {
            renderDialog(
                "mx_CreateRoomDialog",
                "Create a public room",
                `<div class="mx_Dialog_content">
                    ${field("Name", "Name", "")}
                    <div class="mx_CreateRoomDialog_aliasContainer">
                        <div class="mx_Field mx_Field_input mx_RoomAliasField mx_Field_labelAlwaysTopLeft">
                            <span class="mx_Field_prefix">#</span>
                            <input id="alias" type="text" placeholder="e.g. my-room">
                            <label for="alias">Room address</label>
                            <span class="mx_Field_postfix" data-testid="postfix">:localhost</span>
                        </div>
                    </div>
                </div>`,
            );
            const name = box(".mx_Field:not(.mx_RoomAliasField)");
            const address = box(".mx_RoomAliasField");

            expect([address.left, address.width]).toEqual([name.left, name.width]);
            expect(box("[data-testid=postfix]").right).toBe(address.right - 1);
        });
    });

    describe("invite dialog", () => {
        /**
         * InviteDialog's main tab for a DM: with a suggestions section, without one, or sending the invites, when its
         * progress takes the place of the suggestions and the footer.
         */
        function renderInvite(state: "suggestions" | "noSuggestions" | "sending"): void {
            const section = `
                <div class="mx_InviteDialog_section" data-testid="section">
                    <div data-testid="list" style="display: flex; flex-direction: column"></div>
                </div>
            `;
            const suggestions = `
                <div class="mx_InviteDialog_userSections" data-testid="sections">
                    ${state === "suggestions" ? section : ""}
                    <div class="mx_InviteDialog_section_hidden_suggestions_disclaimer">
                        <span data-testid="disclaimer">Some suggestions may be hidden for privacy.</span>
                    </div>
                </div>
                <div class="mx_InviteDialog_footer">
                    <h3>Or send invite link</h3>
                </div>
            `;
            renderDialog(
                "mx_InviteDialog_other",
                "Direct Messages",
                `<div class="mx_InviteDialog_content">
                    <p class="mx_InviteDialog_helpText" data-testid="help">Start a conversation with someone.</p>
                    ${state === "sending" ? `<div class="mx_InviteProgressBody">Preparing invitations…</div>` : suggestions}
                </div>`,
            );
            get(".mx_Dialog_wrapper").classList.add("mx_InviteDialog_flexWrapper");
        }

        it("is a 640px list dialog", () => {
            renderInvite("suggestions");

            expect(box("[data-testid=body]").width).toBe(640);
        });

        it("keeps its 600px body while it suggests people, and shrinks to its content when it has none", () => {
            renderInvite("suggestions");
            expect(box(".mx_InviteDialog_other").height).toBe(600);
            document.body.innerHTML = "";

            renderInvite("noSuggestions");
            expect(box(".mx_InviteDialog_other").height).toBeLessThan(300);
        });

        it("keeps its 600px body while it sends the invites, rather than collapsing around the progress", () => {
            renderInvite("sending");

            expect(box(".mx_InviteDialog_other").height).toBe(600);
        });

        it("reaches 8px past the content edge with the suggestions, whose rows keep their content on it", () => {
            renderInvite("suggestions");
            const body = box("[data-testid=body]");

            expect(box("[data-testid=help]").left - body.left).toBe(24);
            expect(box("[data-testid=list]").left - body.left).toBe(16);
            expect(body.right - box("[data-testid=list]").right).toBe(16);
            expect(box("[data-testid=disclaimer]").left - body.left).toBe(24);
        });

        it("heads the invite link like the suggestions, with the one divider color above it", () => {
            renderInvite("suggestions");
            const heading = getComputedStyle(get(".mx_InviteDialog_footer > h3"));
            const footer = getComputedStyle(get(".mx_InviteDialog_footer"));

            // Compound's body-sm
            expect([heading.fontSize, heading.fontWeight, heading.textTransform]).toEqual(["13px", "600", "none"]);
            expect(heading.color).toBe(colorOf("--cpd-color-text-secondary"));
            expect(footer.borderTopColor).toBe(colorOf("--cpd-color-separator-primary"));
        });
    });

    describe("settings dialogs", () => {
        /** UserSettingsDialog with TabbedView, the first tab selected, holding a SettingsTab of `sections`. */
        function renderSettings(sections: string): void {
            const tabs = ["Account", "Sessions", "Appearance"]
                .map(
                    (name, index) => `
                        <li class="mx_AccessibleButton mx_TabbedView_tabLabel ${index === 0 ? "mx_TabbedView_tabLabel_active" : ""}" role="tab">
                            <svg viewBox="0 0 24 24"></svg>
                            <span class="mx_TabbedView_tabLabel_text">${name}</span>
                        </li>
                    `,
                )
                .join("");
            renderDialog(
                "mx_UserSettingsDialog",
                `<span class="mx_UserSettingsDialog_title_strong">Settings:</span> Account`,
                `<div class="mx_SettingsDialog_content">
                    <div class="mx_TabbedView mx_TabbedView_tabsOnLeft mx_TabbedView_responsive">
                        <ul class="mx_TabbedView_tabLabels" role="tablist">${tabs}</ul>
                        <div class="mx_TabbedView_tabPanel" role="tabpanel">
                            <div class="mx_AutoHideScrollbar mx_TabbedView_tabPanelContent">
                                <div class="mx_SettingsTab"><div class="mx_SettingsTab_sections">${sections}</div></div>
                            </div>
                        </div>
                    </div>
                </div>`,
                "mx_UserSettingsDialog_title",
            );
        }

        /** A legacy SettingsSection: its heading as a size 3 Heading, when it has one, over its subsections. */
        function section(testId: string, heading?: string): string {
            return `
                <div class="mx_SettingsSection" data-testid="${testId}">
                    ${heading ? `<h2 class="mx_Heading_h3">${heading}</h2>` : ""}
                    <div class="mx_SettingsSection_subSections">
                        <div class="mx_SettingsSubsection" style="height: 40px"></div>
                    </div>
                </div>
            `;
        }

        function firstTab(): DOMRect {
            return box(".mx_TabbedView_tabLabel");
        }

        it("is a 980px tabbed dialog with the title in heading-sm, only the tab's name in regular weight", () => {
            renderSettings(section("profile", "Profile"));
            const title = getComputedStyle(get(".mx_Dialog_title"));

            expect(getComputedStyle(get(".mx_UserSettingsDialog")).maxWidth).toBe("932px");
            expect(box("[data-testid=body]").width).toBe(980);
            expect([title.fontSize, title.fontWeight]).toEqual(["20px", "400"]);
            expect(getComputedStyle(get(".mx_UserSettingsDialog_title_strong")).fontWeight).toBe("600");
            expect(middle(box(".mx_Dialog_title"))).toBe(middle(box(".mx_Dialog_cancelButton")));
        });

        it("titles the room settings dialog the same way, the room's name in semibold before the tab's in regular", () => {
            renderDialog(
                "mx_RoomSettingsDialog",
                `<span class="mx_RoomSettingsDialog_title_strong">Design team:</span> General`,
                "",
                "mx_RoomSettingsDialog_title",
            );
            const title = getComputedStyle(get(".mx_Dialog_title"));

            expect([title.fontSize, title.fontWeight]).toEqual(["20px", "400"]);
            expect(getComputedStyle(get(".mx_RoomSettingsDialog_title_strong")).fontWeight).toBe("600");
        });

        it("starts the tabs 16px under the title, their icons on its edge", () => {
            renderSettings(section("profile", "Profile"));
            const title = box(".mx_Dialog_title");

            expect(firstTab().top - title.bottom).toBe(16);
            expect(box(".mx_TabbedView_tabLabel svg").left).toBe(title.left);
        });

        it("keeps the tabs 16px under the title when a larger font makes its line taller than the close button", () => {
            // One of the larger sizes the font size setting puts on the root, which Compound's rem sizes follow
            document.documentElement.style.fontSize = "24px";
            try {
                renderSettings(section("profile", "Profile"));
                const title = box(".mx_Dialog_title");

                expect(title.height).toBeGreaterThan(box(".mx_Dialog_cancelButton").height);
                expect(firstTab().top - title.bottom).toBe(16);
            } finally {
                document.documentElement.style.fontSize = "";
            }
        });

        it("ends the content on the dialog's 24px edge", () => {
            renderSettings(section("profile", "Profile"));

            expect(box("[data-testid=body]").right - box("[data-testid=profile]").right).toBe(24);
        });

        it("starts the tab's pane where the tabs start, and its first line 16px into it, with or without a heading", () => {
            renderSettings(section("profile", "Profile"));
            expect(box(".mx_TabbedView_tabPanel").top).toBe(firstTab().top);
            expect(box("[data-testid=profile] .mx_Heading_h3").top - box(".mx_TabbedView_tabPanel").top).toBe(16);
            document.body.innerHTML = "";

            renderSettings(section("headingless"));
            expect(
                box("[data-testid=headingless] .mx_SettingsSubsection").top - box(".mx_TabbedView_tabPanel").top,
            ).toBe(16);
        });

        it("keeps a heading's subsections 8px under its label and sections 24px apart, as Telegram's groups", () => {
            renderSettings(section("profile", "Profile") + section("account", "Account"));

            expect(
                box("[data-testid=profile] .mx_SettingsSubsection").top -
                    box("[data-testid=profile] .mx_Heading_h3").bottom,
            ).toBe(8);
            expect(
                box("[data-testid=account] .mx_Heading_h3").top -
                    box("[data-testid=profile] .mx_SettingsSubsection").bottom,
            ).toBe(24);
        });

        it("spaces the room profile's Cancel and Save like a footer, 16px under the topic", () => {
            renderSettings(`
                <form class="mx_RoomProfileSettings">
                    <div class="mx_RoomProfileSettings_profile">
                        <div class="mx_RoomProfileSettings_profile_controls">
                            <div class="mx_Field mx_Field_textarea mx_RoomProfileSettings_profile_controls_topic" data-testid="topic">
                                <textarea id="topic" placeholder="Room Topic"></textarea><label for="topic">Room Topic</label>
                            </div>
                        </div>
                    </div>
                    <div class="mx_RoomProfileSettings_buttons">
                        <div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary_outline" role="button">Cancel</div>
                        <div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary" role="button">Save</div>
                    </div>
                </form>
            `);
            const [cancel, save] = [...document.querySelectorAll(".mx_RoomProfileSettings_buttons > *")].map((button) =>
                button.getBoundingClientRect(),
            );

            expect(save.left - cancel.right).toBe(8);
            expect(cancel.top - box("[data-testid=topic]").bottom).toBe(16);
        });
    });

    describe("space pill buttons", () => {
        it("are bordered like fields rather than in the old input gray", () => {
            render(`<div class="mx_AccessibleButton mx_SpacePillButton" role="button">Public</div>`);

            expect(getComputedStyle(get(".mx_SpacePillButton")).borderTopColor).toBe(
                colorOf("--cpd-color-border-interactive-secondary"),
            );
        });

        it("title the choice in 15px semibold, on Compound's type scale", () => {
            render(
                `<div class="mx_AccessibleButton mx_SpacePillButton" role="button">Public<div>Open space for anyone</div></div>`,
            );
            const pill = getComputedStyle(get(".mx_SpacePillButton"));

            expect([pill.fontSize, pill.fontWeight]).toEqual(["15px", "600"]);
        });
    });
});
