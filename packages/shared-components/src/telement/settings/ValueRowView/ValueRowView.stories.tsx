/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";

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

const TIME_ZONES = [
    "Africa/Abidjan",
    "Africa/Cairo",
    "Africa/Johannesburg",
    "Africa/Lagos",
    "America/Argentina/Buenos_Aires",
    "America/Bogota",
    "America/Chicago",
    "America/Los_Angeles",
    "America/New_York",
    "America/Sao_Paulo",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Atlantic/Reykjavik",
    "Australia/Sydney",
    "Europe/Berlin",
    "Europe/Istanbul",
    "Europe/Kyiv",
    "Europe/London",
    "Europe/Paris",
    "Pacific/Auckland",
].map((timeZone) => ({ key: timeZone, label: timeZone }));

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

/** More than 20 options: the menu starts with a search pill that filters them, and the list shows the chosen one. */
export const ManyOptions: Story = {
    args: { label: "Time zone", value: "Europe/Berlin", options: TIME_ZONES, selectedKey: "Europe/Berlin" },
    decorators: [
        // Room for the menu under the row
        (StoryComponent) => (
            <div style={{ blockSize: 480 }}>
                <StoryComponent />
            </div>
        ),
    ],
    parameters: {
        a11y: {
            config: {
                rules: [
                    // The menu is opened over the row, which it hides from assistive technologies
                    { id: "aria-hidden-focus", enabled: false },
                    // The arrow keys scroll the list from the pill, which keeps the focus
                    { id: "scrollable-region-focusable", enabled: false },
                ],
            },
        },
    },
    play: async ({ canvas }) => {
        await userEvent.click(canvas.getByRole("button", { name: /^Time zone/ }));
        await waitFor(() => expect(screen.getByRole("textbox", { name: "Search" })).toHaveFocus());
    },
};

/** The choices that hold what is typed, in any case and without accents, the first one highlighted. */
export const FilteredOptions: Story = {
    ...ManyOptions,
    play: async (context) => {
        await ManyOptions.play?.(context);
        await userEvent.keyboard("pa");
        await waitFor(() => expect(screen.getAllByRole("menuitemradio")).toHaveLength(3));
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
