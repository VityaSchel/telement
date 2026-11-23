/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { MediaDownloadProgressView, useCreateAutoDisposedViewModel } from "@element-hq/web-shared-components";

import {
    type MediaDownloadPart,
    MediaDownloadProgressViewModel,
} from "../../viewmodels/telement/media/MediaDownloadProgressViewModel";

/** Props for {@link MediaDownloadRing}. */
interface MediaDownloadRingProps {
    /** `large` over a picture, `small` in place of a player's play button. */
    size?: "large" | "small";
    /** Extra class name for the ring. */
    className?: string;
    /** The files the media is downloading, see {@link MediaDownloadProgressViewModel}. */
    parts: MediaDownloadPart[];
    /** Called once the user cancelled the downloads. */
    onCancel: () => void;
    /** Called when the user starts them again. */
    onRestart: () => void;
}

/** The download ring of a message's media while its files download, which cancels and restarts them. */
export function MediaDownloadRing({
    parts,
    onCancel,
    onRestart,
    size,
    className,
}: MediaDownloadRingProps): JSX.Element {
    const vm = useCreateAutoDisposedViewModel(() => new MediaDownloadProgressViewModel({ parts, onCancel, onRestart }));
    return <MediaDownloadProgressView vm={vm} size={size} className={className} />;
}
