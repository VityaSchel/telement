/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type ReactNode } from "react";
import { fn } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
    UnreadMentionsButtonView,
    type UnreadMentionsButtonViewActions,
    type UnreadMentionsButtonViewSnapshot,
} from "./UnreadMentionsButtonView";
import { useMockedViewModel } from "../../../../core/viewmodel/useMockedViewModel";
import { withViewDocs } from "../../../../../.storybook/withViewDocs";

type UnreadMentionsButtonViewProps = UnreadMentionsButtonViewSnapshot & UnreadMentionsButtonViewActions;

const UnreadMentionsButtonViewWrapperImpl = ({ onClick, ...snapshot }: UnreadMentionsButtonViewProps): ReactNode => {
    const vm = useMockedViewModel(snapshot, { onClick });
    return (
        <div style={{ padding: 16 }}>
            <UnreadMentionsButtonView vm={vm} />
        </div>
    );
};

const UnreadMentionsButtonViewWrapper = withViewDocs(UnreadMentionsButtonViewWrapperImpl, UnreadMentionsButtonView);

const meta = {
    title: "Telement/Timeline/UnreadMentionsButtonView",
    component: UnreadMentionsButtonViewWrapper,
    tags: ["autodocs"],
    args: {
        count: 2,
        onClick: fn(),
    },
} satisfies Meta<typeof UnreadMentionsButtonViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneDigit: Story = {};

export const TwoDigits: Story = {
    args: { count: 12 },
};
