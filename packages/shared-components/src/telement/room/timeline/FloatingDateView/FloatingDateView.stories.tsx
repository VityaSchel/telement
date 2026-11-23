/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type ReactNode } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { FloatingDateView, type FloatingDateViewSnapshot } from "./FloatingDateView";
import { useMockedViewModel } from "../../../../core/viewmodel/useMockedViewModel";
import { withViewDocs } from "../../../../../.storybook/withViewDocs";

/** The pill over the top of a timeline of 480 × 160 pixels. */
const FloatingDateViewWrapperImpl = (snapshot: FloatingDateViewSnapshot): ReactNode => {
    const vm = useMockedViewModel(snapshot, {});
    return (
        <div
            style={{ position: "relative", width: 480, height: 160, background: "var(--cpd-color-bg-canvas-default)" }}
        >
            <FloatingDateView vm={vm} />
        </div>
    );
};

const FloatingDateViewWrapper = withViewDocs(FloatingDateViewWrapperImpl, FloatingDateView);

const meta = {
    title: "Telement/Timeline/FloatingDateView",
    component: FloatingDateViewWrapper,
    tags: ["autodocs"],
    args: {
        label: "Today",
        visible: true,
        endInset: 0,
    },
} satisfies Meta<typeof FloatingDateViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {};

export const LongDate: Story = {
    args: { label: "Wednesday, December 17, 2025" },
};

export const Hidden: Story = {
    args: { visible: false },
};
