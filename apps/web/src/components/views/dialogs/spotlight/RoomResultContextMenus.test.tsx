/*
Copyright 2024 New Vector Ltd.
Copyright 2023 Mikhail Aheichyk
Copyright 2023 Nordeck IT + Consulting GmbH.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Room, type MatrixClient, PendingEventOrdering } from "matrix-js-sdk/src/matrix";
import { render, screen, type RenderResult } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { filterConsole, stubClient, withClientContextRenderOptions } from "test-utils";

import { RoomResultContextMenus } from "./RoomResultContextMenus";
import { shouldShowComponent } from "../../../../customisations/helpers/UIComponents";
import { UIComponent } from "../../../../settings/UIFeature";
import DMRoomMap from "../../../../utils/DMRoomMap";

vi.mock("../../../../customisations/helpers/UIComponents", () => ({
    shouldShowComponent: vi.fn(),
}));

describe("RoomResultContextMenus", () => {
    let client: MatrixClient;
    let room: Room;

    const renderRoomResultContextMenus = (): RenderResult => {
        return render(<RoomResultContextMenus room={room} />, withClientContextRenderOptions(client));
    };

    filterConsole(
        // irrelevant for this test
        "Room !1:example.org does not have an m.room.create event",
    );

    beforeEach(() => {
        client = stubClient();
        DMRoomMap.makeShared(client);
        room = new Room("!1:example.org", client, "@alice:example.org", {
            pendingEventOrdering: PendingEventOrdering.Detached,
        });
    });

    it("does not render the room options context menu when UIComponent customisations disable room options", () => {
        vi.mocked(shouldShowComponent).mockReturnValue(false);
        renderRoomResultContextMenus();
        expect(shouldShowComponent).toHaveBeenCalledWith(UIComponent.RoomOptionsMenu);
        expect(screen.queryByRole("button", { name: "Room options" })).not.toBeInTheDocument();
    });

    it("renders the room options context menu when UIComponent customisations enable room options", () => {
        vi.mocked(shouldShowComponent).mockReturnValue(true);
        renderRoomResultContextMenus();
        expect(shouldShowComponent).toHaveBeenCalledWith(UIComponent.RoomOptionsMenu);
        expect(screen.queryByRole("button", { name: "Room options" })).toBeInTheDocument();
    });

    it("opens the room list's menu, with the notification options in its submenu instead of a bell", async () => {
        const user = userEvent.setup();
        vi.mocked(shouldShowComponent).mockReturnValue(true);
        renderRoomResultContextMenus();

        expect(screen.queryByRole("button", { name: "Notification options" })).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Room options" }));
        expect(screen.getByRole("menu")).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Notifications" })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Leave room" })).toBeInTheDocument();
    });

    it("doesn't open the room, as a click on the result does, when its button is clicked", async () => {
        const user = userEvent.setup();
        vi.mocked(shouldShowComponent).mockReturnValue(true);
        const onResultClick = vi.fn();
        render(
            <div onClick={onResultClick}>
                <RoomResultContextMenus room={room} />
            </div>,
            withClientContextRenderOptions(client),
        );

        await user.click(screen.getByRole("button", { name: "Room options" }));
        expect(onResultClick).not.toHaveBeenCalled();
    });

    it("keeps the space menu for a space", async () => {
        const user = userEvent.setup();
        vi.mocked(shouldShowComponent).mockReturnValue(true);
        vi.spyOn(room, "isSpaceRoom").mockReturnValue(true);
        renderRoomResultContextMenus();

        expect(screen.queryByRole("button", { name: "Room options" })).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Space options" }));
        expect(screen.getByRole("menu")).toBeInTheDocument();
    });
});
