/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import type MediaDeviceHandler from "../../MediaDeviceHandler";
import { type IMediaDevices, MediaDeviceKindEnum } from "../../MediaDeviceHandler";

/** A microphone as the browser lists it: without its name until the app may use one. */
function devices(label: string): IMediaDevices {
    return {
        [MediaDeviceKindEnum.AudioInput]: [{ deviceId: "1", label }],
        [MediaDeviceKindEnum.AudioOutput]: [],
        [MediaDeviceKindEnum.VideoInput]: [],
    } as unknown as IMediaDevices;
}

describe("mediaDevices", () => {
    let mediaDevices: typeof import("./mediaDevices");
    let listed: MockInstance<typeof MediaDeviceHandler.getDevices>;
    let browser: EventTarget;

    beforeEach(async () => {
        // Nothing known from an earlier test
        vi.resetModules();
        mediaDevices = await import("./mediaDevices");
        listed = vi.spyOn((await import("../../MediaDeviceHandler")).default, "getDevices");
        browser = new EventTarget();
        Object.defineProperty(navigator, "mediaDevices", { value: browser, configurable: true });
    });

    it("knows nothing until the browser has listed the devices, then those it listed", async () => {
        expect(mediaDevices.knownMediaDevices()).toBeUndefined();

        listed.mockResolvedValue(devices("Built-in"));
        await mediaDevices.refreshMediaDevices();
        expect(mediaDevices.knownMediaDevices()).toEqual(devices("Built-in"));
    });

    it("tells a browser that hides the names, or has no devices to list, from one not asked yet", async () => {
        listed.mockResolvedValue(devices(""));
        await mediaDevices.refreshMediaDevices();
        expect(mediaDevices.knownMediaDevices()).toBeNull();

        listed.mockResolvedValue(undefined);
        await mediaDevices.refreshMediaDevices();
        expect(mediaDevices.knownMediaDevices()).toBeNull();
    });

    it("keeps the names a browser gave once it hides them again", async () => {
        listed.mockResolvedValue(devices("Built-in"));
        await mediaDevices.refreshMediaDevices();
        listed.mockResolvedValue(devices(""));
        await mediaDevices.refreshMediaDevices();

        expect(mediaDevices.knownMediaDevices()).toEqual(devices("Built-in"));
    });

    it("lists the devices again as they come and go while they are watched", async () => {
        listed.mockResolvedValue(devices("Built-in"));
        const listener = vi.fn();
        const stop = mediaDevices.watchMediaDevices(listener);
        await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1));

        listed.mockResolvedValue(devices("Headset"));
        browser.dispatchEvent(new Event("devicechange"));
        await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(2));
        expect(mediaDevices.knownMediaDevices()).toEqual(devices("Headset"));

        stop();
        browser.dispatchEvent(new Event("devicechange"));
        expect(listed).toHaveBeenCalledTimes(2);
    });
});
