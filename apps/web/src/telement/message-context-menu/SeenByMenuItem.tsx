/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { type User } from "matrix-js-sdk/src/matrix";
import { AvatarStack } from "@vector-im/compound-web";
import { DoubleCheckIcon } from "@element-hq/web-shared-components";

import { _t } from "../../languageHandler";
import { formatDate } from "../../DateUtils";
import dis from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import SettingsStore from "../../settings/SettingsStore";
import UIStore from "../../stores/UIStore";
import { getKeyBindingsManager } from "../../KeyBindingsManager";
import { KeyBindingAction } from "../../accessibility/KeyboardShortcuts";
import MemberAvatar from "../../components/views/avatars/MemberAvatar";
import IconizedContextMenu, {
    IconizedContextMenuOption,
    IconizedContextMenuOptionList,
} from "../../components/views/context_menus/IconizedContextMenu";
import { type IReadReceiptProps } from "../../components/views/rooms/EventTile";
import { getSeenBySubmenuPosition, type SeenBySubmenuPosition } from "./getSeenBySubmenuPosition";

/** How many of the latest readers the item's face pile shows. */
const FACE_PILE_SIZE = 3;

interface Props {
    /** The people other than the user who have read the message, most recent first. */
    readers: IReadReceiptProps[];
    /** Closes the message menu. */
    onFinished: () => void;
}

/** Where the submenu opens beside the message menu that holds the item. */
function getSubmenuPosition(item: HTMLElement): SeenBySubmenuPosition {
    const menu = (item.closest(".mx_ContextualMenu") ?? item).getBoundingClientRect();
    return getSeenBySubmenuPosition(item.getBoundingClientRect(), menu, UIStore.instance.windowWidth);
}

/**
 * Telegram's "Seen by" item, in the menu of a message of the user's own that someone has read: it says how many have
 * read it, ends with a face pile of the latest of them, and opens a submenu of all of them with the time each read it.
 * Hovering or clicking it opens the submenu, as do Right arrow, Enter and Space; Left arrow and Escape close it. Choosing
 * a reader opens their profile.
 */
export function SeenByMenuItem({ readers, onFinished }: Props): JSX.Element {
    const [position, setPosition] = useState<SeenBySubmenuPosition>();
    const itemRef = useRef<HTMLLIElement>(null);
    const label = _t("timeline|read_receipt_title", { count: readers.length });

    const open = (): void => {
        if (itemRef.current) setPosition(getSubmenuPosition(itemRef.current));
    };
    const close = (): void => setPosition(undefined);

    useEffect(() => {
        if (!position) return;

        // Pointing at another item of the message menu closes the submenu, as Compound's submenus do
        const menu = itemRef.current?.closest('[role="menu"]');
        const onPointerOver = (event: Event): void => {
            const item = (event.target as Element).closest('[role^="menuitem"]');
            if (item && item !== itemRef.current && menu?.contains(item)) setPosition(undefined);
        };
        menu?.addEventListener("pointerover", onPointerOver);
        return () => menu?.removeEventListener("pointerover", onPointerOver);
    }, [position]);

    const onKeyDown = (event: KeyboardEvent): void => {
        // The message menu would close on Right arrow, which opens the submenu instead
        if (getKeyBindingsManager().getAccessibilityAction(event) !== KeyBindingAction.ArrowRight) return;
        event.preventDefault();
        event.stopPropagation();
        open();
    };

    const isTwelveHour = SettingsStore.getValue("showTwelveHourTimestamps");

    return (
        <>
            <IconizedContextMenuOption
                className="mx_SeenByMenuItem"
                inputRef={itemRef}
                icon={<DoubleCheckIcon />}
                label={label}
                aria-haspopup="menu"
                aria-expanded={!!position}
                onClick={open}
                onMouseEnter={open}
                onKeyDown={onKeyDown}
            >
                <AvatarStack className="mx_SeenByMenuItem_faces">
                    {readers.slice(0, FACE_PILE_SIZE).map(({ userId, roomMember }) => (
                        <MemberAvatar
                            key={userId}
                            member={roomMember}
                            fallbackUserId={userId}
                            size="20px"
                            aria-hidden="true"
                            hideTitle
                        />
                    ))}
                </AvatarStack>
            </IconizedContextMenuOption>
            {position && (
                <IconizedContextMenu
                    {...position}
                    className="mx_SeenByMenu"
                    menuClassName="mx_SeenByMenu_submenu"
                    compact={true}
                    hasBackground={false}
                    onFinished={close}
                >
                    <IconizedContextMenuOptionList first>
                        {readers.map(({ userId, roomMember, ts }) => (
                            <IconizedContextMenuOption
                                key={userId}
                                className="mx_SeenByMenu_reader"
                                icon={
                                    <MemberAvatar
                                        member={roomMember}
                                        fallbackUserId={userId}
                                        size="20px"
                                        aria-hidden="true"
                                        hideTitle
                                    />
                                }
                                label={roomMember?.name ?? userId}
                                onClick={() => {
                                    dis.dispatch({
                                        action: Action.ViewUser,
                                        // The right panel takes a user where the reader is no longer a member
                                        member: roomMember ?? ({ userId } as User),
                                        push: false,
                                    });
                                    onFinished();
                                }}
                            >
                                <span className="mx_SeenByMenu_time">{formatDate(new Date(ts), isTwelveHour)}</span>
                            </IconizedContextMenuOption>
                        ))}
                    </IconizedContextMenuOptionList>
                </IconizedContextMenu>
            )}
        </>
    );
}
