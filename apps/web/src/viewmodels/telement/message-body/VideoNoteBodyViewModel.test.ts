/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { EventType, MatrixEvent } from "matrix-js-sdk/src/matrix";
import { VideoNoteBodyViewState, VideoNotePlaybackState } from "@element-hq/web-shared-components";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { _t } from "../../../languageHandler";
import SettingsStore from "../../../settings/SettingsStore";
import { ImageSize } from "../../../settings/enums/ImageSize";
import { type Media, mediaFromContent } from "../../../customisations/Media";
import { PlaybackManager } from "../../../audio/PlaybackManager";
import { type MediaEventHelper } from "../../../utils/MediaEventHelper";
import { VideoNoteBodyViewModel, type VideoNoteBodyViewModelProps } from "./VideoNoteBodyViewModel";

vi.mock("../../../customisations/Media", () => ({
    mediaFromContent: vi.fn(),
}));

describe("VideoNoteBodyViewModel", () => {
    let autoplayVideo: boolean;
    let imageSizeWatcher: ((...args: [unknown, unknown, unknown, unknown, ImageSize]) => void) | undefined;
    const viewModels: VideoNoteBodyViewModel[] = [];

    const flushPromises = async (): Promise<void> => {
        for (let i = 0; i < 5; i++) await Promise.resolve();
    };

    const createEvent = (content: Record<string, unknown> = {}): MatrixEvent =>
        new MatrixEvent({
            type: EventType.RoomMessage,
            room_id: "!room:server",
            event_id: "$note:server",
            sender: "@alice:server",
            content: {
                "msgtype": "m.video",
                "body": "Video message.mp4",
                "url": "mxc://server/note",
                "org.interferolog.circle": true,
                "info": { w: 512, h: 512, duration: 7000, mimetype: "video/mp4" },
                ...content,
            },
        });

    const createHelper = (
        decryptSource: () => Promise<string | null> = () => Promise.resolve("blob:note"),
    ): MediaEventHelper =>
        ({
            media: { isEncrypted: true },
            thumbnailUrl: { value: Promise.resolve("blob:poster") },
            sourceUrl: {
                get value() {
                    return decryptSource();
                },
            },
        }) as unknown as MediaEventHelper;

    const createVm = (props: Partial<VideoNoteBodyViewModelProps> = {}): VideoNoteBodyViewModel => {
        const vm = new VideoNoteBodyViewModel({ mxEvent: createEvent(), mediaVisible: true, ...props });
        viewModels.push(vm);
        return vm;
    };

    beforeEach(() => {
        autoplayVideo = true;
        const originalGetValue = SettingsStore.getValue;
        vi.spyOn(SettingsStore, "getValue").mockImplementation((setting, ...args) => {
            if (setting === "Images.size") return ImageSize.Normal;
            if (setting === "autoplayVideo") return autoplayVideo;
            return originalGetValue(setting, ...args);
        });
        vi.spyOn(SettingsStore, "watchSetting").mockImplementation((_name, _roomId, callback) => {
            imageSizeWatcher = callback as typeof imageSizeWatcher;
            return "video-note-test-watch";
        });
        vi.spyOn(SettingsStore, "unwatchSetting").mockImplementation(vi.fn());
        vi.spyOn(PlaybackManager.instance, "pauseAllExcept").mockImplementation(vi.fn());
        vi.mocked(mediaFromContent).mockImplementation(
            (content) =>
                ({
                    isEncrypted: !!content.file,
                    srcHttp: "https://server/note.mp4",
                    hasThumbnail: true,
                    thumbnailHttp: "https://server/note.jpg",
                }) as unknown as Media,
        );
    });

    afterEach(() => {
        viewModels.splice(0).forEach((vm) => vm.dispose());
        vi.restoreAllMocks();
    });

    it("hides media until the user reveals it", () => {
        const onPreviewClick = vi.fn();
        const vm = createVm({ mediaVisible: false, onPreviewClick });

        expect(vm.getSnapshot()).toMatchObject({ state: VideoNoteBodyViewState.HIDDEN, diameter: 240 });
        vm.onPreviewClick();
        expect(onPreviewClick).toHaveBeenCalledTimes(1);
    });

    it("loops silently with the total duration when videos may autoplay", () => {
        const vm = createVm();

        expect(vm.getSnapshot()).toMatchObject({
            state: VideoNoteBodyViewState.READY,
            src: "https://server/note.mp4",
            poster: "https://server/note.jpg",
            loopPreview: true,
            playbackState: VideoNotePlaybackState.PREVIEW,
            timeLabel: "0:07",
            toggleLabel: _t("telement|video_note|play"),
        });
    });

    it.each([
        ["autoplay is off", {}, false],
        ["interaction is inhibited", { inhibitInteraction: true }, true],
        ["rendering for export", { forExport: true }, true],
    ])("does not loop silently when %s", (_name, props, autoplay) => {
        autoplayVideo = autoplay;
        const vm = createVm(props);

        expect(vm.getSnapshot().loopPreview).toBe(false);
    });

    it("grows with the large image size setting", () => {
        const vm = createVm();

        imageSizeWatcher?.(undefined, undefined, undefined, undefined, ImageSize.Large);

        expect(vm.getSnapshot().diameter).toBe(320);
    });

    it("learns the duration from the media element when the event has none", () => {
        const vm = createVm({ mxEvent: createEvent({ info: { w: 512, h: 512, mimetype: "video/mp4" } }) });
        expect(vm.getSnapshot().timeLabel).toBeUndefined();

        vm.onTimeUpdate(1, 12);

        expect(vm.getSnapshot()).toMatchObject({ timeLabel: "0:12", progress: 0 });
    });

    it("plays with sound, pauses, resumes and returns to the preview at the end", async () => {
        const vm = createVm();

        await vm.onToggle();
        expect(vm.getSnapshot()).toMatchObject({
            playbackState: VideoNotePlaybackState.PLAYING,
            timeLabel: "0:00",
            toggleLabel: _t("telement|video_note|pause"),
        });
        expect(PlaybackManager.instance.pauseAllExcept).toHaveBeenCalled();

        vm.onTimeUpdate(3.5, 7);
        expect(vm.getSnapshot()).toMatchObject({ progress: 0.5, timeLabel: "0:04" });

        await vm.onToggle();
        expect(vm.getSnapshot().playbackState).toBe(VideoNotePlaybackState.PAUSED);

        await vm.onToggle();
        expect(vm.getSnapshot()).toMatchObject({ playbackState: VideoNotePlaybackState.PLAYING, progress: 0.5 });

        vm.onEnded();
        expect(vm.getSnapshot()).toMatchObject({
            playbackState: VideoNotePlaybackState.PREVIEW,
            progress: 0,
            timeLabel: "0:07",
        });
    });

    it("plays only one note with sound at a time", async () => {
        const first = createVm();
        const second = createVm();

        await first.onToggle();
        await second.onToggle();

        expect(first.getSnapshot().playbackState).toBe(VideoNotePlaybackState.PREVIEW);
        expect(second.getSnapshot().playbackState).toBe(VideoNotePlaybackState.PLAYING);
    });

    it("pauses the note playing with sound when other media starts", async () => {
        const playing = createVm();
        const silent = createVm();
        await playing.onToggle();

        VideoNoteBodyViewModel.pausePlayingWithSound();

        expect(playing.getSnapshot().playbackState).toBe(VideoNotePlaybackState.PAUSED);
        expect(silent.getSnapshot().playbackState).toBe(VideoNotePlaybackState.PREVIEW);

        await playing.onToggle();
        expect(playing.getSnapshot().playbackState).toBe(VideoNotePlaybackState.PLAYING);
    });

    it("ignores clicks when interaction is inhibited", async () => {
        const vm = createVm({ inhibitInteraction: true });

        await vm.onToggle();

        expect(vm.getSnapshot().playbackState).toBe(VideoNotePlaybackState.PREVIEW);
    });

    describe("encrypted notes", () => {
        const encryptedEvent = (): MatrixEvent =>
            createEvent({ url: undefined, file: { url: "mxc://server/encrypted" } });

        it("decrypts the video up front when it loops silently", async () => {
            const vm = createVm({ mxEvent: encryptedEvent(), mediaEventHelper: createHelper() });
            expect(vm.getSnapshot().state).toBe(VideoNoteBodyViewState.LOADING);

            vm.loadInitialMediaIfVisible();
            await flushPromises();

            expect(vm.getSnapshot()).toMatchObject({
                state: VideoNoteBodyViewState.READY,
                src: "blob:note",
                poster: "blob:poster",
            });
        });

        it("decrypts the video on the first click when it does not loop", async () => {
            autoplayVideo = false;
            const vm = createVm({ mxEvent: encryptedEvent(), mediaEventHelper: createHelper() });
            vm.loadInitialMediaIfVisible();
            await flushPromises();
            expect(vm.getSnapshot()).toMatchObject({ state: VideoNoteBodyViewState.READY, poster: "blob:poster" });
            expect(vm.getSnapshot().src).toBeUndefined();

            const toggled = vm.onToggle();
            expect(vm.getSnapshot().state).toBe(VideoNoteBodyViewState.LOADING);
            await toggled;

            expect(vm.getSnapshot()).toMatchObject({
                state: VideoNoteBodyViewState.READY,
                src: "blob:note",
                playbackState: VideoNotePlaybackState.PLAYING,
            });
        });

        it("shows an error when decryption fails", async () => {
            const vm = createVm({
                mxEvent: encryptedEvent(),
                mediaEventHelper: createHelper(() => Promise.reject(new Error("bad key"))),
            });

            vm.loadInitialMediaIfVisible();
            await flushPromises();

            expect(vm.getSnapshot().state).toBe(VideoNoteBodyViewState.ERROR);
        });
    });
});
