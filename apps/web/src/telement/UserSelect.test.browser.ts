/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import userSelectStyles from "../../res/css/telement/_UserSelect.pcss?raw";

// Selection rules as Compound, the shared components and Element declare them, in the cascade layers the app loads
// them into.
const upstreamStyles = `
@layer compound-web, shared-components, app-web;

@layer compound-web {
    .compoundChip { user-select: text; }
}

@layer shared-components {
    .searchFieldInput { user-select: text; }
}

@layer app-web {
    .mx_EventTile_spoiler_content { pointer-events: none; }
    .mx_EventTile_spoiler.visible > .mx_EventTile_spoiler_content { user-select: auto; pointer-events: auto; }
    ${userSelectStyles}
}
`;

let stylesheet: HTMLStyleElement;

function render(html: string): void {
    document.body.innerHTML = html;
}

const byId = (id: string): HTMLElement => document.getElementById(id)!;

/** What a triple click on an element selects, as the reader would select a line or a paragraph. */
async function selectedByTripleClick(id: string): Promise<string> {
    document.getSelection()!.removeAllRanges();
    await userEvent.tripleClick(byId(id));
    return document.getSelection()!.toString().trim();
}

/** Each element's computed `user-select` by its id, so that a failure names the elements that are wrong. */
function userSelectOf(ids: string[]): Record<string, string> {
    return Object.fromEntries(ids.map((id) => [id, getComputedStyle(byId(id)).userSelect]));
}

const all = (ids: string[], value: string): Record<string, string> => Object.fromEntries(ids.map((id) => [id, value]));

describe("Telement's text selection", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = upstreamStyles;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.getSelection()!.removeAllRanges();
        document.body.innerHTML = "";
    });

    it("keeps the text of buttons, menu items, tabs, chips, rows and labels from being selected", () => {
        render(`
            <button id="button"><span id="buttonLabel">Invite</span></button>
            <div class="mx_AccessibleButton" id="accessibleButton">Settings</div>
            <div role="button" id="roleButton">Expand</div>
            <ul role="menu">
                <li role="menuitem" id="menuItem">Copy text</li>
                <li role="menuitemcheckbox" id="menuCheckbox">Show hidden events</li>
                <li role="menuitemradio" id="menuRadio">Newest first</li>
            </ul>
            <div role="tablist"><button role="tab" id="tab">Appearance</button></div>
            <label class="compoundChip" id="chip"><input type="checkbox" />Unread</label>
            <div role="listbox"><div role="option" id="row">Design team</div></div>
            <label id="checkboxLabel"><input type="checkbox" /><span id="checkboxText">Show typing</span></label>
            <div role="switch" id="switch">Notifications</div>
            <div role="radio" id="radio">Light</div>
            <div role="gridcell" id="cell">👍</div>
            <div role="treeitem" id="space">Studio</div>
            <details><summary id="summary">Advanced</summary></details>
        `);

        const controls = [
            "button",
            "accessibleButton",
            "roleButton",
            "menuItem",
            "menuCheckbox",
            "menuRadio",
            "tab",
            "chip",
            "row",
            "checkboxLabel",
            "switch",
            "radio",
            "cell",
            "space",
            "summary",
        ];
        expect(userSelectOf(controls)).toEqual(all(controls, "none"));
    });

    it("selects nothing when the reader triple-clicks a control or what it holds", async () => {
        render(`
            <p>Before</p>
            <button id="button"><span id="buttonLabel">Invite people</span></button>
            <div role="menuitem" id="menuItem">Copy text</div>
            <div role="tab" id="tab">Appearance</div>
            <p>After</p>
        `);

        const selected: Record<string, string> = {};
        for (const id of ["button", "buttonLabel", "menuItem", "tab"]) selected[id] = await selectedByTripleClick(id);

        expect(selected).toEqual({ button: "", buttonLabel: "", menuItem: "", tab: "" });
    });

    it("keeps message text selectable, with the controls inside it, like a revealed spoiler", async () => {
        render(`
            <div class="mx_EventTile_content">
                <div class="mx_EventTile_body" id="body">
                    Meet at <a href="https://example.org" id="link">the usual place</a>
                    <button class="mx_EventTile_spoiler visible" id="spoiler"><span class="mx_EventTile_spoiler_content" id="spoilerText">at noon</span></button>
                </div>
            </div>
            <div class="mx_EventTile_content">
                <div class="mx_EventTile_body" id="details"><details open><summary id="summary">Notes</summary>Bring the drafts</details></div>
            </div>
        `);

        expect(userSelectOf(["body", "link", "spoiler", "spoilerText", "summary"])).toEqual(
            all(["body", "link", "spoiler", "spoilerText", "summary"], "auto"),
        );
        // The spoiler's text is in what the reader selects across the message
        expect(await selectedByTripleClick("body")).toMatch(/^Meet at the usual place\s+at noon$/);
    });

    it("keeps text fields and composers selectable, also inside a control such as a search field's label", async () => {
        render(`
            <label id="searchField"><input class="searchFieldInput" id="search" value="design" /></label>
            <label id="nameField">Name <input id="name" value="Alice" /></label>
            <div role="button" id="dropTarget"><textarea id="topic">Mockups</textarea></div>
            <div contenteditable="true" id="composer">A draft</div>
        `);

        expect(userSelectOf(["searchField", "nameField", "dropTarget"])).toEqual(
            all(["searchField", "nameField", "dropTarget"], "none"),
        );
        expect(userSelectOf(["search", "name", "topic"])).toEqual(all(["search", "name", "topic"], "text"));
        expect(getComputedStyle(byId("composer")).userSelect).not.toBe("none");

        await userEvent.tripleClick(byId("name"));
        const name = byId("name") as HTMLInputElement;
        expect(name.value.slice(name.selectionStart!, name.selectionEnd!)).toBe("Alice");
        expect(await selectedByTripleClick("composer")).toBe("A draft");
    });
});
