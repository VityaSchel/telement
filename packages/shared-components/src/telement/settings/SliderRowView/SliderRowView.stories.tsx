/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { fn } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
    SliderRowView,
    type SliderRowViewActions,
    type SliderRowViewProps,
    type SliderRowViewSnapshot,
} from "./SliderRowView";
import { useMockedViewModel } from "../../../core/viewmodel/useMockedViewModel";
import { withViewDocs } from "../../../../.storybook/withViewDocs";
import { SettingsStoryCard } from "../SettingsStoryCard";

type SliderRowViewStoryProps = SliderRowViewSnapshot & SliderRowViewActions & Omit<SliderRowViewProps, "vm">;

/** The row at the top of a settings card, as the font size is. */
const SliderRowViewWrapperImpl = ({
    preview,
    commit,
    start,
    end,
    ...snapshot
}: SliderRowViewStoryProps): JSX.Element => {
    const vm = useMockedViewModel(snapshot, { preview, commit });
    return (
        <SettingsStoryCard>
            <SliderRowView vm={vm} start={start} end={end} />
        </SettingsStoryCard>
    );
};

const SliderRowViewWrapper = withViewDocs(SliderRowViewWrapperImpl, SliderRowView);

const meta = {
    title: "Telement/Settings/SliderRowView",
    component: SliderRowViewWrapper,
    tags: ["autodocs"],
    args: {
        label: "Font size",
        value: "16 (default)",
        position: 7,
        lastPosition: 18,
        preview: fn(),
        commit: fn(),
    },
} satisfies Meta<typeof SliderRowViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** What the slider starts and ends at, drawn at its ends. */
export const WithEnds: Story = {
    args: {
        start: <span style={{ font: "var(--cpd-font-body-sm-regular)" }}>A</span>,
        end: <span style={{ font: "var(--cpd-font-heading-sm-regular)" }}>A</span>,
    },
};

export const AtTheStart: Story = {
    args: { value: "9", position: 0 },
};

export const AtTheEnd: Story = {
    args: { value: "36", position: 18 },
};
