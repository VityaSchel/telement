/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import MediaDeviceHandler, { type IMediaDevices } from "../../MediaDeviceHandler";

let known: IMediaDevices | null | undefined;
const listeners = new Set<() => void>();

/**
 * The media devices as the browser last listed them: undefined until it has, and null while it hides their names, as it
 * does until the user lets the app use one. What shows them starts with these, as the browser takes a moment to list
 * them again.
 */
export function knownMediaDevices(): IMediaDevices | null | undefined {
    return known;
}

/** Asks the browser for the media devices, and tells who watches them. */
export async function refreshMediaDevices(): Promise<void> {
    const devices = await MediaDeviceHandler.getDevices();
    const named = devices && Object.values(devices).some((kind) => kind.some(({ label }) => label));
    // A browser may hide the names again once the app stops using a device, as Firefox does: the ones it gave still stand
    known = named ? devices : (known ?? null);
    for (const listener of listeners) listener();
}

/**
 * Keeps the known media devices up to date while they are shown, as devices come and go.
 * @param listener - Called whenever the browser has listed them.
 * @returns a function that stops watching
 */
export function watchMediaDevices(listener: () => void): () => void {
    listeners.add(listener);
    navigator.mediaDevices?.addEventListener("devicechange", refreshMediaDevices);
    void refreshMediaDevices();

    return () => {
        listeners.delete(listener);
        if (!listeners.size) navigator.mediaDevices?.removeEventListener("devicechange", refreshMediaDevices);
    };
}
