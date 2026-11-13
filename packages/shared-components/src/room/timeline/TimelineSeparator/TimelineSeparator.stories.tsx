/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import TimelineSeparator from "./TimelineSeparator";

const meta = {
    title: "Timeline/Timeline Meta/TimelineSeparator",
    component: TimelineSeparator,
    tags: ["autodocs"],
    args: {
        label: "Label Separator",
        children: "Timeline Separator",
    },
} satisfies Meta<typeof TimelineSeparator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHtmlChild: Story = {
    args: {
        label: "Custom Label",
        children: <strong aria-hidden="true">Thursday</strong>,
    },
};

export const WithDateEvent: Story = {
    args: {
        label: "Date Event Separator",
        children: "Wednesday",
    },
};

export const WithLateEvent: Story = {
    args: {
        label: "Late Event Separator",
        children: "Fri, Jan 9, 2026",
    },
};
