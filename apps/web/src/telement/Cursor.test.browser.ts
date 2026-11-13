/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import cursorStyles from "../../res/css/telement/_Cursor.pcss?raw";

// Cursors as Compound, the shared components and Element declare them, in the cascade layers the app loads them into.
const upstreamStyles = `
@layer compound-web, shared-components, app-web;

@layer compound-web {
    .compoundIconButton { cursor: pointer; }
    .compoundLabel[for] { cursor: pointer; }
    .compoundLabel:has(~ input[disabled]),
    .compoundInlineFieldControl:has(input[disabled]) ~ .compoundInlineFieldBody .compoundLabel { cursor: not-allowed; }
    .compoundTextControl:disabled { cursor: not-allowed; }
}

@layer shared-components {
    .reactionButton { cursor: pointer; }
    .reactionButtonDisabled { cursor: not-allowed; }
}

@layer app-web {
    .mx_AccessibleButton { cursor: pointer; }
    .mx_StyledRadioButton { cursor: pointer; }
    ${cursorStyles}
}
`;

let stylesheet: HTMLStyleElement;

function render(html: string): void {
    document.body.innerHTML = html;
}

function cursorOf(id: string): string {
    return getComputedStyle(document.getElementById(id)!).cursor;
}

/** Each element's cursor by its id, so that a failure names the elements that are wrong. */
function cursorsOf(ids: string[]): Record<string, string> {
    return Object.fromEntries(ids.map((id) => [id, cursorOf(id)]));
}

function allShowing(ids: string[], cursor: string): Record<string, string> {
    return Object.fromEntries(ids.map((id) => [id, cursor]));
}

/** The cursor over the end of an element's first line, past the text when the line is short. */
function cursorAtLineEnd(id: string): string {
    const rect = document.getElementById(id)!.getBoundingClientRect();
    return getComputedStyle(document.elementFromPoint(rect.right - 2, rect.top + 2)!).cursor;
}

