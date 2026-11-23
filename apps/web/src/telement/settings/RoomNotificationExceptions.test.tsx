/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { ClientEvent, EventType, type MatrixClient, MatrixEvent, type Room } from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";
import { stubClient } from "test-utils";

import { getRoomNotifsState, RoomNotifState } from "../../RoomNotifs";
import { useNotificationState } from "../../hooks/useRoomNotificationState";
import Modal from "../../Modal";
import DMRoomMap from "../../utils/DMRoomMap";
import { getNotificationExceptionRooms, RoomNotificationExceptionsRow } from "./RoomNotificationExceptionsRow";
import { RoomNotificationExceptionsDialog } from "./RoomNotificationExceptionsDialog";

vi.mock("../../RoomNotifs", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../RoomNotifs")>()),
    getRoomNotifsState: vi.fn(),
}));
vi.mock("../../hooks/useRoomNotificationState", () => ({ useNotificationState: vi.fn() }));

describe("Room notification exceptions", () => {
    let client: MatrixClient;
    const levels: Record<string, RoomNotifState | null> = {};

    const room = (roomId: string, name: string, membership = KnownMembership.Join, space = false): Room =>
        ({
            roomId,
            name,
            getMyMembership: () => membership,
            isSpaceRoom: () => space,
            getMxcAvatarUrl: () => null,
        }) as unknown as Room;

    const muted = room("!muted:server", "Muted room");
    const mentions = room("!mentions:server", "Announcements");
    const loud = room("!loud:server", "Family");

    beforeEach(() => {
        client = stubClient();
        Object.assign(levels, {
            [muted.roomId]: RoomNotifState.Mute,
            [mentions.roomId]: RoomNotifState.MentionsOnly,
            [loud.roomId]: RoomNotifState.AllMessagesLoud,
            "!default:server": RoomNotifState.AllMessages,
            "!left:server": RoomNotifState.Mute,
            "!space:server": RoomNotifState.Mute,
            "!unknown:server": null,
        });
        vi.mocked(getRoomNotifsState).mockImplementation((_client, roomId) => levels[roomId] ?? null);
        vi.mocked(client.getRooms).mockReturnValue([
            muted,
            room("!default:server", "Default room"),
            mentions,
            room("!left:server", "Left room", KnownMembership.Leave),
            room("!space:server", "Space", KnownMembership.Join, true),
            room("!unknown:server", "Unknown"),
            loud,
        ]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("lists the joined rooms whose level isn't the default, by name", () => {
        expect(getNotificationExceptionRooms(client).map((r) => r.name)).toEqual([
            "Announcements",
            "Family",
            "Muted room",
        ]);
    });

    it("shows how many there are on a row that opens their list", async () => {
        const createDialog = vi.spyOn(Modal, "createDialog").mockReturnValue({} as any);
        render(<RoomNotificationExceptionsRow />);

        const row = screen.getByRole("button", { name: /^Rooms with their own setting/ });
        expect(row).toHaveTextContent("Rooms with their own setting3");
        await userEvent.click(row);

        expect(createDialog).toHaveBeenCalledWith(RoomNotificationExceptionsDialog, {
            rooms: [mentions, loud, muted],
        });
    });

    it("counts again when the push rules change, and goes when no room has a level of its own", () => {
        const pushRules = new MatrixEvent({ type: EventType.PushRules, content: {} });
        render(<RoomNotificationExceptionsRow />);

        levels[muted.roomId] = RoomNotifState.AllMessages;
        act(() => {
            client.emit(ClientEvent.AccountData, pushRules);
        });
        expect(screen.getByRole("button")).toHaveTextContent("2");

        levels[mentions.roomId] = RoomNotifState.AllMessages;
        levels[loud.roomId] = RoomNotifState.AllMessages;
        act(() => {
            client.emit(ClientEvent.AccountData, pushRules);
        });
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("lists each room with its level as a value to change in place", async () => {
        const setLevel = vi.fn();
        vi.spyOn(DMRoomMap, "shared").mockReturnValue({ getUserIdForRoomId: () => undefined } as unknown as DMRoomMap);
        vi.mocked(useNotificationState).mockImplementation((r) => [levels[r.roomId] ?? undefined, setLevel]);
        render(<RoomNotificationExceptionsDialog rooms={[mentions, muted]} onFinished={vi.fn()} />);

        expect(screen.getByRole("dialog", { name: "Rooms with their own setting" })).toBeInTheDocument();
        const rows = screen.getAllByRole("button", { name: /^(Announcements|Muted room)/ });
        expect(rows.map((row) => row.textContent)).toEqual([
            expect.stringContaining("AnnouncementsMentions and keywords"),
            expect.stringContaining("Muted roomMute"),
        ]);

        await userEvent.click(rows[1]);
        expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
            "Default",
            "All messages",
            "Mentions and keywords",
            "Mute",
        ]);
        await userEvent.click(screen.getByRole("menuitemradio", { name: "Default" }));

        expect(setLevel).toHaveBeenCalledWith(RoomNotifState.AllMessages);
    });
});
