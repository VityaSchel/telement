/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { spawnSync } from "node:child_process";

const SECURITY = "/usr/bin/security";

/**
 * The macOS keychain item in which Electron keeps the key of safeStorage and of Chromium's cookie encryption. Only the
 * app that created it may read it without asking, and a build signed differently counts as another app.
 */
function keychainItemArgs(appName: string): string[] {
    return ["-s", `${appName} Safe Storage`, "-a", `${appName} Key`];
}

/**
 * Whether the app's safeStorage keychain item exists. Looking it up reads only its attributes, so it never asks the
 * user for access.
 */
export function hasSafeStorageKeychainItem(appName: string): boolean {
    return spawnSync(SECURITY, ["find-generic-password", ...keychainItemArgs(appName)]).status === 0;
}

/**
 * Deletes the app's safeStorage keychain item, which works even when the user denied reading it. Electron then makes a
 * new key on the next launch, without asking. Returns whether the item was deleted.
 */
export function deleteSafeStorageKeychainItem(appName: string): boolean {
    return spawnSync(SECURITY, ["delete-generic-password", ...keychainItemArgs(appName)]).status === 0;
}
