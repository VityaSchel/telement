/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type ComponentType, type JSX, type SVGProps } from "react";
import classNames from "classnames";
import { CheckIcon, ErrorSolidIcon, TimeIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t, _td } from "../../../../core/i18n/i18n";
import { DoubleCheckIcon } from "../../../core/icons/DoubleCheckIcon";
import styles from "./MessageStatusView.module.css";

/**
 * What became of a message the user sent: it is being sent, it was sent, someone else has read it, or it failed to
 * send.
 */
export type MessageStatus = "sending" | "sent" | "read" | "failed";

/** Props for {@link MessageStatusView}. */
export interface MessageStatusViewProps {
    /** The status of the message. */
    status: MessageStatus;
    /** Extra class name for the status's box. */
    className?: string;
}

const ICONS: Record<MessageStatus, ComponentType<SVGProps<SVGSVGElement>>> = {
    sending: TimeIcon,
    sent: CheckIcon,
    read: DoubleCheckIcon,
    failed: ErrorSolidIcon,
};

const LABELS: Record<MessageStatus, TranslationKey> = {
    sending: _td("telement|message_status|sending"),
    sent: _td("telement|message_status|sent"),
    read: _td("telement|message_status|read"),
    failed: _td("telement|message_status|failed"),
};

/**
 * Telegram's checks after the time of a message the user sent, as the room list draws them: a clock while it is being
 * sent, one check once it is sent and two once anyone else has read it. A message that failed to send has an error
 * mark instead. They are a 16px box in the time's color; the failed mark is in the critical color.
 */
export function MessageStatusView({ status, className }: Readonly<MessageStatusViewProps>): JSX.Element {
    const Icon = ICONS[status];
    return (
        <span
            className={classNames(styles.status, styles[status], className)}
            role="img"
            aria-label={_t(LABELS[status])}
            data-status={status}
        >
            <Icon className={styles.icon} aria-hidden={true} />
        </span>
    );
}
