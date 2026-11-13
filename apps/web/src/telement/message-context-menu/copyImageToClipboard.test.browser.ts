/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, describe, expect, it, type Mock, vi } from "vitest";

import { canCopyImageToClipboard, copyImageToClipboard } from "./copyImageToClipboard";

async function drawPicture(type: string): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = 3;
    canvas.height = 2;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#ff0000";
    context.fillRect(0, 0, 3, 2);
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), type));
}

function mockClipboardWrite(): Mock<Clipboard["write"]> {
    return vi.spyOn(navigator.clipboard, "write").mockResolvedValue(undefined);
}

async function copiedPicture(write: Mock<Clipboard["write"]>): Promise<Blob> {
    const [items] = write.mock.calls[0];
    expect(items).toHaveLength(1);
    expect(items[0].types).toEqual(["image/png"]);
    return items[0].getType("image/png");
}

describe("copyImageToClipboard", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("can copy pictures where the browser supports PNG clipboard items", () => {
        expect(canCopyImageToClipboard()).toBe(true);
    });

    it("cannot copy pictures without clipboard items", () => {
        vi.stubGlobal("ClipboardItem", undefined);

        expect(canCopyImageToClipboard()).toBe(false);
    });

    it("cannot copy pictures when the browser rejects PNG clipboard items", () => {
        vi.spyOn(ClipboardItem, "supports").mockReturnValue(false);

        expect(canCopyImageToClipboard()).toBe(false);
    });

    it("copies a PNG picture as it is", async () => {
        const write = mockClipboardWrite();
        const picture = await drawPicture("image/png");

        await expect(copyImageToClipboard(Promise.resolve(picture))).resolves.toBe(true);

        expect(await copiedPicture(write)).toBe(picture);
    });

    it("converts other pictures to PNG", async () => {
        const write = mockClipboardWrite();
        const picture = await drawPicture("image/jpeg");

        await expect(copyImageToClipboard(Promise.resolve(picture))).resolves.toBe(true);

        const png = await copiedPicture(write);
        expect(png.type).toBe("image/png");
        const bitmap = await createImageBitmap(png);
        expect([bitmap.width, bitmap.height]).toEqual([3, 2]);
    });

    it("reports a failed copy", async () => {
        vi.spyOn(navigator.clipboard, "write").mockRejectedValue(new Error("Not allowed"));

        await expect(copyImageToClipboard(drawPicture("image/png"))).resolves.toBe(false);
    });
});
