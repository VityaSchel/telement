/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type SyntheticEvent, useEffect, useRef } from "react";
import classNames from "classnames";
import {
    FileErrorIcon,
    PlaySolidIcon,
    VisibilityOnIcon,
    VolumeOffSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import { InlineSpinner } from "@vector-im/compound-web";

import { type ViewModel, useViewModel } from "../../../../core/viewmodel";
import styles from "./VideoNoteBodyView.module.css";

/**
 * Render states of a video note body.
 */
export const VideoNoteBodyViewState = {
    ERROR: "ERROR",
    HIDDEN: "HIDDEN",
    LOADING: "LOADING",
    READY: "READY",
} as const;

export type VideoNoteBodyViewState = (typeof VideoNoteBodyViewState)[keyof typeof VideoNoteBodyViewState];

/**
 * Playback modes of a ready video note.
 *
 * In `PREVIEW` the note is idle, or loops silently when the user allows videos to autoplay.
 * `PLAYING` and `PAUSED` are playback with sound that the user started.
 */
export const VideoNotePlaybackState = {
    PREVIEW: "PREVIEW",
    PLAYING: "PLAYING",
    PAUSED: "PAUSED",
} as const;

export type VideoNotePlaybackState = (typeof VideoNotePlaybackState)[keyof typeof VideoNotePlaybackState];

export interface VideoNoteBodyViewSnapshot {
    /**
     * The current render state.
     */
    state: VideoNoteBodyViewState;
    /**
     * Diameter of the circle in pixels.
     */
    diameter: number;
    /**
     * Video source URL.
     */
    src?: string;
    /**
     * Poster image URL shown until the video plays.
     */
    poster?: string;
    /**
     * Whether the note loops silently while in the preview state.
     */
    loopPreview?: boolean;
    /**
     * Current playback mode.
     */
    playbackState?: VideoNotePlaybackState;
    /**
     * Playback progress from 0 to 1, drawn as a ring while playing or paused.
     */
    progress?: number;
    /**
     * Time shown in the badge, such as "0:12".
     */
    timeLabel?: string;
    /**
     * Accessible label of the button that plays or pauses the note.
     */
    toggleLabel?: string;
    /**
     * Label of the button that reveals hidden media.
     */
    hiddenButtonLabel?: string;
    /**
     * Label shown when the media cannot be loaded.
     */
    errorLabel?: string;
}

export interface VideoNoteBodyViewActions {
    /**
     * Invoked when the user chooses to reveal hidden media.
     */
    onPreviewClick?: () => void;
    /**
     * Invoked when the user clicks the note to play or pause it.
     */
    onToggle?: () => void;
    /**
     * Invoked as playback progresses.
     */
    onTimeUpdate?: (currentTimeSeconds: number, durationSeconds: number) => void;
    /**
     * Invoked when playback with sound reaches the end.
     */
    onEnded?: () => void;
}

export type VideoNoteBodyViewModel = ViewModel<VideoNoteBodyViewSnapshot, VideoNoteBodyViewActions>;

interface VideoNoteBodyViewProps {
    /**
     * View model providing render state and actions.
     */
    vm: VideoNoteBodyViewModel;
    /**
     * Optional host CSS class.
     */
    className?: string;
}

/**
 * Plays the media element according to the playback state, which the `<video>` attributes alone can't express:
 * starting playback with sound restarts a note that was looping silently.
 */
function useVideoPlayback(
    state: VideoNoteBodyViewState,
    playbackState: VideoNotePlaybackState,
    loopPreview: boolean,
): React.RefObject<HTMLVideoElement | null> {
    const videoRef = useRef<HTMLVideoElement>(null);
    const previousPlaybackState = useRef<VideoNotePlaybackState>(playbackState);

    useEffect(() => {
        const video = videoRef.current;
        if (state !== VideoNoteBodyViewState.READY || !video) return;

        const previous = previousPlaybackState.current;
        previousPlaybackState.current = playbackState;
        const inPreview = playbackState === VideoNotePlaybackState.PREVIEW;
        video.muted = inPreview;
        video.loop = inPreview;

        if (playbackState === VideoNotePlaybackState.PLAYING) {
            if (previous === VideoNotePlaybackState.PREVIEW) video.currentTime = 0;
            playIgnoringInterruptions(video);
        } else if (inPreview && loopPreview) {
            playIgnoringInterruptions(video);
        } else {
            video.pause();
            if (inPreview) video.currentTime = 0;
        }
    }, [state, playbackState, loopPreview]);

    return videoRef;
}

function playIgnoringInterruptions(video: HTMLVideoElement): void {
    // play() rejects when a later pause() interrupts it, which is expected here.
    video.play()?.catch(() => {});
}

/**
 * Renders a round video message ("video note"): a circle that loops silently in the timeline
 * and plays with sound when clicked, with a progress ring and a time badge.
 */
export function VideoNoteBodyView({ vm, className }: Readonly<VideoNoteBodyViewProps>): JSX.Element {
    const {
        state,
        diameter,
        src,
        poster,
        loopPreview = false,
        playbackState = VideoNotePlaybackState.PREVIEW,
        progress = 0,
        timeLabel,
        toggleLabel,
        hiddenButtonLabel,
        errorLabel,
    } = useViewModel(vm);
    const videoRef = useVideoPlayback(state, playbackState, loopPreview);

    if (state === VideoNoteBodyViewState.ERROR) {
        return (
            <span className={classNames(className, styles.error)}>
                <FileErrorIcon width="16" height="16" />
                {errorLabel}
            </span>
        );
    }

    const circleStyle = { width: diameter, height: diameter };

    if (state === VideoNoteBodyViewState.HIDDEN) {
        return (
            <div className={classNames(className, styles.circle)} style={circleStyle}>
                <button type="button" className={styles.hiddenButton} onClick={vm.onPreviewClick}>
                    <VisibilityOnIcon width="24" height="24" />
                    <span>{hiddenButtonLabel}</span>
                </button>
            </div>
        );
    }

    if (state === VideoNoteBodyViewState.LOADING) {
        return (
            <div className={classNames(className, styles.circle, styles.loading)} style={circleStyle}>
                <InlineSpinner aria-label="Loading..." role="progressbar" />
            </div>
        );
    }

    const inPreview = playbackState === VideoNotePlaybackState.PREVIEW;
    const onTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>): void => {
        vm.onTimeUpdate?.(event.currentTarget.currentTime, event.currentTarget.duration);
    };

    return (
        <div className={classNames(className, styles.circle)} style={circleStyle}>
            <video
                ref={videoRef}
                className={styles.video}
                src={src}
                poster={poster}
                preload={loopPreview ? "auto" : "metadata"}
                muted={inPreview}
                loop={inPreview}
                playsInline
                crossOrigin="anonymous"
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onTimeUpdate}
                onEnded={vm.onEnded}
            />
            {!inPreview && (
                <svg className={styles.progress} viewBox="0 0 100 100" aria-hidden="true">
                    <circle className={styles.progressTrack} cx="50" cy="50" r="48" />
                    <circle
                        className={styles.progressValue}
                        cx="50"
                        cy="50"
                        r="48"
                        pathLength={1}
                        strokeDasharray="1"
                        strokeDashoffset={1 - Math.min(Math.max(progress, 0), 1)}
                    />
                </svg>
            )}
            {playbackState === VideoNotePlaybackState.PAUSED && (
                <PlaySolidIcon className={styles.pausedIcon} width="48" height="48" aria-hidden="true" />
            )}
            <button
                type="button"
                className={styles.toggle}
                aria-label={toggleLabel}
                aria-pressed={playbackState === VideoNotePlaybackState.PLAYING}
                onClick={vm.onToggle}
            />
            {timeLabel && (
                <span className={styles.badge}>
                    {timeLabel}
                    {inPreview && <VolumeOffSolidIcon width="12" height="12" aria-hidden="true" />}
                </span>
            )}
        </div>
    );
}
