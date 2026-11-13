/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { formatSeconds } from "@element-hq/web-shared-components";

/**
 * Formats a time in a video as Telegram does: "0:05", "12:34", "1:02:03". Partial seconds are dropped.
 *
 * @param seconds - The time in seconds.
 */
export function formatVideoTime(seconds: number): string {
    const wholeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    return formatSeconds(wholeSeconds, { hoursMinLength: 1, minutesMinLength: 1 });
}
