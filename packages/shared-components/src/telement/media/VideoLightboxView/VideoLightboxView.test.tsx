/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { composeStories } from "@storybook/react-vite";
import { act, fireEvent, render, screen } from "@test-utils";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
// The layout assertions need the real spacing tokens, Compound's pill radius and Telement's radius tokens.
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../tokens.css";

import { BaseViewModel } from "../../../core/viewmodel/BaseViewModel";
import { MockViewModel } from "../../../core/viewmodel/MockViewModel";
import * as stories from "./VideoLightboxView.stories";
import { loadAvatarPhotos } from "../../core/Avatar/loadAvatarPhotos";
import avatarImage from "../../../../static/profile-pics/profile1.png";
import {
    VideoLightboxView,
    VideoLightboxViewState,
    type VideoLightboxViewActions,
    type VideoLightboxViewSnapshot,
} from "./VideoLightboxView";

const { Paused, Playing, ControlsHidden, Buffering, SpeedMenuOpen, Loading, ErrorState, Narrow } =
    composeStories(stories);

const snapshot: VideoLightboxViewSnapshot = {
    state: VideoLightboxViewState.READY,
    senderName: "Alice",
    senderId: "@alice:example.org",
    canViewSender: true,
    dateLabel: "Thu, Nov 12, 2026, 10:42 AM",
    dateHref: "https://matrix.to/#/!room:example.org/$event",
    playing: false,
    buffering: false,
    currentTime: 12,
    duration: 65,
    currentTimeLabel: "0:12",
    durationLabel: "1:05",
    volume: 0.8,
    muted: false,
    playbackRate: 1,
    speedMenuOpen: false,
    fullscreen: false,
    canFullscreen: true,
    canSave: true,
    saving: false,
    canForward: true,
    optionsOpen: false,
    highContrast: false,
    controlsVisible: true,
};

function createActions() {
    return {
        onClose: vi.fn<() => void>(),
        onSaveClick: vi.fn<() => void>(),
        onForwardClick: vi.fn<() => void>(),
        onOptionsClick: vi.fn<(button: HTMLElement) => void>(),
        onSenderClick: vi.fn<() => void>(),
        // The view model shows the message in Telement instead of following the link.
        onDateClick: vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault()),
        onEscape: vi.fn<() => void>(),
        togglePlay: vi.fn<() => void>(),
        seekTo: vi.fn<(seconds: number) => void>(),
        seekBackward: vi.fn<() => void>(),
        seekForward: vi.fn<() => void>(),
        setVolume: vi.fn<(volume: number) => void>(),
        toggleMute: vi.fn<() => void>(),
        toggleFullscreen: vi.fn<() => void>(),
        toggleSpeedMenu: vi.fn<() => void>(),
        closeSpeedMenu: vi.fn<() => void>(),
        setPlaybackRate: vi.fn<(rate: number) => void>(),
        onMediaUpdate: vi.fn<() => void>(),
        onMediaError: vi.fn<() => void>(),
        onUserActivity: vi.fn<() => void>(),
        setControlsHovered: vi.fn<(hovered: boolean) => void>(),
        setControlsFocused: vi.fn<(focused: boolean) => void>(),
    } satisfies VideoLightboxViewActions;
}

function renderView(overrides: Partial<VideoLightboxViewSnapshot> = {}): ReturnType<typeof createActions> {
    const actions = createActions();
    const vm = Object.assign(new MockViewModel<VideoLightboxViewSnapshot>({ ...snapshot, ...overrides }), actions);
    render(<VideoLightboxView vm={vm} />);
    return actions;
}

/** A view model whose snapshot the test changes, like the app's does. */
class LiveViewModel extends BaseViewModel<VideoLightboxViewSnapshot, undefined> {
    public constructor(initialSnapshot: VideoLightboxViewSnapshot) {
        super(undefined, initialSnapshot);
    }

    public update(changes: Partial<VideoLightboxViewSnapshot>): void {
        this.snapshot.merge(changes);
    }
}

