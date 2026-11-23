/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React, { type ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { act, render, screen, type RenderResult, waitFor } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { EventType, getHttpUriForMxc, MatrixEvent, Room } from "matrix-js-sdk/src/matrix";
import { LinkedTextContext } from "@element-hq/web-shared-components";

import {
    getMockClientWithEventEmitter,
    mockClientMethodsCrypto,
    mockClientMethodsDevice,
    mockClientMethodsServer,
    mockClientMethodsUser,
} from "test-utils";
import { RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { MediaEventHelper } from "../../../utils/MediaEventHelper";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";
import {
    DecryptionFailureBodyFactory,
    FileBodyFactory,
    ImageBodyFactory,
    RedactedBodyFactory,
    VideoBodyFactory,
    renderMBody,
} from "./MBodyFactory";
import { TimelineRenderingType } from "../../../contexts/RoomContext.ts";
import { ScopedRoomContextProvider } from "../../../contexts/ScopedRoomContext.tsx";
import { useMediaVisible } from "../../../hooks/useMediaVisible";
import { FileDownloader } from "../../../utils/FileDownloader";
import { saveMediaAs } from "../../../telement/media/saveMediaAs";

vi.mock("../../../telement/media/saveMediaAs", () => ({ saveMediaAs: vi.fn().mockResolvedValue(undefined) }));

vi.mock("matrix-encrypt-attachment", () => ({
    default: {
        decryptAttachment: vi.fn(),
    },
}));

vi.mock("../../../hooks/useMediaVisible", () => ({
    __esModule: true,
    useMediaVisible: vi.fn(),
}));

describe("MBodyFactory", () => {
    const userId = "@user:server";
    const deviceId = "DEADB33F";
    const cli = getMockClientWithEventEmitter({
        ...mockClientMethodsUser(userId),
        ...mockClientMethodsServer(),
        ...mockClientMethodsDevice(deviceId),
        ...mockClientMethodsCrypto(),
        getRooms: vi.fn().mockReturnValue([]),
        getRoom: vi.fn(),
        getIgnoredUsers: vi.fn(),
        getVersions: vi.fn().mockResolvedValue({
            unstable_features: {
                "org.matrix.msc3882": true,
                "org.matrix.msc3886": true,
            },
        }),
    });
    // eslint-disable-next-line no-restricted-properties
    cli.mxcUrlToHttp.mockImplementation(
        (mxcUrl: string, width?: number, height?: number, resizeMethod?: string, allowDirectLinks?: boolean) => {
            return getHttpUriForMxc("https://server", mxcUrl, width, height, resizeMethod, allowDirectLinks);
        },
    );

    const props = {
        onMessageAllowed: vi.fn(),
        permalinkCreator: new RoomPermalinkCreator(new Room("!room:server", cli, cli.getUserId()!)),
    };
    const mkEvent = (msgtype?: string, content: Record<string, unknown> = {}): MatrixEvent =>
        new MatrixEvent({
            room_id: "!room:server",
            sender: userId,
            type: EventType.RoomMessage,
            content: {
                body: "test-file.txt",
                ...(msgtype ? { msgtype } : {}),
                url: "mxc://server/file",
                ...content,
            },
        });

    let mockDownload: MockInstance<FileDownloader["download"]>;

    beforeEach(() => {
        vi.spyOn(SettingsStore, "getValue").mockRestore();
        vi.mocked(useMediaVisible).mockReturnValue([true, vi.fn()]);
        mockDownload = vi.spyOn(FileDownloader.prototype, "download").mockResolvedValue(undefined);
    });

    const encryptedImageHelper = (): MediaEventHelper =>
        ({
            media: { isEncrypted: true },
            sourceUrl: { value: Promise.resolve("blob:source") },
            thumbnailUrl: { value: Promise.resolve("blob:thumbnail") },
            sourceBlob: {
                value: Promise.resolve(new Blob(["image"], { type: "image/jpeg" })),
                cachedValue: new Blob(["image"], { type: "image/jpeg" }),
            },
        }) as unknown as MediaEventHelper;

    /**
     * Render a media body inside the contexts it needs: the room context, whose rendering type
     * decides which body is picked, and the linked text context the preview tile reads.
     */
    const renderInRoomContext = (node: ReactNode, timelineRenderingType: TimelineRenderingType): RenderResult =>
        // Wrapped in a fragment because `renderMBody` can return null, which `render` itself rejects.
        render(<>{node}</>, {
            wrapper: ({ children }) => (
                <LinkedTextContext.Provider value={{}}>
                    <ScopedRoomContextProvider {...({ timelineRenderingType } as any)}>
                        {children}
                    </ScopedRoomContextProvider>
                </LinkedTextContext.Provider>
            ),
        });

    describe("renderMBody", () => {
        it.each(["m.audio", "m.text"])("returns null for unsupported msgtype %s", (msgtype) => {
            expect(renderMBody({ ...props, mxEvent: mkEvent(msgtype) })).toBeNull();
        });

        it("returns the video body factory for m.video", () => {
            expect(renderMBody({ ...props, mxEvent: mkEvent("m.video") })?.type).toBe(VideoBodyFactory);
        });

        it("returns the image body factory for m.image", () => {
            expect(renderMBody({ ...props, mxEvent: mkEvent("m.image") })?.type).toBe(ImageBodyFactory);
        });

        it("returns null when msgtype is missing", () => {
            expect(renderMBody({ ...props, mxEvent: mkEvent() })).toBeNull();
        });

        it("falls back to file body for unsupported msgtypes", () => {
            const mediaEvent = mkEvent("m.audio");
            renderInRoomContext(
                renderMBody(
                    {
                        ...props,
                        mxEvent: mediaEvent,
                        mediaEventHelper: new MediaEventHelper(mediaEvent),
                    },
                    FileBodyFactory,
                ),
                TimelineRenderingType.File,
            );
            expect(screen.getByRole("button", { name: "test-file.txt" })).toBeInTheDocument();
        });
    });

    describe("media in lists of messages", () => {
        const renderMedia = (msgtype: string, timelineRenderingType: TimelineRenderingType): RenderResult => {
            const mimetype = msgtype === "m.image" ? "image/png" : "video/mp4";
            const mediaEvent = mkEvent(msgtype, { body: "holiday", info: { mimetype, w: 320, h: 240, size: 1024 } });
            return renderInRoomContext(
                renderMBody({ ...props, mxEvent: mediaEvent, mediaEventHelper: new MediaEventHelper(mediaEvent) }),
                timelineRenderingType,
            );
        };

        it.each(
            ["m.image", "m.video"].flatMap((msgtype) =>
                Object.values(TimelineRenderingType).map((type) => [msgtype, type] as const),
            ),
        )(
            "puts no download button under %s in the %s timeline, which the message menu's Save as… saves",
            async (msgtype, timelineRenderingType) => {
                const { container } = renderMedia(msgtype, timelineRenderingType);

                await waitFor(() =>
                    expect(
                        container.querySelector(msgtype === "m.image" ? ".mx_ImageBody" : ".mx_MVideoBody"),
                    ).not.toBeNull(),
                );
                expect(container.querySelector(".mx_MFileBody")).toBeNull();
                expect(screen.queryByText(/^Download/)).not.toBeInTheDocument();
            },
        );
    });

    describe("FileBodyFactory and the document previews lab, for a PDF", () => {
        afterEach(async () => {
            // Both viewers share the lab, so a value left on the device would leak into the next test.
            await SettingsStore.setValue("feature_pdf_viewer", null, SettingLevel.DEVICE, false);
            SettingsStore.reset();
        });

        const renderPdfBody = (): RenderResult => {
            const mediaEvent = mkEvent("m.file", { info: { mimetype: "application/pdf" } });

            return renderInRoomContext(
                renderMBody(
                    { ...props, mxEvent: mediaEvent, mediaEventHelper: new MediaEventHelper(mediaEvent) },
                    FileBodyFactory,
                ),
                TimelineRenderingType.Room,
            );
        };

        it("offers the viewer only once the lab is turned on, without a remount", async () => {
            renderPdfBody();
            expect(screen.queryByRole("button", { name: "Open PDF" })).not.toBeInTheDocument();

            // The view reads the setting, so turning the lab on has to reach an already-rendered tile.
            await act(() => SettingsStore.setValue("feature_pdf_viewer", null, SettingLevel.DEVICE, true));

            expect(screen.getByRole("button", { name: "Open PDF" })).toBeInTheDocument();
        });
    });

    describe("FileBodyFactory and the document previews lab, for Markdown", () => {
        afterEach(async () => {
            // Both viewers share the lab, so a value left on the device would leak into the next test.
            await SettingsStore.setValue("feature_pdf_viewer", null, SettingLevel.DEVICE, false);
            SettingsStore.reset();
        });

        it("offers the viewer only once the lab is turned on, without a remount", async () => {
            const mediaEvent = mkEvent("m.file", { body: "README.md", info: { mimetype: "text/markdown" } });

            renderInRoomContext(
                renderMBody(
                    { ...props, mxEvent: mediaEvent, mediaEventHelper: new MediaEventHelper(mediaEvent) },
                    FileBodyFactory,
                ),
                TimelineRenderingType.Room,
            );
            expect(screen.queryByRole("button", { name: "Open Markdown" })).not.toBeInTheDocument();

            await act(() => SettingsStore.setValue("feature_pdf_viewer", null, SettingLevel.DEVICE, true));

            expect(screen.getByRole("button", { name: "Open Markdown" })).toBeInTheDocument();
        });
    });

    it("renderMBody fallback shows m.audio generic placeholder", async () => {
        const mediaEvent = new MatrixEvent({
            room_id: "!room:server",
            sender: userId,
            type: EventType.RoomMessage,
            content: {
                body: "test-file.txt",
                msgtype: "m.audio",
                url: "mxc://server/image",
            },
        });

        const { container } = renderInRoomContext(
            renderMBody(
                {
                    ...props,
                    mxEvent: mediaEvent,
                    mediaEventHelper: new MediaEventHelper(mediaEvent),
                },
                FileBodyFactory,
            ),
            TimelineRenderingType.File,
        );

        expect(screen.getByText("test-file.txt")).toBeInTheDocument();
        // Only m.file gets the preview tile; everything else keeps the legacy file body,
        // where the filename itself is the button. See FileBodyFactory.
        expect(screen.getByRole("button", { name: "test-file.txt" })).toBeInTheDocument();
        expect(container).toMatchSnapshot();
    });

    it.each([TimelineRenderingType.Room, TimelineRenderingType.File])(
        "renderMBody shows the preview tile for m.file in %s",
        async (timelineRenderingType) => {
            const mediaEvent = new MatrixEvent({
                room_id: "!room:server",
                sender: userId,
                type: EventType.RoomMessage,
                content: {
                    body: "test-file.txt",
                    msgtype: "m.file",
                    url: "mxc://server/image",
                },
            });

            const { container } = renderInRoomContext(
                renderMBody(
                    {
                        ...props,
                        mxEvent: mediaEvent,
                        mediaEventHelper: new MediaEventHelper(mediaEvent),
                    },
                    FileBodyFactory,
                ),
                timelineRenderingType,
            );

            // The preview tile leaves the filename as plain text and gives saving it its own button, "Save as…" as in
            // the message menu.
            expect(screen.getByText("test-file.txt")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Save as…" })).toBeInTheDocument();
            expect(container).toMatchSnapshot();
        },
    );

    describe("PreviewFileBody", () => {
        // A real MediaEventHelper never yields an empty file name, so stub it to exercise the
        // preview tile's own fallbacks.
        const mkFileHelper = (fileName: string, blob: Blob): MediaEventHelper =>
            ({
                fileName,
                media: { isEncrypted: false },
                sourceBlob: { value: Promise.resolve(blob) },
            }) as unknown as MediaEventHelper;

        const renderPreview = (mediaEvent: MatrixEvent, mediaEventHelper: MediaEventHelper) =>
            renderInRoomContext(
                <FileBodyFactory mxEvent={mediaEvent} mediaEventHelper={mediaEventHelper} />,
                TimelineRenderingType.Room,
            );

        it("shows the file size as the tile body when the event declares one", () => {
            const mediaEvent = mkEvent("m.file", { info: { size: 2048, mimetype: "application/pdf" } });

            renderPreview(mediaEvent, mkFileHelper("report.pdf", new Blob(["pdf"])));

            expect(screen.getByText("report.pdf")).toBeInTheDocument();
            expect(screen.getByText("2 KB")).toBeInTheDocument();
        });

        it("shows a placeholder as the tile body when the event declares no size", () => {
            const mediaEvent = mkEvent("m.file");

            renderPreview(mediaEvent, mkFileHelper("report.pdf", new Blob(["pdf"])));

            expect(screen.getByText("Size unknown")).toBeInTheDocument();
        });

        it("asks where to save the file when its Save as… button is clicked, as the message menu does", async () => {
            const mediaEvent = mkEvent("m.file");
            const mediaEventHelper = mkFileHelper("report.pdf", new Blob(["pdf"], { type: "application/pdf" }));

            renderPreview(mediaEvent, mediaEventHelper);
            await userEvent.click(screen.getByRole("button", { name: "Save as…" }));

            await waitFor(() => expect(saveMediaAs).toHaveBeenCalledWith(mediaEvent, mediaEventHelper));
            expect(mockDownload).not.toHaveBeenCalled();
        });
    });

    describe("ImageBodyFactory", () => {
        const imageContent = {
            info: {
                mimetype: "image/jpeg",
                w: 320,
                h: 240,
                size: 48_000,
            },
        };

        it("renders the shared image view in room timelines", () => {
            const mediaEvent = mkEvent("m.image", imageContent);

            const { container } = renderInRoomContext(
                <ImageBodyFactory
                    {...props}
                    mxEvent={mediaEvent}
                    mediaEventHelper={new MediaEventHelper(mediaEvent)}
                />,
                TimelineRenderingType.Room,
            );

            expect(container.querySelector(".mx_ImageBody")).not.toBeNull();
            expect(container.querySelector(".mx_MFileBody")).toBeNull();
        });

        it("draws the download's ring on the picture while it loads, which stops and restarts the download", async () => {
            const mediaEvent = mkEvent("m.image", imageContent);
            const { container } = renderInRoomContext(
                <ImageBodyFactory
                    {...props}
                    mxEvent={mediaEvent}
                    mediaEventHelper={new MediaEventHelper(mediaEvent)}
                />,
                TimelineRenderingType.Room,
            );
            await waitFor(() => expect(container.querySelector(".mx_ImageBody img")).not.toBeNull());

            await userEvent.click(screen.getByRole("button", { name: "Cancel download" }));

            expect(container.querySelector(".mx_ImageBody img")).toBeNull();
            await userEvent.click(screen.getByRole("button", { name: "Download" }));
            expect(container.querySelector(".mx_ImageBody img")).not.toBeNull();
            expect(screen.getByRole("button", { name: "Cancel download" })).toBeInTheDocument();
        });

        it("renders only a file body for encrypted unsafe images without thumbnails", () => {
            const mediaEvent = mkEvent("m.image", {
                file: { url: "mxc://server/encrypted-file" },
                url: undefined,
                info: {
                    mimetype: "text/html",
                },
            });

            const { container } = renderInRoomContext(
                <ImageBodyFactory
                    {...props}
                    mxEvent={mediaEvent}
                    mediaEventHelper={{ media: { isEncrypted: true } } as MediaEventHelper}
                />,
                TimelineRenderingType.Room,
            );

            expect(container.querySelector(".mx_ImageBody")).toBeNull();
            expect(container.querySelector(".mx_MFileBody")).not.toBeNull();
            expect(screen.getByRole("button", { name: "test-file.txt" })).toBeInTheDocument();
        });

        it("keeps the image body for encrypted unsafe images when a thumbnail is available", () => {
            const mediaEvent = mkEvent("m.image", {
                file: { url: "mxc://server/encrypted-file" },
                url: undefined,
                info: {
                    mimetype: "text/html",
                    thumbnail_info: { mimetype: "image/jpeg" },
                },
            });

            const { container } = renderInRoomContext(
                <ImageBodyFactory {...props} mxEvent={mediaEvent} mediaEventHelper={encryptedImageHelper()} />,
                TimelineRenderingType.Room,
            );

            expect(container.querySelector(".mx_ImageBody")).not.toBeNull();
            expect(container.querySelector(".mx_MFileBody")).toBeNull();
        });
    });

    describe("VideoBodyFactory", () => {
        const videoContent = {
            info: {
                mimetype: "video/mp4",
                w: 320,
                h: 240,
                size: 48_000,
            },
        };

        it("renders without a file fallback in room timelines", () => {
            const mediaEvent = mkEvent("m.video", videoContent);

            const { container } = renderInRoomContext(
                <VideoBodyFactory
                    mxEvent={mediaEvent}
                    mediaEventHelper={new MediaEventHelper(mediaEvent)}
                    forExport={false}
                />,
                TimelineRenderingType.Room,
            );

            expect(container.querySelector(".mx_MVideoBody")).not.toBeNull();
            expect(container.querySelector(".mx_MFileBody")).toBeNull();
        });
    });

    it("renders the redacted body wrapper", () => {
        const mediaEvent = mkEvent("m.text");

        const { container } = render(<RedactedBodyFactory mxEvent={mediaEvent} />);

        expect(container.querySelector(".mx_RedactedBody")).not.toBeNull();
    });

    it("renders the decryption failure body wrapper", () => {
        const mediaEvent = mkEvent("m.text");
        Object.defineProperty(mediaEvent, "decryptionFailureReason", {
            configurable: true,
            value: "MEGOLM_UNKNOWN_INBOUND_SESSION_ID",
        });

        const { container } = render(<DecryptionFailureBodyFactory mxEvent={mediaEvent} />);

        expect(container.querySelector(".mx_DecryptionFailureBody")).not.toBeNull();
    });
});
