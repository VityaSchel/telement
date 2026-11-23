/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type FloatingDateScrollPosition } from "./FloatingDateScrollPosition";

/** How far under the top of the timeline the floating date pill is, and how tall: the timeline's date pill. */
const PILL_TOP = 8;
const PILL_HEIGHT = 24;

/**
 * Measures where a room's timeline is for its floating date pill: the first message under the pill's middle, whether one
 * of the timeline's own date separators is under the pill or just below it, whether the timeline is at its bottom, and
 * how wide its scrollbar is. The messages are in order, so a binary search finds the first one in view.
 *
 * @param scrollNode - The timeline's scroll panel, which holds its message list.
 */
export function measureTimelinePosition(scrollNode: HTMLElement): FloatingDateScrollPosition {
    const top = scrollNode.getBoundingClientRect().top;
    const pillMiddle = top + PILL_TOP + PILL_HEIGHT / 2;
    const list = scrollNode.querySelector(".mx_RoomView_MessageList");
    const items = list ? [...list.querySelectorAll<HTMLElement>(":scope > [data-scroll-tokens]")] : [];

    let low = 0;
    let high = items.length;
    while (low < high) {
        const middle = (low + high) >> 1;
        if (items[middle].getBoundingClientRect().bottom > pillMiddle) high = middle;
        else low = middle + 1;
    }
    const eventId = items[low]?.dataset.scrollTokens?.split(",")[0] || null;

    // A separator of the timeline's own touching the pill's place, with a pill's margin around it, would draw the date
    // twice, so the pill makes way until the separator has scrolled past
    const separators = list ? [...list.querySelectorAll(":scope > li > .mx_TimelineSeparator")] : [];
    const separatorUnderPill = separators.some((separator) => {
        const box = separator.getBoundingClientRect();
        return box.bottom > top && box.top < top + 2 * PILL_TOP + PILL_HEIGHT;
    });

    return {
        eventId,
        separatorUnderPill,
        atBottom: scrollNode.scrollHeight - scrollNode.scrollTop - scrollNode.clientHeight < 1,
        endInset: scrollNode.offsetWidth - scrollNode.clientWidth,
    };
}
