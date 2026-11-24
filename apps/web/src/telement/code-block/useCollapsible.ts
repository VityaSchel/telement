/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { useEffect, useState } from "react";

/** The share of the window's height a collapsed block's code takes at most, `mx_EventTile_collapsedCodeBlock`'s 30vh. */
const COLLAPSED_HEIGHT_SHARE = 0.3;

/** Heights can be fractions of a pixel, which hide no code. */
const TOLERANCE = 1;

/**
 * Reads whether a code block hides code while it is collapsed, from the height of its lines rather than their number:
 * how many fit depends on the window and on the font size.
 * @param pre - The block's `pre` element, collapsed or expanded.
 */
export function isCollapsible(pre: HTMLElement): boolean {
    const { paddingBlockStart, paddingBlockEnd } = getComputedStyle(pre);
    const codeHeight = pre.scrollHeight - parseFloat(paddingBlockStart) - parseFloat(paddingBlockEnd);
    const collapsedHeight = document.documentElement.clientHeight * COLLAPSED_HEIGHT_SHARE;
    return pre.scrollHeight - pre.clientHeight > TOLERANCE || codeHeight - collapsedHeight > TOLERANCE;
}

/**
 * Follows whether a code block hides code while it is collapsed, as the window, the font and the code change, so that
 * a block that shows all of it has nothing to expand.
 * @param pre - The block's `pre` element, or null before it is mounted.
 */
export function useCollapsible(pre: HTMLElement | null): boolean {
    const [collapsible, setCollapsible] = useState(false);

    useEffect(() => {
        if (!pre) return;
        const update = (): void => setCollapsible(isCollapsible(pre));
        update();

        // A block whose code starts or stops fitting changes size, except an expanded one as the window's height changes
        const resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(pre);
        window.addEventListener("resize", update);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", update);
        };
    }, [pre]);

    return collapsible;
}
