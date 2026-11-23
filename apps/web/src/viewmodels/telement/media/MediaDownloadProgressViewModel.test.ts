/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as mediaDownloads from "../../../telement/media/mediaDownloads";
import { type MediaDownloadPart, MediaDownloadProgressViewModel } from "./MediaDownloadProgressViewModel";

describe("MediaDownloadProgressViewModel", () => {
    const progress = new Map<string, mediaDownloads.MediaDownloadProgress>();
    const listeners = new Map<string, () => void>();

    /** Reports a download's progress, as the downloads do. */
    const report = (mxc: string, value: mediaDownloads.MediaDownloadProgress | undefined): void => {
        if (value) progress.set(mxc, value);
        else progress.delete(mxc);
        listeners.get(mxc)?.();
    };

    beforeEach(() => {
        vi.spyOn(mediaDownloads, "getMediaDownload").mockImplementation((mxc) => progress.get(mxc));
        vi.spyOn(mediaDownloads, "watchMediaDownload").mockImplementation((mxc, listener) => {
            listeners.set(mxc, listener);
            return () => listeners.delete(mxc);
        });
        vi.spyOn(mediaDownloads, "cancelMediaDownload").mockImplementation((mxc) => report(mxc, undefined));
    });

    afterEach(() => {
        progress.clear();
        listeners.clear();
        vi.restoreAllMocks();
    });

    const create = (
        parts: MediaDownloadPart[] = [{ mxc: "mxc://server/picture", size: 100 }],
    ): { vm: MediaDownloadProgressViewModel; onCancel: () => void; onRestart: () => void } => {
        const onCancel = vi.fn();
        const onRestart = vi.fn();
        return { vm: new MediaDownloadProgressViewModel({ parts, onCancel, onRestart }), onCancel, onRestart };
    };

    it("spins until a download of the file starts", () => {
        const { vm } = create();

        expect(vm.getSnapshot()).toEqual({ state: "downloading" });
    });

    it("fills as the file arrives, against the size the server sends or the message's", () => {
        const { vm } = create();

        report("mxc://server/picture", { loaded: 25 });
        expect(vm.getSnapshot().progress).toBe(0.25);

        report("mxc://server/picture", { loaded: 25, total: 50 });
        expect(vm.getSnapshot().progress).toBe(0.5);
    });

    it("spins when neither the server nor the message gives the file's size", () => {
        const { vm } = create([{ mxc: "mxc://server/picture", size: undefined }]);

        report("mxc://server/picture", { loaded: 25 });

        expect(vm.getSnapshot().progress).toBeUndefined();
    });

    it("adds up the files of a message, counting one whose download has ended as complete", () => {
        const { vm } = create([
            { mxc: "mxc://server/thumbnail", size: 20 },
            { mxc: "mxc://server/picture", size: 80 },
        ]);

        report("mxc://server/thumbnail", { loaded: 10 });
        report("mxc://server/picture", { loaded: 20 });
        expect(vm.getSnapshot().progress).toBe(0.3);

        report("mxc://server/thumbnail", undefined);
        expect(vm.getSnapshot().progress).toBe(0.4);
    });

    it("cancels the downloads and tells the media, then starts them again on request", () => {
        const { vm, onCancel, onRestart } = create();
        report("mxc://server/picture", { loaded: 50 });

        vm.cancel();

        expect(mediaDownloads.cancelMediaDownload).toHaveBeenCalledWith("mxc://server/picture");
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(vm.getSnapshot()).toEqual({ state: "cancelled", progress: undefined });

        vm.restart();

        expect(onRestart).toHaveBeenCalledTimes(1);
        expect(vm.getSnapshot()).toEqual({ state: "downloading", progress: undefined });
        report("mxc://server/picture", { loaded: 10 });
        expect(vm.getSnapshot().progress).toBe(0.1);
    });

    it("stops watching the downloads once disposed", () => {
        const { vm } = create();

        vm.dispose();

        expect(listeners.size).toBe(0);
    });
});
