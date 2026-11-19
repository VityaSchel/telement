/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import type { Meta, StoryObj } from "@storybook/react-vite";
import { PinnedMarkView } from "./PinnedMarkView";

const meta = {
    title: "Telement/Timeline Meta/PinnedMarkView",
    component: PinnedMarkView,
    tags: ["autodocs"],
} satisfies Meta<typeof PinnedMarkView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
