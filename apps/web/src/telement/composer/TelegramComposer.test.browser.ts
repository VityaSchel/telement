/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IconButton } from "@vector-im/compound-web";
import { AttachmentIcon, ReactionIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../../res/css/_common.pcss?raw";
import fontSizes from "../../../res/css/_font-sizes.pcss?raw";
import messageComposerStyles from "../../../res/css/views/rooms/_MessageComposer.pcss?raw";
import sendMessageComposerStyles from "../../../res/css/views/rooms/_SendMessageComposer.pcss?raw";
import sendWysiwygComposerStyles from "../../../res/css/views/rooms/wysiwyg_composer/_SendWysiwygComposer.pcss?raw";
import editorStyles from "../../../res/css/views/rooms/wysiwyg_composer/components/_Editor.pcss?raw";
import telegramComposerStyles from "../../../res/css/telement/_TelegramComposer.pcss?raw";
import threadPanelStyles from "../../../res/css/views/right_panel/_ThreadPanel.pcss?raw";
import replyPreviewStyles from "../../../res/css/views/rooms/_ReplyPreview.pcss?raw";
import emojiButtonStyles from "../../../res/css/views/rooms/_EmojiButton.pcss?raw";
import lightTheme from "../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../test/telement/browserCss";
import { settledStyle, tokenColor } from "../../test/telement/computedStyle";

const ICON = `<svg width="20" height="20"></svg>`;

const PLAIN_FIELD = `
    <div class="mx_SendMessageComposer">
        <div class="mx_BasicMessageComposer">
            <div class="mx_BasicMessageComposer_input" role="textbox">Hello</div>
        </div>
    </div>
`;

const richTextField = (html: string): string => `
    <div class="mx_SendWysiwygComposer">
        <div class="mx_WysiwygComposer_Editor">
            <div class="mx_WysiwygComposer_Editor_container">
                <div class="mx_WysiwygComposer_Editor_content" role="textbox">${html}</div>
            </div>
        </div>
    </div>
`;

/** MessageComposer's row: the attach button (a Compound IconButton, which sets its size), the field and an action button. */
function renderComposerRow(richText: boolean, dir = "ltr", html = "Hello"): void {
    document.body.innerHTML = `
        <div
            class="cpd-theme-light mx_MessageComposer${richText ? " mx_MessageComposer_wysiwyg" : ""}"
            dir="${dir}"
            style="width: 640px"
        >
            <div class="mx_MessageComposer_wrapper">
                <div class="mx_MessageComposer_row">
                    <div class="mx_TelementAttachButton" style="display: flex; --cpd-icon-button-size: 36px">${ICON}</div>
                    ${richText ? richTextField(html) : PLAIN_FIELD}
                    <div class="mx_MessageComposer_actions">
                        <div class="mx_AccessibleButton mx_MessageComposer_button" role="button">${ICON}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function box(selector: string): DOMRect {
    return document.querySelector(selector)!.getBoundingClientRect();
}

/** The horizontal space between two boxes in a row, whichever comes first. */
function gapBetween(a: DOMRect, b: DOMRect): number {
    return Math.max(b.left - a.right, a.left - b.right);
}

/**
 * Opens the paperclip's menu as Compound's Menu places it on the trigger's top side: Radix puts the menu in a fixed
 * wrapper, measures the wrapper and sets its bottom 8px above the trigger.
 */
function openAttachMenu(trigger: DOMRect): DOMRect {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position: fixed; inset-inline-start: 0; inset-block-start: 0";
    wrapper.innerHTML = `
        <div class="mx_TelementAttachMenu" role="menu" data-side="top" style="block-size: 136px; inline-size: 208px"></div>
    `;
    document.body.append(wrapper);
    const top = trigger.top - 8 - wrapper.getBoundingClientRect().height;
    wrapper.style.transform = `translate(${trigger.left}px, ${top}px)`;
    return box(".mx_TelementAttachMenu");
}

let stylesheet: HTMLStyleElement;

describe("Telegram composer buttons", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            ${compoundTokens}
            ${compoundSemantic}
            ${compoundLightTheme}
            ${telementTokens}
            ${toBrowserCss(messageComposerStyles, fontSizes)}
            ${toBrowserCss(sendMessageComposerStyles, fontSizes)}
            ${toBrowserCss(sendWysiwygComposerStyles, fontSizes)}
            ${toBrowserCss(editorStyles, commonStyles, fontSizes)}
            ${toBrowserCss(telegramComposerStyles, fontSizes)}
            ${toBrowserCss(threadPanelStyles, fontSizes, lightTheme)}
            ${replyPreviewStyles}
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("puts the reply bar's quote line on the paperclip's drawn glyph, which starts inside its icon", () => {
        renderComposerRow(false);
        // The paperclip's own glyph, as UploadButton draws it, rather than an empty icon
        document.querySelector(".mx_TelementAttachButton svg")!.outerHTML = renderToStaticMarkup(
            createElement(AttachmentIcon, { width: 20, height: 20 }),
        );
        // ReplyPreview's bar, which MessageComposer puts above its row
        document.querySelector(".mx_MessageComposer_row")!.insertAdjacentHTML(
            "beforebegin",
            `
                <div class="mx_ReplyPreview">
                    <div class="mx_ReplyPreview_section">
                        <div class="mx_ReplyPreview_header"><span class="mx_ReplyPreview_title">Reply to Alice</span></div>
                        <div>Hello there</div>
                    </div>
                </div>
            `,
        );
        const section = document.querySelector(".mx_ReplyPreview_section")!;
        const line = getComputedStyle(section, "::before");
        const glyph = box(".mx_TelementAttachButton svg path");

        expect(glyph.left - box(".mx_TelementAttachButton svg").left).toBe(5);
        expect(line.left).toBe("0px");
        expect(Math.abs(section.getBoundingClientRect().left - glyph.left)).toBeLessThanOrEqual(0.5);
    });

    it("keeps the formatting button's 24px icon on a control-sized target, like the other composer buttons", () => {
        document.body.innerHTML = `
            <div class="mx_MessageComposer_row">
                <div class="mx_AccessibleButton mx_MessageComposer_button mx_TelementFormattingButton" role="button">
                    <svg></svg>
                </div>
            </div>
        `;
        const button = document.querySelector<HTMLElement>(".mx_TelementFormattingButton")!;
        const style = getComputedStyle(button);

        expect([style.width, style.height]).toEqual(["24px", "24px"]);
        expect(button.getBoundingClientRect()).toMatchObject({ width: 36, height: 36 });
    });

    it.each([
        ["plain", "ltr", false],
        ["plain", "rtl", false],
        ["rich-text", "ltr", true],
        ["rich-text", "rtl", true],
    ])("spaces the %s field 8px from the buttons on both sides, %s", (_, dir, richText) => {
        renderComposerRow(richText, dir);
        const field = box(richText ? ".mx_WysiwygComposer_Editor" : ".mx_SendMessageComposer");

        expect({
            attach: gapBetween(box(".mx_TelementAttachButton"), field),
            actions: gapBetween(field, box(".mx_MessageComposer_actions")),
        }).toEqual({ attach: 8, actions: 8 });
    });

    // The plain field has no border or padding, so its text starts at its edge; the rich-text field's starts further in
    it.each([
        ["the plain composer's text", false, ".mx_BasicMessageComposer_input"],
        ["the rich-text field's border", true, ".mx_WysiwygComposer_Editor"],
    ])("sets the paperclip as far from %s as the composer's icons are from its sides", (_, richText, field) => {
        renderComposerRow(richText);
        const icon = box(".mx_TelementAttachButton svg");
        const actionIcon = box(".mx_MessageComposer_actions svg");
        const wrapper = box(".mx_MessageComposer_wrapper");

        expect({
            toField: box(field).left - icon.right,
            fromStart: icon.left - wrapper.left,
            fromEnd: wrapper.right - actionIcon.right,
        }).toEqual({ toField: 16, fromStart: 16, fromEnd: 16 });
    });

    it("opens the paperclip's menu 8px above the composer's top border, like the autocomplete", () => {
        renderComposerRow(false);
        const composer = box(".mx_MessageComposer_wrapper");

        const menu = openAttachMenu(box(".mx_TelementAttachButton"));

        expect(getComputedStyle(document.querySelector(".mx_MessageComposer_wrapper")!).borderTopWidth).toBe("1px");
        expect(composer.top - menu.bottom).toBe(8);
    });

    it.each(["mx_ThreadView", "mx_TimelineCard"])(
        "docks the composer of a right panel card (%s) as the room's is docked: its divider meets the card's edges and its paperclip keeps the room's inset",
        (card) => {
            const composer = (classes: string): string => `
                <div class="${classes}">
                    <div class="mx_MessageComposer_wrapper">
                        <div class="mx_MessageComposer_row">
                            <div class="mx_TelementAttachButton" style="display: flex; --cpd-icon-button-size: 36px">${ICON}</div>
                            ${PLAIN_FIELD}
                        </div>
                    </div>
                </div>
            `;
            // The thread's composer is the compact one
            const compact = card === "mx_ThreadView" ? " mx_MessageComposer--compact" : "";
            document.body.innerHTML = `
                <div class="cpd-theme-light" style="display: flex; align-items: flex-end; height: 300px">
                    <main style="width: 520px">${composer("mx_MessageComposer")}</main>
                    <aside class="mx_BaseCard ${card} mx_ThreadPanel" style="width: 320px">
                        ${composer(`mx_MessageComposer${compact}`)}
                    </aside>
                </div>
            `;
            const [room, panel] = [box("main"), box("aside")];
            const [roomWrapper, panelWrapper] = [...document.querySelectorAll(".mx_MessageComposer_wrapper")].map(
                (wrapper) => wrapper.getBoundingClientRect(),
            );
            const [roomClip, panelClip] = [...document.querySelectorAll(".mx_TelementAttachButton")].map((button) =>
                button.getBoundingClientRect(),
            );
            const panelComposer = getComputedStyle(document.querySelector("aside .mx_MessageComposer")!);

            expect([roomWrapper.left - room.left, room.right - roomWrapper.right]).toEqual([0, 0]);
            expect([panelWrapper.left - panel.left, panel.right - panelWrapper.right]).toEqual([0, 0]);
            expect(panelClip.left - panel.left).toBe(roomClip.left - room.left);
            expect(panelComposer.borderRadius).toBe("0px");
            expect(panelComposer.marginTop).toBe("0px");
        },
    );

    it.each([
        ["one line", "See you at the standup"],
        ["three lines", "<p>Morning!</p><p>The draft wraps</p><p>onto three lines.</p>"],
    ])("centers the rich-text composer's buttons on the field's last line, with %s", (_, html) => {
        renderComposerRow(true, "ltr", html);
        const row = box(".mx_MessageComposer_row");
        const field = box(".mx_WysiwygComposer_Editor");
        const lastLineCenter = box(".mx_WysiwygComposer_Editor_content").bottom - 22 / 2;
        const center = (rect: DOMRect): number => (rect.top + rect.bottom) / 2;

        expect({
            attach: center(box(".mx_TelementAttachButton")) - lastLineCenter,
            action: center(box(".mx_MessageComposer_button")) - lastLineCenter,
            above: field.top - row.top,
            below: row.bottom - field.bottom,
        }).toEqual({ attach: 0, action: 0, above: 8, below: 8 });
    });
});

/**
 * The paperclip as UploadButton renders it, a Compound IconButton that Compound's Menu marks as expanded while the
 * menu is open, beside the emoji button as ComposerDrawerButton renders it while its drawer is open.
 */
function renderOpenButtons(paperclipOpen: boolean): { paperclip: HTMLElement; emoji: HTMLElement } {
    const paperclip = renderToStaticMarkup(
        createElement(
            IconButton,
            {
                "className": "mx_TelementAttachButton",
                "size": "36px",
                "aria-label": "Attachment",
                "aria-haspopup": "menu",
                "aria-expanded": paperclipOpen,
            },
            createElement(AttachmentIcon),
        ),
    );
    document.body.innerHTML = `
        <div class="cpd-theme-light mx_MessageComposer">
            <div class="mx_MessageComposer_row">
                ${paperclip}
                <div class="mx_AccessibleButton mx_MessageComposer_button mx_EmojiButton_highlight" role="button"
                    aria-label="Emoji">${renderToStaticMarkup(createElement(ReactionIcon))}</div>
            </div>
        </div>
    `;
    return {
        paperclip: document.querySelector<HTMLElement>('[aria-label="Attachment"]')!,
        emoji: document.querySelector<HTMLElement>('[aria-label="Emoji"]')!,
    };
}

describe("Telegram composer buttons while their menus are open", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundTokens} ${compoundSemantic} ${compoundLightTheme} }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} }
            @layer app-web {
                ${toBrowserCss(messageComposerStyles, commonStyles, lightTheme, fontSizes)}
                ${toBrowserCss(emojiButtonStyles, commonStyles, lightTheme)}
                ${toBrowserCss(telegramComposerStyles, fontSizes)}
            }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    /** The color a button's glyph is painted in: the fill its paths end up with. */
    const glyphColor = (button: HTMLElement): string => getComputedStyle(button.querySelector("svg path")!).fill;

    it("draws the paperclip's glyph in the accent with no fill while its menu is open, as the emoji button's while its drawer is", () => {
        const { paperclip, emoji } = renderOpenButtons(true);
        const accent = tokenColor("--cpd-color-icon-accent-primary", paperclip);

        expect(settledStyle(paperclip).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(settledStyle(emoji).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(glyphColor(paperclip)).toBe(accent);
        expect(glyphColor(emoji)).toBe(accent);
    });

    it("leaves the paperclip clear and gray while its menu is closed", () => {
        const { paperclip } = renderOpenButtons(false);

        expect(settledStyle(paperclip).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(glyphColor(paperclip)).toBe(tokenColor("--cpd-color-icon-secondary", paperclip));
    });
});
