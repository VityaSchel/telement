/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, type RenderResult } from "test-utils-rtl";
import { EventType, type MatrixClient, type MatrixEvent, MsgType, type Room } from "matrix-js-sdk/src/matrix";
import { mkEvent, mkRoom, stubClient } from "test-utils";

import MessageEvent from "../../components/views/messages/MessageEvent";
import { VideoBodyFactory } from "../../components/views/messages/MBodyFactory";
import MatrixClientContext from "../../contexts/MatrixClientContext";
import SettingsStore from "../../settings/SettingsStore";
import { RoomPermalinkCreator } from "../../utils/permalinks/Permalinks";
import { type IBodyProps } from "../../components/views/messages/IBodyProps";

vi.mock("../../components/views/messages/MBodyFactory", () => ({
    __esModule: true,
    DecryptionFailureBodyFactory: () => <div data-testid="decryption-failure-body" />,
    FileBodyFactory: () => <div data-testid="file-body" />,
    ImageBodyFactory: () => <div data-testid="image-body" />,
    RedactedBodyFactory: () => <div data-testid="redacted-body" />,
    VideoBodyFactory: () => <div data-testid="video-body" />,
    renderMBody: () => <div data-testid="file-body" />,
}));

vi.mock("./VideoNoteBodyFactory", () => ({
    VideoNoteBodyFactory: () => <div data-testid="video-note-body" />,
}));

describe("MessageEvent with round video notes", () => {
    let client: MatrixClient;
    let room: Room;

    const createEvent = (content: Record<string, unknown>): MatrixEvent =>
        mkEvent({
            event: true,
            type: EventType.RoomMessage,
            user: client.getUserId()!,
            room: room.roomId,
            content: {
                "msgtype": MsgType.Video,
                "body": "Video message.mp4",
                "url": "mxc://server/note",
                "org.interferolog.circle": true,
                "info": { w: 512, h: 512, duration: 7000, mimetype: "video/mp4" },
                ...content,
            },
        });

    const renderEvent = (
        mxEvent: MatrixEvent,
        overrideBodyTypes?: Record<string, React.ComponentType<IBodyProps>>,
    ): RenderResult =>
        render(
            <MatrixClientContext.Provider value={client}>
                <MessageEvent
                    mxEvent={mxEvent}
                    permalinkCreator={new RoomPermalinkCreator(room)}
                    overrideBodyTypes={overrideBodyTypes}
                />
            </MatrixClientContext.Provider>,
        );

    beforeEach(() => {
        client = stubClient();
        room = mkRoom(client, "!room:example.com");
        vi.spyOn(client, "getRoom").mockReturnValue(room);
        vi.spyOn(SettingsStore, "unwatchSetting").mockImplementation(vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders a video with the MSC4546 flag as a video note", () => {
        const result = renderEvent(createEvent({}));

        expect(result.getByTestId("video-note-body")).toBeInTheDocument();
        expect(result.queryByTestId("video-body")).toBeNull();
    });

    it("renders a video without the flag as an ordinary video", () => {
        const result = renderEvent(createEvent({ "org.interferolog.circle": undefined }));

        expect(result.getByTestId("video-body")).toBeInTheDocument();
    });

    it("falls back to a file body when the video note fails media validation", () => {
        const result = renderEvent(
            createEvent({ info: { w: 512, h: 512, duration: 7000, mimetype: "application/octet-stream" } }),
        );

        expect(result.getByTestId("file-body")).toBeInTheDocument();
        expect(result.queryByTestId("video-note-body")).toBeNull();
    });

    it("keeps an ordinary video when the caller chose the video renderer, as reply quotes do", () => {
        const result = renderEvent(createEvent({}), { [MsgType.Video]: VideoBodyFactory });

        expect(result.getByTestId("video-body")).toBeInTheDocument();
        expect(result.queryByTestId("video-note-body")).toBeNull();
    });
});
