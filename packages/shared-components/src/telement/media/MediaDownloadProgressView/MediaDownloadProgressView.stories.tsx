/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { fn } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
    MediaDownloadProgressView,
    type MediaDownloadProgressViewActions,
    type MediaDownloadProgressViewProps,
    type MediaDownloadProgressViewSnapshot,
} from "./MediaDownloadProgressView";
import { useMockedViewModel } from "../../../core/viewmodel/useMockedViewModel";
import { withViewDocs } from "../../../../.storybook/withViewDocs";

type WrapperProps = MediaDownloadProgressViewSnapshot &
    MediaDownloadProgressViewActions &
    Pick<MediaDownloadProgressViewProps, "size">;

const MediaDownloadProgressViewWrapperImpl = ({
    state,
    progress,
    cancel,
    restart,
    size,
}: WrapperProps): JSX.Element => {
    const vm = useMockedViewModel({ state, progress }, { cancel, restart });
    // On a picture's gray placeholder, or in a player's place for its play button
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                inlineSize: "240px",
                blockSize: "160px",
                borderRadius: "12px",
                backgroundColor: "var(--cpd-color-bg-subtle-secondary)",
            }}
        >
            <MediaDownloadProgressView vm={vm} size={size} />
        </div>
    );
};

const MediaDownloadProgressViewWrapper = withViewDocs(MediaDownloadProgressViewWrapperImpl, MediaDownloadProgressView);

const meta = {
    title: "Telement/Media/MediaDownloadProgressView",
    component: MediaDownloadProgressViewWrapper,
    tags: ["autodocs"],
    args: {
        state: "downloading",
        progress: 0.4,
        size: "large",
        cancel: fn(),
        restart: fn(),
    },
    argTypes: {
        state: { options: ["downloading", "cancelled"], control: { type: "inline-radio" } },
        size: { options: ["large", "small"], control: { type: "inline-radio" } },
        progress: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    },
} satisfies Meta<typeof MediaDownloadProgressViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Downloading: Story = {};

export const SizeUnknown: Story = { args: { progress: undefined } };

export const Cancelled: Story = { args: { state: "cancelled" } };

export const InPlayer: Story = { args: { size: "small" } };

export const InPlayerCancelled: Story = { args: { size: "small", state: "cancelled" } };
