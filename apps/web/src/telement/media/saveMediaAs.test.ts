/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { EventType, MatrixEvent, MsgType } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import Modal from "../../Modal";
import ErrorDialog from "../../components/views/dialogs/ErrorDialog";
import { ModuleApi } from "../../modules/Api";
import { type MediaEventHelper } from "../../utils/MediaEventHelper";
import { saveFileAs } from "./saveFileAs";
import { checkMediaSavingAllowed, getSaveFileName, saveAs, saveMediaAs } from "./saveMediaAs";

vi.mock("./saveFileAs", () => ({
    saveFileAs: vi.fn(),
}));

const mxEvent = new MatrixEvent({
    type: EventType.RoomMessage,
    event_id: "$video",
    content: { msgtype: MsgType.Video, body: "video.mp4", url: "mxc://server/video" },
});

function createHelper(fileName: string, blob: Promise<Blob>): MediaEventHelper {
    return { fileName, sourceBlob: { value: blob } } as unknown as MediaEventHelper;
}

describe("saveMediaAs", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.mocked(saveFileAs).mockReset();
    });

    it("saves the message's file under its name", async () => {
        const blob = Promise.resolve(new Blob(["video"]));

        await saveMediaAs(mxEvent, createHelper("holiday.mp4", blob));

        expect(saveFileAs).toHaveBeenCalledWith("holiday.mp4", expect.any(Function));
        await expect(vi.mocked(saveFileAs).mock.calls[0][1]()).resolves.toBe(await blob);
    });

    it("names a voice message after its type", async () => {
        const voiceMessage = new MatrixEvent({
            type: EventType.RoomMessage,
            event_id: "$voice",
            content: {
                "msgtype": MsgType.Audio,
                "body": "Voice message",
                "url": "mxc://server/voice",
                "info": { mimetype: "audio/ogg" },
                "org.matrix.msc3245.voice": {},
            },
        });

        await saveMediaAs(voiceMessage, createHelper("Voice message", Promise.resolve(new Blob())));

        expect(saveFileAs).toHaveBeenCalledWith("Voice message.ogg", expect.any(Function));
    });

    it("shows an error when the file cannot be saved", async () => {
        vi.spyOn(logger, "error").mockImplementation(() => {});
        const createDialog = vi
            .spyOn(Modal, "createDialog")
            .mockReturnValue({} as ReturnType<typeof Modal.createDialog>);
        vi.mocked(saveFileAs).mockRejectedValue(new Error("disk full"));

        await saveAs("video.mp4", () => Promise.resolve(new Blob()));

        expect(createDialog).toHaveBeenCalledWith(
            ErrorDialog,
            expect.objectContaining({
                title: "Couldn't save the file",
                description: expect.stringContaining("disk full"),
            }),
        );
    });

    it("shows nothing when the user cancels", async () => {
        const createDialog = vi.spyOn(Modal, "createDialog");
        vi.mocked(saveFileAs).mockResolvedValue(false);

        await saveAs("video.mp4", () => Promise.resolve(new Blob()));

        expect(createDialog).not.toHaveBeenCalled();
    });
});

describe("getSaveFileName", () => {
    it.each([
        ["Voice message", "audio/ogg", "Voice message.ogg"],
        ["Voice message", "audio/ogg; codecs=opus", "Voice message.ogg"],
        ["Smiling cat", "image/png", "Smiling cat.png"],
        ["Song", "audio/mpeg", "Song.mp3"],
        ["Clip", "video/quicktime", "Clip.mov"],
        ["Clip v1.2", "video/mp4", "Clip v1.2.mp4"],
    ])("adds an extension to %j of type %s", (fileName, mimetype, expected) => {
        expect(getSaveFileName(fileName, mimetype)).toBe(expected);
    });

    it.each([
        ["holiday.MP4", "video/mp4"],
        ["photo.jpeg", "image/png"],
        ["README", "text/plain"],
        ["data", "application/octet-stream"],
        ["Voice message", undefined],
    ])("keeps %j of type %s as it is", (fileName, mimetype) => {
        expect(getSaveFileName(fileName, mimetype)).toBe(fileName);
    });
});

describe("checkMediaSavingAllowed", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("allows saving at once when no module decides", () => {
        vi.spyOn(ModuleApi.instance.customComponents, "getHintsForMessage").mockReturnValue(null);

        expect(checkMediaSavingAllowed(mxEvent)).toBeUndefined();
    });

    it("asks the module", async () => {
        const allowDownloadingMedia = vi.fn().mockResolvedValue(false);
        vi.spyOn(ModuleApi.instance.customComponents, "getHintsForMessage").mockReturnValue({
            allowDownloadingMedia,
        });

        await expect(checkMediaSavingAllowed(mxEvent)).resolves.toBe(false);
        expect(allowDownloadingMedia).toHaveBeenCalled();
    });

    it("refuses when the module's check fails", async () => {
        vi.spyOn(logger, "error").mockImplementation(() => {});
        vi.spyOn(ModuleApi.instance.customComponents, "getHintsForMessage").mockReturnValue({
            allowDownloadingMedia: vi.fn().mockRejectedValue(new Error("broken")),
        });

        await expect(checkMediaSavingAllowed(mxEvent)).resolves.toBe(false);
    });
});
