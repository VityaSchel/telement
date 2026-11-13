/*
Copyright 2024, 2025 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach, type MockedObject } from "vitest";
import { EventType, getHttpUriForMxc, type IContent, type MatrixClient, MatrixEvent } from "matrix-js-sdk/src/matrix";
import { fireEvent, render, screen, waitFor } from "test-utils-rtl";
import fetchMock from "@fetch-mock/vitest";

import {
    getMockClientWithEventEmitter,
    mockClientMethodsCrypto,
    mockClientMethodsDevice,
    mockClientMethodsServer,
    mockClientMethodsUser,
    withClientContextRenderOptions,
} from "test-utils";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { type RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { MediaEventHelper } from "../../../utils/MediaEventHelper";
import { ReplyVideoBodyFactory, VideoBodyFactory } from "./MBodyFactory";
import type { IBodyProps } from "./IBodyProps";
import SettingsStore from "../../../settings/SettingsStore";
import { MediaPreviewValue } from "../../../@types/media_preview";
import Modal from "../../../Modal";
import { VideoLightboxDialog } from "../../../telement/media/VideoLightboxDialog";

// Needed so we don't throw an error about failing to decrypt.
vi.mock("matrix-encrypt-attachment", () => ({
    default: {
        decryptAttachment: vi.fn(),
    },
}));

describe("VideoBodyFactory", () => {
    const ourUserId = "@user:server";
    const senderUserId = "@other_use:server";
    const deviceId = "DEADB33F";

    const thumbUrl = "https://server/_matrix/media/v3/download/server/encrypted-poster";
    let cli: MockedObject<MatrixClient>;

    beforeEach(() => {
        cli = getMockClientWithEventEmitter({
            ...mockClientMethodsUser(ourUserId),
            ...mockClientMethodsServer(),
            ...mockClientMethodsDevice(deviceId),
            ...mockClientMethodsCrypto(),
            getRoom: vi.fn(),
            getRooms: vi.fn().mockReturnValue([]),
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
        fetchMock.mockReset();
    });

    const encryptedMediaEvent = new MatrixEvent({
        room_id: "!room:server",
        sender: senderUserId,
        type: EventType.RoomMessage,
        event_id: "$foo:bar",
        content: {
            body: "alt for a test video",
            info: {
                duration: 420,
                w: 40,
                h: 50,
                thumbnail_file: {
                    url: "mxc://server/encrypted-poster",
                },
            },
            file: {
                url: "mxc://server/encrypted-image",
            },
        },
    });

    it("does not crash when given portrait dimensions", () => {
        // Check for an unreliable crash caused by a fractional-sized
        // image dimension being used for a CanvasImageData.
        const content: IContent = {
            info: {
                "w": 720,
                "h": 1280,
                "mimetype": "video/mp4",
                "size": 2495675,
                "thumbnail_file": {
                    url: "",
                    key: { alg: "", key_ops: [], kty: "", k: "", ext: true },
                    iv: "",
                    hashes: {},
                    v: "",
                },
                "thumbnail_info": { mimetype: "" },
                "xyz.amorgan.blurhash": "TrGl6bofof~paxWC?bj[oL%2fPj]",
            },
            url: "http://example.com",
        };

        const event = new MatrixEvent({
            content,
        });

        const defaultProps: IBodyProps = {
            mxEvent: event,
            highlights: [],
            highlightLink: "",
            onMessageAllowed: vi.fn(),
            permalinkCreator: {} as RoomPermalinkCreator,
            mediaEventHelper: { media: { isEncrypted: false } } as MediaEventHelper,
        };

        const { container } = render(
            <MatrixClientContext.Provider value={cli}>
                <VideoBodyFactory {...defaultProps} />
            </MatrixClientContext.Provider>,
            withClientContextRenderOptions(cli),
        );
        expect(screen.getByRole("button", { name: /^Play video/ })).toBeInTheDocument();
        expect(container.querySelector("video")).toBeNull();
    });

    it("should show the decrypted poster of encrypted media without downloading the video", async () => {
        fetchMock.getOnce(thumbUrl, { status: 200 });
        render(
            <VideoBodyFactory
                mxEvent={encryptedMediaEvent}
                mediaEventHelper={new MediaEventHelper(encryptedMediaEvent)}
            />,
            withClientContextRenderOptions(cli),
        );
        const poster = await screen.findByRole("button", { name: "Play video: alt for a test video" });
        await waitFor(() => expect(poster.querySelector("img")?.getAttribute("src")).toMatch(/^blob:/));
        expect(poster).toHaveTextContent("0:00");
        expect(fetchMock).toHaveFetchedTimes(1);
    });

    it("opens the video viewer when the poster is clicked", async () => {
        const createDialog = vi
            .spyOn(Modal, "createDialog")
            .mockReturnValue({} as ReturnType<typeof Modal.createDialog>);
        const mediaEventHelper = new MediaEventHelper(encryptedMediaEvent);
        fetchMock.getOnce(thumbUrl, { status: 200 });
        render(
            <VideoBodyFactory mxEvent={encryptedMediaEvent} mediaEventHelper={mediaEventHelper} />,
            withClientContextRenderOptions(cli),
        );

        fireEvent.click(await screen.findByRole("button", { name: "Play video: alt for a test video" }));

        expect(createDialog).toHaveBeenCalledWith(
            VideoLightboxDialog,
            expect.objectContaining({ mxEvent: encryptedMediaEvent, mediaEventHelper }),
            "mx_Dialog_lightbox",
            undefined,
            true,
        );
        createDialog.mockRestore();
    });

    it("shows a poster that does not open the video in a reply quote", async () => {
        const createDialog = vi.spyOn(Modal, "createDialog");
        fetchMock.getOnce(thumbUrl, { status: 200 });
        const { container } = render(
            <ReplyVideoBodyFactory
                mxEvent={encryptedMediaEvent}
                mediaEventHelper={new MediaEventHelper(encryptedMediaEvent)}
            />,
            withClientContextRenderOptions(cli),
        );

        await waitFor(() => expect(container.querySelector(".mx_MVideoBody img")).not.toBeNull());
        expect(screen.queryByRole("button")).toBeNull();
        fireEvent.click(container.querySelector(".mx_MVideoBody img")!);
        expect(createDialog).not.toHaveBeenCalled();
        createDialog.mockRestore();
    });

    describe("with video previews/thumbnails disabled", () => {
        beforeEach(() => {
            const origFn = SettingsStore.getValue;
            vi.spyOn(SettingsStore, "getValue").mockImplementation((setting, ...args) => {
                if (setting === "mediaPreviewConfig") {
                    return { invite_avatars: MediaPreviewValue.Off, media_previews: MediaPreviewValue.Off };
                }
                return origFn(setting, ...args);
            });
        });

        afterEach(() => {
            SettingsStore.reset();
            vi.restoreAllMocks();
        });

        it("should not download video", async () => {
            fetchMock.getOnce(thumbUrl, { status: 200 });

            render(
                <VideoBodyFactory
                    mxEvent={encryptedMediaEvent}
                    mediaEventHelper={new MediaEventHelper(encryptedMediaEvent)}
                />,
                withClientContextRenderOptions(cli),
            );

            expect(screen.getByText("Show video")).toBeInTheDocument();

            expect(fetchMock).toHaveFetchedTimes(0, thumbUrl);
        });

        it("should render video poster after user consent", async () => {
            fetchMock.getOnce(thumbUrl, { status: 200 });

            render(
                <VideoBodyFactory
                    mxEvent={encryptedMediaEvent}
                    mediaEventHelper={new MediaEventHelper(encryptedMediaEvent)}
                />,
                withClientContextRenderOptions(cli),
            );

            const placeholderButton = screen.getByRole("button", { name: "Show video" });

            expect(placeholderButton).toBeInTheDocument();
            fireEvent.click(placeholderButton);

            await screen.findByRole("button", { name: "Play video: alt for a test video" });
            expect(fetchMock).toHaveFetched(thumbUrl);
        });

        it("should download video if we were the sender", async () => {
            fetchMock.getOnce(thumbUrl, { status: 200 });
            const ourEncryptedMediaEvent = new MatrixEvent({
                room_id: "!room:server",
                sender: ourUserId,
                type: EventType.RoomMessage,
                event_id: "$foo:bar",
                content: {
                    body: "alt for a test video",
                    info: {
                        duration: 420,
                        w: 40,
                        h: 50,
                        thumbnail_file: {
                            url: "mxc://server/encrypted-poster",
                        },
                    },
                    file: {
                        url: "mxc://server/encrypted-image",
                    },
                },
            });
            render(
                <VideoBodyFactory
                    mxEvent={ourEncryptedMediaEvent}
                    mediaEventHelper={new MediaEventHelper(ourEncryptedMediaEvent)}
                />,
                withClientContextRenderOptions(cli),
            );

            expect(await screen.findByRole("button", { name: "Play video: alt for a test video" })).toBeInTheDocument();
            expect(fetchMock).toHaveFetched(thumbUrl);
        });
    });
});
