/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useEffect } from "react";
import { VideoNoteBodyView, useCreateAutoDisposedViewModel } from "@element-hq/web-shared-components";

import { type IBodyProps } from "../../components/views/messages/IBodyProps";
import { useMediaVisible } from "../../hooks/useMediaVisible";
import { VideoNoteBodyViewModel } from "../../viewmodels/telement/message-body/VideoNoteBodyViewModel";

/**
 * Renders the body of a round video note (MSC4546) in the timeline.
 */
export function VideoNoteBodyFactory({
    mxEvent,
    mediaEventHelper,
    forExport,
    inhibitInteraction,
}: Readonly<Pick<IBodyProps, "mxEvent" | "mediaEventHelper" | "forExport" | "inhibitInteraction">>): JSX.Element {
    const [mediaVisible, setMediaVisible] = useMediaVisible(mxEvent);

    const vm = useCreateAutoDisposedViewModel(
        () =>
            new VideoNoteBodyViewModel({
                mxEvent,
                mediaEventHelper,
                forExport,
                inhibitInteraction,
                mediaVisible,
                onPreviewClick: (): void => setMediaVisible(true),
            }),
    );

    useEffect(() => {
        vm.loadInitialMediaIfVisible();
    }, [vm]);

    useEffect(() => {
        vm.setEvent(mxEvent, mediaEventHelper);
    }, [mxEvent, mediaEventHelper, vm]);

    useEffect(() => {
        vm.setForExport(forExport);
    }, [forExport, vm]);

    useEffect(() => {
        vm.setInhibitInteraction(inhibitInteraction);
    }, [inhibitInteraction, vm]);

    useEffect(() => {
        vm.setMediaVisible(mediaVisible);
    }, [mediaVisible, vm]);

    useEffect(() => {
        vm.setOnPreviewClick((): void => setMediaVisible(true));
    }, [setMediaVisible, vm]);

    return <VideoNoteBodyView vm={vm} className="mx_VideoNoteBody" />;
}
