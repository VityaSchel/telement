/*
 * Copyright 2025 New Vector Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX, type MouseEventHandler } from "react";
import { IconButton } from "@vector-im/compound-web";
import ExploreIcon from "@vector-im/compound-design-tokens/assets/web/icons/explore";
import DialPadIcon from "@vector-im/compound-design-tokens/assets/web/icons/dial-pad";

import styles from "./RoomListSearchView.module.css";
import { type ViewModel, useViewModel } from "../../core/viewmodel";
import { Flex } from "../../core/utils/Flex";
import { useI18n } from "../../core/i18n/i18nContext";
import { SearchFieldButtonView } from "../../telement/core/SearchFieldView";

export interface RoomListSearchViewSnapshot {
    /**
     * Whether to display the explore button.
     */
    displayExploreButton: boolean;
    /**
     * Whether to display the dial pad button.
     */
    displayDialButton: boolean;
    /**
     * The keyboard shortcut text to display for the search action.
     * For example: "⌘K" on macOS or "Ctrl+K" on other platforms.
     */
    searchShortcut: string;
}

export interface RoomListSearchViewActions {
    /**
     * Handles the click event on the search button.
     */
    onSearchClick: MouseEventHandler<HTMLButtonElement>;
    /**
     * Handles the click event on the dial pad button.
     */
    onDialPadClick: MouseEventHandler<HTMLButtonElement>;
    /**
     * Handles the click event on the explore button.
     */
    onExploreClick: MouseEventHandler<HTMLButtonElement>;
}

/**
 * The view model for the room list search component.
 */
export type RoomListSearchViewModel = ViewModel<RoomListSearchViewSnapshot, RoomListSearchViewActions>;

interface RoomListSearchViewProps {
    /**
     * The view model for the room list search component.
     */
    vm: RoomListSearchViewModel;
}

/**
 * A search component to be displayed at the top of the room list.
 * The component provides search functionality, optional dial pad access, and optional room exploration.
 *
 * @example
 * ```tsx
 * <RoomListSearchView vm={roomListSearchViewModel} />
 * ```
 */
export function RoomListSearchView({ vm }: Readonly<RoomListSearchViewProps>): JSX.Element {
    const { translate: _t } = useI18n();
    const { displayExploreButton, displayDialButton, searchShortcut } = useViewModel(vm);

    return (
        <Flex
            data-testid="room-list-search"
            className={styles.view}
            role="search"
            gap="var(--cpd-space-2x)"
            align="center"
        >
            {/* Looks like Telegram's resting search field, but opens the search dialog */}
            <SearchFieldButtonView id="room-list-search-button" className={styles.search} onClick={vm.onSearchClick}>
                {_t("telement|room_list|search_with_shortcut", { shortcut: searchShortcut })}
            </SearchFieldButtonView>
            {/* Plain 36px icon buttons with 24px icons, transparent until hovered like the room list header's */}
            {displayDialButton && (
                <IconButton
                    size="var(--tl-control-size)"
                    style={{ padding: "var(--cpd-space-1-5x)" }}
                    aria-label={_t("left_panel|open_dial_pad")}
                    onClick={vm.onDialPadClick}
                >
                    <DialPadIcon />
                </IconButton>
            )}
            {displayExploreButton && (
                <IconButton
                    size="var(--tl-control-size)"
                    style={{ padding: "var(--cpd-space-1-5x)" }}
                    aria-label={_t("action|explore_rooms")}
                    onClick={vm.onExploreClick}
                >
                    <ExploreIcon />
                </IconButton>
            )}
        </Flex>
    );
}
