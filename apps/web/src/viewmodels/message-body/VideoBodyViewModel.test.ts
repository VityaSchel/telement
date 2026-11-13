/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

// @vitest-environment happy-dom

import { EventType, MatrixEvent } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";
import { VideoBodyViewState } from "@element-hq/web-shared-components";
import { decode } from "blurhash";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import SettingsStore from "../../settings/SettingsStore";
import { ImageSize } from "../../settings/enums/ImageSize";
import { type Media, mediaFromContent } from "../../customisations/Media";
import { BLURHASH_FIELD } from "../../utils/image-media";
import { type MediaEventHelper } from "../../utils/MediaEventHelper";
import { type RoomPermalinkCreator } from "../../utils/permalinks/Permalinks";
import { openVideoLightbox } from "../../telement/media/VideoLightboxDialog";
import { VideoBodyViewModel } from "./VideoBodyViewModel";

vi.mock("../../customisations/Media", () => ({
    mediaFromContent: vi.fn(),
}));
vi.mock("../../telement/media/VideoLightboxDialog", () => ({
    openVideoLightbox: vi.fn(),
}));
vi.mock("blurhash", () => ({
    decode: vi.fn(),
}));

describe("VideoBodyViewModel", () => {
    const mockedMediaFromContent = vi.mocked(mediaFromContent);
    const mockedDecode = vi.mocked(decode);
    let imageSizeWatcher: ((...args: [unknown, unknown, unknown, unknown, ImageSize]) => void) | undefined;

    const flushPromises = async (): Promise<void> => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    };

    const createEvent = ({
        body = "demo video",
        content = {},
    }: {
        body?: string;
        content?: Record<string, unknown>;
    } = {}): MatrixEvent => {
        const { info: infoOverride, ...restContent } = content;

        return new MatrixEvent({
            type: EventType.RoomMessage,
            room_id: "!room:server",
            event_id: "$video:server",
            sender: "@alice:server",
            content: {
                msgtype: "m.video",
                body,
                url: "https://server/video.mp4",
                ...restContent,
                info: {
                    w: 320,
                    h: 180,
                    mimetype: "video/mp4",
                    ...(infoOverride as Record<string, unknown> | undefined),
                },
            },
        });
    };

    const createMediaEventHelper = ({
        encrypted,
        thumbnailUrl = "blob:thumbnail",
        sourceUrl = "blob:video",
        sourceBlob = new Blob(["video"], { type: "video/mp4" }),
    }: {
        encrypted: boolean;
        thumbnailUrl?: string | null | Promise<string | null>;
        sourceUrl?: string | null | Promise<string | null>;
        sourceBlob?: Blob | Promise<Blob>;
    }): MediaEventHelper =>
        ({
            media: { isEncrypted: encrypted },
            thumbnailUrl: { value: Promise.resolve(thumbnailUrl) },
            sourceUrl: { value: Promise.resolve(sourceUrl) },
            sourceBlob: { value: Promise.resolve(sourceBlob) },
        }) as unknown as MediaEventHelper;

    const createVm = (overrides?: Partial<ConstructorParameters<typeof VideoBodyViewModel>[0]>): VideoBodyViewModel =>
        new VideoBodyViewModel({
            mxEvent: createEvent(),
            mediaVisible: false,
            ...overrides,
        });

    const createMockMedia = (content: Record<string, any>): Media =>
        ({
            isEncrypted: !!content.file,
            srcMxc: content.url ?? "mxc://server/video",
            thumbnailMxc: content.info?.thumbnail_url ?? undefined,
            srcHttp: content.url ?? "https://server/video.mp4",
            thumbnailHttp:
                content.info?.thumbnail_url === null
                    ? null
                    : (content.info?.thumbnail_url ?? "https://server/poster.jpg"),
            hasThumbnail: content.info?.thumbnail_url !== null,
            getThumbnailHttp: vi.fn(),
            getThumbnailOfSourceHttp: vi.fn(),
            getSquareThumbnailHttp: vi.fn(),
            downloadSource: vi.fn(),
        }) as unknown as Media;

    beforeEach(() => {
        const originalGetValue = SettingsStore.getValue;
        vi.spyOn(SettingsStore, "getValue").mockImplementation((setting, ...args) => {
            if (setting === "Images.size") {
                return ImageSize.Normal;
            }
            return originalGetValue(setting, ...args);
        });
        vi.spyOn(SettingsStore, "watchSetting").mockImplementation((_name, _roomId, callback) => {
            imageSizeWatcher = callback as (...args: [unknown, unknown, unknown, unknown, ImageSize]) => void;
            return "video-body-test-watch";
        });
        vi.spyOn(SettingsStore, "unwatchSetting").mockImplementation(vi.fn());

        mockedMediaFromContent.mockImplementation((content) => createMockMedia(content));
        mockedDecode.mockReturnValue(new Uint8ClampedArray(320 * 180 * 4));
        vi.mocked(openVideoLightbox).mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        imageSizeWatcher = undefined;
    });

    it("computes the initial hidden snapshot from props", () => {
        const vm = createVm();

        expect(vm.getSnapshot().state).toBe(VideoBodyViewState.HIDDEN);
        expect(vm.getSnapshot().hiddenButtonLabel).toBeTruthy();
        expect(vm.getSnapshot().maxWidth).toBe(320);
        expect(vm.getSnapshot().maxHeight).toBe(180);
    });

    it("shows the poster when media becomes visible", () => {
        const vm = createVm();

        vm.setMediaVisible(true);

        expect(vm.getSnapshot()).toMatchObject({
            state: VideoBodyViewState.READY,
            playLabel: "Play video: demo video",
            poster: "https://server/poster.jpg",
            playable: true,
            href: undefined,
        });
        expect(vm.getSnapshot()).not.toHaveProperty("src");
    });

    it("draws a placeholder when the video has no thumbnail", () => {
        const vm = createVm({
            mxEvent: createEvent({ content: { info: { thumbnail_url: null } } }),
            mediaVisible: true,
        });

        expect(vm.getSnapshot().poster).toBeUndefined();
    });

    it.each([
        [65_000, "1:05"],
        [64_600, "1:04"],
        [5_400, "0:05"],
        [3_723_000, "1:02:03"],
    ])("shows a duration of %d ms as %s", (duration, label) => {
        const vm = createVm({ mxEvent: createEvent({ content: { info: { duration } } }), mediaVisible: true });

        expect(vm.getSnapshot().durationLabel).toBe(label);
    });

    it.each([undefined, 0, -1, "12"])("shows no duration when it is %j", (duration) => {
        const vm = createVm({ mxEvent: createEvent({ content: { info: { duration } } }), mediaVisible: true });

        expect(vm.getSnapshot().durationLabel).toBeUndefined();
    });

    it("links the poster to the file when rendering for export", () => {
        const vm = createVm({
            mxEvent: createEvent({
                content: {
                    url: "https://server/fallback.mp4",
                    file: {
                        url: "mxc://server/export-video",
                    },
                },
            }),
            mediaVisible: true,
            forExport: true,
        });
        vm.loadInitialMediaIfVisible();

        expect(vm.getSnapshot()).toMatchObject({
            state: VideoBodyViewState.READY,
            href: "mxc://server/export-video",
            playable: false,
            poster: undefined,
        });
    });

    it("cannot be played when interaction is inhibited", () => {
        const vm = createVm({ mediaVisible: true });

        vm.setInhibitInteraction(true);
        vm.onPlayClick();

        expect(vm.getSnapshot().playable).toBe(false);
        expect(openVideoLightbox).not.toHaveBeenCalled();
    });

    it("opens the video viewer when the poster is clicked", () => {
        const mxEvent = createEvent();
        const mediaEventHelper = createMediaEventHelper({ encrypted: false });
        const permalinkCreator = {} as RoomPermalinkCreator;
        const vm = createVm({ mxEvent, mediaEventHelper, mediaVisible: true });
        vm.setPermalinkCreator(permalinkCreator);

        vm.onPlayClick();

        expect(openVideoLightbox).toHaveBeenCalledWith({ mxEvent, mediaEventHelper, permalinkCreator });
    });

    it("forwards preview clicks", () => {
        const onPreviewClick = vi.fn();
        const vm = createVm({ onPreviewClick });

        vm.onPreviewClick();

        expect(onPreviewClick).toHaveBeenCalledTimes(1);
    });

    it("decrypts only the thumbnail of an encrypted video", async () => {
        const sourceBlob = vi.fn();
        const mediaEventHelper = {
            ...createMediaEventHelper({ encrypted: true, thumbnailUrl: "blob:encrypted-poster" }),
            sourceUrl: {
                get value() {
                    return sourceBlob();
                },
            },
        } as unknown as MediaEventHelper;
        const vm = createVm({
            mxEvent: createEvent({
                content: {
                    file: { url: "mxc://server/encrypted-video" },
                },
            }),
            mediaEventHelper,
            mediaVisible: true,
        });

        expect(vm.getSnapshot().poster).toBeUndefined();

        vm.loadInitialMediaIfVisible();
        await flushPromises();

        expect(vm.getSnapshot()).toMatchObject({
            state: VideoBodyViewState.READY,
            poster: "blob:encrypted-poster",
        });
        expect(sourceBlob).not.toHaveBeenCalled();
    });

    it("switches to the error state when the encrypted thumbnail cannot be decrypted", async () => {
        vi.spyOn(logger, "warn").mockImplementation(vi.fn());
        const vm = createVm({
            mxEvent: createEvent({
                content: {
                    file: { url: "mxc://server/encrypted-video" },
                },
            }),
            mediaEventHelper: createMediaEventHelper({
                encrypted: true,
                thumbnailUrl: Promise.reject(new Error("decrypt failed")),
            }),
            mediaVisible: true,
        });
        vm.loadInitialMediaIfVisible();

        await flushPromises();

        expect(vm.getSnapshot().state).toBe(VideoBodyViewState.ERROR);
        expect(vm.getSnapshot().errorLabel).toBeTruthy();
    });

    it("recomputes dimensions when the image-size setting changes", () => {
        const vm = createVm({
            mxEvent: createEvent({
                content: {
                    info: {
                        w: 1280,
                        h: 720,
                    },
                },
            }),
            mediaVisible: false,
        });

        expect(vm.getSnapshot().maxWidth).toBe(324);
        expect(vm.getSnapshot().maxHeight).toBe(182);

        imageSizeWatcher?.(undefined, undefined, undefined, undefined, ImageSize.Large);

        expect(vm.getSnapshot().maxWidth).toBe(800);
        expect(vm.getSnapshot().maxHeight).toBe(450);
    });

    it("shapes the poster like the thumbnail when the video's size is unknown", () => {
        const vm = createVm({
            mxEvent: createEvent({
                content: { info: { w: undefined, h: undefined, thumbnail_info: { w: 540, h: 960 } } },
            }),
            mediaVisible: true,
        });

        expect(vm.getSnapshot()).toMatchObject({ maxWidth: 182, maxHeight: 324, aspectRatio: "1920/3413" });
    });

    it("gives a poster 16:9 when neither the video's nor the thumbnail's size is known", () => {
        const vm = createVm({
            mxEvent: createEvent({ content: { info: { w: undefined, h: undefined } } }),
            mediaVisible: true,
        });

        expect(vm.getSnapshot()).toMatchObject({ maxWidth: 324, maxHeight: 182, aspectRatio: "1920/1080" });
    });

    it("uses the blurhash poster while the thumbnail image is loading", () => {
        const originalCreateElement = document.createElement.bind(document);
        const originalImage = global.Image;
        let imageOnLoad: (() => void) | undefined;

        const context = {
            createImageData: vi.fn((width: number, height: number) => ({
                data: new Uint8ClampedArray(width * height * 4),
            })),
            putImageData: vi.fn(),
        };
        const canvas = {
            width: 0,
            height: 0,
            getContext: vi.fn(() => context),
            toDataURL: vi.fn(() => "data:image/png;base64,blurhash"),
        };

        vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
            if (tagName === "canvas") {
                return canvas as any;
            }
            return originalCreateElement(tagName);
        }) as typeof document.createElement);

        class MockImage {
            public onload?: () => void;

            public set src(_value: string) {
                imageOnLoad = this.onload;
            }
        }

        global.Image = MockImage as unknown as typeof Image;

        const vm = createVm({
            mxEvent: createEvent({
                content: {
                    info: {
                        [BLURHASH_FIELD]: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
                    },
                },
            }),
            mediaVisible: true,
        });
        vm.loadInitialMediaIfVisible();

        expect(vm.getSnapshot().poster).toBe("data:image/png;base64,blurhash");

        imageOnLoad?.();

        expect(vm.getSnapshot().poster).toBe("https://server/poster.jpg");

        global.Image = originalImage;
    });

    it("resets encrypted media state when the event changes", async () => {
        const vm = createVm({
            mxEvent: createEvent({
                content: {
                    body: "first video",
                    file: { url: "mxc://server/video-a" },
                },
            }),
            mediaEventHelper: createMediaEventHelper({
                encrypted: true,
                thumbnailUrl: "blob:first-poster",
            }),
            mediaVisible: true,
        });
        vm.loadInitialMediaIfVisible();

        await flushPromises();
        expect(vm.getSnapshot().poster).toBe("blob:first-poster");

        vm.setEvent(
            createEvent({
                body: "second video",
                content: {
                    file: { url: "mxc://server/video-b" },
                },
            }),
            createMediaEventHelper({
                encrypted: true,
                thumbnailUrl: "blob:second-poster",
            }),
        );
        expect(vm.getSnapshot().poster).toBeUndefined();

        await flushPromises();

        expect(vm.getSnapshot().playLabel).toBe("Play video: second video");
        expect(vm.getSnapshot().poster).toBe("blob:second-poster");
    });

    it("does not emit for unchanged targeted setters", () => {
        const event = createEvent();
        const onPreviewClick = vi.fn();
        const vm = createVm({
            mxEvent: event,
            mediaVisible: false,
            onPreviewClick,
        });
        const listener = vi.fn();
        vm.subscribe(listener);

        vm.setEvent(event, undefined);
        vm.setForExport(undefined);
        vm.setInhibitInteraction(undefined);
        vm.setMediaVisible(false);
        vm.setOnPreviewClick(onPreviewClick);
        vm.setPermalinkCreator(undefined);

        expect(listener).not.toHaveBeenCalled();
    });
});
