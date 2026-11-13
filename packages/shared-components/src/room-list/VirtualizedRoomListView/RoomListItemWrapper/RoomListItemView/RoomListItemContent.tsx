/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX, memo, type ReactNode } from "react";
import { Text, Tooltip } from "@vector-im/compound-web";
import { NotificationsOffSolidIcon, PinSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import classNames from "classnames";

import { Flex } from "../../../../core/utils/Flex";
import { useViewModel } from "../../../../core/viewmodel";
import { NotificationDecoration } from "./NotificationDecoration";
import { RoomListItemHoverMenu } from "./RoomListItemHoverMenu";
import { type Room, type RoomListItemViewModel } from "./RoomListItemView";
import styles from "./RoomListItemView.module.css";

/**
 * Props for {@link RoomListItemContent}.
 */
export interface RoomListItemContentProps {
    /** The room item view model */
    vm: RoomListItemViewModel;
    /** Function to render the room avatar */
    renderAvatar: (room: Room) => ReactNode;
    /** Whether the item is being dragged */
    isDragging?: boolean;
}

/**
 * The inner content of a room list item: avatar, room name with a bell when the room is muted, message preview,
 * hover menu and notification decoration, or a pin for a pinned room without one.
 * Used both inside the full {@link RoomListItemView} and inside the drag overlay.
 */
export const RoomListItemContent = memo(function RoomListItemContent({
    vm,
    renderAvatar,
    isDragging = false,
}: RoomListItemContentProps): JSX.Element {
    const item = useViewModel(vm);
    // Like Telegram, a pinned room shows a pin where its unread badge would be, unless it has one
    const showPin = item.isFavourite && !item.notification.hasAnyNotificationOrActivity && !item.notification.callType;

    return (
        <Flex
            className={classNames(styles.container, {
                [styles.dragging]: isDragging,
            })}
            gap="var(--cpd-space-3x)"
            align="center"
        >
            {renderAvatar(item.room)}
            <Flex className={styles.content} gap="var(--cpd-space-2x)" align="center" justify="space-between">
                {/* We truncate the room name when too long. Title here is to show the full name on hover */}
                <div className={styles.ellipsis}>
                    <Flex align="center" gap="var(--cpd-space-1x)">
                        <div className={styles.roomName} title={item.name} data-testid="room-name">
                            {item.name}
                            {item.userStatus && (
                                <Tooltip description={item.userStatus.text} maxWidth="30ch" maxLines={1}>
                                    <Text as="span" className={styles.userStatusEmoji}>
                                        {item.userStatus.emoji}
                                    </Text>
                                </Tooltip>
                            )}
                        </div>
                        {/* Like Telegram, a muted room shows a bell after its name */}
                        {item.notification.muted && (
                            <NotificationsOffSolidIcon
                                className={styles.mutedIcon}
                                width="16px"
                                height="16px"
                                fill="var(--cpd-color-icon-tertiary)"
                                aria-hidden={true}
                                data-testid="muted-icon"
                            />
                        )}
                    </Flex>

                    {item.messagePreview && (
                        <Text as="div" size="sm" className={styles.ellipsis} title={item.messagePreview}>
                            {item.messagePreview}
                        </Text>
                    )}
                </div>
                {!isDragging && (item.showMoreOptionsMenu || item.showNotificationMenu) && (
                    <RoomListItemHoverMenu
                        showMoreOptionsMenu={item.showMoreOptionsMenu}
                        showNotificationMenu={item.showNotificationMenu}
                        vm={vm}
                    />
                )}

                {/* aria-hidden because we summarise the unread count/notification status in a11yLabel */}
                <div
                    className={classNames(styles.notificationDecoration, {
                        [styles.onMessagePreviewLine]: item.messagePreview,
                    })}
                    aria-hidden={true}
                >
                    {/* The bell of a muted room is next to its name instead */}
                    <NotificationDecoration {...item.notification} muted={false} />
                    {showPin && (
                        <PinSolidIcon
                            className={styles.pinnedIcon}
                            width="16px"
                            height="16px"
                            fill="var(--cpd-color-icon-tertiary)"
                            data-testid="pinned-icon"
                        />
                    )}
                </div>
            </Flex>
        </Flex>
    );
});
