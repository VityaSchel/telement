/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type MouseEvent } from "react";
import classNames from "classnames";
import { CloseIcon, DownloadIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../../core/i18n/i18n";
import { type ViewModel } from "../../../core/viewmodel/ViewModel";
import { useViewModel } from "../../../core/viewmodel/useViewModel";
import styles from "./MediaDownloadProgressView.module.css";

/** What {@link MediaDownloadProgressView} shows. */
export interface MediaDownloadProgressViewSnapshot {
    /** Whether the file is downloading, or the user cancelled its download. */
    state: "downloading" | "cancelled";
    /** How much of the file has arrived, from 0 to 1, when its size is known. Without it the ring spins. */
    progress?: number;
}

/** What {@link MediaDownloadProgressView} can do. */
export interface MediaDownloadProgressViewActions {
    /** Stops the download. */
    cancel: () => void;
    /** Starts the download again after it was cancelled. */
    restart: () => void;
}

/** The view model of {@link MediaDownloadProgressView}. */
export type MediaDownloadProgressViewModel = ViewModel<
    MediaDownloadProgressViewSnapshot,
    MediaDownloadProgressViewActions
>;

/** Props for {@link MediaDownloadProgressView}. */
export interface MediaDownloadProgressViewProps {
    /** The view model. */
    vm: MediaDownloadProgressViewModel;
    /**
     * `large`: a 48px dark disc over a picture's placeholder. `small`: in place of a player's 32px play button, in
     * its colors.
     */
    size?: "large" | "small";
    /** Extra class name for the root. */
    className?: string;
}

/** The ring's radius in each size: 4px inside a large disc's edge and 3px inside a small one's, on a 2px line. */
const RADIUS = { large: 20, small: 13 };
const BOX = { large: 48, small: 32 };

/**
 * Telegram's download ring: while a file downloads, a ring that fills as it arrives, or spins while its size is
 * unknown, around a × that cancels the download. Once cancelled, a download arrow starts it again.
 */
export function MediaDownloadProgressView({
    vm,
    size = "large",
    className,
}: Readonly<MediaDownloadProgressViewProps>): JSX.Element {
    const { state, progress } = useViewModel(vm);
    const downloading = state === "downloading";
    const radius = RADIUS[size];
    const box = BOX[size];
    const circumference = 2 * Math.PI * radius;
    // An unknown size spins a quarter of the ring
    const filled = progress === undefined ? 0.25 : Math.min(Math.max(progress, 0), 1);

    // The ring sits in a picture's link or a player's region: its click is its own
    const onClick = (ev: MouseEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();
        if (downloading) vm.cancel();
        else vm.restart();
    };

    return (
        <span className={classNames(styles.root, styles[size], className)}>
            <button
                type="button"
                className={styles.button}
                aria-label={downloading ? _t("telement|media|cancel_download") : _t("action|download")}
                onClick={onClick}
            >
                {downloading ? <CloseIcon aria-hidden /> : <DownloadIcon aria-hidden />}
            </button>
            {downloading && (
                <svg
                    className={classNames(styles.ring, { [styles.indeterminate]: progress === undefined })}
                    viewBox={`0 0 ${box} ${box}`}
                    role="progressbar"
                    aria-label={_t("timeline|download_action_downloading")}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress === undefined ? undefined : Math.round(filled * 100)}
                >
                    <circle
                        className={styles.arc}
                        cx={box / 2}
                        cy={box / 2}
                        r={radius}
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - filled)}
                    />
                </svg>
            )}
        </span>
    );
}
