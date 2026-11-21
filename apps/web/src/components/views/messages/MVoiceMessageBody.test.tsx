/*
 * Copyright 2025 New Vector Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

// @vitest-environment happy-dom

import { EventType, MatrixEvent, Room } from "matrix-js-sdk/src/matrix";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "test-utils-rtl";
import React from "react";

import { createTestClient } from "test-utils";
import { MockedPlayback } from "../../../audio/__mocks__";
import { type Playback, PlaybackState } from "../../../audio/Playback";
import { PlaybackManager } from "../../../audio/PlaybackManager";
import type { MediaEventHelper } from "../../../utils/MediaEventHelper";
import MVoiceMessageBody from "./MVoiceMessageBody";
import { PlaybackQueue } from "../../../audio/PlaybackQueue";
import { SDKContextClass } from "../../../contexts/SDKContextClass";
import { TimelineRenderingType } from "../../../contexts/RoomContext";
import { ScopedRoomContextProvider } from "../../../contexts/ScopedRoomContext";

describe("<MVvoiceMessageBody />", () => {
    let event: MatrixEvent;
    beforeEach(() => {
        const playback = new MockedPlayback(PlaybackState.Decoding, 50, 10) as unknown as Playback;
        vi.spyOn(PlaybackManager.instance, "createPlaybackInstance").mockReturnValue(playback);

        const matrixClient = createTestClient();
        const room = new Room("!TESTROOM", matrixClient, "@alice:example.org");
        const playbackQueue = new PlaybackQueue(room, SDKContextClass.instance.roomViewStore);

        vi.spyOn(PlaybackQueue, "forRoom").mockReturnValue(playbackQueue);
        vi.spyOn(playbackQueue, "unsortedEnqueue").mockReturnValue(undefined);

        event = new MatrixEvent({
            room_id: "!room:server",
            sender: "@alice.example.org",
            type: EventType.RoomMessage,
            content: {
                "body": "audio name ",
                "msgtype": "m.audio",
                "url": "mxc://server/audio",
                "org.matrix.msc3946.voice": true,
            },
        });
    });

    it("should render", async () => {
        const mediaEventHelper = {
            sourceBlob: {
                value: {
                    arrayBuffer: () => new ArrayBuffer(8),
                },
            },
        } as unknown as MediaEventHelper;

        await act(() => render(<MVoiceMessageBody mxEvent={event} mediaEventHelper={mediaEventHelper} />));
        expect(await screen.findByTestId("recording-playback")).toBeInTheDocument();
    });

    it("puts no download button under the player in the files panel, which saves it from the message menu", async () => {
        const mediaEventHelper = {
            sourceBlob: { value: { arrayBuffer: () => new ArrayBuffer(8) } },
        } as unknown as MediaEventHelper;

        const { container } = await act(() =>
            render(
                // Only the rendering type matters here, so the rest of the room's state is left out
                <ScopedRoomContextProvider {...({ timelineRenderingType: TimelineRenderingType.File } as any)}>
                    <MVoiceMessageBody mxEvent={event} mediaEventHelper={mediaEventHelper} />
                </ScopedRoomContextProvider>,
            ),
        );

        expect(await screen.findByTestId("recording-playback")).toBeInTheDocument();
        expect(container.querySelector(".mx_MFileBody")).toBeNull();
        expect(screen.queryByText(/^Download/)).not.toBeInTheDocument();
    });

    it("lays out the player while the file downloads rather than a spinner, so the message keeps its size once it loads", async () => {
        const downloading = {
            sourceBlob: { value: new Promise(() => {}) },
        } as unknown as MediaEventHelper;
        event = new MatrixEvent({
            ...event.event,
            content: {
                ...event.getContent(),
                "info": { duration: 3000 },
                "org.matrix.msc1767.audio": { duration: 3000, waveform: [0, 512, 1024] },
            },
        });

        const { container } = await act(() =>
            render(<MVoiceMessageBody mxEvent={event} mediaEventHelper={downloading} />),
        );

        expect(screen.queryByTestId("recording-playback")).not.toBeInTheDocument();
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        // The player's own containers, which size it, with its play button disabled as while it decodes
        const player = container.querySelector(".mx_MVoiceMessageBody > .mx_VoiceMessagePrimaryContainer")!;
        expect(player).toHaveAttribute("aria-busy", "true");
        expect(screen.getByRole("button", { name: "Play" })).toHaveAttribute("aria-disabled", "true");
        expect(player.querySelectorAll(".mx_RecordingPlayback_timelineLayoutMiddle .mx_Waveform_bar")).toHaveLength(39);
        expect(screen.getByRole("timer")).toHaveTextContent("00:03");
    });
});
