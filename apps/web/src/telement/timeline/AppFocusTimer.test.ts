/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppFocusTimer, isAppFocused } from "./AppFocusTimer";

const DELAY_MS = 3000;

describe("AppFocusTimer", () => {
    const onElapsed = vi.fn();
    let timer: AppFocusTimer;

    const setFocused = (focused: boolean, notifyWindow = true): void => {
        vi.spyOn(document, "hasFocus").mockReturnValue(focused);
        if (notifyWindow) window.dispatchEvent(new Event(focused ? "focus" : "blur"));
    };

    const setVisible = (visible: boolean): void => {
        vi.spyOn(document, "visibilityState", "get").mockReturnValue(visible ? "visible" : "hidden");
        document.dispatchEvent(new Event("visibilitychange"));
    };

    beforeEach(() => {
        vi.useFakeTimers();
        setFocused(true);
        setVisible(true);
        timer = new AppFocusTimer(DELAY_MS, onElapsed);
        onElapsed.mockClear();
    });

    afterEach(() => {
        timer.stop();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("takes the app as focused only while its window is both focused and visible", () => {
        expect(isAppFocused()).toBe(true);
        setVisible(false);
        expect(isAppFocused()).toBe(false);
        setVisible(true);
        setFocused(false);
        expect(isAppFocused()).toBe(false);
    });

    it("calls back each time the app has stayed focused for the delay", () => {
        timer.start();
        vi.advanceTimersByTime(DELAY_MS - 1);
        expect(onElapsed).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(onElapsed).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(DELAY_MS);
        expect(onElapsed).toHaveBeenCalledTimes(2);
    });

    it("waits for the focus if the app isn't focused when it starts", () => {
        setFocused(false);
        timer.start();
        vi.advanceTimersByTime(2 * DELAY_MS);
        expect(onElapsed).not.toHaveBeenCalled();

        setFocused(true);
        vi.advanceTimersByTime(DELAY_MS);
        expect(onElapsed).toHaveBeenCalledTimes(1);
    });

    it.each([
        ["loses the focus", setFocused],
        ["is hidden", setVisible],
    ])("starts the time over after the app %s", (_, setAttended) => {
        timer.start();
        vi.advanceTimersByTime(DELAY_MS - 1);
        setAttended(false);
        vi.advanceTimersByTime(2 * DELAY_MS);
        expect(onElapsed).not.toHaveBeenCalled();

        setAttended(true);
        vi.advanceTimersByTime(DELAY_MS - 1);
        expect(onElapsed).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(onElapsed).toHaveBeenCalledTimes(1);
    });

    it("keeps the time running while the focus moves to an iframe, which blurs the window but not the app", () => {
        timer.start();
        vi.advanceTimersByTime(DELAY_MS - 1);
        window.dispatchEvent(new Event("blur"));
        vi.advanceTimersByTime(1);
        expect(onElapsed).toHaveBeenCalledTimes(1);
    });

    it("doesn't call back while an iframe that had the focus has lost it, but does once it has it again", () => {
        timer.start();
        setFocused(false, false);
        vi.advanceTimersByTime(2 * DELAY_MS);
        expect(onElapsed).not.toHaveBeenCalled();

        setFocused(true, false);
        vi.advanceTimersByTime(DELAY_MS);
        expect(onElapsed).toHaveBeenCalledTimes(1);
    });

    it("counts a changed delay from when the time started", () => {
        timer.start();
        vi.advanceTimersByTime(1000);
        timer.changeDelay(10 * DELAY_MS);
        vi.advanceTimersByTime(DELAY_MS);
        expect(onElapsed).not.toHaveBeenCalled();

        timer.changeDelay(DELAY_MS);
        vi.advanceTimersByTime(0);
        expect(onElapsed).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(DELAY_MS);
        expect(onElapsed).toHaveBeenCalledTimes(2);
    });

    it("starts no time for a changed delay while the app isn't focused", () => {
        timer.start();
        setFocused(false);
        timer.changeDelay(1);
        setFocused(true, false);
        vi.advanceTimersByTime(DELAY_MS);
        expect(onElapsed).not.toHaveBeenCalled();
    });

    it("calls back no more once stopped", () => {
        timer.start();
        timer.stop();
        setFocused(true);
        vi.advanceTimersByTime(2 * DELAY_MS);
        expect(onElapsed).not.toHaveBeenCalled();
    });
});
