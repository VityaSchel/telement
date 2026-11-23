/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { composeStories } from "@storybook/react-vite";
import { fireEvent, render, screen } from "@test-utils";
import { describe, expect, it, vi } from "vitest";
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "../../tokens.css";

import * as stories from "./MediaDownloadProgressView.stories";

const { Downloading, SizeUnknown, Cancelled, InPlayer } = composeStories(stories);

describe("MediaDownloadProgressView", () => {
    it("fills its ring as far as the file has arrived, starting at the top", () => {
        const { container } = render(<Downloading />);

        const ring = screen.getByRole("progressbar", { name: "Downloading" });
        expect(ring).toHaveAttribute("aria-valuenow", "40");
        const arc = container.querySelector("circle")!;
        const circumference = 2 * Math.PI * 20;
        expect(Number(arc.getAttribute("stroke-dashoffset"))).toBeCloseTo(circumference * 0.6);
        expect(getComputedStyle(ring).transform).toBe("matrix(0, -1, 1, 0, 0, 0)");
    });

    it("spins a quarter of the ring, slowly with reduced motion, while the file's size is unknown", () => {
        render(<SizeUnknown />);

        const ring = screen.getByRole("progressbar", { name: "Downloading" });
        expect(ring).not.toHaveAttribute("aria-valuenow");
        // The tests run with reduced motion
        expect(getComputedStyle(ring).animationDuration).toBe("4s");
        expect(getComputedStyle(ring).animationIterationCount).toBe("infinite");
    });

    it("cancels the download with the × in its middle, without opening the picture it sits on", () => {
        const onLinkClick = vi.fn();
        render(
            <a href="#picture" onClick={onLinkClick}>
                <Downloading />
            </a>,
        );

        const event = fireEvent.click(screen.getByRole("button", { name: "Cancel download" }));

        expect(Downloading.args.cancel).toHaveBeenCalledTimes(1);
        expect(onLinkClick).not.toHaveBeenCalled();
        expect(event).toBe(false);
    });

    it("starts a cancelled download again with a download arrow", () => {
        render(<Cancelled />);

        expect(screen.queryByRole("progressbar")).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Download" }));

        expect(Cancelled.args.restart).toHaveBeenCalledTimes(1);
    });

    it("is a 48px dark disc with a white ring and ×, which read over any picture", () => {
        render(<Downloading />);

        const button = screen.getByRole("button", { name: "Cancel download" });
        expect(button.getBoundingClientRect()).toMatchObject({ width: 48, height: 48 });
        expect(getComputedStyle(button).backgroundColor).toBe("rgba(0, 0, 0, 0.55)");
        expect(getComputedStyle(button).color).toBe("rgb(255, 255, 255)");
        expect(getComputedStyle(button).borderRadius).toBe("50%");
        expect(getComputedStyle(document.querySelector("circle")!).stroke).toBe("rgb(255, 255, 255)");
    });

    it("takes the place of a player's play button, at its size and in its colors", () => {
        render(
            <div
                style={
                    {
                        "--tl-color-bg-media-play": "rgb(1, 2, 3)",
                        "--tl-color-on-media-play": "rgb(4, 5, 6)",
                    } as React.CSSProperties
                }
            >
                <InPlayer />
            </div>,
        );

        const button = screen.getByRole("button", { name: "Cancel download" });
        expect(button.getBoundingClientRect()).toMatchObject({ width: 32, height: 32 });
        expect(getComputedStyle(button).backgroundColor).toBe("rgb(1, 2, 3)");
        expect(getComputedStyle(document.querySelector("circle")!).stroke).toBe("rgb(4, 5, 6)");
        expect(document.querySelector("circle")).toHaveAttribute("r", "13");
    });
});
