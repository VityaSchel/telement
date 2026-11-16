/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { LinkIcon, VisibilityOnIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../languageHandler";
import { type MenuProps } from "../../components/structures/ContextMenu";
import IconizedContextMenu, {
    IconizedContextMenuOption,
    IconizedContextMenuOptionList,
} from "../../components/views/context_menus/IconizedContextMenu";

interface ThreadListTileContextMenuProps extends MenuProps {
    /** Shows the thread's root message in the room. */
    onViewInRoom: () => void;
    /** Copies the link to the thread, when the tile can make one. */
    onCopyLink?: () => void;
    /** Closes the menu. */
    onFinished: () => void;
}

/**
 * The right-click menu of a thread in the thread list, with what its hover toolbar offered: show it in the room and
 * copy its link. Telement shows that toolbar only on keyboard focus.
 */
export function ThreadListTileContextMenu({
    onViewInRoom,
    onCopyLink,
    onFinished,
    ...menuProps
}: ThreadListTileContextMenuProps): JSX.Element {
    const choose = (action: () => void) => (): void => {
        action();
        onFinished();
    };

    return (
        <IconizedContextMenu {...menuProps} onFinished={onFinished} className="mx_MessageContextMenu" compact>
            <IconizedContextMenuOptionList>
                <IconizedContextMenuOption
                    icon={<VisibilityOnIcon />}
                    label={_t("timeline|mab|view_in_room")}
                    onClick={choose(onViewInRoom)}
                />
                {onCopyLink && (
                    <IconizedContextMenuOption
                        icon={<LinkIcon />}
                        label={_t("timeline|mab|copy_link_thread")}
                        onClick={choose(onCopyLink)}
                    />
                )}
            </IconizedContextMenuOptionList>
        </IconizedContextMenu>
    );
}