function renderInWindow(
    width: number,
    height: number,
    overrides: Partial<VideoLightboxViewSnapshot> = {},
): ReturnType<typeof createActions> {
    const actions = createActions();
    const vm = Object.assign(new MockViewModel<VideoLightboxViewSnapshot>({ ...snapshot, ...overrides }), actions);
    render(
        <div style={{ width: `${width}px`, height: `${height}px` }}>
            <VideoLightboxView vm={vm} />
        </div>,
    );
    return actions;
}

/** The bottom of the space the video gets: the stage without its bottom padding. */
function videoSpaceBottom(): number {
    const stage = screen.getByRole("dialog").querySelector("video")!.parentElement!;
    return stage.getBoundingClientRect().bottom - Number.parseFloat(getComputedStyle(stage).paddingBottom);
}

describe("VideoLightboxView", () => {
    // Avatars show their letter until their photo has loaded, so the snapshots load the photos first
    beforeAll(() => loadAvatarPhotos(avatarImage));

    it.each([
        ["paused", Paused],
        ["playing", Playing],
        ["controls hidden", ControlsHidden],
        ["buffering", Buffering],
        ["speed menu open", SpeedMenuOpen],
        ["loading", Loading],
        ["error", ErrorState],
        ["narrow", Narrow],
    ])("matches snapshot for %s story", (_name, Story) => {
        const { container } = render(<Story />);
        expect(container).toMatchSnapshot();
    });

    it("shows the sender and date, and marks play to receive focus", () => {
        renderView();

        expect(screen.getByRole("dialog", { name: "Video view" })).toHaveClass("cpd-theme-dark");
        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Thu, Nov 12, 2026, 10:42 AM" })).toHaveAttribute(
            "href",
            "https://matrix.to/#/!room:example.org/$event",
        );
        expect(screen.getByRole("button", { name: "Play" })).toHaveAttribute("data-autofocus");
    });

    it("gives the date's link a kind, as Compound's links have, which keeps the app's link color off it", () => {
        renderView();

        expect(screen.getByRole("link", { name: "Thu, Nov 12, 2026, 10:42 AM" })).toHaveAttribute("data-kind");
    });

    it("uses the dark high contrast theme in high contrast mode", () => {
        renderView({ highContrast: true });

        expect(screen.getByRole("dialog")).toHaveClass("cpd-theme-dark-hc");
    });

    it("wires the top bar's buttons", () => {
        const actions = renderView();

        fireEvent.click(screen.getByRole("button", { name: "Save as…" }));
        fireEvent.click(screen.getByRole("button", { name: "Forward" }));
        fireEvent.click(screen.getByRole("button", { name: "Options" }));
        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        fireEvent.click(screen.getByRole("link", { name: "Thu, Nov 12, 2026, 10:42 AM" }));
        fireEvent.click(screen.getByRole("button", { name: "View profile" }));

        expect(actions.onSaveClick).toHaveBeenCalledTimes(1);
        expect(actions.onForwardClick).toHaveBeenCalledTimes(1);
        expect(actions.onOptionsClick).toHaveBeenCalledWith(screen.getByRole("button", { name: "Options" }));
        expect(actions.onClose).toHaveBeenCalledTimes(1);
        expect(actions.onDateClick).toHaveBeenCalledTimes(1);
        expect(actions.onSenderClick).toHaveBeenCalledTimes(1);
    });

    it("marks the options button while its menu is open", () => {
        renderView({ optionsOpen: true });

        const options = screen.getByRole("button", { name: "Options" });
        expect(options).toHaveAttribute("aria-haspopup", "menu");
        expect(options).toHaveAttribute("aria-expanded", "true");
    });

    it("shows an avatar that does nothing when the sender is unknown", () => {
        renderView({ canViewSender: false });

        expect(screen.queryByRole("button", { name: "View profile" })).toBeNull();
        expect(screen.getByRole("img", { name: "@alice:example.org" })).toBeInTheDocument();
    });

    it("hides save, forward and full screen when they are not available", () => {
        renderView({ canSave: false, canForward: false, canFullscreen: false });

        expect(screen.queryByRole("button", { name: "Save as…" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Forward" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Full screen" })).toBeNull();
    });

    it("disables saving while the video is being saved", () => {
        renderView({ saving: true });

        expect(screen.getByRole("button", { name: "Save as…" })).toBeDisabled();
    });

    it.each([
        ["wide", 960],
        ["narrow", 400],
    ])(
        "keeps the top bar's sender and 36px buttons 16px from the edges on a %s screen, like the image viewer's",
        (_name, width) => {
            renderInWindow(width, 560);

            const dialog = screen.getByRole("dialog").getBoundingClientRect();
            const close = screen.getByRole("button", { name: "Close" });
            const topBar = close.parentElement!.parentElement!.getBoundingClientRect();
            const avatar = screen.getByRole("button", { name: "View profile" }).getBoundingClientRect();
            expect(topBar.height).toBe(68);
            expect(avatar.left - dialog.left).toBe(16);
            expect(dialog.right - close.getBoundingClientRect().right).toBe(16);
            expect(close.getBoundingClientRect().top - dialog.top).toBe(16);
            for (const name of ["Save as…", "Forward", "Close"]) {
                const button = screen.getByRole("button", { name });
                const box = button.getBoundingClientRect();
                const icon = button.querySelector("svg")!.getBoundingClientRect();
                expect([box.width, box.height, icon.width, icon.height]).toEqual([36, 36, 24, 24]);
                expect([icon.left - box.left, icon.top - box.top]).toEqual([6, 6]);
            }
        },
    );

    it("mirrors the top bar's insets in a right-to-left layout", () => {
        const vm = Object.assign(new MockViewModel<VideoLightboxViewSnapshot>(snapshot), createActions());
        render(
            <div dir="rtl" style={{ width: "960px", height: "560px" }}>
                <VideoLightboxView vm={vm} />
            </div>,
        );

        const dialog = screen.getByRole("dialog").getBoundingClientRect();
        expect(screen.getByRole("button", { name: "Close" }).getBoundingClientRect().left - dialog.left).toBe(16);
        expect(dialog.right - screen.getByRole("button", { name: "View profile" }).getBoundingClientRect().right).toBe(
            16,
        );
    });

    it("wires the playback controls", () => {
        const actions = renderView({ playing: true });

        fireEvent.click(screen.getByRole("button", { name: "Pause" }));
        fireEvent.change(screen.getByRole("slider", { name: "Playback position" }), { target: { value: "30" } });
        fireEvent.click(screen.getByRole("button", { name: "Mute" }));
        fireEvent.change(screen.getByRole("slider", { name: "Volume" }), { target: { value: "0.5" } });
        fireEvent.click(screen.getByRole("button", { name: "Full screen" }));
        fireEvent.click(screen.getByRole("button", { name: "Playback speed: 1×" }));

        expect(actions.togglePlay).toHaveBeenCalledTimes(1);
        expect(actions.seekTo).toHaveBeenCalledWith(30);
        expect(actions.toggleMute).toHaveBeenCalledTimes(1);
        expect(actions.setVolume).toHaveBeenCalledWith(0.5);
        expect(actions.toggleFullscreen).toHaveBeenCalledTimes(1);
        expect(actions.toggleSpeedMenu).toHaveBeenCalledTimes(1);
    });

    it("describes the playback position", () => {
        renderView();

        const seekBar = screen.getByRole("slider", { name: "Playback position" });
        expect(seekBar).toHaveAttribute("aria-valuetext", "0:12 of 1:05");
        expect(seekBar).toHaveValue("12");
    });

    it("shows the sound as off when muted or at zero volume", () => {
        renderView({ muted: true });

        expect(screen.getByRole("button", { name: "Unmute" })).toBeInTheDocument();
        expect(screen.getByRole("slider", { name: "Volume" })).toHaveValue("0");
    });

    it("offers the exit from full screen while in full screen", () => {
        renderView({ fullscreen: true });

        expect(screen.getByRole("button", { name: "Exit full screen" })).toBeInTheDocument();
    });

    it("lists the playback speeds and focuses the current one", () => {
        const actions = renderView({ speedMenuOpen: true, playbackRate: 1.5 });

        const menu = screen.getByRole("menu", { name: "Playback speed" });
        const items = screen.getAllByRole("menuitemradio");
        expect(items.map((item) => item.textContent)).toEqual(["0.5×", "1×", "1.25×", "1.5×", "2×"]);
        expect(screen.getByRole("menuitemradio", { name: "1.5×" })).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("menuitemradio", { name: "1.5×" })).toHaveFocus();

        fireEvent.keyDown(menu, { key: "ArrowDown" });
        expect(screen.getByRole("menuitemradio", { name: "2×" })).toHaveFocus();
        fireEvent.keyDown(menu, { key: "ArrowDown" });
        expect(screen.getByRole("menuitemradio", { name: "0.5×" })).toHaveFocus();
        fireEvent.keyDown(menu, { key: "ArrowUp" });
        expect(screen.getByRole("menuitemradio", { name: "2×" })).toHaveFocus();

        fireEvent.click(screen.getByRole("menuitemradio", { name: "2×" }));
        expect(actions.setPlaybackRate).toHaveBeenCalledWith(2);
    });

    it("closes the speed menu when focus leaves it", () => {
        const actions = renderView({ speedMenuOpen: true });

        fireEvent.blur(screen.getByRole("menuitemradio", { name: "1×" }), {
            relatedTarget: screen.getByRole("button", { name: "Close" }),
        });

        expect(actions.closeSpeedMenu).toHaveBeenCalledTimes(1);
    });

    it.each([
        [" ", "togglePlay"],
        ["ArrowLeft", "seekBackward"],
        ["ArrowRight", "seekForward"],
        ["m", "toggleMute"],
        ["M", "toggleMute"],
        ["f", "toggleFullscreen"],
        ["Escape", "onEscape"],
    ] as const)("handles the %j key", (key, action) => {
        const actions = renderView();

        fireEvent.keyDown(screen.getByRole("slider", { name: "Playback position" }), { key });

        expect(actions[action]).toHaveBeenCalledTimes(1);
    });

    it("saves on Ctrl+S", () => {
        const actions = renderView();

        fireEvent.keyDown(screen.getByRole("dialog"), { key: "s", ctrlKey: true });

        expect(actions.onSaveClick).toHaveBeenCalledTimes(1);
    });

    it("leaves arrow keys to the volume slider", () => {
        const actions = renderView();

        fireEvent.keyDown(screen.getByRole("slider", { name: "Volume" }), { key: "ArrowLeft" });

        expect(actions.seekBackward).not.toHaveBeenCalled();
    });

    it("plays or pauses on Space after a control was clicked with the mouse", async () => {
        const actions = renderView();

        await userEvent.click(screen.getByRole("button", { name: "Mute" }));
        await userEvent.keyboard(" ");

        expect(actions.toggleMute).toHaveBeenCalledTimes(1);
        expect(actions.togglePlay).toHaveBeenCalledTimes(1);
    });

    it("leaves Space to a control reached with the keyboard", async () => {
        const actions = renderView();
        const mute = screen.getByRole("button", { name: "Mute" });
        for (let i = 0; i < 20 && document.activeElement !== mute; i++) await userEvent.keyboard("{Tab}");
        expect(mute).toHaveFocus();

        await userEvent.keyboard(" ");

        expect(actions.toggleMute).toHaveBeenCalledTimes(1);
        expect(actions.togglePlay).not.toHaveBeenCalled();
    });

    it("leaves Space to the speed menu", () => {
        const actions = renderView({ speedMenuOpen: true });

        fireEvent.keyDown(screen.getByRole("menuitemradio", { name: "1×" }), { key: " " });

        expect(actions.togglePlay).not.toHaveBeenCalled();
    });

    it("gives the seek bar a row of its own on a narrow screen", () => {
        render(
            <div style={{ width: "348px", height: "560px" }}>
                <VideoLightboxView
                    vm={Object.assign(new MockViewModel<VideoLightboxViewSnapshot>(snapshot), createActions())}
                />
            </div>,
        );

        const dialog = screen.getByRole("dialog");
        const seekBar = screen.getByRole("slider", { name: "Playback position" }).getBoundingClientRect();
        const play = screen.getByRole("button", { name: "Play" }).getBoundingClientRect();
        const fullscreen = screen.getByRole("button", { name: "Full screen" }).getBoundingClientRect();
        expect(dialog.scrollWidth).toBeLessThanOrEqual(348);
        expect(seekBar.width).toBeGreaterThanOrEqual(200);
        expect(seekBar.bottom).toBeLessThanOrEqual(play.top);
        expect(fullscreen.right).toBeLessThanOrEqual(348);
    });

    it("keeps the controls on one row on a wide screen", () => {
        render(
            <div style={{ width: "800px", height: "560px" }}>
                <VideoLightboxView
                    vm={Object.assign(new MockViewModel<VideoLightboxViewSnapshot>(snapshot), createActions())}
                />
            </div>,
        );

        const seekBar = screen.getByRole("slider", { name: "Playback position" }).getBoundingClientRect();
        const play = screen.getByRole("button", { name: "Play" }).getBoundingClientRect();
        const fullscreen = screen.getByRole("button", { name: "Full screen" }).getBoundingClientRect();
        expect(seekBar.top + seekBar.height / 2).toBeCloseTo(play.top + play.height / 2, 0);
        expect(fullscreen.top).toBe(play.top);
    });

    it("floats the controls over the bottom of the video in a bar up to 640px wide", () => {
        renderInWindow(1400, 700);

        const dialog = screen.getByRole("dialog").getBoundingClientRect();
        const bar = screen.getByRole("button", { name: "Play" }).parentElement!;
        const barRect = bar.getBoundingClientRect();
        expect(barRect.width).toBe(640);
        expect(barRect.left + barRect.width / 2).toBeCloseTo(dialog.left + dialog.width / 2, 0);
        // A video limited by the window's height ends where the bar does.
        expect(barRect.bottom).toBe(dialog.bottom - 24);
        expect(videoSpaceBottom()).toBe(barRect.bottom);
        // Concentric with the 36px round buttons at its ends, inset by the bar's 4px padding.
        expect(getComputedStyle(bar).borderRadius).toBe("22px");
        expect(getComputedStyle(bar).padding).toBe("4px");
    });

    it("draws the bar in a translucent dark grey that shows on the black backdrop", () => {
        renderView();

        const background = getComputedStyle(
            screen.getByRole("button", { name: "Play" }).parentElement!,
        ).backgroundColor;
        // The dark theme's subtle background, #26282d, at 90%.
        const channels = background.match(/[\d.]+/g)!.map(Number);
        expect(background).toMatch(/^color\(srgb /);
        expect(channels[0]).toBeCloseTo(0x26 / 255, 2);
        expect(channels[1]).toBeCloseTo(0x28 / 255, 2);
        expect(channels[2]).toBeCloseTo(0x2d / 255, 2);
        expect(channels[3]).toBeCloseTo(0.9, 2);
    });

    it("fades the bars and the pointer out when hidden, keeping every control for screen readers", () => {
        renderView({ playing: true, controlsVisible: false });

        const pause = screen.getByRole("button", { name: "Pause" });
        const bar = pause.parentElement!;
        const topBar = screen.getByRole("button", { name: "Close" }).parentElement!.parentElement!;
        expect(getComputedStyle(bar).opacity).toBe("0");
        expect(getComputedStyle(topBar).opacity).toBe("0");
        expect(getComputedStyle(pause).pointerEvents).toBe("none");
        expect(getComputedStyle(screen.getByRole("dialog").querySelector("video")!).cursor).toBe("none");
        expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
            "View profile",
            "Save as…",
            "Forward",
            "Options",
            "Close",
            "Pause",
            "Mute",
            "Playback speed: 1×",
            "Full screen",
        ]);
        expect(screen.getAllByRole("slider")).toHaveLength(2);
    });

    it("fades the bars without a transition when the user prefers reduced motion", () => {
        // The test browser runs with reduced motion.
        expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
        renderView({ playing: true });

        expect(getComputedStyle(screen.getByRole("button", { name: "Pause" }).parentElement!).transitionProperty).toBe(
            "none",
        );
    });

    it("shows the bars and the pointer while the controls are visible", () => {
        renderView({ playing: true });

        expect(getComputedStyle(screen.getByRole("button", { name: "Pause" }).parentElement!).opacity).toBe("1");
        expect(getComputedStyle(screen.getByRole("dialog").querySelector("video")!).cursor).not.toBe("none");
    });

    it("reports pointer movement, touches and key presses", () => {
        const actions = renderView({ playing: true });
        const dialog = screen.getByRole("dialog");
        const video = dialog.querySelector("video")!;

        fireEvent.pointerMove(video);
        fireEvent.pointerDown(video, { pointerType: "touch" });
        fireEvent.keyDown(dialog, { key: "Shift" });
        fireEvent.keyDown(screen.getByRole("button", { name: "Pause" }), { key: "Escape" });

        expect(actions.onUserActivity).toHaveBeenCalledTimes(4);
    });

    it("reports when the mouse pointer enters or leaves the controls", () => {
        const actions = renderView({ playing: true });
        const mouse = { pointerType: "mouse" };

        fireEvent.pointerEnter(screen.getByRole("button", { name: "Pause" }), mouse);
        expect(actions.setControlsHovered).toHaveBeenLastCalledWith(true);
        fireEvent.pointerLeave(screen.getByRole("button", { name: "Pause" }), mouse);
        expect(actions.setControlsHovered).toHaveBeenLastCalledWith(false);

        for (const control of [
            screen.getByRole("button", { name: "Close" }),
            screen.getByRole("link", { name: "Thu, Nov 12, 2026, 10:42 AM" }),
        ]) {
            fireEvent.pointerEnter(control, mouse);
            expect(actions.setControlsHovered).toHaveBeenLastCalledWith(true);
            fireEvent.pointerLeave(control, mouse);
            expect(actions.setControlsHovered).toHaveBeenLastCalledWith(false);
        }
        expect(actions.setControlsHovered).toHaveBeenCalledTimes(6);
    });

    it("does not count the empty space of the top bar or a touch as hovering", () => {
        const actions = renderView({ playing: true });
        const topBar = screen.getByRole("button", { name: "Close" }).parentElement!.parentElement!;

        fireEvent.pointerEnter(topBar, { pointerType: "mouse" });
        fireEvent.pointerEnter(screen.getByRole("button", { name: "Pause" }), { pointerType: "touch" });
        fireEvent.pointerLeave(screen.getByRole("button", { name: "Pause" }), { pointerType: "touch" });

        expect(actions.setControlsHovered).not.toHaveBeenCalled();
    });

    it("does not count the focus the play button gets when the viewer opens, until a key is pressed in it", async () => {
        // The viewer opens from the keyboard, so the play button's focus shows as keyboard focus.
        await userEvent.keyboard("{Shift}");
        const actions = renderView({ playing: true });
        const play = screen.getByRole("button", { name: "Pause" });

        play.focus();
        expect(play).toHaveFocus();
        expect(play.matches(":focus-visible")).toBe(true);
        expect(actions.setControlsFocused).toHaveBeenLastCalledWith(false);

        await userEvent.keyboard("{Tab}");
        expect(actions.setControlsFocused).toHaveBeenLastCalledWith(true);
    });

    it("reports keyboard focus in the bars, but not focus from a click", async () => {
        const actions = renderView({ playing: true });
        const mute = screen.getByRole("button", { name: "Mute" });

        for (let i = 0; i < 20 && document.activeElement !== mute; i++) await userEvent.keyboard("{Tab}");
        expect(mute).toHaveFocus();
        expect(actions.setControlsFocused).toHaveBeenLastCalledWith(true);

        await userEvent.click(screen.getByRole("button", { name: "Pause" }));
        expect(actions.setControlsFocused).toHaveBeenLastCalledWith(false);

        fireEvent.blur(screen.getByRole("button", { name: "Pause" }), { relatedTarget: null });
        expect(actions.setControlsFocused).toHaveBeenLastCalledWith(false);
    });

    it("lets a touch on hidden bars only bring them back", () => {
        const actions = renderView({ playing: true, controlsVisible: false });
        const pause = screen.getByRole("button", { name: "Pause" });
        const video = screen.getByRole("dialog").querySelector("video")!;

        fireEvent.pointerDown(pause, { pointerType: "touch" });
        fireEvent.click(pause);
        fireEvent.pointerDown(video, { pointerType: "pen" });
        fireEvent.click(video);
        expect(actions.togglePlay).not.toHaveBeenCalled();
        expect(actions.onUserActivity).toHaveBeenCalledTimes(2);

        // A mouse is seen moving first, so its clicks work, and so do clicks from the keyboard after a touch.
        fireEvent.pointerDown(pause, { pointerType: "mouse" });
        fireEvent.click(pause);
        fireEvent.pointerDown(pause, { pointerType: "touch" });
        fireEvent.keyDown(pause, { key: "Enter" });
        fireEvent.click(pause);
        expect(actions.togglePlay).toHaveBeenCalledTimes(2);
    });

    it("lets a tap on a hidden control only bring the bars back, also when the touch enters the bar first", () => {
        const actions = createActions();
        const vm = Object.assign(new LiveViewModel({ ...snapshot, playing: true, controlsVisible: false }), actions);
        const show = (): void => vm.update({ controlsVisible: true });
        actions.onUserActivity.mockImplementation(show);
        actions.setControlsHovered.mockImplementation(show);
        render(<VideoLightboxView vm={vm} />);
        const touch = { pointerType: "touch" };

        for (const name of ["Close", "Pause"]) {
            act(() => vm.update({ controlsVisible: false }));
            const control = screen.getByRole("button", { name });
            fireEvent.pointerOver(control, touch);
            fireEvent.pointerEnter(control, touch);
            fireEvent.pointerDown(control, touch);
            fireEvent.pointerUp(control, touch);
            fireEvent.click(control);
            expect(vm.getSnapshot().controlsVisible).toBe(true);
        }

        expect(actions.onClose).not.toHaveBeenCalled();
        expect(actions.togglePlay).not.toHaveBeenCalled();
    });

    it("lets a touch on visible bars press their controls", () => {
        const actions = renderView({ playing: true });
        const pause = screen.getByRole("button", { name: "Pause" });

        fireEvent.pointerDown(pause, { pointerType: "touch" });
        fireEvent.click(pause);

        expect(actions.togglePlay).toHaveBeenCalledTimes(1);
    });

    it("plays or pauses when the video is clicked and closes when the backdrop is clicked", () => {
        const actions = renderView();
        const video = screen.getByRole("dialog").querySelector("video")!;

        fireEvent.click(video);
        expect(actions.togglePlay).toHaveBeenCalledTimes(1);
        expect(actions.onClose).not.toHaveBeenCalled();

        fireEvent.click(video.parentElement!);
        expect(actions.onClose).toHaveBeenCalledTimes(1);

        fireEvent.doubleClick(video);
        expect(actions.toggleFullscreen).toHaveBeenCalledTimes(1);
    });

    it("reports the video element's changes and errors", () => {
        const actions = renderView();
        const video = screen.getByRole("dialog").querySelector("video")!;

        fireEvent.timeUpdate(video);
        fireEvent.play(video);
        fireEvent.waiting(video);
        fireEvent.canPlay(video);
        fireEvent.playing(video);
        fireEvent.error(video);

        expect(actions.onMediaUpdate).toHaveBeenCalledTimes(5);
        expect(actions.onMediaError).toHaveBeenCalledTimes(1);
    });

    it("shows a spinner while loading, centred on the video", () => {
        renderInWindow(1400, 700, { state: VideoLightboxViewState.LOADING, src: undefined });

        const spinner = screen.getByRole("progressbar").parentElement!.getBoundingClientRect();
        const video = screen.getByRole("dialog").querySelector("video")!.getBoundingClientRect();
        expect(spinner.top + spinner.height / 2).toBeCloseTo(video.top + video.height / 2, 0);
        expect(getComputedStyle(screen.getByRole("progressbar").parentElement!.parentElement!).animationName).toBe(
            "none",
        );
    });

    it("shows a spinner when the playing video waits for more of it, after a moment", () => {
        renderView({ playing: true, buffering: true });

        // Until it shows, it is hidden from screen readers too.
        const status = screen.getByRole("progressbar", { hidden: true }).parentElement!.parentElement!;
        expect(screen.getByRole("dialog").querySelector("video")).toBeInTheDocument();
        expect(getComputedStyle(status).animationName).not.toBe("none");
        expect(getComputedStyle(status).animationDelay).toBe("0.5s");
    });

    it("shows no spinner while the video plays on", () => {
        renderView({ playing: true });

        expect(screen.queryByRole("progressbar")).toBeNull();
    });

    it.each([
        ["wide", 800],
        ["narrow", 348],
    ])("opens the speed menu just above the bar in a %s window, lined up with its button", (_name, width) => {
        renderInWindow(width, 560, { speedMenuOpen: true });

        const bar = screen.getByRole("button", { name: "Play" }).parentElement!.getBoundingClientRect();
        const menu = screen.getByRole("menu", { name: "Playback speed" }).getBoundingClientRect();
        const button = screen.getByRole("button", { name: "Playback speed: 1×" }).getBoundingClientRect();
        expect(menu.bottom).toBeCloseTo(bar.top - 8, 0);
        expect(menu.right).toBeCloseTo(button.right, 0);
    });

    it("rounds the speed menu around its items, inset 4px from its outer edge like Telement's other menus", () => {
        renderView({ speedMenuOpen: true });

        const menu = screen.getByRole("menu", { name: "Playback speed" });
        const items = screen.getAllByRole("menuitemradio");
        const menuBox = menu.getBoundingClientRect();
        const first = items[0].getBoundingClientRect();
        const last = items[items.length - 1].getBoundingClientRect();
        expect(first.left - menuBox.left).toBeCloseTo(4, 1);
        expect(first.top - menuBox.top).toBeCloseTo(4, 1);
        expect(menuBox.right - first.right).toBeCloseTo(4, 1);
        expect(menuBox.bottom - last.bottom).toBeCloseTo(4, 1);
        for (const item of items) expect(getComputedStyle(item).borderRadius).toBe("8px");
        // Concentric: the items' radius plus their inset
        expect(getComputedStyle(menu).borderRadius).toBe("12px");
    });

    it("draws focus rings on the controls' edges, inside the bar's padding", async () => {
        renderView();

        // Compound rounds the icon buttons; the slider and the speed button are round-ended like them.
        for (const control of [
            screen.getByRole("button", { name: "Play" }),
            screen.getByRole("slider", { name: "Playback position" }),
            screen.getByRole("button", { name: "Playback speed: 1×" }),
            screen.getByRole("button", { name: "Full screen" }),
        ]) {
            for (let i = 0; i < 20 && document.activeElement !== control; i++) await userEvent.keyboard("{Tab}");
            expect(control).toHaveFocus();
            const style = getComputedStyle(control);
            expect([style.outlineStyle, style.outlineWidth, style.outlineOffset]).toEqual(["solid", "2px", "0px"]);
            // Compound gives its icon buttons a percentage of their box
            const box = control.getBoundingClientRect();
            const radius = style.borderTopLeftRadius.endsWith("%")
                ? (parseFloat(style.borderTopLeftRadius) / 100) * box.width
                : parseFloat(style.borderTopLeftRadius);
            expect(radius).toBeGreaterThanOrEqual(box.height / 2);
        }
    });

    it("shows the error instead of the video and its controls, keeping saving", () => {
        renderView({ state: VideoLightboxViewState.ERROR, errorLabel: "Cannot play" });

        expect(screen.getByRole("alert")).toHaveTextContent("Cannot play");
        expect(screen.getByRole("dialog").querySelector("video")).toBeNull();
        expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
        expect(screen.queryByRole("slider")).toBeNull();
        expect(screen.getByRole("button", { name: "Save as…" })).toBeInTheDocument();
    });
});
