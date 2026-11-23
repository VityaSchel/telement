/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it, vi } from "vitest";

import { LazyValue } from "./LazyValue";

describe("LazyValue", () => {
    it("gets its value once and keeps it", async () => {
        const get = vi.fn().mockResolvedValue("file");
        const value = new LazyValue(get);

        await expect(value.value).resolves.toBe("file");
        await expect(value.value).resolves.toBe("file");

        expect(get).toHaveBeenCalledTimes(1);
        expect(value.present).toBe(true);
        expect(value.cachedValue).toBe("file");
    });

    it("shares one request between callers while it runs", async () => {
        const get = vi.fn().mockResolvedValue("file");
        const value = new LazyValue(get);

        await Promise.all([value.value, value.value]);

        expect(get).toHaveBeenCalledTimes(1);
    });

    it("gets a value that failed, such as a cancelled download, again on the next request", async () => {
        const get = vi.fn().mockRejectedValueOnce(new Error("cancelled")).mockResolvedValueOnce("file");
        const value = new LazyValue(get);

        await expect(value.value).rejects.toThrow("cancelled");
        expect(value.present).toBe(false);
        await expect(value.value).resolves.toBe("file");

        expect(get).toHaveBeenCalledTimes(2);
    });
});
