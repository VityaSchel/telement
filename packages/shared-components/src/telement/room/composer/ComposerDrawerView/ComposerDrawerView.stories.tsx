/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type ReactNode, useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
    ComposerDrawerView,
    type ComposerDrawerViewActions,
    type ComposerDrawerViewSnapshot,
} from "./ComposerDrawerView";
import { useMockedViewModel } from "../../../../core/viewmodel/useMockedViewModel";
import { SearchFieldView } from "../../../core/SearchFieldView";
import { withViewDocs } from "../../../../../.storybook/withViewDocs";

type ComposerDrawerViewProps = ComposerDrawerViewSnapshot & ComposerDrawerViewActions;

const ComposerDrawerViewWrapperImpl = ({ onTabSelected, ...snapshot }: ComposerDrawerViewProps): ReactNode => {
    const vm = useMockedViewModel(snapshot, { onTabSelected });
    return (
        <ComposerDrawerView vm={vm}>
            <div style={{ padding: 16 }}>Content of the {snapshot.activeTab} tab</div>
        </ComposerDrawerView>
    );
};

const ComposerDrawerViewWrapper = withViewDocs(ComposerDrawerViewWrapperImpl, ComposerDrawerView);

const meta = {
    title: "Telement/Composer/ComposerDrawerView",
    component: ComposerDrawerViewWrapper,
    tags: ["autodocs"],
    args: {
        tabs: [
            { id: "emoji", label: "Emoji" },
            { id: "stickers", label: "Stickers" },
        ],
        activeTab: "emoji",
    },
} satisfies Meta<typeof ComposerDrawerViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmojiTab: Story = {};

export const StickersTab: Story = {
    args: { activeTab: "stickers" },
};

const SearchableTabContent = (): ReactNode => {
    const [query, setQuery] = useState("");
    return (
        <div data-testid="searchable-tab-scroller" style={{ height: 240, overflowY: "auto" }}>
            <div style={{ padding: 8 }}>
                <SearchFieldView value={query} onChange={setQuery} />
            </div>
            {Array.from({ length: 20 }, (_, index) => (
                <div key={index} style={{ padding: "8px 16px" }}>
                    Result {index + 1}
                </div>
            ))}
        </div>
    );
};

const SearchableTabDrawer = ({ onTabSelected, ...snapshot }: ComposerDrawerViewProps): ReactNode => {
    const vm = useMockedViewModel(snapshot, { onTabSelected });
    return (
        <ComposerDrawerView vm={vm}>
            <SearchableTabContent />
        </ComposerDrawerView>
    );
};

/**
 * A tab whose content starts its own scroll container with a search field, which scrolls away with the results.
 */
export const SearchableTab: Story = {
    render: (args) => <SearchableTabDrawer {...args} />,
};
