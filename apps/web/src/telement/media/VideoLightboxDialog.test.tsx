/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventType, MatrixEvent, MsgType } from "matrix-js-sdk/src/matrix";
import { fireEvent, render, screen, waitFor } from "test-utils-rtl";
import { stubClient } from "test-utils";

import Modal from "../../Modal";
import { type MediaEventHelper } from "../../utils/MediaEventHelper";
import { openVideoLightbox, VideoLightboxDialog } from "./VideoLightboxDialog";

const mxEvent = new MatrixEvent({
    type: EventType.RoomMessage,
    room_id: "!room:server",
    event_id: "$video:server",
    sender: "@alice:server",
    origin_server_ts: new Date(2026, 10, 12, 10, 42).getTime(),
    content: { msgtype: MsgType.Video, body: "holiday.mp4", url: "mxc://server/video", info: { duration: 65_000 } },
});

const mediaEventHelper = {
    sourceUrl: { value: Promise.resolve("https://server/video.mp4") },
    thumbnailUrl: { value: Promise.resolve(null) },
} as unknown as MediaEventHelper;

describe("VideoLightboxDialog", () => {
    beforeEach(() => {
        stubClient();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("shows the video viewer with focus on play, and closes on Escape", async () => {
        const onFinished = vi.fn();
        render(<VideoLightboxDialog mxEvent={mxEvent} mediaEventHelper={mediaEventHelper} onFinished={onFinished} />);

        const dialog = screen.getByRole("dialog", { name: "Video view" });
        await waitFor(() => expect(screen.getByRole("button", { name: "Play" })).toHaveFocus());
        expect(screen.getByText("1:05")).toBeInTheDocument();
        await waitFor(() => expect(dialog.querySelector("video")).toHaveAttribute("src", "https://server/video.mp4"));

        fireEvent.keyDown(screen.getByRole("button", { name: "Play" }), { key: "Escape" });
        expect(onFinished).toHaveBeenCalled();
    });

    it("opens the message's options menu from its options button", async () => {
        const onFinished = vi.fn();
        render(<VideoLightboxDialog mxEvent={mxEvent} mediaEventHelper={mediaEventHelper} onFinished={onFinished} />);

        const options = screen.getByRole("button", { name: "Options" });
        expect(screen.queryByRole("menu")).toBeNull();
        fireEvent.click(options);

        expect(await screen.findByRole("menu")).toBeInTheDocument();
        expect(options).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("menuitem", { name: "Forward" })).toBeInTheDocument();
    });

    it("opens as a lightbox", () => {
        const createDialog = vi
            .spyOn(Modal, "createDialog")
            .mockReturnValue({} as ReturnType<typeof Modal.createDialog>);

        openVideoLightbox({ mxEvent, mediaEventHelper });

        expect(createDialog).toHaveBeenCalledWith(
            VideoLightboxDialog,
            { mxEvent, mediaEventHelper },
            "mx_Dialog_lightbox",
            undefined,
            true,
        );
    });
});
