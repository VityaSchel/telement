/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/**
 * Controls keep their own clicks: links, buttons such as an avatar, a reaction or a sender's name, fields, and media,
 * which opens its viewer on the first click.
 */
const CONTROL_SELECTOR = [
    "a",
    "button",
    "input",
    "textarea",
    "select",
    "summary",
    "label",
    "img",
    "video",
    "audio",
    "canvas",
    "iframe",
    "[role='button']",
    "[role='link']",
    "[role='slider']",
    "[role='checkbox']",
    "[role='radio']",
    "[role='switch']",
    "[role='menuitem']",
    "[contenteditable]:not([contenteditable='false'])",
    ".mx_AccessibleButton",
].join(", ");

function getCaretNode(x: number, y: number): Node | null {
    if (document.caretPositionFromPoint) return document.caretPositionFromPoint(x, y)?.offsetNode ?? null;
    return document.caretRangeFromPoint?.(x, y)?.startContainer ?? null;
}

/**
 * Whether the point is over a line of text. The browser places the caret in the text nearest to the point even when
 * the point is in the padding beside it, so the point has to be inside the boxes of that text's lines.
 */
function isOverText(x: number, y: number): boolean {
    const node = getCaretNode(x, y);
    if (!(node instanceof Text)) return false;
    const range = document.createRange();
    range.selectNodeContents(node);
    return Array.from(range.getClientRects()).some(
        (line) =>
            line.width > 0 && line.height > 0 && x >= line.left && x <= line.right && y >= line.top && y <= line.bottom,
    );
}

/**
 * Whether a double click on a message's row starts a reply, as in Telegram for macOS: on the bubble's padding, beside
 * the bubble or between messages, but not on text, where it selects a word, nor on a control. A click that reaches
 * the row from something drawn elsewhere, such as its open menu, doesn't count either.
 *
 * @param ev - The double click, or the press that starts it.
 */
export function isReplyDoubleClick(ev: Pick<MouseEvent, "target" | "currentTarget" | "clientX" | "clientY">): boolean {
    const { target, currentTarget } = ev;
    if (!(target instanceof Element) || !(currentTarget instanceof Element) || !currentTarget.contains(target)) {
        return false;
    }
    if (target.closest(CONTROL_SELECTOR)) return false;
    return !isOverText(ev.clientX, ev.clientY);
}
