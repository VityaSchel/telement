/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type CSSProperties, type JSX, type MouseEventHandler, type PropsWithChildren } from "react";
import classNames from "classnames";
import { FileErrorIcon, PlaySolidIcon, VisibilityOnIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { type ViewModel, useViewModel } from "../../../../../core/viewmodel";
import styles from "./VideoBodyView.module.css";

/**
 * Render states for the shared video body view.
 */
export const VideoBodyViewState = {
    ERROR: "ERROR",
    HIDDEN: "HIDDEN",
    READY: "READY",
} as const;

export type VideoBodyViewState = (typeof VideoBodyViewState)[keyof typeof VideoBodyViewState];

export interface VideoBodyViewSnapshot {
    /**
     * The current render state of the component.
     */
    state: VideoBodyViewState;
    /**
     * Accessible label of the poster, which opens the video.
     */
    playLabel?: string;
    /**
     * Label shown in the hidden-preview placeholder.
     */
    hiddenButtonLabel?: string;
    /**
     * Label rendered when media cannot be processed.
     */
    errorLabel?: string;
    /**
     * Optional width constraint for the media frame.
     */
    maxWidth?: number;
    /**
     * Optional height constraint for the media frame.
     */
    maxHeight?: number;
    /**
     * Optional aspect ratio for the media frame.
     */
    aspectRatio?: CSSProperties["aspectRatio"];
    /**
     * Poster image URL. Without one, the frame is a dark placeholder.
     */
    poster?: string;
    /**
     * The video's length, such as "1:05", shown in the frame's top corner.
     */
    durationLabel?: string;
    /**
     * Whether clicking the poster opens the video.
     */
    playable?: boolean;
    /**
     * Address the poster links to instead, for chats exported to HTML, which have no video viewer.
     */
    href?: string;
}

export interface VideoBodyViewActions {
    /**
     * Invoked when the user chooses to reveal hidden media.
     */
    onPreviewClick?: MouseEventHandler<HTMLButtonElement>;
    /**
     * Invoked when the user clicks the poster to watch the video.
     */
    onPlayClick?: () => void;
}

export type VideoBodyViewModel = ViewModel<VideoBodyViewSnapshot, VideoBodyViewActions>;

interface VideoBodyViewProps {
    /**
     * View model providing render state and actions.
     */
    vm: VideoBodyViewModel;
    /**
     * Optional host CSS class.
     */
    className?: string;
    /**
     * Optional CSS class applied to the media frame container.
     */
    containerClassName?: string;
    /**
     * Optional supplemental content rendered after the video frame.
     */
    children?: PropsWithChildren["children"];
}

/**
 * Renders the body of a video message: the video's poster with a play button and its length, or the hidden and
 * error states. The video never plays in the timeline: clicking the poster asks to open it in a viewer.
 *
 * The media frame preserves layout while loading and can render
 * supplemental content such as a file body row after the video.
 */
export function VideoBodyView({
    vm,
    className,
    containerClassName,
    children,
}: Readonly<VideoBodyViewProps>): JSX.Element {
    const {
        state,
        playLabel,
        hiddenButtonLabel,
        errorLabel,
        maxWidth,
        maxHeight,
        aspectRatio,
        poster,
        durationLabel,
        playable,
        href,
    } = useViewModel(vm);

    const rootClassName = classNames(className, styles.root);
    const resolvedContainerClassName = classNames(containerClassName, styles.container);

    // Reserve the media box on the container itself so the timeline doesn't jump
    // while the poster is still loading. The width is definite, as in ImageBodyView: inside the timestamp badge's
    // `fit-content` slot a percentage width is cyclic and the poster would shrink to its play button.
    const containerStyle: CSSProperties = {
        width: maxWidth === undefined ? undefined : `${maxWidth}px`,
        maxWidth: maxWidth === undefined ? undefined : "100%",
        maxHeight,
        aspectRatio,
    };

    if (state === VideoBodyViewState.ERROR) {
        return (
            <span className={classNames(rootClassName, styles.error)}>
                <FileErrorIcon width="16" height="16" />
                {errorLabel}
            </span>
        );
    }

    if (state === VideoBodyViewState.HIDDEN) {
        return (
            <span className={rootClassName}>
                <div className={resolvedContainerClassName} style={containerStyle}>
                    <button type="button" onClick={vm.onPreviewClick} className={styles.hiddenButton}>
                        <div className={styles.hiddenButtonContent}>
                            <VisibilityOnIcon />
                            <span>{hiddenButtonLabel}</span>
                        </div>
                    </button>
                </div>
            </span>
        );
    }

    const frameContent = (
        <>
            {poster && <img className={styles.poster} src={poster} alt="" />}
            <span className={styles.playButton}>
                <PlaySolidIcon width="28" height="28" aria-hidden="true" />
            </span>
            {durationLabel && <span className={styles.duration}>{durationLabel}</span>}
        </>
    );
    const frameClassName = classNames(resolvedContainerClassName, styles.frame);

    let frame: JSX.Element;
    if (href) {
        frame = (
            <a className={frameClassName} style={containerStyle} href={href} aria-label={playLabel}>
                {frameContent}
            </a>
        );
    } else if (playable) {
        frame = (
            <button
                type="button"
                className={frameClassName}
                style={containerStyle}
                aria-label={playLabel}
                onClick={(event): void => {
                    // Browsers differ on whether a click focuses a button. Focus it, so that focus returns here
                    // when the viewer closes.
                    event.currentTarget.focus();
                    vm.onPlayClick?.();
                }}
            >
                {frameContent}
            </button>
        );
    } else {
        frame = (
            <div className={frameClassName} style={containerStyle}>
                {frameContent}
            </div>
        );
    }

    return (
        <span className={rootClassName}>
            {frame}
            {children}
        </span>
    );
}
