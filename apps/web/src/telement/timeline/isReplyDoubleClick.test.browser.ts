/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { isReplyDoubleClick } from "./isReplyDoubleClick";

/** A message's row as the timeline draws it: a bubble with padding, text, controls and a picture, in a wider row. */
const ROW = `
    <ul style="margin: 0; padding: 0; list-style: none; font: 15px/20px sans-serif">
        <li id="row" style="padding: 24px; inline-size: 480px">
            <div id="bubble" style="padding: 12px; inline-size: 320px; background: #eee">
                <p id="text" style="margin: 0">Hello there</p>
                <button id="button" type="button">Reaction</button>
                <a id="link" href="#message">12:55</a>
                <img id="picture" alt="" width="40" height="40" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />
                <span id="avatar" role="button" tabindex="0" style="display: inline-block; inline-size: 24px">A</span>
            </div>
        </li>
    </ul>
    <div id="menu" style="inline-size: 200px; block-size: 40px"></div>
`;

const byId = (id: string): HTMLElement => document.getElementById(id)!;

/** A double click at a point of the page, as the row receives it. */
function doubleClickAt(x: number, y: number, row = byId("row")): boolean {
    return isReplyDoubleClick({ target: document.elementFromPoint(x, y), currentTarget: row, clientX: x, clientY: y });
}

function center(rect: DOMRect): [number, number] {
    return [rect.left + rect.width / 2, rect.top + rect.height / 2];
}

describe("isReplyDoubleClick", () => {
    beforeEach(() => {
        document.body.innerHTML = ROW;
    });

    afterEach(() => {
        document.body.innerHTML = "";
        window.getSelection()?.removeAllRanges();
    });

    it("leaves a double click on the message's text to select a word", () => {
        const range = document.createRange();
        range.setStart(byId("text").firstChild!, 0);
        range.setEnd(byId("text").firstChild!, 5);

        expect(doubleClickAt(...center(range.getBoundingClientRect()))).toBe(false);
    });

    it("replies on the bubble's padding, beside a line of text and around the bubble", () => {
        const bubble = byId("bubble").getBoundingClientRect();
        const line = byId("text").getBoundingClientRect();

        // Beside the end of the line, in the paragraph's own box
        expect(doubleClickAt(bubble.right - 20, line.top + line.height / 2)).toBe(true);
        // In the bubble's padding above the text
        expect(doubleClickAt(bubble.left + 40, bubble.top + 4)).toBe(true);
        // In the row's margin beside the bubble
        expect(doubleClickAt(bubble.right + 40, bubble.top + 4)).toBe(true);
    });

    it.each(["button", "link", "picture", "avatar"])("leaves a double click on the %s to it", (id) => {
        expect(doubleClickAt(...center(byId(id).getBoundingClientRect()))).toBe(false);
    });

    it("ignores a double click on something drawn outside the row, such as its open menu", () => {
        expect(doubleClickAt(...center(byId("menu").getBoundingClientRect()))).toBe(false);
    });

    it("keeps a double click in the padding from selecting the nearest word once its second press is held back", async () => {
        const row = byId("row");
        row.addEventListener("mousedown", (ev) => {
            if (ev.detail === 2 && isReplyDoubleClick(ev)) ev.preventDefault();
        });
        const rowBox = row.getBoundingClientRect();
        const bubble = byId("bubble").getBoundingClientRect();

        // Chrome selects "Hello" for a double click in the padding above it, and the nearest word for one beside the
        // bubble
        for (const [x, y] of [
            [bubble.left + 40, bubble.top + 4],
            [bubble.right + 40, bubble.top + 30],
        ]) {
            await userEvent.dblClick(row, { position: { x: x - rowBox.left, y: y - rowBox.top } });
            expect(window.getSelection()?.toString()).toBe("");
        }
    });
});
