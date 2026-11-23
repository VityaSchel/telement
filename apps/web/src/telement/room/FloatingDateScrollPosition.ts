/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/** Where the timeline is, as measured when it scrolls. */
export interface FloatingDateScrollPosition {
    /** The first message in view under the pill, or null when there is none, as at the start of an empty room. */
    eventId: string | null;
    /** Whether one of the timeline's own date separators is where the pill would be, which would draw it twice. */
    separatorUnderPill: boolean;
    /** Whether the timeline is at its bottom, where new messages arrive and scroll it. */
    atBottom: boolean;
    /** How far the timeline's content ends before its container does, such as a scrollbar's width, in pixels. */
    endInset: number;
}
