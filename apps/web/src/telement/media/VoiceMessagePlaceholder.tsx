/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { Clock, MediaBody } from "@element-hq/web-shared-components";

import Waveform from "../../components/views/audio_messages/Waveform";
import { DEFAULT_WAVEFORM, PLAYBACK_WAVEFORM_SAMPLES } from "../../audio/consts";
import { arrayFastResample, arraySeed, arrayTrimFill } from "../../utils/arrays";
import { MediaDownloadRing } from "./MediaDownloadRing";
import { getMediaDownloadParts } from "./getMediaDownloadParts";

/** Props for {@link VoiceMessagePlaceholder}. */
interface VoiceMessagePlaceholderProps {
    /** The voice message whose file is still downloading. */
    mxEvent: MatrixEvent;
    /** Called once the user cancelled the download. */
    onCancel: () => void;
    /** Called when the user starts it again. */
    onRestart: () => void;
}

/**
 * A voice message's player while its file downloads, at the size the player will have, so that the message doesn't
 * grow when the player takes its place: the download's ring in place of the play button, as in Telegram, the waveform
 * the message carries and its duration.
 */
export function VoiceMessagePlaceholder({
    mxEvent,
    onCancel,
    onRestart,
}: Readonly<VoiceMessagePlaceholderProps>): JSX.Element {
    const content = mxEvent.getContent();
    // The waveform and the duration the player starts with (MAudioBody and PlaybackClock)
    const waveform = content["org.matrix.msc1767.audio"]?.waveform?.map((point: number) => point / 1024);
    const heights = arrayTrimFill(
        arrayFastResample(waveform ?? DEFAULT_WAVEFORM, PLAYBACK_WAVEFORM_SAMPLES),
        PLAYBACK_WAVEFORM_SAMPLES,
        arraySeed(0, PLAYBACK_WAVEFORM_SAMPLES),
    );
    const durationMs = Number(content.info?.duration);

    return (
        <MediaBody className="mx_VoiceMessagePrimaryContainer" aria-busy={true}>
            <MediaDownloadRing
                parts={getMediaDownloadParts(mxEvent)}
                onCancel={onCancel}
                onRestart={onRestart}
                size="small"
            />
            <div className="mx_RecordingPlayback_timelineLayoutMiddle">
                <Waveform relHeights={heights} progress={0} />
            </div>
            <Clock seconds={Number.isFinite(durationMs) ? durationMs / 1000 : 0} role="timer" />
        </MediaBody>
    );
}
