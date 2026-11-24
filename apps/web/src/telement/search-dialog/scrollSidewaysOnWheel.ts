/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/** How far a wheel that counts in lines rather than pixels, as Firefox's can, scrolls per line. */
const LINE_PX = 40;

/** How long a sideways scroll, which a mouse wheel can't make, says that a trackpad is in use. */
const TRACKPAD_MS = 60_000;

/** How far down the event scrolls, in pixels. */
function getPixelsDown({ deltaY, deltaMode }: WheelEvent, strip: HTMLElement): number {
    switch (deltaMode) {
        case WheelEvent.DOM_DELTA_LINE:
            return deltaY * LINE_PX;
        case WheelEvent.DOM_DELTA_PAGE:
            return deltaY * strip.clientWidth;
        default:
            return deltaY;
    }
}

/**
 * Lets a mouse wheel scroll a one-line strip towards its end and back, as a ref callback for it. What the strip is in
 * scrolls instead once the strip is at its end, and while a trackpad is in use, which scrolls the strip by itself.
 * @param strip - The strip, which the browser can scroll sideways.
 * @returns Stops following the wheel.
 */
export function scrollSidewaysOnWheel(strip: HTMLElement | null): (() => void) | undefined {
    if (!strip) return undefined;
    let lastSidewaysScroll = -Infinity;

    const onWheel = (event: WheelEvent): void => {
        // With Ctrl it zooms and with Shift the browser scrolls sideways itself
        if (event.ctrlKey || event.shiftKey) return;
        if (event.deltaX !== 0) {
            lastSidewaysScroll = event.timeStamp;
            return;
        }
        if (event.timeStamp - lastSidewaysScroll < TRACKPAD_MS) return;

        const towardsEnd = getPixelsDown(event, strip);
        const from = strip.scrollLeft;
        strip.scrollLeft += getComputedStyle(strip).direction === "rtl" ? -towardsEnd : towardsEnd;
        if (strip.scrollLeft !== from) event.preventDefault();
    };

    // Not passive, as React's own wheel listeners are, so that the dialog around the strip can be kept from scrolling
    strip.addEventListener("wheel", onWheel, { passive: false });
    return () => strip.removeEventListener("wheel", onWheel);
}
