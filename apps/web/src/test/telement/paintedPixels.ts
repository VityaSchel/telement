/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { sendCdp } from "./computedStyle";

/** Renders the page at the given device pixel ratio, as a 2x screen does, until {@link resetPixelRatio}. */
export async function setPixelRatio(deviceScaleFactor: number): Promise<void> {
    await sendCdp("Emulation.setDeviceMetricsOverride", {
        width: innerWidth,
        height: innerHeight,
        deviceScaleFactor,
        mobile: false,
    });
}

export async function resetPixelRatio(): Promise<void> {
    await sendCdp("Emulation.clearDeviceMetricsOverride", {});
}

/** The pixels the screen shows in the given area of the page, at the current device pixel ratio. */
async function screenPixels(area: { x: number; y: number; width: number; height: number }): Promise<ImageData> {
    const frame = window.frameElement!.getBoundingClientRect();
    const { data } = (await sendCdp("Page.captureScreenshot", {
        format: "png",
        clip: { ...area, x: frame.x + area.x, y: frame.y + area.y, scale: 1 },
    })) as { data: string };
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * The middles, from top to bottom, of what is drawn on a white page in each of the given boxes, such as a capital
 * letter's or the digits' ink, in CSS pixels of the page, all from one picture of the screen. A row of pixels counts
 * when its darkest one is at least 40% as dark as the box's, which leaves out the faint edges of antialiasing.
 */
export async function paintedMiddles(boxes: DOMRect[]): Promise<number[]> {
    const left = Math.floor(Math.min(...boxes.map((box) => box.left)));
    const top = Math.floor(Math.min(...boxes.map((box) => box.top)));
    const right = Math.ceil(Math.max(...boxes.map((box) => box.right)));
    const bottom = Math.ceil(Math.max(...boxes.map((box) => box.bottom)));
    const { data, width } = await screenPixels({ x: left, y: top, width: right - left, height: bottom - top });
    const scale = width / (right - left);

    return boxes.map((box) => {
        const [x0, x1] = [Math.floor(box.left) - left, Math.ceil(box.right) - left].map((x) => x * scale);
        const [y0, y1] = [Math.floor(box.top) - top, Math.ceil(box.bottom) - top].map((y) => y * scale);
        const rows = Array.from({ length: y1 - y0 }, (_, row) => {
            let darkest = 0;
            for (let x = x0; x < x1; x++) {
                const i = ((y0 + row) * width + x) * 4;
                darkest = Math.max(darkest, 765 - data[i] - data[i + 1] - data[i + 2]);
            }
            return darkest;
        });
        const threshold = 0.4 * Math.max(...rows);
        const drawn = rows.map((darkest) => darkest > threshold);
        return top + (y0 + (drawn.indexOf(true) + drawn.lastIndexOf(true) + 1) / 2) / scale;
    });
}
