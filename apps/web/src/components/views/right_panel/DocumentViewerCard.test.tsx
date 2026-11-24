/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "test-utils-rtl";
import { EventType, type MatrixClient, MatrixEvent, MsgType, Room } from "matrix-js-sdk/src/matrix";

import { DocumentViewerCard } from "./DocumentViewerCard";
import { clientAndSDKContextRenderOptions, stubClient, TestSDKContext } from "../../../test/test-utils";

function mkFileEvent(): MatrixEvent {
    return new MatrixEvent({
        room_id: "!room:example.org",
        sender: "@user:example.org",
        event_id: "$readme",
        type: EventType.RoomMessage,
        content: {
            body: "README.md",
            msgtype: MsgType.File,
            url: "mxc://example.org/readme",
            info: { mimetype: "text/markdown" },
        },
    });
}

describe("DocumentViewerCard", () => {
    let client: MatrixClient;
    let sdkContext: TestSDKContext;

    beforeEach(() => {
        client = stubClient();
        sdkContext = new TestSDKContext();
        sdkContext._client = client;
    });

    it("names the card after the file and mounts its viewer", async () => {
        render(<DocumentViewerCard mxEvent={mkFileEvent()} />, clientAndSDKContextRenderOptions(client, sdkContext));

        expect(screen.getByRole("heading", { name: "README.md" })).toBeInTheDocument();
        // The viewer is code split, so it shows up once its chunk has loaded.
        expect(await screen.findByRole("status")).toHaveTextContent("Loading document");
    });

    it("shows an error when the attachment can no longer be opened", () => {
        const mxEvent = mkFileEvent();
        // A redaction while the card is open leaves an event no viewer handles.
        mxEvent.makeRedacted(mxEvent, new Room(mxEvent.getRoomId()!, client, client.getSafeUserId()));

        render(<DocumentViewerCard mxEvent={mxEvent} />, clientAndSDKContextRenderOptions(client, sdkContext));

        expect(screen.getByRole("heading", { name: "Document" })).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent("Unable to load this file.");
    });
});
