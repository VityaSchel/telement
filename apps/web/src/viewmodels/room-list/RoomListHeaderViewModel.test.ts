/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

// @vitest-environment happy-dom

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    ClientEvent,
    JoinRule,
    type MatrixClient,
    type Room,
    RoomEvent,
    RoomType,
    SyncState,
} from "matrix-js-sdk/src/matrix";
import { createTestClient, mkSpace, TestSDKContext } from "test-utils";

import { RoomListHeaderViewModel } from "./RoomListHeaderViewModel";
import { MetaSpace, UPDATE_HOME_BEHAVIOUR, UPDATE_SELECTED_SPACE } from "../../stores/spaces";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import SettingsStore from "../../settings/SettingsStore";
import { SortingAlgorithm } from "../../stores/room-list-v3/skip-list/sorters";
import RoomListStoreV3 from "../../stores/room-list-v3/RoomListStoreV3";
import {
    shouldShowSpaceSettings,
    showCreateNewRoom,
    showSpaceInvite,
    showSpacePreferences,
    showSpaceSettings,
} from "../../utils/space";
import { createRoom, hasCreateRoomRights } from "./utils";
import RightPanelStore from "../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../../stores/right-panel/RightPanelStorePhases";

vi.mock("../../utils/space", () => ({
    shouldShowSpaceSettings: vi.fn(),
    showCreateNewRoom: vi.fn(),
    showSpaceInvite: vi.fn(),
    showSpacePreferences: vi.fn(),
    showSpaceSettings: vi.fn(),
}));

vi.mock("./utils", () => ({
    createRoom: vi.fn(),
    hasCreateRoomRights: vi.fn(),
}));

