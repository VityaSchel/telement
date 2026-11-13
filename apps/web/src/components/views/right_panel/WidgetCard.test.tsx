/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "test-utils-rtl";
import { type MatrixClient, Room } from "matrix-js-sdk/src/matrix";
import { MatrixWidgetType } from "matrix-widget-api";
import { clientAndSDKContextRenderOptions, stubClient, TestSDKContext } from "test-utils";

import WidgetCard from "./WidgetCard";
import { type IApp } from "../../../stores/WidgetStore";
import WidgetUtils, { useWidgets } from "../../../utils/WidgetUtils";
import { type WidgetLayoutStore } from "../../../stores/widgets/WidgetLayoutStore";

vi.mock("../../../utils/WidgetUtils");
// The widget's iframe has nothing to do with the card's header
vi.mock("../elements/AppTile", () => ({ default: () => null }));

describe("<WidgetCard />", () => {
    let client: MatrixClient;
    let room: Room;
    let sdkContext: TestSDKContext;

    beforeEach(() => {
        client = stubClient();
        sdkContext = new TestSDKContext();
        sdkContext._client = client;
        sdkContext._WidgetLayoutStore = {
            isInContainer: vi.fn().mockReturnValue(true),
        } as unknown as WidgetLayoutStore;
        room = new Room("!room:server", client, client.getSafeUserId());
        vi.mocked(WidgetUtils.getWidgetName).mockReturnValue("Etherpad");
        vi.mocked(useWidgets).mockReturnValue([
            {
                id: "etherpad",
                roomId: room.roomId,
                eventId: "$event",
                creatorUserId: client.getSafeUserId(),
                type: MatrixWidgetType.Custom,
                name: "Etherpad",
                url: "https://example.org/etherpad",
            },
        ] satisfies IApp[]);
    });

    it("shows the options button with the overflow icon the other card headers' options buttons have", () => {
        render(
            <WidgetCard room={room} widgetId="etherpad" onClose={vi.fn()} />,
            clientAndSDKContextRenderOptions(client, sdkContext),
        );

        const options = screen.getByRole("button", { name: "Options" });
        expect(options).toHaveClass("mx_BaseCard_header_title_button--option");
        expect(options.querySelector("svg")).not.toBeNull();
    });
});