describe("Telement's cursors", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = upstreamStyles;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
        document.adoptedStyleSheets = [];
    });

    it("shows the arrow on controls and what they contain, whatever cursor they declare", () => {
        render(`
            <button class="compoundIconButton" id="iconButton"><svg id="icon"></svg></button>
            <div class="mx_AccessibleButton" role="button" id="accessibleButton">Settings</div>
            <label class="mx_StyledRadioButton" id="radioLabel"><input type="radio" /><span id="radioText">Light</span></label>
            <div class="compoundField">
                <label class="compoundLabel" for="name" id="fieldLabel">Name</label>
                <input class="compoundTextControl" id="name" />
            </div>
            <a href="https://example.org" id="settingsLink">Help</a>
            <div data-floating-ui-portal><div id="tooltip">Attachment</div></div>
        `);

        const controls = [
            "iconButton",
            "icon",
            "accessibleButton",
            "radioLabel",
            "radioText",
            "fieldLabel",
            "settingsLink",
            "tooltip",
        ];
        expect(cursorsOf(controls)).toEqual(allShowing(controls, "default"));
    });

    it("shows the I-beam in text fields and over the whole text of a message", () => {
        render(`
            <input id="search" />
            <textarea id="topic"></textarea>
            <div contenteditable="true" id="composer"><span class="mx_UserPill" id="pill">Alice</span></div>
            <div style="width: 400px">
                <div class="mx_EventTile_content" id="message">
                    <div class="mx_EventTile_body" id="body">Hi <span class="mx_EventTile_searchHighlight" id="highlight">there</span></div>
                </div>
                <div class="mx_EventTile_content" id="editedMessage">
                    <div data-textual-body-annotation-wrapper id="editedWrapper">
                        <span class="mx_EventTile_body">Hi</span><button id="editedMarker">(edited)</button>
                    </div>
                </div>
                <div class="mx_EventTile_content" id="emote">
                    * <button id="emoteSender">Alice</button> <span class="mx_EventTile_body">waves</span>
                </div>
                <a href="#reply"><div class="mx_EventTile_body" id="quotedBody">Quoted message</div></a>
            </div>
        `);

        const text = ["search", "topic", "composer", "pill", "body", "highlight"];
        expect(cursorsOf(text)).toEqual(allShowing(text, "text"));
        expect(cursorAtLineEnd("body")).toBe("text");
        expect(cursorAtLineEnd("editedWrapper")).toBe("text");
        expect(cursorAtLineEnd("emote")).toBe("text");
        expect(cursorOf("editedMarker")).toBe("default");
        expect(cursorOf("emoteSender")).toBe("default");
        // A reply quote is a control that jumps to the original message
        expect(cursorOf("quotedBody")).toBe("default");
    });

    it("keeps the pointing hand only on links inside messages and their link previews", () => {
        render(`
            <div class="mx_EventTile_content">
                <div class="mx_EventTile_body"><a href="https://example.org" id="messageLink"><b id="bold">link</b></a></div>
                <div class="mx_TextualBody_urlPreviews"><a href="https://example.org" id="previewLink">Example</a></div>
            </div>
            <a href="https://example.org" id="otherLink">Help</a>
        `);

        expect(cursorOf("messageLink")).toBe("pointer");
        expect(cursorOf("bold")).toBe("pointer");
        expect(cursorOf("previewLink")).toBe("pointer");
        expect(cursorOf("otherLink")).toBe("default");
    });

    it("shows not-allowed on disabled controls, what they contain and their labels", () => {
        render(`
            <button class="compoundIconButton" disabled id="iconButton"><svg id="icon"></svg></button>
            <div role="toolbar">
                <button class="reactionButton" id="reaction">👍</button>
                <button class="reactionButton reactionButtonDisabled" aria-disabled="true" id="disabledReaction">
                    <span id="disabledReactionKey">👎</span>
                </button>
            </div>
            <label class="mx_StyledRadioButton" id="radioLabel">
                <input type="radio" disabled /><div id="radioUi"></div><span id="radioText">Dark</span>
            </label>
            <div class="compoundField">
                <label class="compoundLabel" for="name" id="fieldLabel">Name</label>
                <input class="compoundTextControl" id="name" disabled />
            </div>
            <div class="compoundInlineField">
                <div class="compoundInlineFieldControl"><div><input type="radio" disabled /></div></div>
                <div class="compoundInlineFieldBody"><label class="compoundLabel" id="inlineLabel">Light</label></div>
            </div>
            <div class="compoundInlineField">
                <div class="compoundInlineFieldControl"><div><input type="radio" /></div></div>
                <div class="compoundInlineFieldBody"><label class="compoundLabel" for="x" id="enabledInlineLabel">Dark</label></div>
            </div>
            <span><input type="checkbox" disabled id="checkbox" /><label for="checkbox" id="checkboxLabel">Notify</label></span>
            <textarea disabled id="topic"></textarea>
        `);

        expect(cursorOf("reaction")).toBe("default");
        expect(cursorOf("enabledInlineLabel")).toBe("default");
        const disabled = [
            "iconButton",
            "icon",
            "disabledReaction",
            "disabledReactionKey",
            "radioLabel",
            "radioUi",
            "radioText",
            "fieldLabel",
            "name",
            "inlineLabel",
            "checkboxLabel",
            "topic",
        ];
        expect(cursorsOf(disabled)).toEqual(allShowing(disabled, "not-allowed"));
    });

    it("lets the left panel's resize cursor show while its separator is hovered or dragged", () => {
        render(`
            <div role="separator" data-separator="inactive" id="separator"></div>
            <button id="button">Room</button>
            <div contenteditable="true" id="composer"></div>
        `);
        // What the resizing library adds to the page while it controls the cursor
        const librarySheet = new CSSStyleSheet();
        librarySheet.replaceSync("*, *:hover { cursor: ew-resize !important; }");
        document.adoptedStyleSheets = [librarySheet];

        expect(cursorOf("button")).toBe("default");

        for (const state of ["hover", "active"]) {
            document.getElementById("separator")!.dataset.separator = state;
            expect({ state, ...cursorsOf(["button", "composer"]) }).toEqual({
                state,
                button: "ew-resize",
                composer: "ew-resize",
            });
        }
    });
});
