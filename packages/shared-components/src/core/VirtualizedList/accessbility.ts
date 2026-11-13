/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

/** The ARIA pattern used to make the virtualized list accessible. */
export type Pattern = "listbox";

/** ARIA props for a `listbox` container element. */
export type ListboxContainerProps = {
    role: "listbox";
};

/**
 * Returns the ARIA props to spread onto the virtualized list container element.
 *
 * @param pattern - `"listbox"` — returns {@link ListboxContainerProps}.
 * @returns ARIA props for a `listbox` container.
 */
export function getContainerAccessibleProps(pattern: Pattern): ListboxContainerProps {
    switch (pattern) {
        case "listbox":
            return {
                role: "listbox",
            };
    }
}

/** ARIA props for an item rendered inside a `listbox`. */
export type ListboxItemProps = {
    /** Identifies the element as a selectable option within the listbox. */
    "role": "option";
    /** The 1-based position of this option within the full set, used for virtual lists where not all DOM nodes are mounted. */
    "aria-posinset": number;
    /** The total number of options in the set. */
    "aria-setsize": number;
};

/**
 * Returns the ARIA props to spread onto a virtualized list item element.
 *
 * @param pattern - `"listbox"` — returns {@link ListboxItemProps}.
 * @param index - The 0-based index of the item in the full flat list.
 * @param listSize - The total number of items across the entire list.
 * @returns ARIA props for a `listbox` option.
 */
export function getItemAccessibleProps(pattern: Pattern, index: number, listSize: number): ListboxItemProps {
    switch (pattern) {
        case "listbox":
            return {
                "role": "option",
                "aria-posinset": index + 1,
                "aria-setsize": listSize,
            };
    }
}
