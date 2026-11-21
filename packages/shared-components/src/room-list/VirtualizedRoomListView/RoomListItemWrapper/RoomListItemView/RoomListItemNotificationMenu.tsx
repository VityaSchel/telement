/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { useEffect, useRef, useState, type JSX } from "react";
import { MenuItem, SubMenu } from "@vector-im/compound-web";
import { CheckIcon, NotificationsIcon, NotificationsOffIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import classNames from "classnames";

import { _t } from "../../../../core/i18n/i18n";
import { RoomNotifState } from "./RoomNotifs";
import { useViewModel, type ViewModel } from "../../../../core/viewmodel";
import type { RoomListItemViewSnapshot, RoomListItemViewActions } from "./RoomListItemView";
import styles from "./RoomListItemView.module.css";

/**
 * View model type for room list item
 */
export type RoomListItemViewModel = ViewModel<RoomListItemViewSnapshot, RoomListItemViewActions>;

/**
 * Props for RoomListItemNotificationMenu component
 */
export interface RoomListItemNotificationMenuProps {
    /** The room item view model */
    vm: RoomListItemViewModel;
    /** Whether the item is in the room's right-click menu rather than its more options menu */
    inContextMenu?: boolean;
}

/**
 * The "Notifications" item of the room menus, with a chevron at its end. It opens a submenu with the room's
 * notification options, the current one checked. Right arrow and Enter open the submenu, Left arrow and Escape close it.
 */
export function RoomListItemNotificationMenu({ vm, inContextMenu }: RoomListItemNotificationMenuProps): JSX.Element {
    const snapshot = useViewModel(vm);
    const [open, setOpen] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const isMuted = snapshot.roomNotifState === RoomNotifState.Mute;

    useEffect(() => {
        if (!open) return;

        // Radix closes every level on Escape from a document listener; the window sees the key first, so Escape closes
        // only the submenu, as in the ARIA menu pattern
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            event.preventDefault();

            const subMenu = contentRef.current?.closest('[role="menu"]');
            const triggerId = subMenu?.getAttribute("aria-labelledby");
            if (triggerId) document.getElementById(triggerId)?.focus();
            setOpen(false);
        };

        window.addEventListener("keydown", onKeyDown, { capture: true });
        return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
    }, [open]);

    const options = [
        { state: RoomNotifState.AllMessages, label: _t("notifications|default_settings") },
        { state: RoomNotifState.AllMessagesLoud, label: _t("notifications|all_messages") },
        { state: RoomNotifState.MentionsOnly, label: _t("notifications|mentions_keywords") },
        { state: RoomNotifState.Mute, label: _t("notifications|mute_room") },
    ];

    return (
        <SubMenu
            open={open}
            onOpenChange={setOpen}
            trigger={
                <MenuItem
                    Icon={isMuted ? NotificationsOffIcon : NotificationsIcon}
                    label={_t("telement|room_list|more_options|notifications")}
                    onSelect={null}
                    onClick={(evt) => evt.stopPropagation()}
                />
            }
        >
            <div
                ref={contentRef}
                className={classNames(styles.menuContent, styles.subMenuContent, {
                    [styles.contextSubMenuContent]: inContextMenu,
                })}
            >
                {options.map(({ state, label }) => {
                    const checked = snapshot.roomNotifState === state;
                    // Radio items without the radio, as in the sort menu: the chosen one has a check at its end, as
                    // Telegram's menus mark it. Compound's RadioMenuItem can't stop the click, which would also open
                    // the room under the menu
                    return (
                        <MenuItem
                            key={state}
                            role="menuitemradio"
                            aria-checked={checked}
                            hideChevron={true}
                            label={label}
                            onSelect={() => vm.onSetRoomNotifState(state)}
                            onClick={(evt) => evt.stopPropagation()}
                        >
                            {checked && <CheckIcon className={styles.check} aria-hidden={true} />}
                        </MenuItem>
                    );
                })}
            </div>
        </SubMenu>
    );
}
