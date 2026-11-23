/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import {
    BaseViewModel,
    type MediaDownloadProgressViewActions,
    type MediaDownloadProgressViewSnapshot,
} from "@element-hq/web-shared-components";

import {
    cancelMediaDownload,
    getMediaDownload,
    type MediaDownloadProgress,
    watchMediaDownload,
} from "../../../telement/media/mediaDownloads";

/** A file a message's media needs, such as its picture and the picture's thumbnail. */
export interface MediaDownloadPart {
    /** The file's mxc:// address. */
    mxc: string;
    /** The file's size from the message, used while the server doesn't say. */
    size?: number;
}

/** Props for {@link MediaDownloadProgressViewModel}. */
export interface MediaDownloadProgressViewModelProps {
    /** The files whose downloads the ring shows together. */
    parts: MediaDownloadPart[];
    /** Called once the downloads are cancelled, so that the media stops waiting for them. */
    onCancel: () => void;
    /** Called when the user starts the downloads again. */
    onRestart: () => void;
}

/**
 * The download ring of a message's media: how much of its files has arrived, while they download, or a download
 * arrow once the user cancelled them. The ring spins while nothing is known about the files' sizes, such as for a
 * picture the browser loads itself.
 */
export class MediaDownloadProgressViewModel
    extends BaseViewModel<MediaDownloadProgressViewSnapshot, MediaDownloadProgressViewModelProps>
    implements MediaDownloadProgressViewActions
{
    /** The last progress seen of each file, so that a file whose download ended counts as complete. */
    private readonly seen = new Map<string, MediaDownloadProgress>();

    public constructor(props: MediaDownloadProgressViewModelProps) {
        super(props, { state: "downloading" });
        for (const { mxc } of props.parts) {
            this.disposables.track(watchMediaDownload(mxc, this.update));
        }
        this.update();
    }

    private readonly update = (): void => {
        if (this.snapshot.current.state === "cancelled") return;
        this.snapshot.merge({ progress: this.computeProgress() });
    };

    /** The share of the files that has arrived, in whole percent so that it changes no more than a hundred times. */
    private computeProgress(): number | undefined {
        let loaded = 0;
        let total = 0;
        for (const { mxc, size } of this.props.parts) {
            const download = getMediaDownload(mxc);
            const last = this.seen.get(mxc);
            if (download) this.seen.set(mxc, download);
            else if (!last) continue;

            const fileTotal = (download ?? last)?.total ?? size;
            if (!fileTotal) return undefined;
            total += fileTotal;
            // A download that has ended has brought the whole file
            loaded += download ? Math.min(download.loaded, fileTotal) : fileTotal;
        }
        if (total === 0) return undefined;
        return Math.floor((loaded / total) * 100) / 100;
    }

    public cancel = (): void => {
        this.snapshot.merge({ state: "cancelled", progress: undefined });
        for (const { mxc } of this.props.parts) cancelMediaDownload(mxc);
        this.props.onCancel();
    };

    public restart = (): void => {
        this.seen.clear();
        this.snapshot.merge({ state: "downloading", progress: undefined });
        this.props.onRestart();
        this.update();
    };
}
