/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessageStatusView } from "./MessageStatusView";

const meta = {
    title: "Telement/Timeline Meta/MessageStatusView",
    component: MessageStatusView,
    tags: ["autodocs"],
    args: {
        status: "sent",
    },
    argTypes: {
        status: {
            options: ["sending", "sent", "read", "failed"],
            control: { type: "inline-radio" },
        },
    },
} satisfies Meta<typeof MessageStatusView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sending: Story = { args: { status: "sending" } };

export const Sent: Story = {};

export const Read: Story = { args: { status: "read" } };

export const Failed: Story = { args: { status: "failed" } };
