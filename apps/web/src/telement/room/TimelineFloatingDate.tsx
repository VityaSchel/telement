/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useEffect, useRef } from "react";
import { type Room } from "matrix-js-sdk/src/matrix";
import { FloatingDateView, useCreateAutoDisposedViewModel } from "@element-hq/web-shared-components";

import { FloatingDateViewModel } from "../../viewmodels/telement/room/FloatingDateViewModel";
import { measureTimelinePosition } from "./measureTimelinePosition";

interface TimelineFloatingDateProps {
    /** The room whose timeline it floats over. */
    room: Room;
}

/**
 * The room timeline's floating date pill. It is drawn in the timeline's container, over the message list, and follows
 * the scrolling of the timeline's scroll panel, which it hears from the container: scroll events don't bubble, but they
 * pass the container on their way to the panel.
 */
export function TimelineFloatingDate({ room }: Readonly<TimelineFloatingDateProps>): JSX.Element {
    const vm = useCreateAutoDisposedViewModel(() => new FloatingDateViewModel({ room }));
    const anchor = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timeline = anchor.current?.parentElement;
        if (!timeline) return;
        let frame = 0;
        const onScroll = (event: Event): void => {
            const panel = event.target;
            if (!(panel instanceof HTMLElement) || !panel.classList.contains("mx_RoomView_messagePanel")) return;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => vm.onScroll(measureTimelinePosition(panel)));
        };
        timeline.addEventListener("scroll", onScroll, { capture: true, passive: true });
        return () => {
            timeline.removeEventListener("scroll", onScroll, { capture: true });
            cancelAnimationFrame(frame);
        };
    }, [vm]);

    return (
        <div ref={anchor} style={{ display: "contents" }}>
            <FloatingDateView vm={vm} />
        </div>
    );
}
