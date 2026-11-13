/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type ReactNode } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import posterImage from "../../../../../static/element.png";
import demoVideo from "../../../../../static/videoBodyDemo.webm";
import {
    VideoNoteBodyView,
    VideoNoteBodyViewState,
    VideoNotePlaybackState,
    type VideoNoteBodyViewActions,
    type VideoNoteBodyViewSnapshot,
} from "./VideoNoteBodyView";
import { useMockedViewModel } from "../../../../core/viewmodel/useMockedViewModel";
import { withViewDocs } from "../../../../../.storybook/withViewDocs";

type VideoNoteBodyViewProps = VideoNoteBodyViewSnapshot & VideoNoteBodyViewActions;

const VideoNoteBodyViewWrapperImpl = ({
    onPreviewClick,
    onToggle,
    onTimeUpdate,
    onEnded,
    ...snapshotProps
}: VideoNoteBodyViewProps): ReactNode => {
    const vm = useMockedViewModel(snapshotProps, { onPreviewClick, onToggle, onTimeUpdate, onEnded });
    return <VideoNoteBodyView vm={vm} />;
};

const VideoNoteBodyViewWrapper = withViewDocs(VideoNoteBodyViewWrapperImpl, VideoNoteBodyView);

const meta = {
    title: "Telement/Timeline Body/VideoNoteBodyView",
    component: VideoNoteBodyViewWrapper,
    tags: ["autodocs"],
    argTypes: {
        state: {
            options: Object.values(VideoNoteBodyViewState),
            control: { type: "select" },
        },
        playbackState: {
            options: Object.values(VideoNotePlaybackState),
            control: { type: "select" },
        },
        progress: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    },
    args: {
        state: VideoNoteBodyViewState.READY,
        diameter: 240,
        src: demoVideo,
        poster: posterImage,
        loopPreview: false,
        playbackState: VideoNotePlaybackState.PREVIEW,
        progress: 0,
        timeLabel: "0:05",
        toggleLabel: "Play video message",
        hiddenButtonLabel: "Show video",
        errorLabel: "Error decrypting video",
    },
} satisfies Meta<typeof VideoNoteBodyViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Paused: Story = {
    args: {
        playbackState: VideoNotePlaybackState.PAUSED,
        progress: 0.4,
        timeLabel: "0:02",
        toggleLabel: "Play video message",
    },
};

export const Hidden: Story = {
    args: {
        state: VideoNoteBodyViewState.HIDDEN,
    },
};

export const Loading: Story = {
    args: {
        state: VideoNoteBodyViewState.LOADING,
    },
};

export const ErrorState: Story = {
    args: {
        state: VideoNoteBodyViewState.ERROR,
    },
};
