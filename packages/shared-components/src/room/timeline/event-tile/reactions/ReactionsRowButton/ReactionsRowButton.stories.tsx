/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX } from "react";
import { fn } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMockedViewModel } from "../../../../../core/viewmodel";
import { withViewDocs } from "../../../../../../.storybook/withViewDocs";
import { type ReactionsRowButtonTooltipViewSnapshot } from "../ReactionsRowButtonTooltip";
import { DEFAULT_EVENT_PRESENTATION, type EventLayout, EventPresentationProvider } from "../../../EventPresentation";
import {
    ReactionsRowButtonView,
    type ReactionsRowButtonViewSnapshot,
    type ReactionsRowButtonViewActions,
} from "./ReactionsRowButtonView";

type WrapperProps = Omit<ReactionsRowButtonViewSnapshot, "tooltipVm"> &
    Partial<ReactionsRowButtonViewActions> & {
        ariaLabel?: string;
        tooltipFormattedSenders?: ReactionsRowButtonTooltipViewSnapshot["formattedSenders"];
        tooltipCaption?: ReactionsRowButtonTooltipViewSnapshot["caption"];
        tooltipOpen?: ReactionsRowButtonTooltipViewSnapshot["tooltipOpen"];
        /** The timeline's layout, which decides the chip's look. */
        layout?: EventLayout;
    };

const ReactionsRowButtonViewWrapperImpl = ({
    tooltipFormattedSenders,
    tooltipCaption,
    tooltipOpen,
    onClick,
    layout,
    ...snapshotProps
}: WrapperProps): JSX.Element => {
    const tooltipVm = useMockedViewModel(
        {
            formattedSenders: tooltipFormattedSenders,
            caption: tooltipCaption,
            tooltipOpen,
        },
        {},
    );

    const vm = useMockedViewModel(
        {
            ...snapshotProps,
            tooltipVm,
        },
        {
            onClick: onClick ?? fn(),
        },
    );

    const view = <ReactionsRowButtonView vm={vm} />;
    if (!layout) return view;
    return (
        <EventPresentationProvider value={{ ...DEFAULT_EVENT_PRESENTATION, layout }}>{view}</EventPresentationProvider>
    );
};

const ReactionsRowButtonViewWrapper = withViewDocs(ReactionsRowButtonViewWrapperImpl, ReactionsRowButtonView);

const meta = {
    title: "Timeline/Timeline Reaction/ReactionsRowButton",
    component: ReactionsRowButtonViewWrapper,
    tags: ["autodocs"],
    args: {
        content: "👍",
        count: 2,
        ariaLabel: "Alice and Bob reacted with 👍",
        isSelected: false,
        isDisabled: false,
        imageSrc: undefined,
        imageAlt: undefined,
        tooltipFormattedSenders: undefined,
        tooltipCaption: undefined,
        tooltipOpen: true,
    },
} satisfies Meta<typeof ReactionsRowButtonViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
    args: {
        isSelected: true,
    },
};

export const WithTooltip: Story = {
    args: {
        count: 3,
        tooltipFormattedSenders: "Alice, Bob and Charlie",
        tooltipCaption: "reacted with 👍",
        tooltipOpen: true,
    },
};

/** In a bubble, the avatars of the few people who reacted take the count's place, as in Telegram. */
export const WithReactors: Story = {
    args: {
        layout: "bubble",
        count: 3,
        ariaLabel: "Alice, Bob and Charlie reacted with 👍",
        tooltipFormattedSenders: "Alice, Bob and Charlie",
        tooltipCaption: "reacted with 👍",
        tooltipOpen: false,
        reactors: [
            { id: "@alice:example.org", name: "Alice" },
            { id: "@bob:example.org", name: "Bob" },
            { id: "@charlie:example.org", name: "Charlie" },
        ],
    },
};

/** Your own reaction among them, in the accent's fill. */
export const WithReactorsSelected: Story = {
    args: {
        ...WithReactors.args,
        isSelected: true,
    },
};
