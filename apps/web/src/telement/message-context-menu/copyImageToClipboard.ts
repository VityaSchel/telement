/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { logger } from "matrix-js-sdk/src/logger";

const PNG = "image/png";

/** Whether this browser can put a picture on the clipboard. Browsers only accept PNG pictures there. */
export function canCopyImageToClipboard(): boolean {
    if (typeof ClipboardItem === "undefined" || typeof navigator.clipboard?.write !== "function") return false;
    return typeof ClipboardItem.supports !== "function" || ClipboardItem.supports(PNG);
}

/** Redraws a picture as PNG. An animated picture becomes its first frame. */
async function toPng(picture: Blob): Promise<Blob> {
    if (picture.type === PNG) return picture;

    const url = URL.createObjectURL(picture);
    try {
        const image = new Image();
        image.src = url;
        await image.decode();

        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext("2d")?.drawImage(image, 0, 0);
        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((png) => (png ? resolve(png) : reject(new Error("Could not draw the picture"))), PNG);
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Puts a picture on the clipboard, converted to PNG.
 *
 * The clipboard write starts at once and waits for the picture inside it, because Safari only allows writing to
 * the clipboard while the click that asked for it is being handled.
 *
 * @param picture - The picture, which may still be downloading.
 * @returns Whether the picture was copied.
 */
export async function copyImageToClipboard(picture: Promise<Blob>): Promise<boolean> {
    try {
        await navigator.clipboard.write([new ClipboardItem({ [PNG]: picture.then(toPng) })]);
        return true;
    } catch (error) {
        logger.warn("Could not copy the picture to the clipboard", error);
        return false;
    }
}
