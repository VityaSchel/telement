/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import classNames from "classnames";
import { PinSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../../../core/i18n/i18n";
import styles from "./PinnedMarkView.module.css";

/** Props for {@link PinnedMarkView}. */
export interface PinnedMarkViewProps {
    /** Extra class name for the mark's box. */
    className?: string;
}

/**
 * Telegram's mark of a pinned message, which it draws before the message's time: the room list's tilted pin in a 12px
 * box, in the color of the text around it.
 */
export function PinnedMarkView({ className }: Readonly<PinnedMarkViewProps>): JSX.Element {
    return (
        <span className={classNames(styles.mark, className)} role="img" aria-label={_t("room|pinned_message_badge")}>
            <PinSolidIcon className={styles.icon} aria-hidden={true} />
        </span>
    );
}
