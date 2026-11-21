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
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import spacePillButtonStyles from "../../res/css/structures/_SpacePillButton.pcss?raw";
import tabbedViewStyles from "../../res/css/structures/_TabbedView.pcss?raw";
import addExistingToSpaceDialogStyles from "../../res/css/views/dialogs/_AddExistingToSpaceDialog.pcss?raw";
import compoundDialogStyles from "../../res/css/views/dialogs/_CompoundDialog.pcss?raw";
import createRoomDialogStyles from "../../res/css/views/dialogs/_CreateRoomDialog.pcss?raw";
import createSubspaceDialogStyles from "../../res/css/views/dialogs/_CreateSubspaceDialog.pcss?raw";
import exportDialogStyles from "../../res/css/views/dialogs/_ExportDialog.pcss?raw";
import inviteDialogStyles from "../../res/css/views/dialogs/_InviteDialog.pcss?raw";
import leaveRoomDialogStyles from "../../res/css/views/dialogs/_LeaveRoomDialog.pcss?raw";
import logoutDialogStyles from "../../res/css/views/dialogs/_LogoutDialog.pcss?raw";
import roomSettingsDialogStyles from "../../res/css/views/dialogs/_RoomSettingsDialog.pcss?raw";
import roomUpgradeWarningDialogStyles from "../../res/css/views/dialogs/_RoomUpgradeWarningDialog.pcss?raw";
import settingsDialogStyles from "../../res/css/views/dialogs/_SettingsDialog.pcss?raw";
import unpinAllDialogStyles from "../../res/css/views/dialogs/_UnpinAllDialog.pcss?raw";
import userSettingsDialogStyles from "../../res/css/views/dialogs/_UserSettingsDialog.pcss?raw";
import accessibleButtonStyles from "../../res/css/views/elements/_AccessibleButton.pcss?raw";
import fieldStyles from "../../res/css/views/elements/_Field.pcss?raw";
import linkModalStyles from "../../res/css/views/rooms/wysiwyg_composer/components/_LinkModal.pcss?raw";
import roomProfileSettingsStyles from "../../res/css/views/settings/_RoomProfileSettings.pcss?raw";
import settingsSectionStyles from "../../res/css/views/settings/tabs/_SettingsSection.pcss?raw";
import settingsTabStyles from "../../res/css/views/settings/tabs/_SettingsTab.pcss?raw";
import headingStyles from "../../res/css/views/typography/_Heading.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";
import { loadInter } from "../test/telement/fonts";

/** In the order _components.pcss imports them, Heading's last, as BaseDialog's title has to win over it. */
const APP_STYLES = [
    commonStyles,
    spacePillButtonStyles,
    tabbedViewStyles,
    addExistingToSpaceDialogStyles,
    compoundDialogStyles,
    createRoomDialogStyles,
    createSubspaceDialogStyles,
    exportDialogStyles,
    inviteDialogStyles,
    leaveRoomDialogStyles,
    logoutDialogStyles,
    roomSettingsDialogStyles,
    roomUpgradeWarningDialogStyles,
    settingsDialogStyles,
    unpinAllDialogStyles,
    userSettingsDialogStyles,
    accessibleButtonStyles,
    fieldStyles,
    linkModalStyles,
    roomProfileSettingsStyles,
    settingsSectionStyles,
    settingsTabStyles,
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

/** DialogButtons: Cancel, then the primary action. */
const FOOTER = `
    <div class="mx_Dialog_buttons">
        <span class="mx_Dialog_buttons_row">
            <button class="mx_LegacyDialogButton cancel" type="button">Cancel</button>
            <button class="mx_LegacyDialogButton mx_Dialog_primary" type="button">Create room</button>
        </span>
    </div>
`;

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
            @layer compound-tokens, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} }
            @layer shared-components { ${telementTokens} }
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

        it("puts the title, the content and the footer on a 24px edge", () => {
            renderForm();
            const body = box("[data-testid=body]");

            expect(box(".mx_Dialog_title").left - body.left).toBe(24);
            expect(box("[data-testid=text]").left - body.left).toBe(24);
            expect(body.right - box(".mx_Dialog_primary").right).toBe(24);
            expect(body.bottom - box(".mx_Dialog_primary").bottom).toBe(24);
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
            const cancel = box(".mx_LegacyDialogButton.cancel");
            const primary = box(".mx_Dialog_primary");

            expect(cancel.width).toBeLessThan(100);
            expect(primary.width).toBeLessThan(140);
            expect(primary.left - cancel.right).toBe(8);
        });

        it("makes the create room dialog a 480px form", () => {
            renderForm();

            expect(box("[data-testid=body]").width).toBe(480);
        });

        it("keeps the unpin all dialog 396px wide, with the shared title on the close button's line", () => {
            renderDialog("mx_UnpinAllDialog", "Unpin all messages?", "", "mx_UnpinAllDialog_title", false);
            const title = box(".mx_Dialog_title");

            expect(box("[data-testid=body]").width).toBe(396);
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
                <div class="mx_Dialog_buttons">
                    <button class="mx_LegacyDialogButton mx_Dialog_primary" type="button">OK</button>
                </div>`,
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

        it("keep their OK button 24px from the bottom and end, and 24px under the text", () => {
            renderAlert();
            const body = box("[data-testid=body]");
            const ok = box(".mx_Dialog_primary");

            expect([body.right - ok.right, body.bottom - ok.bottom]).toEqual([24, 24]);
            expect(ok.top - box("[data-testid=text]").bottom).toBe(24);
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

        it("keeps the search dialog and developer tools at upstream's width", () => {
            renderDialog("mx_SpotlightDialog", "Search", "");
            expect(box(".mx_SpotlightDialog").width).toBe(704);
            document.body.innerHTML = "";

            renderDialog("mx_QuestionDialog", "Developer tools", "");
            addWrapperClass("mx_DevtoolsDialog_wrapper");
            expect(box("[data-testid=body]").width).toBe(752);
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
                <div class="mx_Dialog_buttons">
                    <span class="mx_Dialog_buttons_row">
                        <button class="mx_LegacyDialogButton danger" type="button" disabled data-testid="danger">Leave</button>
                        <button class="mx_LegacyDialogButton" type="button" disabled data-testid="action">Send report</button>
                    </span>
                </div>`,
            );
            const filled = [
                colorIn("--cpd-color-text-disabled"),
                colorIn("--cpd-color-bg-subtle-primary"),
                colorIn("--cpd-color-bg-subtle-primary"),
                "1",
            ];

            expect(look(get("[data-testid=input]"))).toEqual(filled);
            expect(look(get("[data-testid=danger]"))).toEqual(filled);
            expect(look(get("[data-testid=action]"))).toEqual(filled);
        });

        it("keep a disabled Cancel an outline, as Compound draws a disabled outline button", () => {
            renderDialog(
                "mx_ReportEventDialog",
                "Report content",
                `<div class="mx_Dialog_buttons">
                    <span class="mx_Dialog_buttons_row">
                        <button class="mx_LegacyDialogButton cancel" type="button" disabled data-testid="cancel">Cancel</button>
                        <button class="mx_LegacyDialogButton mx_Dialog_primary" type="button" disabled>Send report</button>
                    </span>
                </div>`,
            );

            expect(look(get("[data-testid=cancel]"))).toEqual([
                colorIn("--cpd-color-text-disabled"),
                colorIn("--cpd-color-bg-subtle-secondary"),
                colorIn("--cpd-color-border-interactive-secondary"),
                "1",
            ]);
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
    });
});