describe("RoomListHeaderViewModel", () => {
    let matrixClient: MatrixClient;
    let mockSpace: Room;
    let vm: RoomListHeaderViewModel;
    let sdkContext: TestSDKContext;

    beforeEach(() => {
        matrixClient = createTestClient();
        sdkContext = new TestSDKContext();
        sdkContext._client = matrixClient;

        mockSpace = mkSpace(matrixClient, "!space:server");

        vi.mocked(hasCreateRoomRights).mockReturnValue(true);
        vi.mocked(shouldShowSpaceSettings).mockReturnValue(true);

        vi.spyOn(SettingsStore, "getValue").mockImplementation((settingName: string) => {
            if (settingName === "RoomList.preferredSorting") return SortingAlgorithm.Recency;
            if (settingName === "feature_video_rooms") return true;
            if (settingName === "feature_element_call_video_rooms") return true;
            return false;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vm.dispose();
    });

    describe("snapshot", () => {
        it("should compute snapshot for Home space", () => {
            vi.spyOn(sdkContext.spaceStore, "activeSpace", "get").mockReturnValue(MetaSpace.Home);
            vi.spyOn(sdkContext.spaceStore, "activeSpaceRoom", "get").mockReturnValue(null);

            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });

            const snapshot = vm.getSnapshot();
            expect(snapshot.title).toBe("Home");
            expect(snapshot.displaySpaceMenu).toBe(false);
            expect(snapshot.canCreateRoom).toBe(true);
            expect(snapshot.canCreateVideoRoom).toBe(true);
            expect(snapshot.activeSortOption).toBe("recent");
        });

        it("should compute snapshot for active space", () => {
            vi.spyOn(sdkContext.spaceStore, "activeSpace", "get").mockReturnValue(mockSpace.roomId);
            vi.spyOn(sdkContext.spaceStore, "activeSpaceRoom", "get").mockReturnValue(mockSpace);

            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });

            const snapshot = vm.getSnapshot();
            expect(snapshot.title).toBe(mockSpace.roomId);
        });

        it("should hide video room option when feature is disabled", () => {
            vi.spyOn(SettingsStore, "getValue").mockImplementation((settingName: string) => {
                if (settingName === "feature_video_rooms") return false;
                return false;
            });

            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });
            expect(vm.getSnapshot().canCreateVideoRoom).toBe(false);
        });

        it("should show alphabetical sort option when RoomList.preferredSorting is Alphabetic", () => {
            vi.spyOn(SettingsStore, "getValue").mockImplementation((settingName: string) => {
                if (settingName === "RoomList.preferredSorting") return SortingAlgorithm.Alphabetic;
                return false;
            });

            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });
            expect(vm.getSnapshot().activeSortOption).toBe("alphabetical");
        });

        it("should show invite option when space is public", () => {
            vi.spyOn(sdkContext.spaceStore, "activeSpace", "get").mockReturnValue(mockSpace.roomId);
            vi.spyOn(sdkContext.spaceStore, "activeSpaceRoom", "get").mockReturnValue(mockSpace);
            vi.spyOn(mockSpace, "getJoinRule").mockReturnValue(JoinRule.Public);

            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });
            expect(vm.getSnapshot().canInviteInSpace).toBe(true);
        });

        it("should hide invite option when user cannot invite", () => {
            vi.mocked(mockSpace.canInvite).mockReturnValue(false);

            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });
            expect(vm.getSnapshot().canInviteInSpace).toBe(false);
        });

        it("should hide space settings when user cannot access them", () => {
            vi.spyOn(sdkContext.spaceStore, "activeSpace", "get").mockReturnValue(mockSpace.roomId);
            vi.mocked(shouldShowSpaceSettings).mockReturnValue(false);

            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });
            expect(vm.getSnapshot().canAccessSpaceSettings).toBe(false);
        });
    });

    describe("event listeners", () => {
        it.each([UPDATE_SELECTED_SPACE, UPDATE_HOME_BEHAVIOUR])(
            "should update snapshot when %s event is emitted",
            (event) => {
                vi.spyOn(sdkContext.spaceStore, "activeSpace", "get").mockReturnValue(MetaSpace.Home);
                vi.spyOn(sdkContext.spaceStore, "activeSpaceRoom", "get").mockReturnValue(null);

                vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });

                vi.spyOn(sdkContext.spaceStore, "activeSpace", "get").mockReturnValue(mockSpace.roomId);
                vi.spyOn(sdkContext.spaceStore, "activeSpaceRoom", "get").mockReturnValue(mockSpace);
                sdkContext.spaceStore.emit(event);

                expect(vm.getSnapshot().title).toBe(mockSpace.roomId);
            },
        );

        it("should update snapshot when space name changes", () => {
            vi.spyOn(sdkContext.spaceStore, "activeSpace", "get").mockReturnValue(mockSpace.roomId);
            vi.spyOn(sdkContext.spaceStore, "activeSpaceRoom", "get").mockReturnValue(mockSpace);

            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });

            mockSpace.name = "new name";
            mockSpace.emit(RoomEvent.Name, mockSpace);

            expect(vm.getSnapshot().title).toBe("new name");
        });

        /** Moves the client to a sync state, as the SDK does: the state changes, then the event says so. */
        function emitSyncState(syncState: SyncState, prevState: SyncState): void {
            vi.mocked(matrixClient.getSyncState).mockReturnValue(syncState);
            matrixClient.emit(ClientEvent.Sync, syncState, prevState);
        }

        it("should show no sync status while syncing", () => {
            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });

            expect(vm.getSnapshot().syncStatus).toBeUndefined();
        });

        it("should start with Updating while the first sync after a reload is pending", () => {
            vi.mocked(matrixClient.getSyncState).mockReturnValue(SyncState.Prepared);

            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });

            expect(vm.getSnapshot().syncStatus).toBe("updating");
        });

        it.each([
            [SyncState.Prepared, "updating"],
            [SyncState.Reconnecting, "updating"],
            [SyncState.Catchup, "updating"],
            [SyncState.Error, "waiting_for_network"],
            [SyncState.Syncing, undefined],
            [SyncState.Stopped, undefined],
        ])("should show the %s sync state as %s", (syncState, syncStatus) => {
            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });

            emitSyncState(SyncState.Error, SyncState.Syncing);
            emitSyncState(syncState, SyncState.Error);

            expect(vm.getSnapshot().syncStatus).toBe(syncStatus);
        });

        it("should stop following the sync state once disposed", () => {
            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });
            vm.dispose();

            emitSyncState(SyncState.Error, SyncState.Syncing);

            expect(vm.getSnapshot().syncStatus).toBeUndefined();
        });
    });

    describe("actions", () => {
        beforeEach(() => {
            vi.spyOn(sdkContext.spaceStore, "activeSpace", "get").mockReturnValue(mockSpace.roomId);
            vi.spyOn(sdkContext.spaceStore, "activeSpaceRoom", "get").mockReturnValue(mockSpace);
        });

        it("should fire CreateChat action when createChatRoom is called", () => {
            const fireSpy = vi.spyOn(defaultDispatcher, "fire");
            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });

            vm.createChatRoom(new Event("click"));
            expect(fireSpy).toHaveBeenCalledWith(Action.CreateChat);
        });

        it("should call createRoom with active space when in a space", () => {
            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });
            vm.createRoom(new Event("click"));

            expect(createRoom).toHaveBeenCalledWith(mockSpace);
        });

        it("should show create video room dialog for space when createVideoRoom is called", () => {
            vi.spyOn(SettingsStore, "getValue").mockImplementation((settingName: string) => {
                if (settingName === "feature_element_call_video_rooms") return false;
                return false;
            });

            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });
            vm.createVideoRoom();
            expect(showCreateNewRoom).toHaveBeenCalledWith(mockSpace, RoomType.ElementVideo);
        });

        it("should use UnstableCall type when element_call_video_rooms is enabled", () => {
            vi.spyOn(sdkContext.spaceStore, "activeSpaceRoom", "get").mockReturnValue(null);

            const dispatchSpy = vi.spyOn(defaultDispatcher, "dispatch");
            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });
            vm.createVideoRoom();

            expect(dispatchSpy).toHaveBeenCalledWith({
                action: Action.CreateRoom,
                type: RoomType.UnstableCall,
            });
        });

        it("should dispatch ViewRoom action when openSpaceHome is called", () => {
            const dispatchSpy = vi.spyOn(defaultDispatcher, "dispatch");
            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });
            vm.openSpaceHome();

            expect(dispatchSpy).toHaveBeenCalledWith({
                action: Action.ViewRoom,
                room_id: "!space:server",
            });
        });

        describe("openSpaceInfo (Telement)", () => {
            beforeEach(() => {
                RightPanelStore.instance.reset();
            });

            afterEach(() => {
                RightPanelStore.instance.reset();
            });

            it("opens the space's home with the space's own room info in the right panel", () => {
                const dispatchSpy = vi.spyOn(defaultDispatcher, "dispatch");
                RightPanelStore.instance.setCard({ phase: RightPanelPhases.MemberList }, true, mockSpace.roomId);
                vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });

                vm.openSpaceInfo();

                expect(dispatchSpy).toHaveBeenCalledWith({ action: Action.ViewRoom, room_id: mockSpace.roomId });
                expect(RightPanelStore.instance.isOpenForRoom(mockSpace.roomId)).toBe(true);
                expect(RightPanelStore.instance.currentCardForRoom(mockSpace.roomId).phase).toBe(
                    RightPanelPhases.RoomSummary,
                );
            });

            it("does nothing without an active space", () => {
                vi.spyOn(sdkContext.spaceStore, "activeSpaceRoom", "get").mockReturnValue(null);
                const dispatchSpy = vi.spyOn(defaultDispatcher, "dispatch");
                vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });

                vm.openSpaceInfo();

                expect(dispatchSpy).not.toHaveBeenCalled();
                expect(RightPanelStore.instance.isOpenForRoom(mockSpace.roomId)).toBe(false);
            });
        });

        it("should show space invite dialog when inviteInSpace is called", () => {
            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });
            vm.inviteInSpace();

            expect(showSpaceInvite).toHaveBeenCalledWith(mockSpace);
        });

        it("should show space preferences dialog when openSpacePreferences is called", () => {
            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });
            vm.openSpacePreferences();

            expect(showSpacePreferences).toHaveBeenCalledWith(mockSpace);
        });

        it("should show space settings dialog when openSpaceSettings is called", () => {
            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });
            vm.openSpaceSettings();

            expect(showSpaceSettings).toHaveBeenCalledWith(mockSpace);
        });

        it.each([
            ["recent" as const, SortingAlgorithm.Recency],
            ["alphabetical" as const, SortingAlgorithm.Alphabetic],
            ["unread-first" as const, SortingAlgorithm.Unread],
        ])("should resort when sort is called with '%s'", (option, expectedAlgorithm) => {
            const resortSpy = vi.spyOn(RoomListStoreV3.instance, "resort").mockImplementation(vi.fn());
            vm = new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore });
            vm.sort(option);
            expect(resortSpy).toHaveBeenCalledWith(expectedAlgorithm);
        });
    });
});
