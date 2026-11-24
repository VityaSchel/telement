/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { fn } from "storybook/test";
import SignOutIcon from "@vector-im/compound-design-tokens/assets/web/icons/sign-out";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActionRowView, type ActionRowViewProps } from "./ActionRowView";
import { SettingsStoryCard } from "../SettingsStoryCard";

/** The row alone on a settings card, as Leave room and Deactivate account are. */
const ActionRowViewWrapper = (props: ActionRowViewProps): JSX.Element => (
    <SettingsStoryCard>
        <ActionRowView {...props} />
    </SettingsStoryCard>
);

const meta = {
    title: "Telement/Settings/ActionRowView",
    component: ActionRowViewWrapper,
    tags: ["autodocs"],
    args: {
        kind: "critical",
        children: "Leave room",
        onClick: fn(),
    },
} satisfies Meta<typeof ActionRowViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Critical: Story = {};

export const CriticalWithIcon: Story = {
    args: { children: "Remove this device", Icon: SignOutIcon },
};

export const Accent: Story = {
    args: { kind: "accent", children: "Mark all as read" },
};

export const AccentWithStatus: Story = {
    args: { kind: "accent", children: "Check for update", value: "No update available." },
};

export const Disabled: Story = {
    args: { kind: "accent", children: "Mark all as read", disabled: true },
};

export const Navigation: Story = {
    args: { kind: "default", children: "Rooms with their own setting", value: "3", navigation: true },
};

export const Disclosure: Story = {
    args: { "kind": "default", "children": "Access token", "navigation": true, "aria-expanded": false },
};

export const DisclosureExpanded: Story = {
    args: { "kind": "default", "children": "Access token", "navigation": true, "aria-expanded": true },
};
