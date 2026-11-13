/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { memo } from "react";
import { type JSX } from "react";
import classNames from "classnames";

import { type VirtualizedListContext } from "./virtualized-list";
import styles from "./story-mock.module.css";
import type { ListboxItemProps } from "./accessbility";

export interface SimpleItemComponent {
    id: string;
    label: string;
}

export const items: SimpleItemComponent[] = Array.from({ length: 50 }, (_, i) => ({
    id: `item-${i}`,
    label: `Item ${i + 1}`,
}));

type SimpleItemComponentProps<Context> = ListboxItemProps & {
    item: SimpleItemComponent;
    context: Context;
    onFocus: (item: SimpleItemComponent, e: React.FocusEvent) => void;
};

export const SimpleItemComponent = memo(function SimpleItemComponent({
    item,
    context,
    onFocus,
    ...rest
}: SimpleItemComponentProps<VirtualizedListContext<undefined>>): JSX.Element {
    const selected = context.tabIndexKey === item.id;

    return (
        <button
            className={classNames(styles.item, { [styles.itemSelected]: selected })}
            tabIndex={selected ? 0 : -1}
            type="button"
            {...rest}
            onFocus={(e) => onFocus(item, e)}
        >
            {item.label}
        </button>
    );
});
