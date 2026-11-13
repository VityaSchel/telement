/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX } from "react";
import { fn } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FilterId } from "../RoomListPrimaryFilters";
import { RoomListView, type RoomListViewSnapshot, type RoomListViewActions } from "./RoomListView";
import type { Room } from "../VirtualizedRoomListView/RoomListItemWrapper/RoomListItemView";
import { useMockedViewModel } from "../../core/viewmodel";
import { withViewDocs } from "../../../.storybook/withViewDocs";
import {
    renderAvatar,
    createGetRoomItemViewModel,
    mockRoomIds,
    mockSmallListRoomIds,
    mockLargeListRoomIds,
} from "../story-mocks";

type RoomListViewProps = RoomListViewSnapshot &
    RoomListViewActions & { renderAvatar: (room: Room) => React.ReactElement };

const mockFilterIds: FilterId[] = ["unread", "people", "rooms"];

// Wrapper component that creates a mocked ViewModel
const RoomListViewWrapperImpl = ({
    onToggleFilter,
    createChatRoom,
    createRoom,
    getRoomItemViewModel,
    updateVisibleRooms,
    updateVisibleFold,
    renderAvatar: renderAvatarProp,
    scrollToUnreadActivity,
    setScrollToIndex,
    ...rest
}: RoomListViewProps): JSX.Element => {
    const vm = useMockedViewModel(rest, {
        onToggleFilter,
        createChatRoom,
        createRoom,
        getRoomItemViewModel,
        updateVisibleRooms,
        updateVisibleFold,
        scrollToUnreadActivity,
        setScrollToIndex,
    });
    return <RoomListView vm={vm} renderAvatar={renderAvatarProp} />;
};
const RoomListViewWrapper = withViewDocs(RoomListViewWrapperImpl, RoomListView);

const meta = {
    title: "Room List/RoomListView",
    component: RoomListViewWrapper,
    tags: ["autodocs"],
    decorators: [
        (Story) => (
            <div
                style={{
                    width: "320px",
                    height: "600px",
                    border: "1px solid var(--cpd-color-border-interactive-primary)",
                    display: "flex",
                    flexDirection: "column",
                    resize: "horizontal",
                    overflow: "auto",
                    minWidth: "250px",
                    maxWidth: "800px",
                }}
            >
                <Story />
            </div>
        ),
    ],
    args: {
        // Snapshot properties (state)
        isLoadingRooms: false,
        isRoomListEmpty: false,
        filterIds: mockFilterIds,
        activeFilterId: undefined,
        roomListState: {
            activeRoomIndex: undefined,
            spaceId: "!space:server",
            filterKeys: undefined,
        },
        roomIds: mockRoomIds,
        canCreateRoom: true,
        // Action properties (callbacks)
        onToggleFilter: fn(),
        createChatRoom: fn(),
        createRoom: fn(),
        getRoomItemViewModel: createGetRoomItemViewModel(mockRoomIds),
        updateVisibleRooms: fn(),
        updateVisibleFold: fn(),
        renderAvatar,
        toast: undefined,
        scrollToUnreadActivity: fn(),
        setScrollToIndex: fn(),
    },
    parameters: {
        design: {
            type: "figma",
            url: "https://www.figma.com/design/vlmt46QDdE4dgXDiyBJXqp/ER-33-Left-Panel?node-id=2925-19126",
        },
    },
} satisfies Meta<typeof RoomListViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
    args: {
        isLoadingRooms: true,
    },
};

export const Empty: Story = {
    args: {
        isRoomListEmpty: true,
    },
};

export const EmptyWithoutCreatePermission: Story = {
    args: {
        isRoomListEmpty: true,
        canCreateRoom: false,
    },
};

export const WithActiveFilter: Story = {
    args: {
        filterIds: ["unread", "people", "rooms"],
        activeFilterId: "people",
        roomListState: {
            activeRoomIndex: undefined,
            spaceId: "!space:server",
            filterKeys: ["people"],
        },
    },
};

export const WithSelection: Story = {
    args: {
        roomListState: {
            activeRoomIndex: 0,
            spaceId: "!space:server",
            filterKeys: undefined,
        },
    },
};

export const EmptyPeopleFilter: Story = {
    args: {
        isRoomListEmpty: true,
        filterIds: ["people", "rooms"],
        activeFilterId: "people",
    },
};

export const EmptyRoomsFilter: Story = {
    args: {
        isRoomListEmpty: true,
        filterIds: ["rooms", "people"],
        activeFilterId: "rooms",
    },
};

export const EmptyUnreadFilter: Story = {
    args: {
        isRoomListEmpty: true,
        filterIds: ["unread", "people"],
        activeFilterId: "unread",
    },
};

export const EmptyInvitesFilter: Story = {
    args: {
        isRoomListEmpty: true,
        filterIds: ["invites", "people"],
        activeFilterId: "invites",
    },
};

export const EmptyMentionsFilter: Story = {
    args: {
        isRoomListEmpty: true,

        filterIds: ["mentions", "people"],
        activeFilterId: "mentions",
    },
};

export const SmallFlatList: Story = {
    args: {
        roomIds: mockSmallListRoomIds,
    },
};

export const LargeFlatList: Story = {
    args: {
        roomIds: mockLargeListRoomIds,
        getRoomItemViewModel: createGetRoomItemViewModel(mockLargeListRoomIds),
    },
};

export const UnreadActivityBelow: Story = {
    args: {
        toast: "unread_activity",
    },
};
