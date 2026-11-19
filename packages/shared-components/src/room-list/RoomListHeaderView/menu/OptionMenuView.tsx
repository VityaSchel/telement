/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { IconButton, Menu, MenuItem, MenuTitle } from "@vector-im/compound-web";
import React, { type JSX, useState } from "react";
import OverflowHorizontalIcon from "@vector-im/compound-design-tokens/assets/web/icons/overflow-horizontal";
import CheckIcon from "@vector-im/compound-design-tokens/assets/web/icons/check";

import { type RoomListHeaderViewModel, type SortOption } from "../RoomListHeaderView";
import { useViewModel } from "../../../core/viewmodel";
import { useI18n } from "../../../core/i18n/i18nContext";
import styles from "./OptionMenuView.module.css";

interface OptionMenuViewProps {
    /**
     * The view model for the room list header
     */
    vm: RoomListHeaderViewModel;
}

/**
 * A menu component that provides sorting options for the room list.
 * Displays a dropdown menu of the ways to sort rooms, by activity, unread first or alphabetically, with a check at the
 * end of the active one, as Telegram marks the chosen option in its menus.
 *
 * @example
 * ```tsx
 * <OptionMenuView vm={roomListHeaderViewModel} />
 * ```
 */
export function OptionMenuView({ vm }: OptionMenuViewProps): JSX.Element {
    const { translate: _t } = useI18n();
    const [open, setOpen] = useState(false);
    const { activeSortOption } = useViewModel(vm);

    const options: [SortOption, string][] = [
        ["recent", _t("room_list|sort_type|activity")],
        ["unread-first", _t("room_list|sort_type|unread_first")],
        ["alphabetical", _t("room_list|sort_type|atoz")],
    ];

    return (
        <Menu
            open={open}
            onOpenChange={setOpen}
            title={_t("room_list|room_options")}
            showTitle={false}
            // The button sits at the room list's end, so the menu ends with it and stays over the list
            align="end"
            trigger={
                <IconButton
                    tooltip={_t("room_list|room_options")}
                    aria-label={_t("room_list|room_options")}
                    // A 36px control with a 24px icon, like the room header's
                    size="var(--tl-control-size)"
                    style={{ padding: "var(--cpd-space-1-5x)" }}
                >
                    <OverflowHorizontalIcon />
                </IconButton>
            }
        >
            <MenuTitle title={_t("room_list|sort")} className={styles.title} />
            {options.map(([option, label]) => {
                const checked = activeSortOption === option;
                // A radio item without the radio, so that its label starts where other items without an icon start
                return (
                    <MenuItem
                        key={option}
                        role="menuitemradio"
                        aria-checked={checked}
                        label={label}
                        onSelect={() => vm.sort(option)}
                        hideChevron
                    >
                        {checked && <CheckIcon className={styles.check} aria-hidden />}
                    </MenuItem>
                );
            })}
        </Menu>
    );
}
