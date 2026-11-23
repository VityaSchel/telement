/*
 * Copyright 2025 New Vector Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventType, MatrixEvent } from "matrix-js-sdk/src/matrix";
import { render, screen, act } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";

import { MockedPlayback } from "../../../audio/__mocks__";
import { type Playback, PlaybackState } from "../../../audio/Playback";
import MAudioBody from "./MAudioBody";
import { PlaybackManager } from "../../../audio/PlaybackManager";
import { type MediaEventHelper } from "../../../utils/MediaEventHelper";
import { TimelineRenderingType } from "../../../contexts/RoomContext";
import { ScopedRoomContextProvider } from "../../../contexts/ScopedRoomContext";

describe("<MAudioBody />", () => {
    let event: MatrixEvent;

    const mediaEventHelper = {
        sourceBlob: {
            value: {
                arrayBuffer: () => new ArrayBuffer(8),
            },
        },
    } as unknown as MediaEventHelper;

    beforeEach(() => {
        const playback = new MockedPlayback(PlaybackState.Decoding, 50, 10) as unknown as Playback;
        vi.spyOn(PlaybackManager.instance, "createPlaybackInstance").mockReturnValue(playback);

        event = new MatrixEvent({
            room_id: "!room:server",
            sender: "@alice.example.org",
            type: EventType.RoomMessage,
            content: {
                body: "audio name ",
                msgtype: "m.audio",
                url: "mxc://server/audio",
            },
        });
    });

    it("should render", async () => {
        await act(() => render(<MAudioBody mxEvent={event} mediaEventHelper={mediaEventHelper} />));
        expect(await screen.findByRole("region", { name: "Audio player" })).toBeInTheDocument();
    });

    it("lays out the player while the file downloads, with the download's ring in place of its play button", async () => {
        const downloading = { sourceBlob: { value: new Promise(() => {}) } } as unknown as MediaEventHelper;
        event.getContent().info = { size: 2048, duration: 61000 };

        await act(() => render(<MAudioBody mxEvent={event} mediaEventHelper={downloading} />));

        const player = screen.getByRole("region", { name: "Audio player" });
        expect(player).toContainElement(screen.getByRole("progressbar", { name: "Downloading" }));
        expect(player).toContainElement(screen.getByRole("button", { name: "Cancel download" }));
        expect(screen.queryByRole("button", { name: "Play" })).not.toBeInTheDocument();
        expect(screen.getByTestId("audio-player-name")).toHaveTextContent("audio name");
        expect(player).toHaveTextContent("01:01");
        expect(player).toHaveTextContent("(2 KB)");
    });

    it("cancels the download from its ring without showing an error, and loads the player once it is started again", async () => {
        let abort!: (error: Error) => void;
        const first = new Promise<Blob>((_resolve, reject) => (abort = reject));
        const values = [first, Promise.resolve({ arrayBuffer: () => new ArrayBuffer(8) })];
        const restartable = {
            sourceBlob: {
                get value() {
                    return values.shift();
                },
            },
        } as unknown as MediaEventHelper;
        await act(() => render(<MAudioBody mxEvent={event} mediaEventHelper={restartable} />));

        await userEvent.click(screen.getByRole("button", { name: "Cancel download" }));
        await act(async () => abort(new DOMException("The download was cancelled", "AbortError")));

        expect(screen.queryByText("Error processing audio message")).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Download" }));

        expect(await screen.findByRole("button", { name: "Play" })).toBeInTheDocument();
    });

    it("should show the body as the title when there is no filename", async () => {
        await act(() => render(<MAudioBody mxEvent={event} mediaEventHelper={mediaEventHelper} />));
        expect(await screen.findByRole("region", { name: "Audio player" })).toBeInTheDocument();
        expect(screen.getByText("audio name")).toBeInTheDocument();
    });

    it.each(Object.values(TimelineRenderingType))(
        "puts no download button under the player in the %s timeline, as the message menu saves it",
        async (timelineRenderingType) => {
            const { container } = await act(() =>
                render(
                    // Only the rendering type matters here, so the rest of the room's state is left out
                    <ScopedRoomContextProvider {...({ timelineRenderingType } as any)}>
                        <MAudioBody mxEvent={event} mediaEventHelper={mediaEventHelper} />
                    </ScopedRoomContextProvider>,
                ),
            );

            expect(await screen.findByRole("region", { name: "Audio player" })).toBeInTheDocument();
            expect(container.querySelector(".mx_MFileBody")).toBeNull();
            expect(screen.queryByText(/^Download/)).not.toBeInTheDocument();
        },
    );

    it("should prefer the filename over the body as the title", async () => {
        // A caption puts the human readable text in `body` and the actual file name in `filename`.
        event.getContent().filename = "recording.ogg";
        event.getContent().body = "Listen to this!";

        await act(() => render(<MAudioBody mxEvent={event} mediaEventHelper={mediaEventHelper} />));
        expect(await screen.findByRole("region", { name: "Audio player" })).toBeInTheDocument();
        expect(screen.getByText("recording.ogg")).toBeInTheDocument();
        expect(screen.queryByText("Listen to this!")).not.toBeInTheDocument();
    });
});
