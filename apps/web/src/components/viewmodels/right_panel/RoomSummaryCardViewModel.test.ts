/*
 * Copyright 2025 New Vector Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { type MatrixClient, type Room, RoomMember } from "matrix-js-sdk/src/matrix";
import { act, renderHook, waitFor } from "test-utils-rtl";
import { mkStubRoom, stubClient, withClientContextRenderOptions } from "test-utils";

import { useRoomSummaryCardViewModel } from "./RoomSummaryCardViewModel";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { DefaultTagID } from "../../../stores/room-list-v3/skip-list/tag";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../../../stores/right-panel/RightPanelStorePhases";
import Modal from "../../../Modal";
import { ShareDialog } from "../../views/dialogs/ShareDialog";
import ExportDialog from "../../views/dialogs/ExportDialog";
import { PollHistoryDialog } from "../../views/dialogs/PollHistoryDialog";
import { ReportRoomDialog } from "../../views/dialogs/ReportRoomDialog";
import { inviteToRoom } from "../../../utils/room/inviteToRoom";
import DMRoomMap from "../../../utils/DMRoomMap";
import * as hooks from "../../../hooks/useAccountData";
import * as WithPresenceIndicator from "../../views/avatars/WithPresenceIndicator";
import * as getTagsForRoomUtils from "../../../utils/room/getTagsForRoom";

vi.mock("../../../utils/room/inviteToRoom", () => ({
    inviteToRoom: vi.fn(),
}));

describe("useRoomSummaryCardViewModel", () => {
    let matrixClient: MatrixClient;
    let room: Room;
    let permalinkCreator: any;

    beforeEach(() => {
        matrixClient = stubClient();
        room = mkStubRoom("roomId", "roomName", matrixClient);
        permalinkCreator = {};

        DMRoomMap.setShared({
            getUserIdForRoomId: vi.fn(),
        } as unknown as DMRoomMap);

        vi.spyOn(getTagsForRoomUtils, "getTagsForRoom").mockReturnValue([]);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    function render() {
        return renderHook(
            () => useRoomSummaryCardViewModel(room, permalinkCreator),
            withClientContextRenderOptions(matrixClient),
        );
    }

    it("should return correct initial state", () => {
        const { result } = render();

        expect(result.current.isDirectMessage).toBe(false);
        expect(result.current.isRoomEncrypted).toBe(false);
        expect(result.current.isVideoRoom).toBe(false);
        expect(result.current.isFavorite).toBe(false);
        expect(result.current.pinCount).toBe(0);
    });

    it("should handle room members click", () => {
        const spy = vi.spyOn(RightPanelStore.instance, "pushCard");
        const { result } = render();

        result.current.onRoomMembersClick();
        expect(spy).toHaveBeenCalledWith({ phase: RightPanelPhases.MemberList }, true);
    });

    it("should handle room settings click", () => {
        const spy = vi.spyOn(defaultDispatcher, "dispatch").mockImplementation(() => {});
        const { result } = render();

        result.current.onRoomSettingsClick(new Event("click"));
        expect(spy).toHaveBeenCalledWith({ action: "open_room_settings" });
    });

    it("should handle leave room click", () => {
        const spy = vi.spyOn(defaultDispatcher, "dispatch").mockImplementation(() => {});
        const { result } = render();

        result.current.onLeaveRoomClick();
        expect(spy).toHaveBeenCalledWith({
            action: "leave_room",
            room_id: room.roomId,
        });
    });

    it("should handle room files click", () => {
        const spy = vi.spyOn(RightPanelStore.instance, "pushCard");
        const { result } = render();

        result.current.onRoomFilesClick();
        expect(spy).toHaveBeenCalledWith({ phase: RightPanelPhases.FilePanel }, true);
    });

    it("should handle room extensions click", () => {
        const spy = vi.spyOn(RightPanelStore.instance, "pushCard");
        const { result } = render();

        result.current.onRoomExtensionsClick();
        expect(spy).toHaveBeenCalledWith({ phase: RightPanelPhases.Extensions }, true);
    });

    it("should handle room pins click", () => {
        const spy = vi.spyOn(RightPanelStore.instance, "pushCard");
        const { result } = render();

        result.current.onRoomPinsClick();
        expect(spy).toHaveBeenCalledWith({ phase: RightPanelPhases.PinnedMessages }, true);
    });

    it("should handle room invite click", () => {
        const { result } = render();

        result.current.onInviteToRoomClick();
        expect(inviteToRoom).toHaveBeenCalledWith(room);
    });

    describe("action that trigger a dialog", () => {
        let createDialogSpy: Mock;

        beforeEach(() => {
            createDialogSpy = vi.spyOn(Modal, "createDialog").mockImplementation(
                () =>
                    ({
                        finished: Promise.resolve([false]),
                        close: vi.fn(),
                    }) as any,
            ) as unknown as Mock;
        });

        afterEach(() => {
            createDialogSpy.mockRestore();
        });

        it("should handle room export click", async () => {
            const { result } = render();

            await act(async () => {
                await result.current.onRoomExportClick();
            });
            expect(createDialogSpy).toHaveBeenCalledWith(ExportDialog, { room });
        });

        it("should handle room poll history click", async () => {
            const { result } = render();

            await act(async () => {
                await result.current.onRoomPollHistoryClick();
            });
            expect(createDialogSpy).toHaveBeenCalledWith(PollHistoryDialog, {
                room,
                matrixClient,
                permalinkCreator,
            });
        });

        it("should handle room report click", async () => {
            const { result } = render();

            await act(async () => {
                await result.current.onReportRoomClick();
            });

            expect(createDialogSpy).toHaveBeenCalledWith(ReportRoomDialog, { roomId: room.roomId });
        });

        it("should handle share room click", async () => {
            const { result } = render();

            await act(async () => {
                await result.current.onShareRoomClick();
            });

            expect(createDialogSpy).toHaveBeenCalledWith(ShareDialog, {
                target: room,
            });
        });
    });

    describe("favorite room state", () => {
        it("should identify favorite rooms", () => {
            vi.spyOn(getTagsForRoomUtils, "getTagsForRoom").mockReturnValue([DefaultTagID.Favourite]);
            const { result } = render();

            expect(result.current.isFavorite).toBe(true);
        });

        it("should identify non-favorite rooms", () => {
            vi.spyOn(getTagsForRoomUtils, "getTagsForRoom").mockReturnValue([]);
            const { result } = render();

            expect(result.current.isFavorite).toBe(false);
        });
    });

    describe("direct message state", () => {
        it("should identify direct message rooms", async () => {
            // Mock the direct rooms account data
            const directRoomsList = {
                "@user:domain.com": [room.roomId],
            };
            // Mock the useAccountData hook result
            vi.spyOn(hooks, "useAccountData").mockReturnValue(directRoomsList);

            const { result } = render();

            await waitFor(() => {
                expect(result.current.isDirectMessage).toBe(true);
            });
        });

        it("should identify non-direct message rooms", async () => {
            // Mock the direct rooms account data
            const directRoomsList = {};
            // Mock the useAccountData hook result
            vi.spyOn(hooks, "useAccountData").mockReturnValue(directRoomsList);

            const { result } = render();

            await waitFor(() => {
                expect(result.current.isDirectMessage).toBe(false);
            });
        });
    });

    describe("people", () => {
        it("are left to the room header, which has a button for them", () => {
            vi.spyOn(WithPresenceIndicator, "useDmMember").mockReturnValue(null);
            const { result } = render();

            expect(result.current.showPeople).toBe(false);
        });

        it("are listed in a DM, where the room header has no button for them", () => {
            vi.spyOn(WithPresenceIndicator, "useDmMember").mockReturnValue(
                new RoomMember(room.roomId, "@bob:example.org"),
            );
            const { result } = render();

            expect(result.current.showPeople).toBe(true);
        });
    });
});
