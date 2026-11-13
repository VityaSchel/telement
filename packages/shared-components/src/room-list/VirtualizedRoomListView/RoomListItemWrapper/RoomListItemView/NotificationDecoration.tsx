/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import {
    MentionIcon,
    ErrorSolidIcon,
    NotificationsOffSolidIcon,
    VideoCallSolidIcon,
    EmailSolidIcon,
    VoiceCallSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import { UnreadCounter, Unread } from "@vector-im/compound-web";

import { Flex } from "../../../../core/utils/Flex";
import styles from "./NotificationDecoration.module.css";

/**
 * Data representing the notification state for a room or item.
 * Used in snapshots and passed to the NotificationDecoration component.
 */
export interface NotificationDecorationData {
    /** Whether there is any notification or activity to display */
    hasAnyNotificationOrActivity: boolean;
    /** Whether there's an unsent message */
    isUnsentMessage: boolean;
    /** Whether the user is invited to the room */
    invited: boolean;
    /** Whether the notification is a mention */
    isMention: boolean;
    /** Whether there's activity (not a full notification) */
    isActivityNotification: boolean;
    /** Whether there's a notification (not just activity) */
    isNotification: boolean;
    /** Whether there are unread messages with a count */
    hasUnreadCount: boolean;
    /** Notification count */
    count: number;
    /**
     * Whether notifications are muted, which makes the unread counter grey, like Telegram's. The activity dot is grey
     * already, so a bell follows it instead.
     */
    muted: boolean;
    /** Optional call type indicator */
    callType?: "video" | "voice";
}

/**
 * Props for the NotificationDecoration component.
 */
export interface NotificationDecorationProps extends NotificationDecorationData {}

/**
 * Renders notification badges and indicators for rooms/items
 */
export const NotificationDecoration: React.FC<NotificationDecorationProps> = ({
    hasAnyNotificationOrActivity,
    muted,
    callType,
    isUnsentMessage,
    invited,
    isMention,
    isNotification,
    isActivityNotification,
    count,
}) => {
    // Don't render anything if there's nothing to show
    if (!hasAnyNotificationOrActivity && !callType) {
        return null;
    }

    // data-badge and data-unread-dot let the selected room list item recolor them
    return (
        <Flex
            className={styles.decoration}
            align="center"
            justify="center"
            gap="var(--cpd-space-1x)"
            data-testid="notification-decoration"
        >
            {isUnsentMessage && (
                <ErrorSolidIcon width="20px" height="20px" fill="var(--cpd-color-icon-critical-primary)" />
            )}
            {callType === "video" && (
                <VideoCallSolidIcon width="20px" height="20px" fill="var(--cpd-color-icon-accent-primary)" />
            )}
            {callType === "voice" && (
                <VoiceCallSolidIcon width="20px" height="20px" fill="var(--cpd-color-icon-accent-primary)" />
            )}
            {invited && <EmailSolidIcon width="20px" height="20px" fill="var(--cpd-color-icon-accent-primary)" />}
            {/* Like Telegram's, the @ is a badge of the counter's shape and color */}
            {isMention && (
                <span className={styles.mention} data-badge={true}>
                    <MentionIcon width="14px" height="14px" />
                </span>
            )}
            {/* Without a count, the counter would be a second circle like the @ */}
            {(isNotification || (isMention && count > 0)) && (
                <UnreadCounter count={count || null} data-badge={true} data-muted={muted || undefined} />
            )}
            {isActivityNotification && <Unread data-unread-dot={true} />}
            {muted && isActivityNotification && (
                <NotificationsOffSolidIcon
                    width="20px"
                    height="20px"
                    fill="var(--cpd-color-icon-tertiary)"
                    data-testid="muted-activity-icon"
                />
            )}
        </Flex>
    );
};
