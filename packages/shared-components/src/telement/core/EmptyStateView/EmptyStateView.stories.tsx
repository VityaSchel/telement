/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { Button } from "@vector-im/compound-web";
import { fn } from "storybook/test";
import PlusIcon from "@vector-im/compound-design-tokens/assets/web/icons/plus";
import RoomIcon from "@vector-im/compound-design-tokens/assets/web/icons/room";
import ThreadsIcon from "@vector-im/compound-design-tokens/assets/web/icons/threads";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyStateView, type EmptyStateViewProps } from "./EmptyStateView";

/** The empty state in an area the size of a right panel card, or of a popover's list in the compact size. */
const EmptyStateViewWrapper = (props: EmptyStateViewProps): JSX.Element => (
    <div style={{ width: 320, height: props.size === "compact" ? 360 : 480, outline: "1px dashed gray" }}>
        <EmptyStateView {...props} />
    </div>
);

const meta = {
    title: "Telement/Core/EmptyStateView",
    component: EmptyStateViewWrapper,
    tags: ["autodocs"],
    args: {
        Icon: ThreadsIcon,
        title: "Threads help keep your conversations on-topic and easy to track.",
        description: "Right-click a message and choose “Reply in thread”.",
    },
} satisfies Meta<typeof EmptyStateViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Panel: Story = {};

export const PanelWithActions: Story = {
    args: {
        Icon: RoomIcon,
        title: "No rooms yet",
        description: "Add an existing room or create a new one.",
        children: (
            <>
                <Button size="md" kind="secondary" Icon={PlusIcon} onClick={fn()}>
                    Add existing room
                </Button>
                <Button size="md" kind="secondary" Icon={RoomIcon} onClick={fn()}>
                    New room
                </Button>
            </>
        ),
    },
};

export const Compact: Story = {
    args: {
        size: "compact",
        title: undefined,
        description: "You don't have unread threads you've participated in.",
    },
};
