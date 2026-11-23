/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX, type PropsWithChildren, type ReactNode } from "react";
import { Button } from "@vector-im/compound-web";
import ChatIcon from "@vector-im/compound-design-tokens/assets/web/icons/chat";
import RoomIcon from "@vector-im/compound-design-tokens/assets/web/icons/room";
import FilterIcon from "@vector-im/compound-design-tokens/assets/web/icons/filter";

import { Flex } from "../../core/utils/Flex";
import { _t } from "../../core/i18n/i18n";
import { useViewModel } from "../../core/viewmodel";
import type { RoomListViewModel } from "./RoomListView";
import styles from "./RoomListEmptyStateView.module.css";

/**
 * Props for RoomListEmptyStateView component
 */
export interface RoomListEmptyStateViewProps {
    /** The view model containing all data and callbacks */
    vm: RoomListViewModel;
}

/**
 * Empty state component for the room list.
 * Displays appropriate message and actions based on the active filter.
 */
export const RoomListEmptyStateView: React.FC<RoomListEmptyStateViewProps> = ({ vm }): JSX.Element => {
    const snapshot = useViewModel(vm);

    // If there is no active filter, show the default empty state
    if (!snapshot.activeFilterId) {
        return (
            <GenericPlaceholder
                title={_t("room_list|empty|no_chats")}
                description={
                    snapshot.canCreateRoom
                        ? _t("room_list|empty|no_chats_description")
                        : _t("room_list|empty|no_chats_description_no_room_rights")
                }
            >
                <Flex
                    className={styles.defaultPlaceholder}
                    align="center"
                    justify="center"
                    direction="column"
                    gap="var(--cpd-space-4x)"
                >
                    <Button size="md" kind="secondary" Icon={ChatIcon} onClick={vm.createChatRoom}>
                        {_t("action|start_chat")}
                    </Button>
                    {snapshot.canCreateRoom && (
                        <Button size="md" kind="secondary" Icon={RoomIcon} onClick={vm.createRoom}>
                            {_t("action|new_room")}
                        </Button>
                    )}
                </Flex>
            </GenericPlaceholder>
        );
    }

    // Every filter with no rooms offers to clear it, so an empty filter is never a dead end
    const activeFilterId = snapshot.activeFilterId;
    const onClearFilters = (): void => vm.onToggleFilter(activeFilterId);
    switch (activeFilterId) {
        case "people":
            return (
                <FilterPlaceholder
                    title={_t("room_list|empty|no_people")}
                    description={_t("room_list|empty|no_people_description")}
                    onClearFilters={onClearFilters}
                />
            );
        case "rooms":
            return (
                <FilterPlaceholder
                    title={_t("room_list|empty|no_rooms")}
                    description={_t("room_list|empty|no_rooms_description")}
                    onClearFilters={onClearFilters}
                />
            );
        case "unread":
            return <FilterPlaceholder title={_t("room_list|empty|no_unread")} onClearFilters={onClearFilters} />;
        case "invites":
            return <FilterPlaceholder title={_t("room_list|empty|no_invites")} onClearFilters={onClearFilters} />;
        case "mentions":
            return <FilterPlaceholder title={_t("room_list|empty|no_mentions")} onClearFilters={onClearFilters} />;
        default:
            return (
                <FilterPlaceholder
                    title={_t("room_list|empty|no_chats")}
                    description={_t("room_list|empty|no_chats_description")}
                    onClearFilters={onClearFilters}
                />
            );
    }
};

interface GenericPlaceholderProps {
    /** The title of the placeholder */
    title: string;
    /** The description of the placeholder */
    description?: string;
    /** Optional children (e.g., action buttons) */
    children?: ReactNode;
}

/**
 * A generic placeholder for the room list
 */
function GenericPlaceholder({ title, description, children }: PropsWithChildren<GenericPlaceholderProps>): JSX.Element {
    return (
        <Flex
            data-testid="empty-room-list"
            className={styles.genericPlaceholder}
            direction="column"
            align="stretch"
            justify="center"
            gap="var(--cpd-space-2x)"
        >
            <span className={styles.title}>{title}</span>
            {description && <span className={styles.description}>{description}</span>}
            {children}
        </Flex>
    );
}

interface FilterPlaceholderProps {
    /** The title to display */
    title: string;
    /** The description of the placeholder */
    description?: string;
    /** Called when the "Clear filters" button is clicked */
    onClearFilters: () => void;
}

/**
 * A placeholder for the room list when the active filter has no rooms, with a button that clears the filter, in the
 * outline style of the unfiltered list's buttons.
 */
function FilterPlaceholder({ title, description, onClearFilters }: FilterPlaceholderProps): JSX.Element {
    return (
        <GenericPlaceholder title={title} description={description}>
            <Flex className={styles.defaultPlaceholder} align="center" justify="center" direction="column">
                <Button size="md" kind="secondary" Icon={FilterIcon} onClick={onClearFilters}>
                    {_t("telement|room_list|clear_filters")}
                </Button>
            </Flex>
        </GenericPlaceholder>
    );
}
