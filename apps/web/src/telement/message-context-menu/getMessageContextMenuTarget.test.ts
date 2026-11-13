/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";

import { getMessageContextMenuTarget } from "./getMessageContextMenuTarget";

function mount(html: string): HTMLElement {
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    return container;
}

describe("getMessageContextMenuTarget", () => {
    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("opens the message menu without extras on plain message content", () => {
        const container = mount("<p>Hello</p>");

        expect(getMessageContextMenuTarget(container.querySelector("p"))).toEqual({});
    });

    it("opens the message menu when the target is not an element", () => {
        expect(getMessageContextMenuTarget(null)).toEqual({});
        expect(getMessageContextMenuTarget(document.createTextNode("text"))).toEqual({});
    });

    it.each([
        ["an input", "<input />", "input"],
        ["a text area", "<textarea></textarea>", "textarea"],
        ["editable content", "<div contenteditable='true'><span>text</span></div>", "span"],
    ])("keeps the browser's menu inside %s", (_name, html, selector) => {
        const container = mount(html);

        expect(getMessageContextMenuTarget(container.querySelector(selector))).toBeNull();
    });

    it("opens the message menu inside content that is explicitly not editable", () => {
        const container = mount("<div contenteditable='false'><span>text</span></div>");

        expect(getMessageContextMenuTarget(container.querySelector("span"))).toEqual({});
    });

    it("offers the link under the pointer", () => {
        const container = mount("<a href='https://example.org/page'><b>link</b></a>");

        expect(getMessageContextMenuTarget(container.querySelector("b"))).toEqual({
            link: "https://example.org/page",
        });
    });

    it.each([
        ["an in-page picture", "blob:https://app.example.org/1234"],
        ["a media download", "https://matrix.example.org/_matrix/client/v1/media/download/example.org/abc"],
        ["a legacy media download", "https://matrix.example.org/_matrix/media/v3/download/example.org/abc"],
    ])("does not offer the link of %s", (_name, href) => {
        const container = mount(`<a href='${href}'>file</a>`);

        expect(getMessageContextMenuTarget(container.querySelector("a"))).toEqual({});
    });

    it("offers the picture under the pointer", () => {
        const container = mount("<div><img src='https://example.org/cat.png' alt='' /></div>");

        expect(getMessageContextMenuTarget(container.querySelector("img"))).toEqual({
            imageSrc: "https://example.org/cat.png",
        });
    });

    it("offers both the picture and the link of a linked picture", () => {
        const container = mount("<a href='https://example.org/'><img src='https://example.org/cat.png' /></a>");

        expect(getMessageContextMenuTarget(container.querySelector("img"))).toEqual({
            link: "https://example.org/",
            imageSrc: "https://example.org/cat.png",
        });
    });

    it("does not offer to copy an avatar", () => {
        const container = mount("<span role='img'><img src='https://example.org/avatar.png' /></span>");

        expect(getMessageContextMenuTarget(container.querySelector("img"))).toEqual({});
    });

    it("does not offer to copy a custom reaction", () => {
        const container = mount(
            "<div role='toolbar'><button><img src='https://example.org/reaction.png' alt='' /></button></div>",
        );

        expect(getMessageContextMenuTarget(container.querySelector("img"))).toEqual({});
    });

    it("does not offer to copy a picture in a quoted reply", () => {
        const container = mount(
            "<blockquote class='mx_ReplyChain'><img src='https://example.org/cat.png' /></blockquote>",
        );

        expect(getMessageContextMenuTarget(container.querySelector("img"))).toEqual({});
    });
});
