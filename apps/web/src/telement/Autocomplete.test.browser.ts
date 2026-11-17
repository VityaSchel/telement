/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import autocompleteStyles from "../../res/css/views/rooms/_Autocomplete.pcss?raw";
import messageComposerStyles from "../../res/css/views/rooms/_MessageComposer.pcss?raw";
import sendMessageComposerStyles from "../../res/css/views/rooms/_SendMessageComposer.pcss?raw";
import basicMessageComposerStyles from "../../res/css/views/rooms/_BasicMessageComposer.pcss?raw";
import sendWysiwygComposerStyles from "../../res/css/views/rooms/wysiwyg_composer/_SendWysiwygComposer.pcss?raw";
import wysiwygEditorStyles from "../../res/css/views/rooms/wysiwyg_composer/components/_Editor.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";

/** The autocomplete with a user and a room group, as Autocomplete and its providers render it. */
const AUTOCOMPLETE = `
    <div id="mx_Autocomplete" class="mx_Autocomplete" role="listbox">
        <div class="mx_Autocomplete_ProviderSection" role="presentation" id="users">
            <div class="mx_Autocomplete_provider_name">Users</div>
            <div class="mx_Autocomplete_Completion_container_pill">
                <div class="mx_Autocomplete_Completion_pill mx_Autocomplete_Completion selected" role="option"
                    aria-selected="true" id="alice">
                    <span class="mx_BaseAvatar" style="display: inline-block; inline-size: 24px; block-size: 24px"></span>
                    <span class="mx_Autocomplete_Completion_title">Alice</span>
                    <span class="mx_Autocomplete_Completion_subtitle"></span>
                    <span class="mx_Autocomplete_Completion_description">@alice:example.org</span>
                </div>
                <div class="mx_Autocomplete_Completion_pill mx_Autocomplete_Completion" role="option"
                    aria-selected="false" id="bob">
                    <span class="mx_BaseAvatar" style="display: inline-block; inline-size: 24px; block-size: 24px"></span>
                    <span class="mx_Autocomplete_Completion_title">Bob</span>
                    <span class="mx_Autocomplete_Completion_subtitle"></span>
                    <span class="mx_Autocomplete_Completion_description">@bob:example.org</span>
                </div>
            </div>
        </div>
        <div class="mx_Autocomplete_ProviderSection" role="presentation" id="commands">
            <div class="mx_Autocomplete_provider_name">Commands</div>
            <div class="mx_Autocomplete_Completion_container_pill">
                <div class="mx_Autocomplete_Completion_block mx_Autocomplete_Completion" role="option"
                    aria-selected="false" id="shrug">
                    <span class="mx_Autocomplete_Completion_title">/shrug</span>
                    <span class="mx_Autocomplete_Completion_subtitle">&lt;message&gt;</span>
                    <span class="mx_Autocomplete_Completion_description">Prepends ¯\\_(ツ)_/¯</span>
                </div>
            </div>
        </div>
    </div>
`;

