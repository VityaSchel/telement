/*
Copyright 2024 New Vector Ltd.
Copyright 2021, 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { type Room } from "matrix-js-sdk/src/matrix";
import React, { Fragment, type JSX, useState } from "react";
import { IconButton, Menu } from "@vector-im/compound-web";
import { OverflowHorizontalIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import { MoreOptionContent, useCreateAutoDisposedViewModel } from "@element-hq/web-shared-components";

import { ContextMenuTooltipButton } from "../../../../accessibility/context_menu/ContextMenuTooltipButton";
import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext";
import { _t } from "../../../../languageHandler";
import SpaceContextMenu from "../../context_menus/SpaceContextMenu";
import { type ButtonEvent } from "../../elements/AccessibleButton";
import { ChevronFace, type MenuProps } from "../../../structures/ContextMenu";
import { shouldShowComponent } from "../../../../customisations/helpers/UIComponents";
import { UIComponent } from "../../../../settings/UIFeature";
import { RoomListItemViewModel } from "../../../../viewmodels/room-list/RoomListItemViewModel";

interface Props {
    room: Room;
}

const contextMenuBelow = (elementRect: DOMRect): MenuProps => {
    // align the context menu's icons with the icon which opened the context menu
    const left = elementRect.left + window.scrollX - 9;
    const top = elementRect.bottom + window.scrollY + 17;
    const chevronFace = ChevronFace.None;
    return { left, top, chevronFace };
};

/**
 * The "…" button of a room or space in the search dialog's results. A room's menu is the room list's, notifications
 * submenu included.
 */
export function RoomResultContextMenus({ room }: Props): JSX.Element | null {
    if (!shouldShowComponent(UIComponent.RoomOptionsMenu)) return null;
    return room.isSpaceRoom() ? <SpaceOptionsMenu room={room} /> : <RoomOptionsMenu room={room} />;
}

function SpaceOptionsMenu({ room }: Props): JSX.Element {
    const [menuPosition, setMenuPosition] = useState<DOMRect | null>(null);

    return (
        <Fragment>
            <ContextMenuTooltipButton
                className="mx_SpotlightDialog_option--menu"
                onClick={(ev: ButtonEvent) => {
                    ev.preventDefault();
                    ev.stopPropagation();

                    const target = ev.target as HTMLElement;
                    setMenuPosition(target.getBoundingClientRect());
                }}
                title={_t("space|context_menu|options")}
                isExpanded={menuPosition !== null}
            >
                <OverflowHorizontalIcon />
            </ContextMenuTooltipButton>
            {menuPosition !== null && (
                <SpaceContextMenu
                    {...contextMenuBelow(menuPosition)}
                    space={room}
                    onFinished={() => setMenuPosition(null)}
                />
            )}
        </Fragment>
    );
}

function RoomOptionsMenu({ room }: Props): JSX.Element {
    const [open, setOpen] = useState(false);
    const title = _t("room|context_menu|title");

    return (
        <Menu
            open={open}
            onOpenChange={setOpen}
            title={title}
            showTitle={false}
            align="start"
            trigger={
                <IconButton
                    className="mx_SpotlightDialog_option--menu"
                    tooltip={title}
                    aria-label={title}
                    size="20px"
                    // The result itself opens the room when clicked
                    onClick={(ev) => ev.stopPropagation()}
                >
                    <OverflowHorizontalIcon />
                </IconButton>
            }
        >
            <RoomOptionsMenuContent room={room} />
        </Menu>
    );
}

/** The menu's items. The room's view model only exists while the menu is open, as the dialog lists many rooms. */
function RoomOptionsMenuContent({ room }: Props): JSX.Element {
    const client = useMatrixClientContext();
    const vm = useCreateAutoDisposedViewModel(() => new RoomListItemViewModel({ room, client }));
    return <MoreOptionContent vm={vm} />;
}
