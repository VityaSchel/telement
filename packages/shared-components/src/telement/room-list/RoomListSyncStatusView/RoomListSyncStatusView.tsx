/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { InlineSpinner } from "@vector-im/compound-web";

import { Flex } from "../../../core/utils/Flex";
import { useI18n } from "../../../core/i18n/i18nContext";
import styles from "./RoomListSyncStatusView.module.css";

/**
 * Why the room list may be out of date: the client is catching up with the server, as after a reload, or it can't
 * reach the server.
 */
export type RoomListSyncStatus = "updating" | "waiting_for_network";

/**
 * Props for {@link RoomListSyncStatusView}.
 */
export interface RoomListSyncStatusViewProps {
    /** What the room list is waiting for */
    status: RoomListSyncStatus;
}

/**
 * "Updating…" or "Waiting for network…" after a small spinner, shown in place of the room list's title while the room
 * list may be out of date, as Telegram shows it in place of its chat list's title.
 *
 * @example
 * ```tsx
 * <RoomListSyncStatusView status="updating" />
 * ```
 */
export function RoomListSyncStatusView({ status }: Readonly<RoomListSyncStatusViewProps>): JSX.Element {
    const { translate: _t } = useI18n();
    const label =
        status === "updating"
            ? _t("telement|room_list|sync_status|updating")
            : _t("telement|room_list|sync_status|waiting_for_network");

    return (
        <Flex className={styles.status} align="center" gap="var(--cpd-space-2x)" role="status">
            <InlineSpinner className={styles.spinner} size={16} aria-hidden />
            <span className={styles.label}>{label}</span>
        </Flex>
    );
}
