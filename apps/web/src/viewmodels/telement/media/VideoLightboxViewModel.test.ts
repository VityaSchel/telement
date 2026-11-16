/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { EventStatus, EventType, MatrixEvent, MsgType, type RoomMember } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";
import { VideoLightboxViewState } from "@element-hq/web-shared-components";
import { stubClient } from "test-utils";

import dis from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import { MediaEventHelper } from "../../../utils/MediaEventHelper";
import { type RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { PlaybackManager } from "../../../audio/PlaybackManager";
import { checkMediaSavingAllowed, saveMediaAs } from "../../../telement/media/saveMediaAs";
import { VideoNoteBodyViewModel } from "../message-body/VideoNoteBodyViewModel";
import { VideoLightboxViewModel, type VideoLightboxViewModelProps } from "./VideoLightboxViewModel";

vi.mock("../../../dispatcher/dispatcher");
vi.mock("../../../telement/media/saveMediaAs", () => ({
    checkMediaSavingAllowed: vi.fn(),
    saveMediaAs: vi.fn(),
}));

/** A stand-in for the video element, which happy-dom cannot play. */
class FakeVideo {
    public paused = true;
    public ended = false;
    /** HAVE_ENOUGH_DATA: the video can play to its end. */
    public readyState = 4;
    public currentTime = 0;
    public duration = Number.NaN;
    public volume = 1;
    public muted = false;
    public playbackRate = 1;
    public defaultPlaybackRate = 1;
    public play = vi.fn(async (): Promise<void> => {
        this.paused = false;
    });
    public pause = vi.fn((): void => {
        this.paused = true;
    });
}

function createEvent(content: Record<string, unknown> = {}, status: EventStatus | null = null): MatrixEvent {
    const event = new MatrixEvent({
        type: EventType.RoomMessage,
        room_id: "!room:server",
        event_id: "$video:server",
        sender: "@alice:server",
        origin_server_ts: new Date(2026, 10, 12, 10, 42).getTime(),
        content: {
            msgtype: MsgType.Video,
            body: "holiday.mp4",
            url: "mxc://server/video",
            info: { duration: 65_000, mimetype: "video/mp4" },
            ...content,
        },
    });
    event.setStatus(status);
    return event;
}

function createHelper({
    sourceUrl = Promise.resolve<string | null>("https://server/video.mp4"),
    thumbnailUrl = Promise.resolve<string | null>("https://server/poster.jpg"),
}: {
    sourceUrl?: Promise<string | null>;
    thumbnailUrl?: Promise<string | null>;
} = {}): MediaEventHelper {
    return { sourceUrl: { value: sourceUrl }, thumbnailUrl: { value: thumbnailUrl } } as unknown as MediaEventHelper;
}

describe("VideoLightboxViewModel", () => {
    let video: FakeVideo;
    let onFinished: Mock<() => void>;
    let vm: VideoLightboxViewModel | undefined;

    const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

    function createVm(overrides: Partial<VideoLightboxViewModelProps> = {}): VideoLightboxViewModel {
        vm = new VideoLightboxViewModel({
            mxEvent: createEvent(),
            mediaEventHelper: createHelper(),
            videoRef: { current: video as unknown as HTMLVideoElement },
            onFinished,
            ...overrides,
        });
        return vm;
    }

    beforeEach(() => {
        stubClient();
        video = new FakeVideo();
        onFinished = vi.fn<() => void>();
        vi.mocked(checkMediaSavingAllowed).mockReturnValue(undefined);
        vi.mocked(saveMediaAs).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vm?.dispose();
        vm = undefined;
        document.body.className = "";
        vi.restoreAllMocks();
        vi.mocked(dis.dispatch).mockClear();
        vi.mocked(saveMediaAs).mockReset();
    });

    describe("top bar", () => {
        it("shows the sender, the date and a link to the message", () => {
            const forEvent = vi.fn().mockReturnValue("https://matrix.to/#/!room:server/$video:server");
            const mxEvent = createEvent();
            mxEvent.sender = {
                name: "Alice",
                userId: "@alice:server",
                getMxcAvatarUrl: () => undefined,
            } as unknown as RoomMember;

            const snapshot = createVm({
                mxEvent,
                permalinkCreator: { forEvent } as unknown as RoomPermalinkCreator,
            }).getSnapshot();

            expect(snapshot).toMatchObject({
                senderName: "Alice",
                senderId: "@alice:server",
                canViewSender: true,
                senderAvatarUrl: undefined,
                dateHref: "https://matrix.to/#/!room:server/$video:server",
            });
            expect(snapshot.dateLabel).toContain("2026");
            expect(forEvent).toHaveBeenCalledWith("$video:server");
        });

        it("falls back to the sender's ID and an inert link", () => {
            const snapshot = createVm().getSnapshot();

            expect(snapshot.senderName).toBe("@alice:server");
            expect(snapshot.canViewSender).toBe(false);
            expect(snapshot.dateHref).toBe("#");
        });

        it("shows the sender's profile, closing the viewer", () => {
            const mxEvent = createEvent();
            const sender = { name: "Alice", userId: "@alice:server", getMxcAvatarUrl: () => undefined };
            mxEvent.sender = sender as unknown as RoomMember;

            createVm({ mxEvent }).onSenderClick();

            expect(dis.dispatch).toHaveBeenCalledWith({ action: Action.ViewUser, member: sender });
            expect(onFinished).toHaveBeenCalled();
        });

        it("cannot show the profile of an unknown sender", () => {
            createVm().onSenderClick();

            expect(dis.dispatch).not.toHaveBeenCalled();
            expect(onFinished).not.toHaveBeenCalled();
        });

        it("shows the message in its room when the date is clicked", () => {
            const event = { preventDefault: vi.fn() };

            createVm().onDateClick(event as unknown as React.MouseEvent<HTMLAnchorElement>);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(dis.dispatch).toHaveBeenCalledWith({
                action: Action.ViewRoom,
                event_id: "$video:server",
                highlighted: true,
                room_id: "!room:server",
            });
            expect(onFinished).toHaveBeenCalled();
        });

        it("closes", () => {
            createVm().onClose();

            expect(onFinished).toHaveBeenCalled();
        });

        it("uses the high contrast theme when the app does", () => {
            document.body.classList.add("cpd-theme-light-hc");

            expect(createVm().getSnapshot().highContrast).toBe(true);
        });
    });

    describe("saving", () => {
        it("saves the video with the message's media helper", async () => {
            const mediaEventHelper = createHelper();
            const mxEvent = createEvent();
            const { promise, resolve } = Promise.withResolvers<void>();
            vi.mocked(saveMediaAs).mockReturnValue(promise);
            createVm({ mxEvent, mediaEventHelper });

            const saved = vm!.onSaveClick();
            expect(saveMediaAs).toHaveBeenCalledWith(mxEvent, mediaEventHelper);
            expect(vm!.getSnapshot().saving).toBe(true);

            void vm!.onSaveClick();
            expect(saveMediaAs).toHaveBeenCalledTimes(1);

            resolve();
            await saved;
            expect(vm!.getSnapshot().saving).toBe(false);
        });

        it("hides saving until a module allows it", async () => {
            const { promise, resolve } = Promise.withResolvers<boolean>();
            vi.mocked(checkMediaSavingAllowed).mockReturnValue(promise);

            createVm();
            expect(vm!.getSnapshot().canSave).toBe(false);
            void vm!.onSaveClick();
            expect(saveMediaAs).not.toHaveBeenCalled();

            resolve(true);
            await flush();
            expect(vm!.getSnapshot().canSave).toBe(true);
        });

        it("keeps saving hidden when a module refuses", async () => {
            vi.mocked(checkMediaSavingAllowed).mockReturnValue(Promise.resolve(false));

            createVm();
            await flush();

            expect(vm!.getSnapshot().canSave).toBe(false);
        });
    });

    describe("forwarding", () => {
        it("pauses the video and opens the forward dialog", () => {
            const mxEvent = createEvent();
            const permalinkCreator = { forEvent: vi.fn() } as unknown as RoomPermalinkCreator;
            createVm({ mxEvent, permalinkCreator });
            video.paused = false;

            expect(vm!.getSnapshot().canForward).toBe(true);
            vm!.onForwardClick();

            expect(video.pause).toHaveBeenCalled();
            expect(dis.dispatch).toHaveBeenCalledWith({
                action: Action.OpenForwardDialog,
                event: mxEvent,
                permalinkCreator,
            });
        });

        it("cannot forward a message that failed to send", () => {
            expect(createVm({ mxEvent: createEvent({}, EventStatus.NOT_SENT) }).getSnapshot().canForward).toBe(false);
        });
    });

    describe("options menu", () => {
        it("opens next to its button and closes", () => {
            createVm();
            const button = document.createElement("button");
            const rect = new DOMRect(900, 10, 36, 36);
            vi.spyOn(button, "getBoundingClientRect").mockReturnValue(rect);

            expect(vm!.getSnapshot().optionsOpen).toBe(false);
            expect(vm!.optionsAnchor).toBeUndefined();
            vm!.onOptionsClick(button);
            expect(vm!.getSnapshot().optionsOpen).toBe(true);
            expect(vm!.optionsAnchor).toBe(rect);

            vm!.closeOptions();
            expect(vm!.getSnapshot().optionsOpen).toBe(false);
            expect(vm!.optionsAnchor).toBeUndefined();
        });
    });

    describe("loading", () => {
        it("shows the video and its thumbnail once they load", async () => {
            createVm();
            expect(vm!.getSnapshot()).toMatchObject({
                state: VideoLightboxViewState.LOADING,
                durationLabel: "1:05",
            });

            await flush();

            expect(vm!.getSnapshot()).toMatchObject({
                state: VideoLightboxViewState.READY,
                src: "https://server/video.mp4",
                poster: "https://server/poster.jpg",
            });
        });

        it("shows an error when the video cannot be decrypted", async () => {
            vi.spyOn(logger, "warn").mockImplementation(() => {});
            createVm({ mediaEventHelper: createHelper({ sourceUrl: Promise.reject(new Error("bad key")) }) });

            await flush();

            expect(vm!.getSnapshot()).toMatchObject({
                state: VideoLightboxViewState.ERROR,
                errorLabel: "Error decrypting video",
            });
        });

        it("shows an error when the browser cannot play the video", async () => {
            createVm();
            await flush();

            vm!.onMediaError();

            expect(vm!.getSnapshot()).toMatchObject({
                state: VideoLightboxViewState.ERROR,
                errorLabel: "This video can't be played here. Save it to watch it in another app.",
            });
        });

        it("makes and releases its own media helper without one", async () => {
            const destroy = vi.spyOn(MediaEventHelper.prototype, "destroy");
            createVm({ mediaEventHelper: undefined });
            await flush();

            expect(vm!.getSnapshot()).toMatchObject({
                state: VideoLightboxViewState.READY,
                src: expect.stringContaining("server/video"),
            });
            vm!.dispose();
            expect(destroy).toHaveBeenCalledTimes(1);
        });

        it("leaves the message's media helper to the message", async () => {
            const destroy = vi.spyOn(MediaEventHelper.prototype, "destroy");
            createVm();

            vm!.dispose();

            expect(destroy).not.toHaveBeenCalled();
        });
    });

    describe("playback", () => {
        beforeEach(async () => {
            createVm();
            await flush();
        });

        it("plays and pauses, stopping voice messages and video notes", async () => {
            const pauseAllExcept = vi.spyOn(PlaybackManager.instance, "pauseAllExcept");
            const pauseVideoNote = vi.spyOn(VideoNoteBodyViewModel, "pausePlayingWithSound");

            vm!.togglePlay();
            await flush();
            vm!.onMediaUpdate();
            expect(video.play).toHaveBeenCalled();
            expect(vm!.getSnapshot().playing).toBe(true);
            expect(pauseAllExcept).toHaveBeenCalledTimes(1);
            expect(pauseVideoNote).toHaveBeenCalledTimes(1);

            vm!.onMediaUpdate();
            expect(pauseAllExcept).toHaveBeenCalledTimes(1);
            expect(pauseVideoNote).toHaveBeenCalledTimes(1);

            vm!.togglePlay();
            vm!.onMediaUpdate();
            expect(video.pause).toHaveBeenCalled();
            expect(vm!.getSnapshot().playing).toBe(false);
        });

        it("does not play before the video has loaded", () => {
            vm!.dispose();
            createVm({ mediaEventHelper: createHelper({ sourceUrl: new Promise(() => {}) }) });

            vm!.togglePlay();

            expect(video.play).not.toHaveBeenCalled();
        });

        it("tracks the playback position and length", () => {
            video.duration = 65.4;
            video.currentTime = 12.7;

            vm!.onMediaUpdate();

            expect(vm!.getSnapshot()).toMatchObject({
                currentTime: 12.7,
                duration: 65.4,
                currentTimeLabel: "0:12",
                durationLabel: "1:05",
            });
        });

        it("seeks, staying within the video", () => {
            video.duration = 60;

            vm!.seekTo(30);
            expect(video.currentTime).toBe(30);
            vm!.seekForward();
            expect(video.currentTime).toBe(35);
            vm!.seekBackward();
            vm!.seekBackward();
            expect(video.currentTime).toBe(25);
            vm!.seekTo(90);
            expect(video.currentTime).toBe(60);
            vm!.seekTo(-4);
            expect(video.currentTime).toBe(0);
            expect(vm!.getSnapshot().currentTimeLabel).toBe("0:00");
        });

        it("uses the message's length when the browser does not know it", () => {
            video.duration = Number.POSITIVE_INFINITY;
            video.currentTime = 30;

            vm!.onMediaUpdate();
            expect(vm!.getSnapshot()).toMatchObject({ duration: 65, durationLabel: "1:05" });

            vm!.seekForward();
            expect(video.currentTime).toBe(35);
            vm!.seekTo(90);
            expect(video.currentTime).toBe(65);
        });

        it("seeks without an end when nobody knows the length", () => {
            vm!.dispose();
            createVm({ mxEvent: createEvent({ info: { mimetype: "video/webm" } }) });
            video.duration = Number.POSITIVE_INFINITY;
            video.currentTime = 30;

            vm!.seekForward();

            expect(video.currentTime).toBe(35);
            expect(vm!.getSnapshot()).toMatchObject({ duration: 0, durationLabel: "0:00" });
        });

        it("floors the length like the poster does", () => {
            vm!.dispose();
            createVm({ mxEvent: createEvent({ info: { duration: 64_600 } }) });
            expect(vm!.getSnapshot().durationLabel).toBe("1:04");

            video.duration = 64.6;
            vm!.onMediaUpdate();
            expect(vm!.getSnapshot().durationLabel).toBe("1:04");
        });

        it("sets the volume, muting at zero", () => {
            vm!.setVolume(0.4);
            expect(video.volume).toBe(0.4);
            expect(vm!.getSnapshot()).toMatchObject({ volume: 0.4, muted: false });

            vm!.setVolume(0);
            expect(vm!.getSnapshot()).toMatchObject({ volume: 0, muted: true });
        });

        it("mutes and unmutes, restoring a silent volume", () => {
            vm!.toggleMute();
            expect(vm!.getSnapshot().muted).toBe(true);

            vm!.toggleMute();
            expect(vm!.getSnapshot().muted).toBe(false);

            vm!.setVolume(0);
            vm!.toggleMute();
            expect(vm!.getSnapshot()).toMatchObject({ volume: 1, muted: false });
        });

        it("changes the playback speed from the menu", () => {
            vm!.toggleSpeedMenu();
            expect(vm!.getSnapshot().speedMenuOpen).toBe(true);

            vm!.setPlaybackRate(1.5);

            expect(video.playbackRate).toBe(1.5);
            expect(video.defaultPlaybackRate).toBe(1.5);
            expect(vm!.getSnapshot()).toMatchObject({ playbackRate: 1.5, speedMenuOpen: false });
        });

        it("ignores speeds the menu does not offer", () => {
            vm!.setPlaybackRate(3);

            expect(video.playbackRate).toBe(1);
        });

        it("closes the speed menu", () => {
            vm!.toggleSpeedMenu();
            vm!.closeSpeedMenu();

            expect(vm!.getSnapshot().speedMenuOpen).toBe(false);
        });
    });

    describe("hiding the controls", () => {
        beforeEach(async () => {
            vi.useFakeTimers();
            createVm();
            // Lets the video load.
            await vi.advanceTimersByTimeAsync(0);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        function startPlaying(): void {
            video.paused = false;
            vm!.onMediaUpdate();
        }

        it("hides them 3 seconds after the last activity while the video plays", () => {
            startPlaying();

            vi.advanceTimersByTime(2999);
            expect(vm!.getSnapshot().controlsVisible).toBe(true);
            vi.advanceTimersByTime(1);
            expect(vm!.getSnapshot().controlsVisible).toBe(false);

            vm!.onUserActivity();
            expect(vm!.getSnapshot().controlsVisible).toBe(true);
            vi.advanceTimersByTime(2000);
            vm!.onUserActivity();
            vi.advanceTimersByTime(2000);
            expect(vm!.getSnapshot().controlsVisible).toBe(true);
            vi.advanceTimersByTime(1000);
            expect(vm!.getSnapshot().controlsVisible).toBe(false);
        });

        it("keeps them while the video is paused, and starts waiting again when it plays", () => {
            vi.advanceTimersByTime(10_000);
            expect(vm!.getSnapshot().controlsVisible).toBe(true);

            startPlaying();
            vi.advanceTimersByTime(2999);
            expect(vm!.getSnapshot().controlsVisible).toBe(true);
            vi.advanceTimersByTime(1);
            expect(vm!.getSnapshot().controlsVisible).toBe(false);
        });

        it("keeps them while the video loads", async () => {
            vm!.dispose();
            createVm({ mediaEventHelper: createHelper({ sourceUrl: new Promise(() => {}) }) });
            startPlaying();

            await vi.advanceTimersByTimeAsync(10_000);

            expect(vm!.getSnapshot().controlsVisible).toBe(true);
        });

        it("shows them when the video pauses, ends or fails", () => {
            startPlaying();
            vi.advanceTimersByTime(3000);

            video.paused = true;
            vm!.onMediaUpdate();
            expect(vm!.getSnapshot().controlsVisible).toBe(true);

            startPlaying();
            vi.advanceTimersByTime(3000);
            video.ended = true;
            vm!.onMediaUpdate();
            expect(vm!.getSnapshot().controlsVisible).toBe(true);

            video.ended = false;
            startPlaying();
            vi.advanceTimersByTime(3000);
            expect(vm!.getSnapshot().controlsVisible).toBe(false);
            vm!.onMediaError();
            expect(vm!.getSnapshot().controlsVisible).toBe(true);
        });

        it("keeps them while the pointer is over them", () => {
            startPlaying();
            vm!.setControlsHovered(true);
            vi.advanceTimersByTime(10_000);
            expect(vm!.getSnapshot().controlsVisible).toBe(true);

            vm!.setControlsHovered(false);
            vi.advanceTimersByTime(3000);
            expect(vm!.getSnapshot().controlsVisible).toBe(false);
        });

        it("keeps them while a control has keyboard focus, and shows them when one gets it", () => {
            startPlaying();
            vi.advanceTimersByTime(3000);
            expect(vm!.getSnapshot().controlsVisible).toBe(false);

            vm!.setControlsFocused(true);
            expect(vm!.getSnapshot().controlsVisible).toBe(true);
            vi.advanceTimersByTime(10_000);
            expect(vm!.getSnapshot().controlsVisible).toBe(true);

            vm!.setControlsFocused(false);
            vi.advanceTimersByTime(3000);
            expect(vm!.getSnapshot().controlsVisible).toBe(false);
        });

        it("keeps them while the playing video waits for more of it, and hides them once it plays on", () => {
            startPlaying();
            expect(vm!.getSnapshot().buffering).toBe(false);
            vi.advanceTimersByTime(3000);
            expect(vm!.getSnapshot().controlsVisible).toBe(false);

            // HAVE_CURRENT_DATA: the video has its current frame but not the next ones.
            video.readyState = 2;
            vm!.onMediaUpdate();
            expect(vm!.getSnapshot()).toMatchObject({ playing: true, buffering: true, controlsVisible: true });
            vi.advanceTimersByTime(10_000);
            expect(vm!.getSnapshot().controlsVisible).toBe(true);

            video.readyState = 3;
            vm!.onMediaUpdate();
            expect(vm!.getSnapshot().buffering).toBe(false);
            vi.advanceTimersByTime(2999);
            expect(vm!.getSnapshot().controlsVisible).toBe(true);
            vi.advanceTimersByTime(1);
            expect(vm!.getSnapshot().controlsVisible).toBe(false);
        });

        it("does not count a paused video as waiting", () => {
            video.readyState = 1;
            vm!.onMediaUpdate();

            expect(vm!.getSnapshot().buffering).toBe(false);
        });

        it("stops waiting when the video fails", () => {
            startPlaying();
            video.readyState = 2;
            vm!.onMediaUpdate();

            vm!.onMediaError();

            expect(vm!.getSnapshot()).toMatchObject({ playing: false, buffering: false });
        });

        it("keeps them while the speed menu is open", () => {
            startPlaying();
            vm!.toggleSpeedMenu();
            vi.advanceTimersByTime(10_000);
            expect(vm!.getSnapshot().controlsVisible).toBe(true);
        });

        it("keeps them while the options menu is open, and starts waiting again when it closes", () => {
            startPlaying();
            vm!.onOptionsClick(document.createElement("button"));
            vi.advanceTimersByTime(10_000);
            expect(vm!.getSnapshot().controlsVisible).toBe(true);

            vm!.closeOptions();
            vi.advanceTimersByTime(3000);
            expect(vm!.getSnapshot().controlsVisible).toBe(false);
        });

        it("stops waiting once disposed", () => {
            startPlaying();
            vm!.dispose();

            vi.advanceTimersByTime(3000);

            expect(vm!.getSnapshot().controlsVisible).toBe(true);
        });
    });

    describe("full screen and Escape", () => {
        let fullscreenElement: Element | null;

        // happy-dom has no Fullscreen API.
        beforeEach(() => {
            fullscreenElement = null;
            Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fullscreenElement });
            Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
            Object.defineProperty(document, "exitFullscreen", {
                configurable: true,
                value: vi.fn().mockResolvedValue(undefined),
            });
            document.documentElement.requestFullscreen = vi.fn().mockResolvedValue(undefined);
        });

        afterEach(() => {
            for (const property of ["fullscreenElement", "fullscreenEnabled", "exitFullscreen"]) {
                Reflect.deleteProperty(document, property);
            }
            Reflect.deleteProperty(document.documentElement, "requestFullscreen");
        });

        function enterFullscreen(): void {
            fullscreenElement = document.documentElement;
            document.dispatchEvent(new Event("fullscreenchange"));
        }

        it("puts the whole page in full screen, so that dialogs and tooltips still show, and follows the browser", () => {
            createVm();
            expect(vm!.getSnapshot().canFullscreen).toBe(true);

            vm!.toggleFullscreen();
            expect(document.documentElement.requestFullscreen).toHaveBeenCalled();

            enterFullscreen();
            expect(vm!.getSnapshot().fullscreen).toBe(true);

            vm!.toggleFullscreen();
            expect(document.exitFullscreen).toHaveBeenCalled();

            fullscreenElement = null;
            document.dispatchEvent(new Event("fullscreenchange"));
            expect(vm!.getSnapshot().fullscreen).toBe(false);
        });

        it("stays in full screen while forwarding, since the forward dialog shows over the viewer", () => {
            createVm();
            enterFullscreen();

            vm!.onForwardClick();

            expect(dis.dispatch).toHaveBeenCalledWith(expect.objectContaining({ action: Action.OpenForwardDialog }));
            expect(document.exitFullscreen).not.toHaveBeenCalled();
        });

        it("leaves full screen when the viewer closes in full screen", () => {
            createVm();
            enterFullscreen();

            vm!.dispose();

            expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
        });

        it("leaves other full screen alone when it closes", () => {
            createVm();
            fullscreenElement = document.body;

            vm!.dispose();

            expect(document.exitFullscreen).not.toHaveBeenCalled();
        });

        it("stops following full screen once disposed", () => {
            createVm();
            vm!.dispose();

            enterFullscreen();

            expect(vm!.getSnapshot().fullscreen).toBe(false);
        });

        it("closes the speed menu, then leaves full screen, then closes", () => {
            createVm();
            vm!.toggleSpeedMenu();
            fullscreenElement = document.documentElement;

            vm!.onEscape();
            expect(vm!.getSnapshot().speedMenuOpen).toBe(false);
            expect(document.exitFullscreen).not.toHaveBeenCalled();

            vm!.onEscape();
            expect(document.exitFullscreen).toHaveBeenCalled();
            expect(onFinished).not.toHaveBeenCalled();

            fullscreenElement = null;
            vm!.onEscape();
            expect(onFinished).toHaveBeenCalled();
        });
    });
});
