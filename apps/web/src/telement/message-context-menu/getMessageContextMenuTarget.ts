/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/** What a right click inside a message landed on. */
interface MessageContextMenuTarget {
    /** Address of the link under the pointer, which the menu offers to copy. */
    link?: string;
    /** Address of the picture under the pointer, which the menu offers to copy. */
    imageSrc?: string;
}

/** Text fields keep the browser's own menu, with its spell checking and pasting. */
const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

/**
 * Avatars draw their picture inside an element that is itself the image, custom reactions sit in the reactions
 * toolbar, and replies quote another message.
 */
const NOT_A_MESSAGE_PICTURE_SELECTOR = "[role='img'], [role='toolbar'], .mx_ReplyChain";

/** Media download addresses that only work inside this page or with the user's access token. */
const MEDIA_PATH_PREFIXES = ["/_matrix/media/", "/_matrix/client/v1/media/"];

function isShareableLink(href: string): boolean {
    if (href.startsWith("blob:")) return false;
    try {
        const { pathname } = new URL(href);
        return !MEDIA_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    } catch {
        return false;
    }
}

/**
 * Works out what the message context menu offers for a right click on `target`, or returns `null` when the
 * browser's own menu should open instead.
 *
 * Pictures in the message can be copied, but not avatars or pictures in a quoted reply. Links can be copied too,
 * except for media download addresses, which nobody else can open.
 */
export function getMessageContextMenuTarget(target: EventTarget | null): MessageContextMenuTarget | null {
    if (!(target instanceof Element)) return {};
    if (target.closest(EDITABLE_SELECTOR)) return null;

    const href = target.closest("a")?.href;
    const isMessagePicture =
        target instanceof HTMLImageElement && !target.parentElement?.closest(NOT_A_MESSAGE_PICTURE_SELECTOR);

    return {
        link: href && isShareableLink(href) ? href : undefined,
        imageSrc: isMessagePicture ? target.currentSrc || target.src : undefined,
    };
}
