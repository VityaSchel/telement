/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { AudioPlayerView, useCreateAutoDisposedViewModel } from "@element-hq/web-shared-components";

import { AudioPlaceholderViewModel } from "../../viewmodels/telement/media/AudioPlaceholderViewModel";
import { MediaDownloadRing } from "./MediaDownloadRing";
import { getMediaDownloadParts } from "./getMediaDownloadParts";

/** Props for {@link AudioPlaceholder}. */
interface AudioPlaceholderProps {
    /** The audio message whose file is downloading. */
    mxEvent: MatrixEvent;
    /** Called once the user cancelled the download. */
    onCancel: () => void;
    /** Called when the user starts it again. */
    onRestart: () => void;
}

/**
 * An audio message's player while its file downloads, at the size the player will have, so that the message doesn't
 * grow when the player takes its place, with the download's ring in place of the play button, as in Telegram.
 */
export function AudioPlaceholder({ mxEvent, onCancel, onRestart }: Readonly<AudioPlaceholderProps>): JSX.Element {
    const vm = useCreateAutoDisposedViewModel(() => new AudioPlaceholderViewModel({ mxEvent }));
    return (
        <AudioPlayerView
            vm={vm}
            playButton={
                <MediaDownloadRing
                    parts={getMediaDownloadParts(mxEvent)}
                    onCancel={onCancel}
                    onRestart={onRestart}
                    size="small"
                />
            }
        />
    );
}
