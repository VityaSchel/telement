/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "matrix-js-sdk/src/logger";

import { FileDownloader } from "../../utils/FileDownloader";
import { saveFileAs } from "./saveFileAs";

vi.mock("../../utils/FileDownloader");

type PickerWindow = { showSaveFilePicker?: ReturnType<typeof vi.fn> };

describe("saveFileAs", () => {
    const blob = new Blob(["video"], { type: "video/mp4" });

    afterEach(() => {
        delete (window as PickerWindow).showSaveFilePicker;
        vi.mocked(FileDownloader).mockClear();
    });

    describe("without the File System Access API", () => {
        it("downloads the file", async () => {
            await expect(saveFileAs("video.mp4", () => Promise.resolve(blob))).resolves.toBe(true);

            expect(vi.mocked(FileDownloader).mock.instances[0].download).toHaveBeenCalledWith({
                blob,
                name: "video.mp4",
            });
        });

        it("fails when the file cannot be loaded", async () => {
            await expect(saveFileAs("video.mp4", () => Promise.reject(new Error("offline")))).rejects.toThrow(
                "offline",
            );
        });
    });

    describe("with the File System Access API", () => {
        let writable: {
            write: ReturnType<typeof vi.fn>;
            close: ReturnType<typeof vi.fn>;
            abort: ReturnType<typeof vi.fn>;
        };
        let picked: { createWritable: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };

        beforeEach(() => {
            writable = {
                write: vi.fn().mockResolvedValue(undefined),
                close: vi.fn().mockResolvedValue(undefined),
                abort: vi.fn().mockResolvedValue(undefined),
            };
            picked = {
                createWritable: vi.fn().mockResolvedValue(writable),
                remove: vi.fn().mockResolvedValue(undefined),
            };
            (window as PickerWindow).showSaveFilePicker = vi.fn().mockResolvedValue(picked);
        });

        it("opens the save dialog, then loads and writes the file", async () => {
            const { promise: picking, resolve: pick } = Promise.withResolvers<typeof picked>();
            (window as PickerWindow).showSaveFilePicker!.mockReturnValue(picking);
            const loadFile = vi.fn().mockResolvedValue(blob);

            const saved = saveFileAs("video.mp4", loadFile);
            expect((window as PickerWindow).showSaveFilePicker).toHaveBeenCalledWith({ suggestedName: "video.mp4" });
            expect(loadFile).not.toHaveBeenCalled();

            pick(picked);
            await expect(saved).resolves.toBe(true);
            expect(loadFile).toHaveBeenCalledTimes(1);
            expect(writable.write).toHaveBeenCalledWith(blob);
            expect(writable.close).toHaveBeenCalled();
            expect(FileDownloader).not.toHaveBeenCalled();
        });

        it("neither loads nor saves the file when the dialog is cancelled", async () => {
            (window as PickerWindow).showSaveFilePicker!.mockRejectedValue(new DOMException("cancelled", "AbortError"));
            const loadFile = vi.fn().mockResolvedValue(blob);

            await expect(saveFileAs("video.mp4", loadFile)).resolves.toBe(false);
            expect(loadFile).not.toHaveBeenCalled();
            expect(FileDownloader).not.toHaveBeenCalled();
        });

        it("downloads the file when the dialog cannot open", async () => {
            vi.spyOn(logger, "warn").mockImplementation(() => {});
            (window as PickerWindow).showSaveFilePicker!.mockRejectedValue(
                new DOMException("Must be handling a user gesture", "SecurityError"),
            );

            await expect(saveFileAs("video.mp4", () => Promise.resolve(blob))).resolves.toBe(true);
            expect(vi.mocked(FileDownloader).mock.instances[0].download).toHaveBeenCalledWith({
                blob,
                name: "video.mp4",
            });
        });

        it("deletes the file the dialog created when the file cannot be loaded", async () => {
            await expect(saveFileAs("video.mp4", () => Promise.reject(new Error("offline")))).rejects.toThrow(
                "offline",
            );

            expect(picked.createWritable).not.toHaveBeenCalled();
            expect(picked.remove).toHaveBeenCalled();
        });

        it("fails when the file cannot be opened for writing", async () => {
            picked.createWritable.mockRejectedValue(new DOMException("denied", "NotAllowedError"));

            await expect(saveFileAs("video.mp4", () => Promise.resolve(blob))).rejects.toThrow("denied");
            expect(picked.remove).toHaveBeenCalled();
        });

        it("discards a partly written file", async () => {
            writable.write.mockRejectedValue(new DOMException("disk full", "QuotaExceededError"));

            await expect(saveFileAs("video.mp4", () => Promise.resolve(blob))).rejects.toThrow("disk full");
            expect(writable.abort).toHaveBeenCalled();
            expect(writable.close).not.toHaveBeenCalled();
            expect(picked.remove).toHaveBeenCalled();
        });
    });
});
