/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { Menu, MenuItem } from "@vector-im/compound-web";
import { DeleteIcon, RestartIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../../../core/i18n/i18n";
import { type ViewModel } from "../../../../core/viewmodel/ViewModel";
import { useViewModel } from "../../../../core/viewmodel/useViewModel";
import { MessageStatusView } from "../MessageStatusView";
import styles from "./FailedMessageMarkView.module.css";

/** What {@link FailedMessageMarkView} shows. */
export interface FailedMessageMarkViewSnapshot {
    /** Whether the menu of the mark is open. */
    menuOpen: boolean;
}

/** What {@link FailedMessageMarkView} can do. */
export interface FailedMessageMarkViewActions {
    /** Opens or closes the menu. */
    setMenuOpen: (open: boolean) => void;
    /** Sends the message again. */
    resend: () => void;
    /** Removes the message, which nobody else has received. */
    delete: () => void;
}

/** The view model of {@link FailedMessageMarkView}. */
export type FailedMessageMarkViewModel = ViewModel<FailedMessageMarkViewSnapshot, FailedMessageMarkViewActions>;

/** Props for {@link FailedMessageMarkView}. */
export interface FailedMessageMarkViewProps {
    /** The view model. */
    vm: FailedMessageMarkViewModel;
}

/**
 * The red mark of a message that failed to send, as a button: as in Telegram, it opens a menu offering to send the
 * message again or to delete it. The menu opens above the mark, ending with it.
 */
export function FailedMessageMarkView({ vm }: Readonly<FailedMessageMarkViewProps>): JSX.Element {
    const { menuOpen } = useViewModel(vm);

    return (
        <Menu
            open={menuOpen}
            onOpenChange={vm.setMenuOpen}
            title={_t("telement|message_status|failed")}
            showTitle={false}
            side="top"
            align="end"
            trigger={
                // Named by the mark inside it, "Failed to send"
                <button type="button" className={styles.mark}>
                    <MessageStatusView status="failed" />
                </button>
            }
        >
            <MenuItem
                Icon={RestartIcon}
                label={_t("telement|message_status|resend")}
                onSelect={vm.resend}
                hideChevron
            />
            <MenuItem Icon={DeleteIcon} label={_t("action|delete")} onSelect={vm.delete} kind="critical" hideChevron />
        </Menu>
    );
}
