/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/** The widest the readers' submenu gets (_SeenByMenu.pcss), which decides whether it fits on the menu's end side. */
export const SEEN_BY_SUBMENU_MAX_WIDTH = 320;

/** The rows' inset from the edge of a menu, its border included (_IconizedContextMenu.pcss). */
const MENU_INSET = 4;

/** Where a legacy ContextMenu opens: its top, and the window's left or right edge's distance to its own. */
export interface SeenBySubmenuPosition {
    top: number;
    left?: number;
    right?: number;
}

/**
 * Where the "Seen by" item's submenu of readers opens: against the message menu's edge, on its end side where it fits
 * in the window and on its start side otherwise, with its first row level with the item, as the room menus' submenus
 * open.
 *
 * @param item - the "Seen by" item's box
 * @param menu - the message menu's box
 * @param windowWidth - the window's width
 */
export function getSeenBySubmenuPosition(
    item: Pick<DOMRect, "top">,
    menu: Pick<DOMRect, "left" | "right">,
    windowWidth: number,
): SeenBySubmenuPosition {
    const top = item.top - MENU_INSET;
    return menu.right + SEEN_BY_SUBMENU_MAX_WIDTH <= windowWidth
        ? { top, left: menu.right }
        : { top, right: windowWidth - menu.left };
}
