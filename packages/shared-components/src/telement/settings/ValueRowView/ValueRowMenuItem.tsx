/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type ComponentPropsWithoutRef, type JSX } from "react";
import { MenuItem } from "@vector-im/compound-web";
import CheckIcon from "@vector-im/compound-design-tokens/assets/web/icons/check";

import styles from "./ValueRowView.module.css";

/** Props for {@link ValueRowMenuItem}. */
interface ValueRowMenuItemProps extends Omit<ComponentPropsWithoutRef<"button">, "onSelect" | "onClick"> {
    /** What the item offers. */
    label: string;
    /** Whether it is the current choice, which has the check. */
    checked: boolean;
    /** Chooses the item. */
    onSelect: () => void;
}

/** A choice in the row's menu: a radio item without the radio, its check at the item's end, as in Telegram's menus. */
export function ValueRowMenuItem({
    label,
    checked,
    onSelect,
    ...buttonProps
}: Readonly<ValueRowMenuItemProps>): JSX.Element {
    return (
        <MenuItem
            {...buttonProps}
            role="menuitemradio"
            aria-checked={checked}
            label={label}
            onSelect={onSelect}
            hideChevron
        >
            {checked && <CheckIcon className={styles.check} aria-hidden />}
        </MenuItem>
    );
}
