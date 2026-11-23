/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import type React from "react";

import defaultDispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import { type OpenSpotlightPayload } from "../../dispatcher/payloads/OpenSpotlightPayload";
import Modal from "../../Modal";

/**
 * Opens the search dialog with the character typed while a room in the room list, or the list itself, has the
 * keyboard focus, as typing in Telegram's chat list moves the letters into its search. Element sent the keystroke to
 * the composer instead. Space, Enter, the arrows, Home and End are not characters, so they keep their meaning in the
 * list, and so do shortcuts with Ctrl or Cmd. Alt is allowed, as it types accented letters on some keyboards.
 *
 * @param ev - A key going down in the room list
 * @returns Whether the key opened the search dialog
 */
export function openSearchOnTyping(ev: React.KeyboardEvent): boolean {
    if (ev.ctrlKey || ev.metaKey || ev.nativeEvent.isComposing) return false;
    if (ev.key.length !== 1 || ev.key === " ") return false;
    // Only a room's row or the list itself, not a button inside a row such as its "…"
    const target = ev.target as Element;
    if (target !== ev.currentTarget && target.getAttribute("role") !== "option") return false;
    // A key typed after the dialog was asked for, but before its field took the focus
    if (Modal.hasDialogs()) return false;

    ev.preventDefault();
    ev.stopPropagation();
    // Synchronously, so the dialog is open before the next key
    defaultDispatcher.dispatch<OpenSpotlightPayload>({ action: Action.OpenSpotlight, initialText: ev.key }, true);
    return true;
}
