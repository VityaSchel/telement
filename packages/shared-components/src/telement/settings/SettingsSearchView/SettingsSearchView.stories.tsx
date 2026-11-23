/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
    SettingsSearchView,
    type SettingsSearchViewActions,
    type SettingsSearchViewProps,
    type SettingsSearchViewSnapshot,
} from "./SettingsSearchView";
import { useMockedViewModel } from "../../../core/viewmodel/useMockedViewModel";
import { withViewDocs } from "../../../../.storybook/withViewDocs";

type SettingsSearchViewStoryProps = SettingsSearchViewSnapshot &
    SettingsSearchViewActions &
    Pick<SettingsSearchViewProps, "compact">;

/** The search at the settings tabs' 220px width, with room under it for the results. */
const SettingsSearchViewWrapperImpl = ({
    setQuery,
    moveActive,
    setActiveIndex,
    choose,
    compact,
    ...snapshot
}: SettingsSearchViewStoryProps): JSX.Element => {
    const vm = useMockedViewModel(snapshot, { setQuery, moveActive, setActiveIndex, choose });
    return (
        <div style={{ width: 220, height: 360, padding: 16 }}>
            <SettingsSearchView vm={vm} compact={compact} />
        </div>
    );
};

const SettingsSearchViewWrapper = withViewDocs(SettingsSearchViewWrapperImpl, SettingsSearchView);

const meta = {
    title: "Telement/Settings/SettingsSearchView",
    component: SettingsSearchViewWrapper,
    tags: ["autodocs"],
    args: {
        query: "",
        results: [],
        activeIndex: 0,
        setQuery: fn(),
        moveActive: fn(),
        setActiveIndex: fn(),
        choose: fn(),
    },
} satisfies Meta<typeof SettingsSearchViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

/** The results show while the field has focus: focus it to see them. */
export const WithResults: Story = {
    args: {
        query: "preview",
        results: [
            { id: "1", path: ["Preferences", "Room list", "Show message previews"] },
            { id: "2", path: ["Preferences", "Link previews", "Enable inline URL previews by default"] },
            { id: "3", path: ["Appearance", "Font size"] },
        ],
        activeIndex: 1,
    },
};

export const NoResults: Story = {
    args: { query: "wallpaper" },
};

/** With room for an icon only, above tabs that are only icons. */
export const Compact: Story = {
    args: { compact: true },
};

/** The field the compact search's button opens, over what is beside it. */
export const CompactOpen: Story = {
    args: { ...WithResults.args, compact: true },
    play: async ({ canvas }) => {
        await userEvent.click(canvas.getByRole("button", { name: "Search settings" }));
        await waitFor(() => expect(canvas.getByRole("combobox", { name: "Search settings" })).toHaveFocus());
    },
};
