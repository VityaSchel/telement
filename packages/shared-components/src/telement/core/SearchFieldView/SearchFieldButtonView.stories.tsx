/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { fn } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchFieldButtonView } from "./SearchFieldButtonView";

const meta = {
    title: "Telement/Core/SearchFieldButtonView",
    component: SearchFieldButtonView,
    tags: ["autodocs"],
    decorators: [
        (Story) => (
            <div style={{ width: 320 }}>
                <Story />
            </div>
        ),
    ],
    args: {
        children: "Search (Ctrl+K)",
        onClick: fn(),
    },
} satisfies Meta<typeof SearchFieldButtonView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Without a label, a circle with only the magnifier. */
export const IconOnly: Story = {
    args: { "children": undefined, "aria-label": "Search settings" },
};
