/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";

import { getScrollEdges, type ScrollEdges, useScrollEdges } from "./useScrollEdges";

/** A 100px wide scroller of `contentWidth` content, which writes its edges into its data attributes. */
function Scroller({ dir, contentWidth }: { dir: "ltr" | "rtl"; contentWidth: number }): JSX.Element {
    const [ref, { hiddenAtStart, hiddenAtEnd }] = useScrollEdges<HTMLDivElement>();
    return (
        <div
            ref={ref}
            dir={dir}
            data-start={hiddenAtStart}
            data-end={hiddenAtEnd}
            style={{ width: 100, overflowX: "auto", whiteSpace: "nowrap" }}
        >
            <div style={{ display: "inline-block", width: contentWidth, height: 10 }} />
        </div>
    );
}

let root: Root | undefined;

function render(dir: "ltr" | "rtl", contentWidth: number): HTMLElement {
    document.body.innerHTML = "<div></div>";
    root = createRoot(document.body.firstElementChild!);
    flushSync(() => root!.render(<Scroller dir={dir} contentWidth={contentWidth} />));
    return document.querySelector<HTMLElement>("[data-start]")!;
}

const edgesOf = (scroller: HTMLElement): ScrollEdges => ({
    hiddenAtStart: scroller.dataset.start === "true",
    hiddenAtEnd: scroller.dataset.end === "true",
});

/** Scrolls `scroller` `distance` pixels from its start, which is its right in right-to-left text. */
async function scrollFromStart(scroller: HTMLElement, distance: number): Promise<void> {
    scroller.scrollLeft = scroller.dir === "rtl" ? -distance : distance;
    await vi.waitFor(() => expect(Math.abs(scroller.scrollLeft)).toBe(distance));
}

describe("useScrollEdges", () => {
    afterEach(() => {
        root?.unmount();
        root = undefined;
        document.body.innerHTML = "";
    });

    it.each(["ltr", "rtl"] as const)(
        "says which side of a scroller hides content as it scrolls from its start to its end, in %s text",
        async (dir) => {
            const scroller = render(dir, 300);

            await vi.waitFor(() => expect(edgesOf(scroller)).toEqual({ hiddenAtStart: false, hiddenAtEnd: true }));

            await scrollFromStart(scroller, 100);
            await vi.waitFor(() => expect(edgesOf(scroller)).toEqual({ hiddenAtStart: true, hiddenAtEnd: true }));

            await scrollFromStart(scroller, 200);
            await vi.waitFor(() => expect(edgesOf(scroller)).toEqual({ hiddenAtStart: true, hiddenAtEnd: false }));
        },
    );

    it("says nothing is hidden where the content fits", async () => {
        const scroller = render("ltr", 80);

        await vi.waitFor(() => expect(edgesOf(scroller)).toEqual({ hiddenAtStart: false, hiddenAtEnd: false }));
    });

    it("follows the scroller's width, as when the timeline is resized", async () => {
        const scroller = render("ltr", 300);
        await vi.waitFor(() => expect(edgesOf(scroller).hiddenAtEnd).toBe(true));

        scroller.style.width = "320px";

        await vi.waitFor(() => expect(edgesOf(scroller)).toEqual({ hiddenAtStart: false, hiddenAtEnd: false }));
    });

    it("follows its content, as when the code is highlighted or the block expanded", async () => {
        const scroller = render("ltr", 80);
        await vi.waitFor(() => expect(edgesOf(scroller).hiddenAtEnd).toBe(false));

        scroller.append(Object.assign(document.createElement("span"), { textContent: "x".repeat(200) }));

        await vi.waitFor(() => expect(edgesOf(scroller).hiddenAtEnd).toBe(true));
    });

    it("counts a fraction of a pixel left to scroll as nothing hidden", () => {
        const element = { scrollLeft: 199, scrollWidth: 299.5, clientWidth: 100 } as HTMLElement;

        expect(getScrollEdges(element)).toEqual({ hiddenAtStart: true, hiddenAtEnd: false });
    });
});
