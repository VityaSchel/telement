/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, describe, expect, it, vi } from "vitest";

import { cancelMediaDownload, fetchMedia, getMediaDownload, watchMediaDownload } from "./mediaDownloads";

const MXC = "mxc://server/file";

/** A response whose body arrives in the given chunks, one each time the test pushes. */
function streamingResponse(headers: Record<string, string> = {}): {
    response: Response;
    push: (bytes: number) => void;
    end: () => void;
} {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
        start(c): void {
            controller = c;
        },
    });
    return {
        response: new Response(body, { status: 200, headers }),
        push: (bytes) => controller.enqueue(new Uint8Array(bytes)),
        end: () => controller.close(),
    };
}

describe("mediaDownloads", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("counts a download's bytes against the size the server sends, and forgets it once it ends", async () => {
        const { response, push, end } = streamingResponse({ "Content-Length": "10" });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
        const listener = vi.fn();
        const stopWatching = watchMediaDownload(MXC, listener);

        const download = await fetchMedia(MXC, "https://server/file");
        expect(getMediaDownload(MXC)).toEqual({ loaded: 0, total: 10 });

        const reading = download.arrayBuffer();
        push(4);
        await vi.waitFor(() => expect(getMediaDownload(MXC)).toEqual({ loaded: 4, total: 10 }));
        push(6);
        end();

        expect((await reading).byteLength).toBe(10);
        expect(getMediaDownload(MXC)).toBeUndefined();
        expect(listener).toHaveBeenCalled();

        stopWatching();
        listener.mockClear();
        vi.mocked(fetch).mockResolvedValue(streamingResponse().response);
        await fetchMedia(MXC, "https://server/file");
        cancelMediaDownload(MXC);
        expect(listener).not.toHaveBeenCalled();
    });

    it("leaves the size unknown when the server doesn't send it", async () => {
        const { response } = streamingResponse();
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

        await fetchMedia(MXC, "https://server/file");

        expect(getMediaDownload(MXC)).toEqual({ loaded: 0 });
        cancelMediaDownload(MXC);
        expect(getMediaDownload(MXC)).toBeUndefined();
    });

    it("cancels a download, which then fails", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(
                (_url: string, init: RequestInit) =>
                    new Promise((_resolve, reject) =>
                        init.signal!.addEventListener("abort", () =>
                            reject(new DOMException("The download was cancelled", "AbortError")),
                        ),
                    ),
            ),
        );

        const download = fetchMedia(MXC, "https://server/file");
        expect(getMediaDownload(MXC)).toEqual({ loaded: 0 });

        cancelMediaDownload(MXC);

        await expect(download).rejects.toThrow("The download was cancelled");
        expect(getMediaDownload(MXC)).toBeUndefined();
    });
});
