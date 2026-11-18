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
import createRoomDialogStyles from "../../res/css/views/dialogs/_CreateRoomDialog.pcss?raw";
import inviteDialogStyles from "../../res/css/views/dialogs/_InviteDialog.pcss?raw";
import settingsDialogStyles from "../../res/css/views/dialogs/_SettingsDialog.pcss?raw";
import unpinAllDialogStyles from "../../res/css/views/dialogs/_UnpinAllDialog.pcss?raw";
import userSettingsDialogStyles from "../../res/css/views/dialogs/_UserSettingsDialog.pcss?raw";
import accessibleButtonStyles from "../../res/css/views/elements/_AccessibleButton.pcss?raw";
import fieldStyles from "../../res/css/views/elements/_Field.pcss?raw";
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
    createRoomDialogStyles,
    inviteDialogStyles,
    settingsDialogStyles,
    unpinAllDialogStyles,
    userSettingsDialogStyles,
    accessibleButtonStyles,
    fieldStyles,
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

        it("starts every tab's first line where the tabs start, with or without a heading", () => {
            renderSettings(section("profile", "Profile"));
            expect(box("[data-testid=profile] .mx_Heading_h3").top).toBe(firstTab().top);
            document.body.innerHTML = "";

            renderSettings(section("headingless"));
            expect(box("[data-testid=headingless] .mx_SettingsSubsection").top).toBe(firstTab().top);
        });

        it("keeps a heading's subsections 16px under it and sections the tab's 32px apart", () => {
            renderSettings(section("profile", "Profile") + section("account", "Account"));

            expect(
                box("[data-testid=profile] .mx_SettingsSubsection").top -
                    box("[data-testid=profile] .mx_Heading_h3").bottom,
            ).toBe(16);
            expect(
                box("[data-testid=account] .mx_Heading_h3").top -
                    box("[data-testid=profile] .mx_SettingsSubsection").bottom,
            ).toBe(32);
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
