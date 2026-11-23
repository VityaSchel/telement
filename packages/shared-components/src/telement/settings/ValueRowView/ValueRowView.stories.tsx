/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { fn } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { ValueRowList, ValueRowView, type ValueRowViewActions, type ValueRowViewSnapshot } from "./ValueRowView";
import { useMockedViewModel } from "../../../core/viewmodel/useMockedViewModel";
import { withViewDocs } from "../../../../.storybook/withViewDocs";
import { SettingsStoryCard as SettingsCard } from "../SettingsStoryCard";

type ValueRowViewProps = ValueRowViewSnapshot & ValueRowViewActions;

const ValueRowViewWrapperImpl = ({
    select,
    startCustom,
    setCustomValue,
    commitCustom,
    cancelCustom,
    ...snapshot
}: ValueRowViewProps): JSX.Element => {
    const vm = useMockedViewModel(snapshot, { select, startCustom, setCustomValue, commitCustom, cancelCustom });
    return (
        <SettingsCard>
            <ValueRowView vm={vm} />
        </SettingsCard>
    );
};

const ValueRowViewWrapper = withViewDocs(ValueRowViewWrapperImpl, ValueRowView);

const ROLES = [
    { key: "0", label: "Default" },
    { key: "50", label: "Moderator" },
    { key: "100", label: "Admin" },
];

const meta = {
    title: "Telement/Settings/ValueRowView",
    component: ValueRowViewWrapper,
    tags: ["autodocs"],
    args: {
        label: "Send messages",
        value: "Default",
        options: ROLES,
        selectedKey: "0",
        disabled: false,
        select: fn(),
        startCustom: fn(),
        setCustomValue: fn(),
        commitCustom: fn(),
        cancelCustom: fn(),
    },
} satisfies Meta<typeof ValueRowViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
    args: { label: "Change permissions", value: "Admin", selectedKey: "100", disabled: true },
};

export const CustomValue: Story = {
    args: { label: "Remove users", value: "75", selectedKey: undefined, customLabel: "Custom…" },
};

export const EditingCustomValue: Story = {
    args: { label: "Remove users", value: "75", selectedKey: undefined, customLabel: "Custom…", customValue: "75" },
};

export const Person: Story = {
    args: {
        label: "BotBob",
        description: "@bot_0002:localhost",
        avatar: { id: "@bot_0002:localhost", name: "BotBob" },
        value: "Moderator",
        selectedKey: "50",
    },
};

export const LongValue: Story = {
    args: {
        label: "Audio output",
        value: "MacBook Pro Speakers (Built-in, with a very long device name)",
        options: [{ key: "default", label: "MacBook Pro Speakers (Built-in, with a very long device name)" }],
        selectedKey: "default",
    },
};

/** Rows one under another in a list, without gaps, the first and last reaching into the card's padding. */
export const List: Story = {
    render: (args) => {
        const RowsImpl = (): JSX.Element => {
            const { select, startCustom, setCustomValue, commitCustom, cancelCustom } = args;
            const actions = { select, startCustom, setCustomValue, commitCustom, cancelCustom };
            const first = useMockedViewModel({ ...args, label: "Default role" }, actions);
            const second = useMockedViewModel({ ...args, label: "Send messages" }, actions);
            const third = useMockedViewModel(
                { ...args, label: "Remove users", value: "Moderator", selectedKey: "50" },
                actions,
            );
            return (
                <SettingsCard>
                    <ValueRowList>
                        <ValueRowView vm={first} />
                        <ValueRowView vm={second} />
                        <ValueRowView vm={third} />
                    </ValueRowList>
                </SettingsCard>
            );
        };
        return <RowsImpl />;
    },
};
