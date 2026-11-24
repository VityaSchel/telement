/*
 * Copyright 2025 New Vector Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

// @vitest-environment happy-dom

import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { act, render, screen } from "test-utils-rtl";
import { mkStubRoom, stubClient } from "test-utils";
import { MatrixEvent, RoomMember, User, UserEvent } from "matrix-js-sdk/src/matrix";

import { DecoratedRoomAvatarView } from "./DecoratedRoomAvatarView";
import {
    AvatarBadgeDecoration,
    type RoomAvatarViewState,
    useRoomAvatarViewModel,
} from "../../viewmodels/avatars/RoomAvatarViewModel";
import DMRoomMap from "../../../utils/DMRoomMap";
import { Presence } from "./WithPresenceIndicator";

vi.mock("../../viewmodels/avatars/RoomAvatarViewModel", async () => ({
    ...(await vi.importActual("../../viewmodels/avatars/RoomAvatarViewModel")),
    useRoomAvatarViewModel: vi.fn(),
}));

describe("<DecoratedRoomAvatarView />", () => {
    const matrixClient = stubClient();
    const room = mkStubRoom("roomId", "roomName", matrixClient);

    DMRoomMap.makeShared(matrixClient);
    vi.spyOn(DMRoomMap.shared(), "getUserIdForRoomId").mockReturnValue(undefined);

    let defaultValue: RoomAvatarViewState;

    beforeEach(() => {
        defaultValue = {
            badgeDecoration: undefined,
            presence: null,
        };

        vi.mocked(useRoomAvatarViewModel).mockReturnValue(defaultValue);
    });

    it("should not render a decoration", () => {
        vi.mocked(useRoomAvatarViewModel).mockReturnValue({ ...defaultValue });
        const { asFragment } = render(<DecoratedRoomAvatarView room={room} />);
        expect(asFragment()).toMatchSnapshot();
    });

    it("should render a low priority room decoration", () => {
        vi.mocked(useRoomAvatarViewModel).mockReturnValue({
            ...defaultValue,
            badgeDecoration: AvatarBadgeDecoration.LowPriority,
        });
        const { asFragment } = render(<DecoratedRoomAvatarView room={room} />);

        expect(screen.getByLabelText("This is a low priority room")).toBeInTheDocument();
        expect(asFragment()).toMatchSnapshot();
    });

    it("should render a video room decoration", () => {
        vi.mocked(useRoomAvatarViewModel).mockReturnValue({
            ...defaultValue,
            badgeDecoration: AvatarBadgeDecoration.VideoRoom,
        });
        const { asFragment } = render(<DecoratedRoomAvatarView room={room} />);

        expect(screen.getByLabelText("This room is a video room")).toBeInTheDocument();
        expect(asFragment()).toMatchSnapshot();
    });

    it("should render a public room decoration", () => {
        vi.mocked(useRoomAvatarViewModel).mockReturnValue({
            ...defaultValue,
            badgeDecoration: AvatarBadgeDecoration.PublicRoom,
        });
        const { asFragment } = render(<DecoratedRoomAvatarView room={room} />);

        expect(screen.getByLabelText("This room is public")).toBeInTheDocument();
        expect(asFragment()).toMatchSnapshot();
    });

    it.each([
        { presence: Presence.Online, label: "Online" },
        { presence: Presence.Busy, label: "Busy" },
        { presence: Presence.Away, label: "Away" },
    ])("should render the $presence presence", ({ presence, label }) => {
        vi.mocked(useRoomAvatarViewModel).mockReturnValue({
            ...defaultValue,
            badgeDecoration: AvatarBadgeDecoration.Presence,
            presence,
        });
        const { asFragment } = render(<DecoratedRoomAvatarView room={room} />);

        expect(screen.getByLabelText(label)).toBeInTheDocument();
        expect(asFragment()).toMatchSnapshot();
    });

    describe("in a DM", () => {
        const user = new User("@bob:foo.bar");
        const member = new RoomMember(room.roomId, user.userId);
        member.user = user;

        beforeEach(async () => {
            const { useRoomAvatarViewModel: actualViewModel } = await vi.importActual<
                typeof import("../../viewmodels/avatars/RoomAvatarViewModel")
            >("../../viewmodels/avatars/RoomAvatarViewModel");
            vi.mocked(useRoomAvatarViewModel).mockImplementation(actualViewModel);

            vi.spyOn(DMRoomMap.shared(), "getUserIdForRoomId").mockReturnValue(user.userId);
            vi.spyOn(room, "getMember").mockReturnValue(member);
            vi.spyOn(room, "getJoinedMembers").mockReturnValue([
                new RoomMember(room.roomId, matrixClient.getSafeUserId()),
                member,
            ]);
        });

        function setPresence(presence: string): void {
            user.presence = presence;
            user.emit(UserEvent.Presence, new MatrixEvent(), user);
        }

        function decoration(container: HTMLElement): { dot: string | null | undefined; notch: boolean } {
            return {
                dot: container.querySelector("svg")?.getAttribute("aria-label"),
                notch: container.querySelector(".mx_RoomAvatarView_RoomAvatar_presence") !== null,
            };
        }

        it("should show someone offline without a dot, and without the notch for one", () => {
            user.presence = "offline";
            const { container } = render(<DecoratedRoomAvatarView room={room} />);

            expect(decoration(container)).toEqual({ dot: undefined, notch: false });
        });

        it.each([
            ["online", "Online"],
            ["unavailable", "Away"],
            ["busy", "Busy"],
        ])("should change between offline and %s without loading the avatar's image anew", (presence, label) => {
            user.presence = presence;
            const { container } = render(<DecoratedRoomAvatarView room={room} />);
            const image = container.querySelector("img");
            expect(image).not.toBeNull();
            expect(decoration(container)).toEqual({ dot: label, notch: true });

            act(() => setPresence("offline"));
            expect(decoration(container)).toEqual({ dot: undefined, notch: false });

            act(() => setPresence(presence));
            expect(decoration(container)).toEqual({ dot: label, notch: true });
            expect(container.querySelector("img")).toBe(image);
        });
    });
});
