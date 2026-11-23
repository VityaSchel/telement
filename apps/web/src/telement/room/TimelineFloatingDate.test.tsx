/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "test-utils-rtl";
import { type MatrixEvent, type Room } from "matrix-js-sdk/src/matrix";

import SettingsStore from "../../settings/SettingsStore";
import { measureTimelinePosition } from "./measureTimelinePosition";
import { TimelineFloatingDate } from "./TimelineFloatingDate";

vi.mock("./measureTimelinePosition", () => ({ measureTimelinePosition: vi.fn() }));

describe("TimelineFloatingDate", () => {
    const room = {
        findEventById: () => ({ getTs: () => new Date("2021-12-15T10:00:00Z").getTime() }) as MatrixEvent,
    } as unknown as Room;

    beforeEach(() => {
        vi.useFakeTimers({ now: new Date("2021-12-17T08:09:00Z") });
        vi.spyOn(SettingsStore, "getValue").mockReturnValue(true);
        vi.mocked(measureTimelinePosition).mockReturnValue({
            eventId: "$wednesday",
            separatorUnderPill: false,
            atBottom: false,
            endInset: 0,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    function renderTimeline(): HTMLElement {
        render(
            <main>
                <div className="mx_ScrollPanel mx_RoomView_messagePanel" data-testid="panel">
                    <ol className="mx_RoomView_MessageList" />
                </div>
                <TimelineFloatingDate room={room} />
            </main>,
        );
        return screen.getByTestId("panel");
    }

    const isVisible = (): boolean => !!screen.getByTestId("floating-date").className.match(/_visible_/);

    it("shows the date of the first message in view while the timeline's panel scrolls", async () => {
        const panel = renderTimeline();
        expect(isVisible()).toBe(false);

        fireEvent.scroll(panel);
        await act(() => vi.advanceTimersToNextFrame());

        expect(measureTimelinePosition).toHaveBeenCalledWith(panel);
        expect(isVisible()).toBe(true);
        expect(screen.getByText("Wednesday")).toBeInTheDocument();

        await act(() => vi.advanceTimersByTime(1000));

        expect(isVisible()).toBe(false);
    });

    it("measures once a frame however often the panel scrolls", async () => {
        const panel = renderTimeline();

        fireEvent.scroll(panel);
        fireEvent.scroll(panel);
        fireEvent.scroll(panel);
        await act(() => vi.advanceTimersToNextFrame());

        expect(measureTimelinePosition).toHaveBeenCalledTimes(1);
    });

    it("ignores other things scrolling in the timeline, such as a code block", async () => {
        renderTimeline();
        const code = document.createElement("pre");
        screen.getByTestId("panel").append(code);

        fireEvent.scroll(code);
        await act(() => vi.advanceTimersToNextFrame());

        expect(measureTimelinePosition).not.toHaveBeenCalled();
    });
});
