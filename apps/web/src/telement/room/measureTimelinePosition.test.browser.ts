/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, describe, expect, it } from "vitest";

import { measureTimelinePosition } from "./measureTimelinePosition";

/** A message of the given height, as the timeline lists it with its scroll token. */
const message = (eventId: string, height = 60): string =>
    `<li data-scroll-tokens="${eventId}" style="height: ${height}px">${eventId}</li>`;

/** A date separator as DateSeparatorWrapper lays it out: a 24px pill with 8px above and below. */
const SEPARATOR = `<li><div class="mx_TimelineSeparator" role="separator" style="height: 24px; margin: 8px 0"></div></li>`;

/** A timeline 300px tall, its list padded as the room's is, scrolled to `scrollTop`. */
function timeline(scrollTop: number, ...items: string[]): HTMLElement {
    document.body.innerHTML = `
        <div class="mx_RoomView_messagePanel" style="height: 300px; width: 400px; overflow-y: scroll; scrollbar-width: thin">
            <ol class="mx_RoomView_MessageList" style="margin: 0; padding: 0 12px; list-style: none">${items.join("")}</ol>
        </div>
    `;
    const panel = document.querySelector<HTMLElement>(".mx_RoomView_messagePanel")!;
    panel.scrollTop = scrollTop;
    return panel;
}

const messages = (count: number): string[] => Array.from({ length: count }, (_, i) => message(`$event${i}`));

describe("measureTimelinePosition", () => {
    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("finds the first message under the middle of the pill, 20px under the top", () => {
        // Each message is 60px: scrolled by 100px, the second ends 20px under the top, on the pill's middle line
        expect(measureTimelinePosition(timeline(100, ...messages(20))).eventId).toBe("$event2");
        expect(measureTimelinePosition(timeline(99, ...messages(20))).eventId).toBe("$event1");
        expect(measureTimelinePosition(timeline(0, ...messages(20))).eventId).toBe("$event0");
    });

    it("takes the first event of a summary of several", () => {
        expect(measureTimelinePosition(timeline(0, message("$first,$second"), ...messages(10))).eventId).toBe("$first");
    });

    it("finds no message in an empty timeline", () => {
        expect(measureTimelinePosition(timeline(0)).eventId).toBeNull();
    });

    it("tells when one of the timeline's own date separators is where the pill would be", () => {
        const items = [...messages(3), SEPARATOR, ...messages(10)];
        // The separator's pill is 188px down the list
        expect(measureTimelinePosition(timeline(188 - 8, ...items)).separatorUnderPill).toBe(true);
        expect(measureTimelinePosition(timeline(188 + 30, ...items)).separatorUnderPill).toBe(false);
        expect(measureTimelinePosition(timeline(188 - 60, ...items)).separatorUnderPill).toBe(false);
    });

    it("tells when the timeline is at its bottom", () => {
        expect(measureTimelinePosition(timeline(0, ...messages(20))).atBottom).toBe(false);
        expect(measureTimelinePosition(timeline(20 * 60, ...messages(20))).atBottom).toBe(true);
    });

    it("measures the scrollbar, which the pill leaves out to center on the messages", () => {
        const panel = timeline(0, ...messages(20));

        expect(measureTimelinePosition(panel).endInset).toBe(panel.offsetWidth - panel.clientWidth);
    });
});
