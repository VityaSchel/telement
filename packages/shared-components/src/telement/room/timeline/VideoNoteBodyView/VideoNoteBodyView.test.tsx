/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { composeStories } from "@storybook/react-vite";
import { act, fireEvent, render, screen } from "@test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as stories from "./VideoNoteBodyView.stories";
import {
    VideoNoteBodyView,
    VideoNoteBodyViewState,
    VideoNotePlaybackState,
    type VideoNoteBodyViewActions,
    type VideoNoteBodyViewModel,
    type VideoNoteBodyViewSnapshot,
} from "./VideoNoteBodyView";

const { Preview, Paused, Hidden, ErrorState } = composeStories(stories);

class TestVideoNoteViewModel implements VideoNoteBodyViewModel {
    private readonly listeners = new Set<() => void>();
    public readonly onPreviewClick = vi.fn<NonNullable<VideoNoteBodyViewActions["onPreviewClick"]>>();
    public readonly onToggle = vi.fn<NonNullable<VideoNoteBodyViewActions["onToggle"]>>();
    public readonly onTimeUpdate = vi.fn<NonNullable<VideoNoteBodyViewActions["onTimeUpdate"]>>();
    public readonly onEnded = vi.fn<NonNullable<VideoNoteBodyViewActions["onEnded"]>>();

    public constructor(private snapshot: VideoNoteBodyViewSnapshot) {}

    public getSnapshot = (): VideoNoteBodyViewSnapshot => this.snapshot;

    public subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    public update(changes: Partial<VideoNoteBodyViewSnapshot>): void {
        this.snapshot = { ...this.snapshot, ...changes };
        act(() => this.listeners.forEach((listener) => listener()));
    }
}

const readySnapshot: VideoNoteBodyViewSnapshot = {
    state: VideoNoteBodyViewState.READY,
    diameter: 240,
    src: "https://example.org/note.mp4",
    poster: "https://example.org/note.jpg",
    loopPreview: true,
    playbackState: VideoNotePlaybackState.PREVIEW,
    progress: 0,
    timeLabel: "0:07",
    toggleLabel: "Play video message",
};

function getVideo(container: HTMLElement): HTMLVideoElement {
    return container.querySelector("video")!;
}

describe("VideoNoteBodyView", () => {
    let play: ReturnType<typeof vi.spyOn>;
    let pause: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
        pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it.each([
        ["preview", Preview],
        ["paused", Paused],
        ["hidden", Hidden],
        ["error", ErrorState],
    ])("matches snapshot for %s story", (_name, Story) => {
        const { container } = render(<Story />);
        expect(container).toMatchSnapshot();
    });

    it("reveals hidden media through the preview button", () => {
        const vm = new TestVideoNoteViewModel({
            state: VideoNoteBodyViewState.HIDDEN,
            diameter: 240,
            hiddenButtonLabel: "Show video",
        });
        render(<VideoNoteBodyView vm={vm} />);

        fireEvent.click(screen.getByRole("button", { name: "Show video" }));

        expect(vm.onPreviewClick).toHaveBeenCalledTimes(1);
    });

    it("loops silently in preview and toggles playback on click", () => {
        const vm = new TestVideoNoteViewModel(readySnapshot);
        const { container } = render(<VideoNoteBodyView vm={vm} />);
        const video = getVideo(container);

        expect(video.muted).toBe(true);
        expect(video.loop).toBe(true);
        expect(play).toHaveBeenCalled();
        expect(screen.getByText("0:07")).toBeInTheDocument();
        expect(container.querySelector("svg circle[pathLength]")).toBeNull();

        const toggle = screen.getByRole("button", { name: "Play video message" });
        expect(toggle).toHaveAttribute("aria-pressed", "false");
        fireEvent.click(toggle);
        expect(vm.onToggle).toHaveBeenCalledTimes(1);
    });

    it("stays still in preview when silent looping is off", () => {
        const vm = new TestVideoNoteViewModel({ ...readySnapshot, loopPreview: false });
        render(<VideoNoteBodyView vm={vm} />);

        expect(play).not.toHaveBeenCalled();
        expect(pause).toHaveBeenCalled();
    });

    it("restarts with sound when playback starts from the preview, then pauses", () => {
        const vm = new TestVideoNoteViewModel(readySnapshot);
        const { container } = render(<VideoNoteBodyView vm={vm} />);
        const video = getVideo(container);
        video.currentTime = 3;
        play.mockClear();

        vm.update({
            playbackState: VideoNotePlaybackState.PLAYING,
            progress: 0.25,
            toggleLabel: "Pause video message",
        });

        expect(video.muted).toBe(false);
        expect(video.loop).toBe(false);
        expect(video.currentTime).toBe(0);
        expect(play).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("button", { name: "Pause video message" })).toHaveAttribute("aria-pressed", "true");
        expect(container.querySelector("svg circle[pathLength]")).toHaveAttribute("stroke-dashoffset", "0.75");

        video.currentTime = 2;
        vm.update({ playbackState: VideoNotePlaybackState.PAUSED, toggleLabel: "Play video message" });

        expect(pause).toHaveBeenCalled();
        expect(video.currentTime).toBe(2);
    });

    it("resumes from the current position after a pause", () => {
        const vm = new TestVideoNoteViewModel({ ...readySnapshot, playbackState: VideoNotePlaybackState.PAUSED });
        const { container } = render(<VideoNoteBodyView vm={vm} />);
        const video = getVideo(container);
        video.currentTime = 4;

        vm.update({ playbackState: VideoNotePlaybackState.PLAYING });

        expect(video.currentTime).toBe(4);
        expect(play).toHaveBeenCalled();
    });

    it("reports playback progress and the end of playback", () => {
        const vm = new TestVideoNoteViewModel({ ...readySnapshot, playbackState: VideoNotePlaybackState.PLAYING });
        const { container } = render(<VideoNoteBodyView vm={vm} />);
        const video = getVideo(container);
        Object.defineProperty(video, "duration", { value: 8, configurable: true });
        video.currentTime = 2;

        fireEvent.timeUpdate(video);
        fireEvent.ended(video);

        expect(vm.onTimeUpdate).toHaveBeenCalledWith(2, 8);
        expect(vm.onEnded).toHaveBeenCalledTimes(1);
    });
});
