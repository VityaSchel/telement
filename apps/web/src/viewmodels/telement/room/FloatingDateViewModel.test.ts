/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type MatrixEvent, type Room } from "matrix-js-sdk/src/matrix";

import SettingsStore from "../../../settings/SettingsStore";
import { type FloatingDateScrollPosition } from "../../../telement/room/FloatingDateScrollPosition";
import { FLOATING_DATE_IDLE_MS, FloatingDateViewModel } from "./FloatingDateViewModel";

describe("FloatingDateViewModel", () => {
    // Friday 2021-12-17, 9:09 in the morning
    const now = new Date("2021-12-17T08:09:00.000Z");
    const events = new Map<string, number>([
        ["$today", now.getTime() - 60_000],
        ["$wednesday", now.getTime() - 2 * 24 * 3600_000],
    ]);
    const room = {
        findEventById: (eventId: string) =>
            events.has(eventId) ? ({ getTs: () => events.get(eventId) } as MatrixEvent) : undefined,
    } as unknown as Room;

    const scrolled = (position: Partial<FloatingDateScrollPosition>): FloatingDateScrollPosition => ({
        eventId: "$today",
        separatorUnderPill: false,
        atBottom: false,
        endInset: 0,
        ...position,
    });

    let vm: FloatingDateViewModel;

    beforeEach(() => {
        vi.useFakeTimers({ now });
        vi.spyOn(SettingsStore, "getValue").mockReturnValue(true);
        vm = new FloatingDateViewModel({ room });
    });

    afterEach(() => {
        vm.dispose();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("is hidden until the timeline scrolls", () => {
        expect(vm.getSnapshot().visible).toBe(false);
    });

    it("shows the date of the first message in view, as the date separators write it", () => {
        vm.onScroll(scrolled({ eventId: "$wednesday", endInset: 8 }));

        expect(vm.getSnapshot()).toEqual({ label: "Wednesday", visible: true, endInset: 8 });

        vm.onScroll(scrolled({ eventId: "$today" }));

        expect(vm.getSnapshot().label).toBe("today");
    });

    it("hides a second after the timeline stops scrolling", () => {
        vm.onScroll(scrolled({}));
        vi.advanceTimersByTime(FLOATING_DATE_IDLE_MS - 100);
        vm.onScroll(scrolled({}));
        vi.advanceTimersByTime(FLOATING_DATE_IDLE_MS - 100);

        expect(vm.getSnapshot().visible).toBe(true);

        vi.advanceTimersByTime(100);

        expect(vm.getSnapshot().visible).toBe(false);
    });

    it("makes way for a date separator of the timeline's own under it", () => {
        vm.onScroll(scrolled({}));
        vm.onScroll(scrolled({ separatorUnderPill: true }));

        expect(vm.getSnapshot().visible).toBe(false);
    });

    it.each<[string, Partial<FloatingDateScrollPosition>]>([
        ["at the bottom of the timeline, where arriving messages scroll it", { atBottom: true }],
        ["without a message in view", { eventId: null }],
        ["for a message it can't find", { eventId: "$unknown" }],
    ])("hides at once %s", (_case, position) => {
        vm.onScroll(scrolled({}));
        vm.onScroll(scrolled(position));

        expect(vm.getSnapshot().visible).toBe(false);
    });

    it("writes dates without relative days when the deployment turns them off", () => {
        vi.mocked(SettingsStore.getValue).mockReturnValue(false);
        vm.onScroll(scrolled({ eventId: "$wednesday" }));

        expect(vm.getSnapshot().label).not.toBe("Wednesday");
        expect(vm.getSnapshot().label).toContain("2021");
    });

    it("stops its timer when disposed", () => {
        vm.onScroll(scrolled({}));
        vm.dispose();

        expect(vi.getTimerCount()).toBe(0);
    });
});