/** The plain text composer, as MessageComposer, SendMessageComposer and BasicMessageComposer render it. */
function renderComposer(): void {
    document.body.innerHTML = `
        <div class="cpd-theme-light" style="padding-top: 400px; inline-size: 600px">
            <div class="mx_MessageComposer_wrapper" id="composer">
                <div class="mx_MessageComposer_row">
                    <div class="mx_SendMessageComposer">
                        <div class="mx_BasicMessageComposer">
                            <div class="mx_BasicMessageComposer_AutoCompleteWrapper">${AUTOCOMPLETE}</div>
                            <div class="mx_BasicMessageComposer_input" contenteditable="true">@</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/** The rich text composer, as SendWysiwygComposer and WysiwygComposer render it. */
function renderRichTextComposer(): void {
    document.body.innerHTML = `
        <div class="cpd-theme-light" style="padding-top: 400px; inline-size: 600px">
            <div class="mx_MessageComposer_wrapper">
                <div class="mx_MessageComposer_row">
                    <div class="mx_SendWysiwygComposer">
                        <div class="mx_WysiwygComposer_AutoCompleteWrapper">${AUTOCOMPLETE}</div>
                        <div class="mx_WysiwygComposer_Editor" id="field">
                            <div class="mx_WysiwygComposer_Editor_container">
                                <div class="mx_WysiwygComposer_Editor_content" contenteditable="true">@</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function rectOf(selector: string): DOMRect {
    return document.querySelector(selector)!.getBoundingClientRect();
}

function textLeft(element: Element): number {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect().left;
}

let stylesheet: HTMLStyleElement;

describe("The composer's autocomplete", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${telementTokens}
            body { margin: 0; font: var(--cpd-font-body-md-regular); }
            ${[
                autocompleteStyles,
                messageComposerStyles,
                sendMessageComposerStyles,
                basicMessageComposerStyles,
                sendWysiwygComposerStyles,
                wysiwygEditorStyles,
            ]
                .map((styles) => toBrowserCss(styles, fontSizes, lightTheme))
                .join("\n")}
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("floats 8px above the composer's top border, as a menu with a border all around and the menus' corners", () => {
        renderComposer();
        const autocomplete = document.getElementById("mx_Autocomplete")!;
        const style = getComputedStyle(autocomplete);

        expect(rectOf("#composer").top - rectOf("#mx_Autocomplete").bottom).toBe(8);
        expect(style.borderRadius).toBe("12px");
        for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
            expect(style[`border${side}Width`]).toBe("1px");
        }
        expect(style.boxShadow).not.toBe("none");
    });

    it("floats 8px above the rich text field", () => {
        renderRichTextComposer();

        expect(rectOf("#field").top - rectOf("#mx_Autocomplete").bottom).toBe(8);
    });

    it("lists completions in 32px rows inset 4px, the avatar 16px in and the name 10px after it", () => {
        renderComposer();
        const menu = rectOf("#mx_Autocomplete");

        expect(rectOf("#users").top - menu.top).toBe(4);
        expect(menu.bottom - rectOf("#shrug").bottom).toBe(4);
        for (const id of ["alice", "bob", "shrug"]) {
            const row = document.getElementById(id)!;
            expect(row.getBoundingClientRect().height).toBe(32);
            expect(row.getBoundingClientRect().left - menu.left).toBe(4);
            expect(menu.right - row.getBoundingClientRect().right).toBe(4);
            expect(getComputedStyle(row).borderRadius).toBe("8px");
        }
        for (const id of ["alice", "bob"]) {
            const avatar = rectOf(`#${id} .mx_BaseAvatar`);
            expect(avatar.left - menu.left).toBe(16);
            expect(textLeft(document.querySelector(`#${id} .mx_Autocomplete_Completion_title`)!) - avatar.right).toBe(
                10,
            );
        }
        expect(textLeft(document.querySelector("#shrug .mx_Autocomplete_Completion_title")!) - menu.left).toBe(16);
        // The groups' titles start where the rows' content does, and a line separates the groups, 2px from the rows
        for (const title of document.querySelectorAll(".mx_Autocomplete_provider_name")) {
            expect(textLeft(title) - menu.left).toBe(16);
            expect(getComputedStyle(title).fontWeight).toBe("600");
        }
        const commands = document.getElementById("commands")!;
        expect(getComputedStyle(commands).borderTopStyle).toBe("solid");
        expect(commands.getBoundingClientRect().top - rectOf("#bob").bottom).toBe(2);
    });

    it("fills the row chosen with the arrow keys darker than a hovered one", async () => {
        renderComposer();
        const alice = document.getElementById("alice")!;
        const bob = document.getElementById("bob")!;
        const rest = getComputedStyle(bob).backgroundColor;

        await userEvent.hover(bob);
        const hovered = getComputedStyle(bob).backgroundColor;
        expect(hovered).not.toBe(rest);
        expect(getComputedStyle(alice).backgroundColor).not.toBe(hovered);
        expect(getComputedStyle(alice).backgroundColor).not.toBe(rest);
    });
});
