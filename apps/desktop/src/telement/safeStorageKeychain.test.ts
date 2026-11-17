/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { beforeEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";

import { deleteSafeStorageKeychainItem, hasSafeStorageKeychainItem } from "./safeStorageKeychain.js";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }));

const ITEM = ["-s", "Telement Safe Storage", "-a", "Telement Key"];

describe("safeStorage keychain item", () => {
    beforeEach(() => {
        vi.mocked(spawnSync).mockReset();
    });

    it("looks the item up by its attributes only, which never asks for access", () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0 } as ReturnType<typeof spawnSync>);

        expect(hasSafeStorageKeychainItem("Telement")).toBe(true);
        expect(spawnSync).toHaveBeenCalledWith("/usr/bin/security", ["find-generic-password", ...ITEM]);
    });

    it("reports a missing item", () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 44 } as ReturnType<typeof spawnSync>);

        expect(hasSafeStorageKeychainItem("Telement")).toBe(false);
    });

    it("deletes the item and reports whether it worked", () => {
        vi.mocked(spawnSync).mockReturnValueOnce({ status: 0 } as ReturnType<typeof spawnSync>);
        expect(deleteSafeStorageKeychainItem("Telement")).toBe(true);
        expect(spawnSync).toHaveBeenCalledWith("/usr/bin/security", ["delete-generic-password", ...ITEM]);

        vi.mocked(spawnSync).mockReturnValueOnce({ status: 44 } as ReturnType<typeof spawnSync>);
        expect(deleteSafeStorageKeychainItem("Telement")).toBe(false);
    });
});
