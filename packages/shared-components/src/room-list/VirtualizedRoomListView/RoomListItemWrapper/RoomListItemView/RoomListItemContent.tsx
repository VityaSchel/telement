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

import { useViewModel } from "../../../../core/viewmodel";
import { _t } from "../../../../core/i18n/i18n";
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
}

/**
 * The plate of a room list item, laid out like a Telegram chat: the avatar, the room name with a bell when the room is
 * muted and the time, then two lines of message preview (or who is typing) with the notification decoration, or a pin
 * for a pinned room without one, at the end of the second line. On hover the "…" button takes the time's place.
 */
export const RoomListItemContent = memo(function RoomListItemContent({
    vm,
    renderAvatar,
}: RoomListItemContentProps): JSX.Element {
    const item = useViewModel(vm);
    // Like Telegram, a pinned room shows a pin where its unread badge would be, unless it has one
    const showPin = item.isFavourite && !item.notification.hasAnyNotificationOrActivity && !item.notification.callType;

    let preview: ReactNode;
    if (item.typing) {
        preview = <span className={styles.typing}>{item.typing}</span>;
    } else if (item.messagePreview && item.messagePreviewSender) {
        preview = _t(
            "telement|room_list|message_preview",
            { senderName: item.messagePreviewSender, message: item.messagePreview },
            { sender: (sub) => <span className={styles.sender}>{sub}</span> },
        );
    } else {
        preview = item.messagePreview;
    }

    return (
        <div className={styles.container}>
            {renderAvatar(item.room)}
            <div className={styles.text}>
                <div className={styles.titleRow}>
                    {/* We truncate the room name when too long. Title here is to show the full name on hover */}
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
                    <div className={styles.timeSlot}>
                        {/* A class that the app's screenshot tests can hide, as the time changes from run to run */}
                        {item.timestamp && (
                            <time
                                className={classNames(styles.time, "mx_RoomListItemView_time")}
                                dateTime={item.timestampIso}
                                title={item.timestampFull}
                            >
                                {item.timestamp}
                            </time>
                        )}
                        {item.showMoreOptionsMenu && <RoomListItemHoverMenu vm={vm} />}
                    </div>
                </div>
                <div className={styles.previewRow}>
                    {preview && (
                        <div className={styles.preview} title={item.typing ? undefined : item.messagePreview}>
                            {preview}
                        </div>
                    )}
                    {/* aria-hidden because we summarise the unread count/notification status in a11yLabel */}
                    <div className={styles.notificationDecoration} aria-hidden={true}>
                        <NotificationDecoration {...item.notification} />
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
                </div>
            </div>
        </div>
    );
});
