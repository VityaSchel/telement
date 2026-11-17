/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX } from "react";
import { IconButton, H1 } from "@vector-im/compound-web";
import { ComposeIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { type ViewModel, useViewModel } from "../../core/viewmodel";
import { Flex } from "../../core/utils/Flex";
import { useI18n } from "../../core/i18n/i18nContext";
import { ComposeMenuView, OptionMenuView, SpaceMenuView } from "./menu";
import styles from "./RoomListHeaderView.module.css";

/**
 * The available sorting options for the room list.
 */
export type SortOption = "recent" | "alphabetical" | "unread-first";

export interface RoomListHeaderViewSnapshot {
    /**
     * The title of the room list
     */
    title: string;
    /**
     * Whether to display the space menu
     * True if there is an active space
     */
    displaySpaceMenu: boolean;
    /**
     * Whether the user can create rooms
     */
    canCreateRoom: boolean;
    /**
     * Whether the user can create video rooms
     */
    canCreateVideoRoom: boolean;
    /**
     * Whether the user can invite in the active space
     */
    canInviteInSpace: boolean;
    /**
     * Whether the user can access space settings
     */
    canAccessSpaceSettings: boolean;
    /**
     * The currently active sort option.
     */
    activeSortOption: SortOption;
}

export interface RoomListHeaderViewActions {
    /**
     * Create a chat room
     */
    createChatRoom: (e: Event) => void;
    /**
     * Create a room
     */
    createRoom: (e: Event) => void;
    /**
     * Create a video room
     */
    createVideoRoom: () => void;
    /**
     * Open the active space home
     */
    openSpaceHome: () => void;
    /**
     * Display the space invite dialog
     */
    inviteInSpace: () => void;
    /**
     * Open the space preferences
     */
    openSpacePreferences: () => void;
    /**
     * Open the space settings
     */
    openSpaceSettings: () => void;
    /**
     * Change the sort order of the room-list.
     */
    sort: (option: SortOption) => void;
}

/**
 * The view model for the room list header component.
 */
export type RoomListHeaderViewModel = ViewModel<RoomListHeaderViewSnapshot, RoomListHeaderViewActions>;

interface RoomListHeaderViewProps {
    /**
     * The view model for the room list header component.
     */
    vm: RoomListHeaderViewModel;
}

/**
 * The header view for the room list
 * The space name is displayed and a compose menu is shown if the user can create rooms
 *
 * @example
 * ```tsx
 * <RoomListHeaderView vm={roomListHeaderViewModel} />
 * ```
 */
export function RoomListHeaderView({ vm }: Readonly<RoomListHeaderViewProps>): JSX.Element {
    const { translate: _t } = useI18n();
    const { title, displaySpaceMenu, canCreateRoom, canCreateVideoRoom } = useViewModel(vm);
    const canOnlyStartChat = !canCreateRoom && !canCreateVideoRoom;

    return (
        <Flex
            as="header"
            className={styles.header}
            aria-label={_t("room|context_menu|title")}
            align="end"
            data-testid="room-list-header"
        >
            <Flex className={styles.container} justify="space-between" align="center" gap="var(--cpd-space-3x)">
                <Flex className={styles.title} align="center" gap="var(--cpd-space-1x)">
                    <H1 size="sm" title={title}>
                        {title}
                    </H1>
                    {displaySpaceMenu && <SpaceMenuView vm={vm} />}
                </Flex>
                <Flex align="center" gap="var(--cpd-space-2x)">
                    <OptionMenuView vm={vm} />
                    {canOnlyStartChat ? (
                        <IconButton
                            // A 36px control with a 24px icon, like the room header's
                            size="var(--tl-control-size)"
                            style={{ padding: "var(--cpd-space-1-5x)" }}
                            onClick={(e) => vm.createChatRoom(e.nativeEvent)}
                            tooltip={_t("action|start_chat")}
                        >
                            <ComposeIcon color="var(--cpd-color-icon-secondary)" aria-hidden />
                        </IconButton>
                    ) : (
                        <ComposeMenuView vm={vm} />
                    )}
                </Flex>
            </Flex>
        </Flex>
    );
}
