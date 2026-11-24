/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { useEffect, useState } from "react";

/** Which sides of a horizontally scrolling element have content scrolled out of view. */
export interface ScrollEdges {
    /** Content is hidden before the start of the line: the element is scrolled away from its start. */
    hiddenAtStart: boolean;
    /** Content is hidden past the end of the line: the element can scroll further towards its end. */
    hiddenAtEnd: boolean;
}

const NONE: ScrollEdges = { hiddenAtStart: false, hiddenAtEnd: false };

/** Scroll positions are whole pixels while widths are not, so a fraction of a pixel left over counts as none. */
const TOLERANCE = 1;

/**
 * Reads which sides of an element scrolled along the inline axis hide content. The distance from the start is the
 * size of `scrollLeft` in either writing direction, as right-to-left scrolling counts down from 0.
 */
export function getScrollEdges(element: HTMLElement): ScrollEdges {
    const fromStart = Math.abs(element.scrollLeft);
    const overflow = element.scrollWidth - element.clientWidth;
    if (overflow <= TOLERANCE) return NONE;
    return {
        hiddenAtStart: fromStart > TOLERANCE,
        hiddenAtEnd: overflow - fromStart > TOLERANCE,
    };
}

/**
 * Follows which sides of a horizontally scrolling element hide content, as it scrolls, resizes or its content changes,
 * so that the side that has more to show can fade out.
 * @param element - The element, or null before it is mounted.
 */
export function useScrollEdges(element: HTMLElement | null): ScrollEdges {
    const [edges, setEdges] = useState<ScrollEdges>(NONE);

    useEffect(() => {
        if (!element) return;
        const update = (): void => {
            const next = getScrollEdges(element);
            setEdges((current) =>
                current.hiddenAtStart === next.hiddenAtStart && current.hiddenAtEnd === next.hiddenAtEnd
                    ? current
                    : next,
            );
        };
        update();

        element.addEventListener("scroll", update, { passive: true });
        // The element's own size changes with the timeline and when it is expanded; its content's width when the code
        // is highlighted or the font loads
        const resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(element);
        const mutationObserver = new MutationObserver(update);
        mutationObserver.observe(element, { childList: true, subtree: true, characterData: true });
        void document.fonts?.ready.then(update);

        return () => {
            element.removeEventListener("scroll", update);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, [element]);

    return edges;
}
