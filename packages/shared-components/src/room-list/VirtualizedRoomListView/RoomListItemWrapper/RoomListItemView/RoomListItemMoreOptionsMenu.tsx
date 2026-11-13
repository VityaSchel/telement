/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { useState, type JSX } from "react";
import { IconButton, Menu, MenuItem, Separator, ToggleMenuItem } from "@vector-im/compound-web";
import {
    MarkAsReadIcon,
    MarkAsUnreadIcon,
    PinIcon,
    UnpinIcon,
    ArrowDownIcon,
    UserAddIcon,
    LinkIcon,
    LeaveIcon,
    OverflowHorizontalIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../../../core/i18n/i18n";
import { useViewModel, type ViewModel } from "../../../../core/viewmodel";
import type { RoomListItemViewSnapshot, RoomListItemViewActions } from "./RoomListItemView";

/**
 * View model type for room list item
 */
export type RoomListItemViewModel = ViewModel<RoomListItemViewSnapshot, RoomListItemViewActions>;

/**
 * Props for RoomListItemMoreOptionsMenu component
 */
export interface RoomListItemMoreOptionsMenuProps {
    /** The room item view model */
    vm: RoomListItemViewModel;
}

/**
 * The more options menu for room list items.
 * Displays additional room actions like mark as read/unread, pin, invite, etc.
 */
export function RoomListItemMoreOptionsMenu({ vm }: RoomListItemMoreOptionsMenuProps): JSX.Element {
    const [open, setOpen] = useState(false);

    return (
        <Menu
            open={open}
            onOpenChange={setOpen}
            title={_t("room_list|room|more_options")}
            showTitle={false}
            align="start"
            trigger={
                <IconButton
                    tooltip={_t("room_list|room|more_options")}
                    aria-label={_t("room_list|room|more_options")}
                    size="24px"
                    style={{ padding: "2px" }}
                >
                    <OverflowHorizontalIcon />
                </IconButton>
            }
        >
            <MoreOptionContent vm={vm} />
        </Menu>
    );
}

interface MoreOptionContentProps {
    vm: RoomListItemViewModel;
}

export function MoreOptionContent({ vm }: MoreOptionContentProps): JSX.Element {
    const snapshot = useViewModel(vm);
    return (
        <div onKeyDown={(e) => e.stopPropagation()}>
            {snapshot.canMarkAsRead && (
                <MenuItem
                    Icon={MarkAsReadIcon}
                    label={_t("room_list|more_options|mark_read")}
                    onSelect={vm.onMarkAsRead}
                    onClick={(evt) => evt.stopPropagation()}
                    hideChevron={true}
                />
            )}
            {snapshot.canMarkAsUnread && (
                <MenuItem
                    Icon={MarkAsUnreadIcon}
                    label={_t("room_list|more_options|mark_unread")}
                    onSelect={vm.onMarkAsUnread}
                    onClick={(evt) => evt.stopPropagation()}
                    hideChevron={true}
                />
            )}
            {/* Pin and Low priority are hidden for a room with a pending invitation */}
            {snapshot.canChangeSection && (
                <>
                    {/* Like Telegram, an action whose label says what it does rather than a checkbox */}
                    <MenuItem
                        Icon={snapshot.isFavourite ? UnpinIcon : PinIcon}
                        label={
                            snapshot.isFavourite
                                ? _t("telement|room_list|more_options|unpin")
                                : _t("telement|room_list|more_options|pin")
                        }
                        onSelect={vm.onToggleFavorite}
                        onClick={(evt) => evt.stopPropagation()}
                        hideChevron={true}
                    />
                    <ToggleMenuItem
                        checked={snapshot.isLowPriority}
                        Icon={ArrowDownIcon}
                        label={_t("room_list|more_options|low_priority")}
                        onSelect={vm.onToggleLowPriority}
                        onClick={(evt) => evt.stopPropagation()}
                    />
                </>
            )}
            <Separator />
            {snapshot.canInvite && (
                <MenuItem
                    Icon={UserAddIcon}
                    label={_t("action|invite")}
                    onSelect={vm.onInvite}
                    onClick={(evt) => evt.stopPropagation()}
                    hideChevron={true}
                />
            )}
            {snapshot.canCopyRoomLink && (
                <MenuItem
                    Icon={LinkIcon}
                    label={_t("room_list|more_options|copy_link")}
                    onSelect={vm.onCopyRoomLink}
                    onClick={(evt) => evt.stopPropagation()}
                    hideChevron={true}
                />
            )}
            <Separator />
            <MenuItem
                kind="critical"
                Icon={LeaveIcon}
                label={_t("room_list|more_options|leave_room")}
                onSelect={vm.onLeaveRoom}
                onClick={(evt) => evt.stopPropagation()}
                hideChevron={true}
            />
        </div>
    );
}
