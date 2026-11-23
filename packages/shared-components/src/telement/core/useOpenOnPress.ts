/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type PointerEvent, type SyntheticEvent, useCallback, useRef } from "react";

/**
 * The handlers {@link useOpenOnPress} returns, to spread on the element that opens something.
 */
export interface OpenOnPressHandlers {
    /** Opens on a plain press of the primary mouse button */
    onPointerDown: (e: PointerEvent) => void;
    /** Opens on any other click, including the keyboard's, and skips the click that ends a press that opened */
    onClick: (e: SyntheticEvent) => void;
}

/**
 * Whether a pointer down is a plain press of the primary mouse button on the element itself, not on a button or link
 * inside it (such as a row's "…" button). Touch and pen presses are left to the click, so that a swipe that starts on
 * an element scrolls rather than opens it.
 */
function isPlainPrimaryPress(e: PointerEvent): boolean {
    if (e.pointerType !== "mouse" || e.button !== 0) return false;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
    return e.target instanceof Element && e.target.closest("a, button, [role='button']") === e.currentTarget;
}

/**
 * Opens something, such as a chat or a space, as soon as the primary mouse button goes down on it, as Telegram does,
 * so that switching feels instant and the press shows as the selection. The right button, modifier keys, touch and
 * the keyboard keep opening it as before, on the click.
 *
 * @param open - Opens what the element stands for
 * @returns The handlers to put on the element
 */
export function useOpenOnPress(open: () => void): OpenOnPressHandlers {
    const openedOnPress = useRef(false);

    const onPointerDown = useCallback(
        (e: PointerEvent): void => {
            openedOnPress.current = isPlainPrimaryPress(e);
            if (openedOnPress.current) open();
        },
        [open],
    );

    const onClick = useCallback(
        (e: SyntheticEvent): void => {
            // A click from the keyboard has no press before it (it is a key event, or a click with a detail of 0), so
            // it always opens
            if (openedOnPress.current && e.nativeEvent instanceof MouseEvent && e.nativeEvent.detail > 0) {
                openedOnPress.current = false;
                return;
            }
            open();
        },
        [open],
    );

    return { onPointerDown, onClick };
}
