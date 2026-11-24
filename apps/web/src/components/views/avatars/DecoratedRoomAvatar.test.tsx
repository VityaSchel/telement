/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, render, waitFor } from "test-utils-rtl";
import {
    JoinRule,
    type MatrixClient,
    MatrixEvent,
    PendingEventOrdering,
    Room,
    RoomMember,
    User,
    UserEvent,
} from "matrix-js-sdk/src/matrix";
import React from "react";
import userEvent from "@testing-library/user-event";
import { stubClient } from "test-utils";

import { MatrixClientPeg } from "../../../MatrixClientPeg";
import DecoratedRoomAvatar from "./DecoratedRoomAvatar";
import DMRoomMap from "../../../utils/DMRoomMap";

vi.mock("../../../utils/presence", () => ({ isPresenceEnabled: vi.fn().mockReturnValue(true) }));

vi.mock("../../../utils/room/getJoinedNonFunctionalMembers", () => ({
    getJoinedNonFunctionalMembers: vi.fn().mockReturnValue([0, 1]),
}));

describe("DecoratedRoomAvatar", () => {
    const ROOM_ID = "roomId";

    let mockClient: MatrixClient;
    let room: Room;

    function renderComponent() {
        return render(<DecoratedRoomAvatar room={room} size="32px" />);
    }

    beforeEach(() => {
        stubClient();
        mockClient = vi.mocked(MatrixClientPeg.safeGet());

        room = new Room(ROOM_ID, mockClient, mockClient.getUserId() ?? "", {
            pendingEventOrdering: PendingEventOrdering.Detached,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("shows an avatar with globe icon and tooltip for public room", async () => {
        const dmRoomMap = {
            getUserIdForRoomId: vi.fn(),
        } as unknown as DMRoomMap;
        vi.spyOn(DMRoomMap, "shared").mockReturnValue(dmRoomMap);
        room.getJoinRule = vi.fn().mockReturnValue(JoinRule.Public);

        const { container, asFragment } = renderComponent();

        const globe = container.querySelector(".mx_DecoratedRoomAvatar_icon_globe")!;
        expect(globe).toBeVisible();
        await userEvent.hover(globe!);

        // wait for the tooltip to open
        const tooltip = await waitFor(() => {
            const tooltip = document.getElementById(globe.getAttribute("aria-labelledby")!);
            expect(tooltip).toBeVisible();
            return tooltip;
        });
        expect(tooltip).toHaveTextContent("This room is public");

        expect(asFragment()).toMatchSnapshot();
    });

    it("shows the presence indicator in a DM room that also has functional members", async () => {
        const DM_USER_ID = "@bob:foo.bar";
        const dmRoomMap = {
            getUserIdForRoomId: () => {
                return DM_USER_ID;
            },
        } as unknown as DMRoomMap;
        vi.spyOn(DMRoomMap, "shared").mockReturnValue(dmRoomMap);
        vi.spyOn(DecoratedRoomAvatar.prototype as any, "getPresenceIcon").mockImplementation(() => "ONLINE");
        vi.spyOn(room, "getMember").mockReturnValue(new RoomMember(room.roomId, DM_USER_ID));

        const { container, asFragment } = renderComponent();

        const presence = container.querySelector(".mx_DecoratedRoomAvatar_icon")!;
        expect(presence).toBeVisible();
        await userEvent.hover(presence!);

        // wait for the tooltip to open
        const tooltip = await waitFor(() => {
            const tooltip = document.getElementById(presence.getAttribute("aria-labelledby")!);
            expect(tooltip).toBeVisible();
            return tooltip;
        });
        expect(tooltip).toHaveTextContent("Online");

        expect(asFragment()).toMatchSnapshot();
    });

    describe("presence in a DM room", () => {
        const DM_USER_ID = "@bob:foo.bar";

        let user: User;

        beforeEach(() => {
            user = new User(DM_USER_ID);
            vi.mocked(mockClient.getUser).mockReturnValue(user);
            vi.spyOn(DMRoomMap, "shared").mockReturnValue({
                getUserIdForRoomId: () => DM_USER_ID,
            } as unknown as DMRoomMap);
        });

        function setPresence(presence: string): void {
            user.presence = presence;
            user.emit(UserEvent.Presence, new MatrixEvent(), user);
        }

        function decoration(container: HTMLElement): { cutout: boolean; icon: string | undefined } {
            return {
                cutout: container.querySelector(".mx_DecoratedRoomAvatar_cutout") !== null,
                icon: container.querySelector(".mx_DecoratedRoomAvatar_icon")?.className.split(" ").at(-1),
            };
        }

        it("shows someone offline without a dot, and without the cutout for one", () => {
            user.presence = "offline";
            const { container } = renderComponent();

            expect(decoration(container)).toEqual({ cutout: false, icon: undefined });
        });

        it.each([
            ["online", "mx_DecoratedRoomAvatar_icon_online"],
            ["unavailable", "mx_DecoratedRoomAvatar_icon_away"],
            ["busy", "mx_DecoratedRoomAvatar_icon_busy"],
        ])("cuts the avatar out only while there is a dot to show in it: %s", (presence, icon) => {
            user.presence = presence;
            const { container } = renderComponent();
            expect(decoration(container)).toEqual({ cutout: true, icon });

            act(() => setPresence("offline"));
            expect(decoration(container)).toEqual({ cutout: false, icon: undefined });

            act(() => setPresence(presence));
            expect(decoration(container)).toEqual({ cutout: true, icon });
        });
    });
});
