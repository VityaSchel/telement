/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";

import { validateImageOrVideoMimetype, validateStickerMimetype } from "./validateMediaMimetype";

describe("validateImageOrVideoMimetype", () => {
    it.each([
        { name: "a picture", content: { body: "cat.png", info: { mimetype: "image/png" } } },
        { name: "a video", content: { body: "cat.mp4", info: { mimetype: "video/mp4" } } },
        { name: "a picture without a mimetype", content: { body: "cat.jpg" } },
        { name: "a captioned picture", content: { body: "Look at this", filename: "cat.png" } },
        {
            name: "a picture with a thumbnail",
            content: { body: "cat.png", info: { thumbnail_info: { mimetype: "image/jpeg" } } },
        },
    ])("accepts $name", ({ content }) => {
        expect(validateImageOrVideoMimetype(content)).toBe(true);
    });

    it.each([
        { name: "content without a file name", content: {} },
        { name: "a file name without an extension", content: { body: "cat" } },
        { name: "a file name that is not a picture's", content: { body: "cat.pdf" } },
        { name: "a mimetype that is not a picture's", content: { body: "cat.png", info: { mimetype: "text/html" } } },
        {
            name: "a mimetype that does not match the file name",
            content: { body: "cat.png", info: { mimetype: "video/mp4" } },
        },
        {
            name: "a thumbnail that is not a picture",
            content: { body: "cat.png", info: { thumbnail_info: { mimetype: "text/html" } } },
        },
    ])("rejects $name", ({ content }) => {
        expect(validateImageOrVideoMimetype(content)).toBe(false);
    });
});

describe("validateStickerMimetype", () => {
    it.each([
        { name: "a sticker without a mimetype", content: { body: "cat" } },
        { name: "a picture sticker", content: { body: "cat", info: { mimetype: "image/webp" } } },
    ])("accepts $name", ({ content }) => {
        expect(validateStickerMimetype(content)).toBe(true);
    });

    it.each([
        { name: "a sticker that is not a picture", content: { body: "cat", info: { mimetype: "video/mp4" } } },
        {
            name: "a thumbnail that is not a picture",
            content: { body: "cat", info: { thumbnail_info: { mimetype: "text/html" } } },
        },
    ])("rejects $name", ({ content }) => {
        expect(validateStickerMimetype(content)).toBe(false);
    });
});
