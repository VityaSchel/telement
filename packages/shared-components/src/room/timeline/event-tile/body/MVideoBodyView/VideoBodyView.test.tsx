/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import { composeStories } from "@storybook/react-vite";
import { fireEvent, render, screen } from "@test-utils";
import { describe, expect, it, vi } from "vitest";

import { MockViewModel } from "../../../../../core/viewmodel/MockViewModel";
import * as stories from "./VideoBodyView.stories";
import {
    VideoBodyView,
    VideoBodyViewState,
    type VideoBodyViewActions,
    type VideoBodyViewSnapshot,
} from "./VideoBodyView";

const { Ready, WithoutPoster, Hidden, ErrorState } = composeStories(stories);

class TestVideoBodyViewModel extends MockViewModel<VideoBodyViewSnapshot> implements VideoBodyViewActions {
    public onPreviewClick?: VideoBodyViewActions["onPreviewClick"];
    public onPlayClick?: VideoBodyViewActions["onPlayClick"];

    public constructor(snapshot: VideoBodyViewSnapshot, actions: VideoBodyViewActions = {}) {
        super(snapshot);
        this.onPreviewClick = actions.onPreviewClick;
        this.onPlayClick = actions.onPlayClick;
    }
}

const readySnapshot: VideoBodyViewSnapshot = {
    state: VideoBodyViewState.READY,
    playLabel: "Play video: Product demo video",
    maxWidth: 320,
    maxHeight: 180,
    aspectRatio: "16/9",
    poster: "https://example.org/demo-poster.jpg",
    durationLabel: "1:05",
    playable: true,
};

describe("VideoBodyView", () => {
    it.each([
        ["ready", Ready],
        ["without poster", WithoutPoster],
        ["hidden", Hidden],
        ["error", ErrorState],
    ])("matches snapshot for %s story", (_name, Story) => {
        const { container } = render(<Story />);
        expect(container).toMatchSnapshot();
    });

    it("renders the hidden preview button and wires the click handler", () => {
        const onPreviewClick = vi.fn();
        const vm = new TestVideoBodyViewModel(
            {
                state: VideoBodyViewState.HIDDEN,
                hiddenButtonLabel: "Show video",
                maxWidth: 320,
                maxHeight: 180,
                aspectRatio: "16/9",
            },
            { onPreviewClick },
        );

        render(<VideoBodyView vm={vm} />);

        fireEvent.click(screen.getByRole("button", { name: "Show video" }));
        expect(onPreviewClick).toHaveBeenCalledTimes(1);
    });

    it("renders an error message when media processing fails", () => {
        const vm = new TestVideoBodyViewModel({
            state: VideoBodyViewState.ERROR,
            errorLabel: "Error decrypting video",
        });

        render(<VideoBodyView vm={vm} />);

        expect(screen.getByText("Error decrypting video")).toBeInTheDocument();
    });

    it("renders the poster with its duration and file body content, and never a video", () => {
        const vm = new TestVideoBodyViewModel(readySnapshot);

        const { container } = render(
            <VideoBodyView vm={vm}>
                <div>File body slot</div>
            </VideoBodyView>,
        );

        const poster = screen.getByRole("button", { name: "Play video: Product demo video" });
        expect(poster.querySelector("img")).toHaveAttribute("src", "https://example.org/demo-poster.jpg");
        expect(poster).toHaveTextContent("1:05");
        expect(container.querySelector("video")).toBeNull();
        expect(screen.getByText("File body slot")).toBeInTheDocument();
    });

    it("draws a placeholder without a poster or duration", () => {
        const vm = new TestVideoBodyViewModel({ ...readySnapshot, poster: undefined, durationLabel: undefined });

        render(<VideoBodyView vm={vm} />);

        const poster = screen.getByRole("button", { name: "Play video: Product demo video" });
        expect(poster.querySelector("img")).toBeNull();
        expect(poster).toHaveTextContent("");
    });

    it("keeps the poster's size inside a parent that fits its content", () => {
        const vm = new TestVideoBodyViewModel({ ...readySnapshot, poster: undefined });

        render(
            <div style={{ width: "fit-content" }}>
                <VideoBodyView vm={vm} />
            </div>,
        );

        const { width, height } = screen
            .getByRole("button", { name: "Play video: Product demo video" })
            .getBoundingClientRect();
        expect(width).toBe(320);
        expect(height).toBe(180);
    });

    it("fits the poster into a narrower parent", () => {
        const vm = new TestVideoBodyViewModel(readySnapshot);

        render(
            <div style={{ width: "160px" }}>
                <VideoBodyView vm={vm} />
            </div>,
        );

        const { width, height } = screen
            .getByRole("button", { name: "Play video: Product demo video" })
            .getBoundingClientRect();
        expect(width).toBe(160);
        expect(height).toBe(90);
    });

    it("focuses the poster and asks to play the video when clicked", () => {
        const onPlayClick = vi.fn();
        const vm = new TestVideoBodyViewModel(readySnapshot, { onPlayClick });

        render(<VideoBodyView vm={vm} />);

        const poster = screen.getByRole("button", { name: "Play video: Product demo video" });
        fireEvent.click(poster);
        expect(onPlayClick).toHaveBeenCalledTimes(1);
        expect(poster).toHaveFocus();
    });

    it("renders a poster that cannot be clicked when the video cannot be played", () => {
        const vm = new TestVideoBodyViewModel({ ...readySnapshot, playable: false });

        render(<VideoBodyView vm={vm} />);

        expect(screen.queryByRole("button")).toBeNull();
        expect(screen.getByText("1:05")).toBeInTheDocument();
    });

    it("links the poster to the video file in exported chats", () => {
        const vm = new TestVideoBodyViewModel({ ...readySnapshot, playable: false, href: "files/demo.mp4" });

        render(<VideoBodyView vm={vm} />);

        expect(screen.getByRole("link", { name: "Play video: Product demo video" })).toHaveAttribute(
            "href",
            "files/demo.mp4",
        );
    });
});
