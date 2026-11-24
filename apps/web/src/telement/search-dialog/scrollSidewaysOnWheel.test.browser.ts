/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, describe, expect, it } from "vitest";

import { scrollSidewaysOnWheel } from "./scrollSidewaysOnWheel";

/** A 100px wide strip of `contentWidth` content that the wheel scrolls sideways. */
function renderStrip({ contentWidth = 300, dir = "ltr" } = {}): HTMLElement {
    document.body.innerHTML = `
        <div dir="${dir}" style="width: 100px; overflow: auto hidden">
            <div style="width: ${contentWidth}px; height: 10px"></div>
        </div>
    `;
    const strip = document.body.querySelector<HTMLElement>("[dir]")!;
    stop = scrollSidewaysOnWheel(strip);
    return strip;
}

let stop: (() => void) | undefined;

/** Turns the wheel over `strip` and says whether what it is in was kept from scrolling. */
function wheel(strip: HTMLElement, init: WheelEventInit): boolean {
    return !strip.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, ...init }));
}

describe("scrollSidewaysOnWheel", () => {
    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("scrolls the strip towards its end and back, and not what it is in", () => {
        const strip = renderStrip();

        expect(wheel(strip, { deltaY: 60 })).toBe(true);
        expect(strip.scrollLeft).toBe(60);

        expect(wheel(strip, { deltaY: -20 })).toBe(true);
        expect(strip.scrollLeft).toBe(40);
    });

    it("scrolls a right-to-left strip towards its end, on the left", () => {
        const strip = renderStrip({ dir: "rtl" });

        expect(wheel(strip, { deltaY: 60 })).toBe(true);
        expect(strip.scrollLeft).toBe(-60);
    });

    it("leaves the wheel to what the strip is in once the strip is at its end, at its start or all in view", () => {
        const strip = renderStrip();
        expect(wheel(strip, { deltaY: -60 })).toBe(false);
        strip.scrollLeft = 200;
        expect(wheel(strip, { deltaY: 60 })).toBe(false);
        expect(strip.scrollLeft).toBe(200);

        const fitting = renderStrip({ contentWidth: 80 });
        expect(wheel(fitting, { deltaY: 60 })).toBe(false);
    });

    it("leaves sideways scrolling to the browser, and up and down too while a trackpad makes it", () => {
        const strip = renderStrip();

        expect(wheel(strip, { deltaX: 8, deltaY: 1 })).toBe(false);
        expect(wheel(strip, { deltaY: 60 })).toBe(false);
        expect(strip.scrollLeft).toBe(0);
    });

    it("takes a mouse wheel again a minute after a trackpad was used", () => {
        const strip = renderStrip();
        const later = new WheelEvent("wheel", { cancelable: true, deltaY: 60 });
        Object.defineProperty(later, "timeStamp", { value: performance.now() + 61_000 });

        wheel(strip, { deltaX: 8 });
        strip.dispatchEvent(later);

        expect(strip.scrollLeft).toBe(60);
    });

    it.each(["ctrlKey", "shiftKey"])("leaves the wheel with %s to the browser, which zooms or scrolls", (key) => {
        const strip = renderStrip();

        expect(wheel(strip, { deltaY: 60, [key]: true })).toBe(false);
        expect(strip.scrollLeft).toBe(0);
    });

    it("counts wheels that turn by lines or pages in pixels", () => {
        const strip = renderStrip();

        wheel(strip, { deltaY: 2, deltaMode: WheelEvent.DOM_DELTA_LINE });
        expect(strip.scrollLeft).toBe(80);

        wheel(strip, { deltaY: 1, deltaMode: WheelEvent.DOM_DELTA_PAGE });
        expect(strip.scrollLeft).toBe(180);
    });

    it("stops following the wheel", () => {
        const strip = renderStrip();

        stop?.();

        expect(wheel(strip, { deltaY: 60 })).toBe(false);
        expect(strip.scrollLeft).toBe(0);
    });
});
