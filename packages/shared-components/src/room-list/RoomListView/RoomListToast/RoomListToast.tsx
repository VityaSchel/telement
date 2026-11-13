/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX, type MouseEventHandler } from "react";
import { Toast } from "@vector-im/compound-web";
import ArrowDownIcon from "@vector-im/compound-design-tokens/assets/web/icons/arrow-down";

import styles from "./RoomListToast.module.css";
import { useI18n } from "../../../core/i18n/i18nContext";

export type ToastType =
    // Persistent, clickable toast surfacing unread activity below the visible area.
    "unread_activity";

interface RoomListToastProps {
    /** Callback when the toast itself is clicked */
    onClick: MouseEventHandler<HTMLButtonElement>;
}

/**
 * A toast component used for displaying messages in the room list view: a persistent, clickable
 * toast that jumps to the next unread room below the visible area of the list.
 *
 * @example
 * ```tsx
 *   <RoomListToast onClick={onClickHandler} />
 * ```
 */
export function RoomListToast({ onClick }: Readonly<RoomListToastProps>): JSX.Element {
    const { translate: _t } = useI18n();

    // The unread-activity toast is clickable as a whole (it scrolls to the unread room) rather
    // than closeable, so it uses the clickable Toast variant with a leading arrow-down icon.
    return (
        <Toast className={styles.toast} Icon={ArrowDownIcon} onClick={onClick}>
            {_t("room_list|unread_messages")}
        </Toast>
    );
}
