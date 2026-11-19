/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "test-utils-rtl";
import { getMockClientWithEventEmitter, withClientContextRenderOptions } from "test-utils";
import { MatrixEvent, Room } from "matrix-js-sdk/src/matrix";

import BridgeSettingsTab from "./BridgeSettingsTab";

describe("<BridgeSettingsTab />", () => {
    const userId = "@alice:server.org";
    const client = getMockClientWithEventEmitter({
        getRoom: vi.fn(),
    });
    const roomId = "!room:server.org";

    const getComponent = (room: Room) =>
        render(<BridgeSettingsTab room={room} />, withClientContextRenderOptions(client));

    it("renders when room is not bridging messages to any platform", () => {
        const room = new Room(roomId, client, userId);

        const { container } = getComponent(room);

        expect(container).toMatchSnapshot();
    });

    it("renders when room is bridging messages", () => {
        const bridgeEvent = new MatrixEvent({
            type: "uk.half-shot.bridge",
            content: {
                channel: { id: "channel-test" },
                protocol: { id: "protocol-test" },
                bridgebot: "test",
            },
            room_id: roomId,
            state_key: "1",
        });
        const room = new Room(roomId, client, userId);
        room.currentState.setStateEvents([bridgeEvent]);
        client.getRoom.mockReturnValue(room);

        const { container } = getComponent(room);

        expect(container).toMatchSnapshot();
    });

    it("links the bridge help, workspace and channel as links that leave the app", () => {
        const bridgeEvent = new MatrixEvent({
            type: "uk.half-shot.bridge",
            content: {
                channel: {
                    id: "channel-test",
                    displayname: "General",
                    external_url: "https://chat.example.org/general",
                },
                network: { id: "network-test", displayname: "Example", external_url: "https://chat.example.org/" },
                protocol: { id: "protocol-test" },
                bridgebot: "test",
            },
            room_id: roomId,
            state_key: "1",
        });
        const room = new Room(roomId, client, userId);
        room.currentState.setStateEvents([bridgeEvent]);
        client.getRoom.mockReturnValue(room);

        const { getByRole } = getComponent(room);

        for (const [name, href] of [
            ["Learn more.", "https://matrix.org/bridges/"],
            ["Example", "https://chat.example.org/"],
            ["General", "https://chat.example.org/general"],
        ]) {
            const link = getByRole("link", { name });
            expect(link).toHaveAttribute("href", href);
            expect(link).toHaveClass("mx_ExternalLink");
            expect(link.querySelector(".mx_ExternalLink_icon")).not.toBeNull();
        }
    });
});
