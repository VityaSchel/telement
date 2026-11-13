/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unmockIntlDateTimeFormat } from "test-utils/date";

import { formatChatListTimestamp, getChatListTimestampExpiry, getNextMidnight } from "./formatChatListTimestamp";

const BERLIN = "Europe/Berlin";
/** Friday 2026-11-13, 12:00 in Berlin */
const NOW = Date.parse("2026-11-13T12:00:00+01:00");

// The test setup formats every date in UTC, and these tests are about time zones
beforeEach(() => {
    unmockIntlDateTimeFormat();
});

afterEach(() => {
    vi.restoreAllMocks();
});

function label(timestamp: string, options: { twelveHour?: boolean; locale?: string; timeZone?: string } = {}): string {
    return formatChatListTimestamp(
        Date.parse(timestamp),
        NOW,
        options.twelveHour ?? false,
        options.locale ?? "en-US",
        options.timeZone ?? BERLIN,
    ).label;
}

describe("formatChatListTimestamp", () => {
    it("shows the time of a message from today", () => {
        expect(label("2026-11-13T08:05:00+01:00")).toBe("08:05");
        expect(label("2026-11-13T00:00:00+01:00")).toBe("00:00");
    });

    it("shows the time in 12 or 24 hours as the user chose", () => {
        expect(label("2026-11-13T15:05:00+01:00", { twelveHour: true })).toBe("3:05 PM");
        expect(label("2026-11-13T15:05:00+01:00", { twelveHour: false })).toBe("15:05");
    });

    it("keeps showing the time of a message from yesterday for 20 hours, like Telegram Desktop", () => {
        expect(label("2026-11-12T23:30:00+01:00")).toBe("23:30");
        expect(label("2026-11-12T16:01:00+01:00")).toBe("16:01");
        expect(label("2026-11-12T15:59:00+01:00")).toBe("Thu");
    });

    it("shows the short weekday of a message from the last 7 days", () => {
        expect(label("2026-11-12T10:00:00+01:00")).toBe("Thu");
        expect(label("2026-11-07T23:59:00+01:00")).toBe("Sat");
    });

    it("shows the short date of an older message in the user's locale", () => {
        expect(label("2026-11-06T12:00:00+01:00")).toBe("11/6/26");
        expect(label("2026-11-06T12:00:00+01:00", { locale: "en-GB" })).toBe("06/11/2026");
        expect(label("2025-11-13T12:00:00+01:00", { locale: "de" })).toBe("13.11.25");
    });

    it("decides what today is in the user's time zone", () => {
        const now = Date.parse("2026-11-13T22:00:00+01:00");
        const message = Date.parse("2026-11-13T00:30:00+01:00");

        // Today in Berlin, 21.5 hours ago
        expect(formatChatListTimestamp(message, now, false, "en-US", BERLIN).label).toBe("00:30");
        // Yesterday evening in New York
        expect(formatChatListTimestamp(message, now, false, "en-US", "America/New_York").label).toBe("Thu");
    });

    it("gives the full date in the time zone as the title and the ISO date and time", () => {
        const timestamp = Date.parse("2026-11-12T10:00:00+01:00");
        const { title, dateTime } = formatChatListTimestamp(timestamp, NOW, true, "en-GB", BERLIN);

        expect(title).toBe("Thu, 12 Nov 2026, 10:00:00 am");
        expect(formatChatListTimestamp(timestamp, NOW, false, "en-US", "America/New_York").title).toBe(
            "Thu, Nov 12, 2026, 04:00:00",
        );
        expect(dateTime).toBe("2026-11-12T09:00:00.000Z");
    });

    it("makes each formatter once, as every room in view formats its time on each update", () => {
        const timestamps = ["2026-11-13T08:05:00+01:00", "2026-11-12T10:00:00+01:00", "2026-11-06T12:00:00+01:00"];
        const formatAll = (): void => {
            for (const timestamp of timestamps) {
                label(timestamp);
                getChatListTimestampExpiry(Date.parse(timestamp), NOW, BERLIN);
            }
            getNextMidnight(NOW, BERLIN);
        };
        formatAll();

        const made = vi.spyOn(Intl, "DateTimeFormat");
        formatAll();
        expect(made).not.toHaveBeenCalled();
    });

    it("makes its formatters again when the system's time zone changes, as a formatter keeps its zone", () => {
        const format = (): string => formatChatListTimestamp(NOW, NOW, false, "en-US", undefined).label;
        format();
        const made = vi.spyOn(Intl, "DateTimeFormat");
        format();
        expect(made).not.toHaveBeenCalled();

        vi.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(new Date(NOW).getTimezoneOffset() + 60);
        format();
        expect(made).toHaveBeenCalled();
    });
});

describe("getNextMidnight", () => {
    it("is the start of the next day in the time zone", () => {
        expect(getNextMidnight(NOW, BERLIN)).toBe(Date.parse("2026-11-14T00:00:00+01:00"));
        expect(getNextMidnight(NOW, "America/New_York")).toBe(Date.parse("2026-11-14T00:00:00-05:00"));
    });

    it("finds midnight across a daylight saving change", () => {
        // Berlin's clocks go forward at 02:00 on 2026-03-29, so that day is 23 hours long
        expect(getNextMidnight(Date.parse("2026-03-29T01:00:00+01:00"), BERLIN)).toBe(
            Date.parse("2026-03-30T00:00:00+02:00"),
        );
        // and back at 03:00 on 2026-10-25, which is 25 hours long
        expect(getNextMidnight(Date.parse("2026-10-25T01:00:00+02:00"), BERLIN)).toBe(
            Date.parse("2026-10-26T00:00:00+01:00"),
        );
    });
});

describe("getChatListTimestampExpiry", () => {
    it("is 20 hours after a message from yesterday that still shows its time", () => {
        const timestamp = Date.parse("2026-11-12T23:30:00+01:00");
        expect(getChatListTimestampExpiry(timestamp, NOW, BERLIN)).toBe(timestamp + 20 * 60 * 60 * 1000);
    });

    it("leaves the change of other labels to the midnight refresh", () => {
        expect(getChatListTimestampExpiry(Date.parse("2026-11-13T08:05:00+01:00"), NOW, BERLIN)).toBeUndefined();
        expect(getChatListTimestampExpiry(Date.parse("2026-11-12T10:00:00+01:00"), NOW, BERLIN)).toBeUndefined();
    });
});
