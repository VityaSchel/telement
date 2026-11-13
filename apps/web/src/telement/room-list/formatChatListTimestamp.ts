/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { DAY_MS, HOUR_MS, getTwelveHourOptions } from "../../DateUtils";
import { getUserLanguage } from "../../i18n/settings";
import { getUserTimezone } from "../../TimezoneHandler";

/** How long a message from an earlier day keeps showing its time instead of its weekday, as in Telegram Desktop */
const RECENT_MS = 20 * HOUR_MS;

/** A room's last activity as the room list shows it. */
interface ChatListTimestamp {
    /** The time today or within the last 20 hours, the short weekday within a week, the short date before that */
    label: string;
    /** The full date and time, for the label's tooltip */
    title: string;
    /** The moment as an ISO 8601 string, for `<time dateTime>` */
    dateTime: string;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * A formatter made once for each locale, time zone and options, as every room in view formats its time on each update.
 * Without a time zone it formats in the system's, so the system's current offset from UTC is part of the key: a
 * formatter keeps the zone it was made in.
 */
function formatter(
    locale: string,
    timeZone: string | undefined,
    options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
    const key = `${locale}|${timeZone ?? new Date().getTimezoneOffset()}|${JSON.stringify(options)}`;
    let format = formatters.get(key);
    if (!format) {
        format = new Intl.DateTimeFormat(locale, { ...options, timeZone });
        formatters.set(key, format);
    }
    return format;
}

/** The calendar day of `time` in the time zone, as a number of days that grows by one from one day to the next. */
function dayNumber(time: number, timeZone: string | undefined): number {
    const parts = formatter("en-US", timeZone, { year: "numeric", month: "numeric", day: "numeric" }).formatToParts(
        time,
    );
    const part = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((p) => p.type === type)!.value);
    return Date.UTC(part("year"), part("month") - 1, part("day")) / DAY_MS;
}

/** How far into its day `time` is in the time zone, in milliseconds. */
function timeOfDay(time: number, timeZone: string | undefined): number {
    const parts = formatter("en-US", timeZone, {
        hourCycle: "h23",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
    }).formatToParts(time);
    const part = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((p) => p.type === type)!.value);
    return ((part("hour") * 60 + part("minute")) * 60 + part("second")) * 1000 + (time % 1000);
}

function isShownAsTime(timestamp: number, now: number, timeZone: string | undefined): boolean {
    return dayNumber(timestamp, timeZone) === dayNumber(now, timeZone) || Math.abs(now - timestamp) < RECENT_MS;
}

/**
 * Formats when a room was last active for the room list, by Telegram Desktop's rule: the time if that was today or
 * less than 20 hours ago, the short weekday if it was in the last 7 days, the locale's short date otherwise.
 * @param timestamp - when the room was last active, in milliseconds since the epoch
 * @param now - the current time, in milliseconds since the epoch
 * @param showTwelveHour - whether to show times in 12-hour format
 * @param locale - the locale to format in, by default the user's
 * @param timeZone - the time zone to format in, by default the user's
 */
export function formatChatListTimestamp(
    timestamp: number,
    now: number,
    showTwelveHour: boolean,
    locale = getUserLanguage(),
    timeZone = getUserTimezone(),
): ChatListTimestamp {
    let label: string;
    if (isShownAsTime(timestamp, now, timeZone)) {
        label = formatter(locale, timeZone, {
            ...getTwelveHourOptions(showTwelveHour),
            hour: "numeric",
            minute: "2-digit",
        }).format(timestamp);
    } else if (Math.abs(dayNumber(now, timeZone) - dayNumber(timestamp, timeZone)) < 7) {
        label = formatter(locale, timeZone, { weekday: "short" }).format(timestamp);
    } else {
        label = formatter(locale, timeZone, { dateStyle: "short" }).format(timestamp);
    }
    return {
        label,
        // As formatFullDate formats it, with seconds
        title: formatter(locale, timeZone, {
            ...getTwelveHourOptions(showTwelveHour),
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
        }).format(timestamp),
        dateTime: new Date(timestamp).toISOString(),
    };
}

/**
 * The start of the next day in the time zone: when every label in the room list may need to change.
 * @param now - the current time, in milliseconds since the epoch
 * @param timeZone - the time zone, by default the user's
 */
export function getNextMidnight(now: number, timeZone = getUserTimezone()): number {
    const tomorrow = now - timeOfDay(now, timeZone) + DAY_MS;
    // A day with a daylight saving change is an hour shorter or longer: move to the nearest midnight
    const offset = timeOfDay(tomorrow, timeZone);
    return offset < DAY_MS / 2 ? tomorrow - offset : tomorrow + DAY_MS - offset;
}

/**
 * When a label shown as a time for a message from an earlier day turns into a weekday, which happens 20 hours after
 * the message rather than at midnight. Undefined when the label changes no sooner than at the next midnight.
 * @param timestamp - when the room was last active, in milliseconds since the epoch
 * @param now - the current time, in milliseconds since the epoch
 * @param timeZone - the time zone, by default the user's
 */
export function getChatListTimestampExpiry(
    timestamp: number,
    now: number,
    timeZone = getUserTimezone(),
): number | undefined {
    const isToday = dayNumber(timestamp, timeZone) === dayNumber(now, timeZone);
    if (isToday || !isShownAsTime(timestamp, now, timeZone)) return undefined;
    return timestamp + RECENT_MS;
}
