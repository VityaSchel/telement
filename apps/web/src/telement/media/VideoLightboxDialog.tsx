/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useRef } from "react";
import FocusLock from "react-focus-lock";
import { type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { VideoLightboxView, useCreateAutoDisposedViewModel, useViewModel } from "@element-hq/web-shared-components";

import Modal from "../../Modal";
import MessageContextMenu from "../../components/views/context_menus/MessageContextMenu";
import { aboveLeftOf } from "../../components/structures/ContextMenu";
import { type MediaEventHelper } from "../../utils/MediaEventHelper";
import { type RoomPermalinkCreator } from "../../utils/permalinks/Permalinks";
import { VideoLightboxViewModel } from "../../viewmodels/telement/media/VideoLightboxViewModel";

interface VideoLightboxDialogProps {
    /** The video message. */
    mxEvent: MatrixEvent;
    /** The message's media helper, whose already loaded files are reused. */
    mediaEventHelper?: MediaEventHelper;
    /** Creates the link to the message that the date opens. */
    permalinkCreator?: RoomPermalinkCreator;
    /** Closes the dialog. */
    onFinished: () => void;
}

/**
 * The video viewer as a lightbox dialog. Focus moves to its play button, stays inside it while it is open and returns
 * to what had it before. Its "…" button opens the message's options menu, as the image viewer's does.
 */
export function VideoLightboxDialog({
    mxEvent,
    mediaEventHelper,
    permalinkCreator,
    onFinished,
}: VideoLightboxDialogProps): JSX.Element {
    const videoRef = useRef<HTMLVideoElement>(null);
    const vm = useCreateAutoDisposedViewModel(
        () => new VideoLightboxViewModel({ mxEvent, mediaEventHelper, permalinkCreator, videoRef, onFinished }),
    );
    useViewModel(vm);
    const optionsAnchor = vm.optionsAnchor;

    return (
        // The lock's own element must not change the layout: the view fills the lightbox itself.
        <FocusLock returnFocus={true} lockProps={{ style: { display: "contents" } }}>
            <VideoLightboxView vm={vm} videoRef={videoRef} />
            {optionsAnchor && (
                <MessageContextMenu
                    {...aboveLeftOf(optionsAnchor)}
                    mxEvent={mxEvent}
                    permalinkCreator={permalinkCreator}
                    onFinished={vm.closeOptions}
                    onCloseDialog={onFinished}
                />
            )}
        </FocusLock>
    );
}

/**
 * Opens a video message in the video viewer.
 */
export function openVideoLightbox(props: Omit<VideoLightboxDialogProps, "onFinished">): void {
    Modal.createDialog(VideoLightboxDialog, props, "mx_Dialog_lightbox", undefined, true);
}
