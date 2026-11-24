/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/**
 * Whether the app's window is focused and visible, so that the user sees what it shows even while they only watch it,
 * without the input that {@link UserActivity} needs.
 */
export function isAppFocused(): boolean {
    return document.hasFocus() && document.visibilityState === "visible";
}

/**
 * Calls back each time the app has stayed focused and visible for the given time, with or without any input from the
 * user. The time starts over when the app is focused again.
 */
export class AppFocusTimer {
    private timeoutHandle?: number;
    private startedAt = 0;

    /**
     * @param delayMs - How long the app stays focused before the callback, in milliseconds.
     * @param onElapsed - Called each time that time has passed.
     */
    public constructor(
        private delayMs: number,
        private readonly onElapsed: () => void,
    ) {}

    /** Starts watching the app's focus, and the time if the app is focused already. */
    public start(): void {
        window.addEventListener("focus", this.onFocusChange);
        window.addEventListener("blur", this.onFocusChange);
        document.addEventListener("visibilitychange", this.onFocusChange);
        this.onFocusChange();
    }

    /** Stops the time and watching the app's focus. */
    public stop(): void {
        window.removeEventListener("focus", this.onFocusChange);
        window.removeEventListener("blur", this.onFocusChange);
        document.removeEventListener("visibilitychange", this.onFocusChange);
        this.clearTimeout();
    }

    /** Changes the time, counted from when the running one started. */
    public changeDelay(delayMs: number): void {
        if (delayMs === this.delayMs) return;
        this.delayMs = delayMs;
        if (this.timeoutHandle === undefined) return;
        this.clearTimeout();
        this.scheduleTimeout();
    }

    private readonly onFocusChange = (): void => {
        if (!isAppFocused()) {
            this.clearTimeout();
        } else if (this.timeoutHandle === undefined) {
            this.startedAt = Date.now();
            this.scheduleTimeout();
        }
    };

    private readonly onTimeout = (): void => {
        this.startedAt = Date.now();
        this.scheduleTimeout();
        // Focus inside an iframe, such as a widget's, leaves the app and comes back without an event on this window
        if (isAppFocused()) this.onElapsed();
    };

    private scheduleTimeout(): void {
        const elapsedMs = Date.now() - this.startedAt;
        this.timeoutHandle = window.setTimeout(this.onTimeout, Math.max(0, this.delayMs - elapsedMs));
    }

    private clearTimeout(): void {
        window.clearTimeout(this.timeoutHandle);
        this.timeoutHandle = undefined;
    }
}
