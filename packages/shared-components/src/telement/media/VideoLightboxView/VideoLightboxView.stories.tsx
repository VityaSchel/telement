/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type ReactNode } from "react";
import { fn } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react-vite";
import posterImage from "../../../../static/element.png";
import avatarImage from "../../../../static/profile-pics/profile1.png";
import {
    VideoLightboxView,
    VideoLightboxViewState,
    type VideoLightboxViewActions,
    type VideoLightboxViewSnapshot,
} from "./VideoLightboxView";
import { useMockedViewModel } from "../../../core/viewmodel/useMockedViewModel";
import { withViewDocs } from "../../../../.storybook/withViewDocs";

type VideoLightboxViewProps = VideoLightboxViewSnapshot & VideoLightboxViewActions;

const VideoLightboxViewWrapperImpl = ({
    onClose,
    onSaveClick,
    onForwardClick,
    onOptionsClick,
    onSenderClick,
    onDateClick,
    onEscape,
    togglePlay,
    seekTo,
    seekBackward,
    seekForward,
    setVolume,
    toggleMute,
    toggleFullscreen,
    toggleSpeedMenu,
    closeSpeedMenu,
    setPlaybackRate,
    onMediaUpdate,
    onMediaError,
    onUserActivity,
    setControlsHovered,
    setControlsFocused,
    ...snapshotProps
}: VideoLightboxViewProps): ReactNode => {
    const vm = useMockedViewModel(snapshotProps, {
        onClose,
        onSaveClick,
        onForwardClick,
        onOptionsClick,
        onSenderClick,
        onDateClick,
        onEscape,
        togglePlay,
        seekTo,
        seekBackward,
        seekForward,
        setVolume,
        toggleMute,
        toggleFullscreen,
        toggleSpeedMenu,
        closeSpeedMenu,
        setPlaybackRate,
        onMediaUpdate,
        onMediaError,
        onUserActivity,
        setControlsHovered,
        setControlsFocused,
    });
    return <VideoLightboxView vm={vm} />;
};

const VideoLightboxViewWrapper = withViewDocs(VideoLightboxViewWrapperImpl, VideoLightboxView);

const meta = {
    title: "Telement/Media/VideoLightboxView",
    component: VideoLightboxViewWrapper,
    tags: ["autodocs"],
    decorators: [
        // The app draws the viewer over a black backdrop. The video has no source, so that the story shows its
        // poster instead of playing.
        (Story) => (
            <div style={{ height: "560px", backgroundColor: "#000" }}>
                <Story />
            </div>
        ),
    ],
    argTypes: {
        state: {
            options: Object.values(VideoLightboxViewState),
            control: { type: "select" },
        },
        volume: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    },
    args: {
        state: VideoLightboxViewState.READY,
        senderName: "Alice",
        senderId: "@alice:example.org",
        canViewSender: true,
        senderAvatarUrl: avatarImage,
        dateLabel: "Thu, Nov 12, 2026, 10:42 AM",
        dateHref: "https://matrix.to/#/!room:example.org/$event",
        poster: posterImage,
        playing: false,
        buffering: false,
        currentTime: 12,
        duration: 65,
        currentTimeLabel: "0:12",
        durationLabel: "1:05",
        volume: 0.8,
        muted: false,
        playbackRate: 1,
        speedMenuOpen: false,
        fullscreen: false,
        canFullscreen: true,
        canSave: true,
        saving: false,
        canForward: true,
        optionsOpen: false,
        highContrast: false,
        controlsVisible: true,
        onClose: fn(),
        onSaveClick: fn(),
        onForwardClick: fn(),
        onOptionsClick: fn(),
        onSenderClick: fn(),
        onDateClick: fn(),
        onEscape: fn(),
        togglePlay: fn(),
        seekTo: fn(),
        seekBackward: fn(),
        seekForward: fn(),
        setVolume: fn(),
        toggleMute: fn(),
        toggleFullscreen: fn(),
        toggleSpeedMenu: fn(),
        closeSpeedMenu: fn(),
        setPlaybackRate: fn(),
        onMediaUpdate: fn(),
        onMediaError: fn(),
        onUserActivity: fn(),
        setControlsHovered: fn(),
        setControlsFocused: fn(),
    },
} satisfies Meta<typeof VideoLightboxViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Paused: Story = {};

export const Playing: Story = {
    args: {
        playing: true,
    },
};

/** While the video plays and the user is idle, the bars and the pointer fade out. */
export const ControlsHidden: Story = {
    args: {
        playing: true,
        controlsVisible: false,
    },
};

/** A playing video that waits for more of it to load, as a streamed video does when the connection is slow. */
export const Buffering: Story = {
    args: {
        playing: true,
        buffering: true,
    },
};

export const Muted: Story = {
    args: {
        muted: true,
    },
};

export const SpeedMenuOpen: Story = {
    args: {
        playbackRate: 1.5,
        speedMenuOpen: true,
    },
};

export const Loading: Story = {
    args: {
        state: VideoLightboxViewState.LOADING,
        currentTime: 0,
        duration: 0,
        currentTimeLabel: "0:00",
        durationLabel: "1:05",
    },
};

export const ErrorState: Story = {
    args: {
        state: VideoLightboxViewState.ERROR,
        errorLabel: "This video can't be played here. Save it to watch it in another app.",
    },
};

export const WithoutSaveOrForward: Story = {
    args: {
        canSave: false,
        canForward: false,
        canFullscreen: false,
    },
};

/** On a phone, the seek bar takes a row of its own and long names are shortened. */
export const Narrow: Story = {
    decorators: [
        // The viewer fills the window in the app, so it fills the frame here.
        (Story) => (
            <div style={{ width: "360px", height: "100%" }}>
                <Story />
            </div>
        ),
    ],
    args: {
        senderName: "Alice Wonderland-Liddell of Oxford",
    },
};
