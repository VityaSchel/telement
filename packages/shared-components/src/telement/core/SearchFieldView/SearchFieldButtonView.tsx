/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type ButtonHTMLAttributes, type JSX, type PropsWithChildren } from "react";
import classNames from "classnames";
import { SearchIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import styles from "./SearchFieldView.module.css";

export interface SearchFieldButtonViewProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
    /**
     * The label shown next to the magnifier, such as "Search (Ctrl+K)".
     */
    children: PropsWithChildren["children"];
}

/**
 * A button that looks like a resting {@link SearchFieldView}, for searches that open somewhere else, such as the room
 * list's search, which opens the search dialog.
 *
 * @example
 * ```tsx
 * <SearchFieldButtonView onClick={openSearchDialog}>Search (Ctrl+K)</SearchFieldButtonView>
 * ```
 */
export function SearchFieldButtonView({
    children,
    className,
    ...buttonProps
}: Readonly<SearchFieldButtonViewProps>): JSX.Element {
    return (
        <button type="button" className={classNames(styles.field, styles.button, className)} {...buttonProps}>
            <span className={styles.decoration}>
                <SearchIcon className={styles.icon} aria-hidden />
                <span className={styles.placeholder}>{children}</span>
            </span>
        </button>
    );
}
