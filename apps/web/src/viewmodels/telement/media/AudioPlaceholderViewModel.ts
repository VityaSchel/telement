/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { type MediaEventContent } from "matrix-js-sdk/src/types";
import {
    type AudioPlayerViewModel,
    type AudioPlayerViewSnapshot,
    BaseViewModel,
} from "@element-hq/web-shared-components";

import { presentableTextForFile } from "../../../utils/FileUtils";

/** Props for {@link AudioPlaceholderViewModel}. */
export interface AudioPlaceholderViewModelProps {
    /** The audio message whose file is downloading. */
    mxEvent: MatrixEvent;
}

const noop = (): void => {};

/**
 * The audio player of a message while its file downloads, drawn at the size it will have from what the message says:
 * the file's name, size and length, nothing played yet.
 */
export class AudioPlaceholderViewModel
    extends BaseViewModel<AudioPlayerViewSnapshot, AudioPlaceholderViewModelProps>
    implements AudioPlayerViewModel
{
    public constructor(props: AudioPlaceholderViewModelProps) {
        super(props, AudioPlaceholderViewModel.computeSnapshot(props.mxEvent));
    }

    private static computeSnapshot(mxEvent: MatrixEvent): AudioPlayerViewSnapshot {
        const content = mxEvent.getContent<MediaEventContent>();
        const durationMs = Number(content.info && "duration" in content.info ? content.info.duration : undefined);
        return {
            playbackState: "decoding",
            mediaName: presentableTextForFile(content, undefined, false),
            sizeBytes: content.info?.size,
            durationSeconds: Number.isFinite(durationMs) ? durationMs / 1000 : 0,
            playedSeconds: 0,
            percentComplete: 0,
            error: false,
        };
    }

    public onKeyDown = noop;
    public togglePlay = noop;
    public onSeekbarChange = noop;
}
