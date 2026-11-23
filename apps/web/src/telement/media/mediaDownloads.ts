/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/** How far a media file's download has come. */
export interface MediaDownloadProgress {
    /** Bytes that have arrived. */
    loaded: number;
    /** The file's size from the server's Content-Length, when it sends one. */
    total?: number;
}

interface MediaDownload {
    progress: MediaDownloadProgress;
    controller: AbortController;
}

/** The downloads of media files running now, by the file's mxc:// address. */
const downloads = new Map<string, Set<MediaDownload>>();
const listeners = new Map<string, Set<() => void>>();

function notify(mxc: string): void {
    listeners.get(mxc)?.forEach((listener) => listener());
}

function add(mxc: string, download: MediaDownload): void {
    let set = downloads.get(mxc);
    if (!set) downloads.set(mxc, (set = new Set()));
    set.add(download);
    notify(mxc);
}

function remove(mxc: string, download: MediaDownload): void {
    const set = downloads.get(mxc);
    if (!set?.delete(download)) return;
    if (set.size === 0) downloads.delete(mxc);
    notify(mxc);
}

/**
 * Downloads a media file as `fetch` does, counting the bytes of its body as they arrive, so that the timeline can
 * show the download's progress and cancel it.
 *
 * @param mxc - The file's mxc:// address, which the timeline knows it by.
 * @param url - The address to download it from.
 */
export async function fetchMedia(mxc: string, url: string): Promise<Response> {
    const download: MediaDownload = { progress: { loaded: 0 }, controller: new AbortController() };
    add(mxc, download);
    download.controller.signal.addEventListener("abort", () => remove(mxc, download));

    let response: Response;
    try {
        response = await fetch(url, { signal: download.controller.signal });
    } catch (error) {
        remove(mxc, download);
        throw error;
    }

    const length = Number(response.headers.get("Content-Length"));
    if (length > 0) download.progress = { ...download.progress, total: length };
    if (!response.ok || !response.body) {
        remove(mxc, download);
        return response;
    }

    const reader = response.body.getReader();
    const body = new ReadableStream<Uint8Array>({
        async pull(controller): Promise<void> {
            try {
                const { done, value } = await reader.read();
                if (done) {
                    remove(mxc, download);
                    controller.close();
                    return;
                }
                download.progress = { ...download.progress, loaded: download.progress.loaded + value.byteLength };
                notify(mxc);
                controller.enqueue(value);
            } catch (error) {
                remove(mxc, download);
                controller.error(error);
            }
        },
        cancel(reason): Promise<void> {
            remove(mxc, download);
            return reader.cancel(reason);
        },
    });
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

/**
 * The progress of the download of a media file, or `undefined` while none runs. When the file is being downloaded
 * more than once, such as for the timeline and for "Save as…", the first download counts.
 */
export function getMediaDownload(mxc: string): MediaDownloadProgress | undefined {
    const first = downloads.get(mxc)?.values().next().value;
    return first?.progress;
}

/**
 * Calls `listener` whenever a download of the media file starts, progresses or ends.
 *
 * @returns A function that stops calling it.
 */
export function watchMediaDownload(mxc: string, listener: () => void): () => void {
    let set = listeners.get(mxc);
    if (!set) listeners.set(mxc, (set = new Set()));
    set.add(listener);
    return () => {
        set.delete(listener);
        if (set.size === 0) listeners.delete(mxc);
    };
}

/** Cancels the downloads of a media file, which then fail with an `AbortError`. */
export function cancelMediaDownload(mxc: string): void {
    downloads.get(mxc)?.forEach((download) => download.controller.abort());
}
