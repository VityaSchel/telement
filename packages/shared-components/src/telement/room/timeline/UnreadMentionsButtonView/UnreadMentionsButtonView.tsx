/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import classNames from "classnames";
import { Tooltip } from "@vector-im/compound-web";
import { MentionIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../../../core/i18n/i18n";
import { type ViewModel } from "../../../../core/viewmodel/ViewModel";
import { useViewModel } from "../../../../core/viewmodel/useViewModel";
import styles from "./UnreadMentionsButtonView.module.css";

/** What {@link UnreadMentionsButtonView} shows. */
export interface UnreadMentionsButtonViewSnapshot {
    /** How many messages mentioning the user they haven't read. The button shows only while there are some. */
    count: number;
}

/** What {@link UnreadMentionsButtonView} can do. */
export interface UnreadMentionsButtonViewActions {
    /** Jumps the timeline to the next unread mention, oldest first. */
    onClick: () => void;
}

/** The view model of {@link UnreadMentionsButtonView}. */
export type UnreadMentionsButtonViewModel = ViewModel<
    UnreadMentionsButtonViewSnapshot,
    UnreadMentionsButtonViewActions
>;

/** Props for {@link UnreadMentionsButtonView}. */
export interface UnreadMentionsButtonViewProps {
    /** The view model of the button. */
    vm: UnreadMentionsButtonViewModel;
    /** Extra class name for the button's box, which places it. */
    className?: string;
}

/**
 * Telegram's unread mentions button: a 36px circle with the @, drawn like the timeline's jump to bottom button, with the
 * room list's accent counter on its top end edge. Each press jumps to the next unread mention.
 */
export function UnreadMentionsButtonView({
    vm,
    className,
}: Readonly<UnreadMentionsButtonViewProps>): JSX.Element | null {
    const { count } = useViewModel(vm);
    if (count < 1) return null;

    const label = _t("telement|timeline|next_unread_mention");
    return (
        <div className={classNames(styles.unreadMentions, className)}>
            <Tooltip description={label} placement="left">
                <button
                    type="button"
                    className={styles.button}
                    aria-label={_t("telement|timeline|unread_mentions", { count })}
                    onClick={vm.onClick}
                >
                    <MentionIcon />
                </button>
            </Tooltip>
            <span className={styles.counter} aria-hidden={true}>
                {count}
            </span>
        </div>
    );
}
