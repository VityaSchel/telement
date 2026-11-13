/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";

import { formatVideoTime } from "./formatVideoTime";

describe("formatVideoTime", () => {
    it.each([
        [0, "0:00"],
        [5.9, "0:05"],
        [59.6, "0:59"],
        [65, "1:05"],
        [754, "12:34"],
        [3723, "1:02:03"],
    ])("formats %d seconds as %s", (seconds, label) => {
        expect(formatVideoTime(seconds)).toBe(label);
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY, -3])("formats %d as 0:00", (seconds) => {
        expect(formatVideoTime(seconds)).toBe("0:00");
    });
});
