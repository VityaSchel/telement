/*
 * Copyright 2025 New Vector Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

// @vitest-environment happy-dom

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { KnownMembership, type MatrixClient, type Room } from "matrix-js-sdk/src/matrix";
import { waitFor } from "test-utils-rtl";
import { createTestClient, flushPromises, mkStubRoom, stubClient, TestSDKContext } from "test-utils";

import RoomListStoreV3, { RoomListStoreV3Event } from "../../stores/room-list-v3/RoomListStoreV3";
import { FilterEnum } from "../../stores/room-list-v3/skip-list/filters";
import { DefaultTagID } from "../../stores/room-list-v3/skip-list/tag";
import dispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import { SDKContextClass } from "../../contexts/SDKContextClass";
import DMRoomMap from "../../utils/DMRoomMap";
import { RoomListViewModel } from "./RoomListViewModel";
import { type RoomListItemViewModel } from "./RoomListItemViewModel";
import SettingsStore from "../../settings/SettingsStore";
import { SettingLevel } from "../../settings/SettingLevel";
import { PreviewRoomListItemViewModel } from "./PreviewRoomListItemViewModel";
import { type RoomViewStore } from "../../stores/RoomViewStore";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import { hasCreateRoomRights } from "./utils";
import { RoomNotificationStateStore } from "../../stores/notifications/RoomNotificationStateStore";
import { type RoomNotificationState } from "../../stores/notifications/RoomNotificationState";

vi.mock("./utils", () => ({
    hasCreateRoomRights: vi.fn().mockReturnValue(false),
    hasAccessToOptionsMenu: vi.fn().mockReturnValue(true),
    hasAccessToNotificationMenu: vi.fn().mockReturnValue(true),
}));

describe("RoomListViewModel", () => {
    let matrixClient: MatrixClient;
    let sdkContext: TestSDKContext;
    let room1: Room;
    let room2: Room;
    let room3: Room;
    let viewModel: RoomListViewModel;

    beforeEach(() => {
        matrixClient = createTestClient();

        sdkContext = new TestSDKContext();
        sdkContext._client = matrixClient;
        room1 = mkStubRoom("!room1:server", "Room 1", matrixClient);
        room2 = mkStubRoom("!room2:server", "Room 2", matrixClient);
        room3 = mkStubRoom("!room3:server", "Room 3", matrixClient);

        // Setup DMRoomMap
        const dmRoomMap = {
            getUserIdForRoomId: vi.fn().mockReturnValue(null),
        } as unknown as DMRoomMap;
        DMRoomMap.setShared(dmRoomMap);

        vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
            spaceId: "home",
            rooms: [room1, room2, room3],
        });

        vi.spyOn(RoomListStoreV3.instance, "isLoadingRooms", "get").mockReturnValue(false);
        vi.spyOn(SDKContextClass.instance.spaceStore, "activeSpaceRoom", "get").mockReturnValue(null);
        vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue(null);

        vi.mocked(hasCreateRoomRights).mockReturnValue(false);
    });

    afterEach(() => {
        viewModel?.dispose();
        vi.restoreAllMocks();
    });

    describe("Initialization", () => {
        it("should initialize with correct snapshot", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            const snapshot = viewModel.getSnapshot();
            expect(snapshot.roomIds).toEqual(["!room1:server", "!room2:server", "!room3:server"]);
            expect(snapshot.isRoomListEmpty).toBe(false);
            expect(snapshot.isLoadingRooms).toBe(false);
            expect(snapshot.roomListState.spaceId).toBe("home");
            expect(snapshot.filterIds.length).toBeGreaterThan(0);
            expect(snapshot.activeFilterId).toBeUndefined();
        });

        it("should initialize with empty room list", () => {
            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "home",
                rooms: [],
            });

            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            expect(viewModel.getSnapshot().roomIds).toEqual([]);
            expect(viewModel.getSnapshot().isRoomListEmpty).toBe(true);
        });

        it("should set canCreateRoom based on user rights", () => {
            vi.mocked(hasCreateRoomRights).mockReturnValue(true);
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            expect(viewModel.getSnapshot().canCreateRoom).toBe(true);
        });
    });

    describe("Room list updates", () => {
        it("should update room list when ListsUpdate event fires", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            const newRoom = mkStubRoom("!room4:server", "Room 4", matrixClient);
            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "home",
                rooms: [room1, room2, room3, newRoom],
            });

            RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsUpdate);

            expect(viewModel.getSnapshot().roomIds).toEqual([
                "!room1:server",
                "!room2:server",
                "!room3:server",
                "!room4:server",
            ]);
        });

        it("should update loading state when ListsLoaded event fires", () => {
            vi.spyOn(RoomListStoreV3.instance, "isLoadingRooms", "get").mockReturnValue(true);
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            expect(viewModel.getSnapshot().isLoadingRooms).toBe(true);

            RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsLoaded);

            expect(viewModel.getSnapshot().isLoadingRooms).toBe(false);
        });

        // This test ensures that the room list item vms are preserved when the room list is changing
        it("should keep existing view model when ListsUpdate event fires", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            // Create view model for room1
            const room1VM = viewModel.getRoomItemViewModel("!room1:server");
            expect(room1VM).toBeDefined();

            RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsUpdate);

            // View model should be still valid
            expect(room1VM!.isDisposed).toBe(false);
        });
    });

    describe("Space switching", () => {
        it("should update room list when space changes", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            const spaceRoomList = [room1, room2];

            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "!space:server",
                rooms: spaceRoomList,
            });

            vi.spyOn(SDKContextClass.instance.spaceStore, "getLastSelectedRoomIdForSpace").mockReturnValue(
                "!room1:server",
            );

            RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsUpdate);

            expect(viewModel.getSnapshot().roomListState.spaceId).toBe("!space:server");
            expect(viewModel.getSnapshot().roomIds).toEqual(["!room1:server", "!room2:server"]);
        });

        it("should clear view models when space changes", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            // Get view models for visible rooms
            const vm1 = viewModel.getRoomItemViewModel("!room1:server")!;
            const vm2 = viewModel.getRoomItemViewModel("!room2:server")!;

            const disposeSpy1 = vi.spyOn(vm1, "dispose");
            const disposeSpy2 = vi.spyOn(vm2, "dispose");

            // Change space
            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "!space:server",
                rooms: [room3],
            });

            RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsUpdate);

            expect(disposeSpy1).toHaveBeenCalled();
            expect(disposeSpy2).toHaveBeenCalled();
        });

        it("should clear roomsMap when space changes and repopulate with new rooms", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            const newSpaceRoom = mkStubRoom("!spaceroom:server", "Space Room", matrixClient);

            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "!space:server",
                rooms: [newSpaceRoom],
            });
            vi.spyOn(SDKContextClass.instance.spaceStore, "getLastSelectedRoomIdForSpace").mockReturnValue(null);

            RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsUpdate);

            // New space room should be accessible
            expect(() => viewModel.getRoomItemViewModel("!spaceroom:server")).not.toThrow();
            // Old rooms from the home space should not be accessible
            expect(viewModel.getRoomItemViewModel("!room1:server")).toBeUndefined();
        });
    });

    describe("Active room tracking", () => {
        it("should update active room index when room is selected", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue("!room2:server");

            dispatcher.dispatch({
                action: Action.ActiveRoomChanged,
                oldRoomId: "!room1:server",
                newRoomId: "!room2:server",
            });

            // Use setTimeout to allow the dispatcher callback to run
            await flushPromises();
            expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(1);
        });

        it("should return undefined active room index when no room is selected", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue(null);

            dispatcher.dispatch({
                action: Action.ActiveRoomChanged,
                oldRoomId: "!room1:server",
                newRoomId: null,
            });

            // Use setTimeout to allow the dispatcher callback to run
            await flushPromises();
            expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBeUndefined();
        });

        describe("Preview item", () => {
            const previewRoomId = "!preview:server";
            const roomViewStore = (): RoomViewStore => SDKContextClass.instance.roomViewStore;

            function createViewModel(): RoomListViewModel {
                return new RoomListViewModel({
                    client: matrixClient,
                    spaceStore: SDKContextClass.instance.spaceStore,
                    roomViewStore: roomViewStore(),
                });
            }

            async function openRoom(roomId: string): Promise<void> {
                vi.spyOn(roomViewStore(), "getRoomId").mockReturnValue(roomId);
                dispatcher.dispatch({ action: Action.ActiveRoomChanged, oldRoomId: null, newRoomId: roomId });
                await flushPromises();
            }

            it("shows a room the user left first until another room is opened", async () => {
                const leftRoom = mkStubRoom(previewRoomId, "Left room", matrixClient);
                vi.mocked(leftRoom.getMyMembership).mockReturnValue(KnownMembership.Leave);
                vi.mocked(matrixClient.getRoom).mockImplementation((roomId) =>
                    roomId === previewRoomId ? leftRoom : null,
                );
                viewModel = createViewModel();

                await openRoom(previewRoomId);
                expect(viewModel.getSnapshot().roomIds).toEqual([
                    previewRoomId,
                    "!room1:server",
                    "!room2:server",
                    "!room3:server",
                ]);
                expect(viewModel.roomIds[0]).toBe(previewRoomId);
                expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(0);
                const item = viewModel.getRoomItemViewModel(previewRoomId);
                expect(item).toBeInstanceOf(PreviewRoomListItemViewModel);
                expect(item?.getSnapshot().name).toBe("Left room");

                await openRoom("!room2:server");
                expect(viewModel.getSnapshot().roomIds).not.toContain(previewRoomId);
                expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(1);
            });

            it("counts the preview item when scrolling to a room and to unread activity", async () => {
                stubClient();
                const leftRoom = mkStubRoom(previewRoomId, "Left room", matrixClient);
                vi.mocked(leftRoom.getMyMembership).mockReturnValue(KnownMembership.Leave);
                vi.mocked(matrixClient.getRoom).mockImplementation((roomId) =>
                    roomId === previewRoomId ? leftRoom : null,
                );
                viewModel = createViewModel();
                const scrollSpy = vi.fn();
                viewModel.setScrollToIndex(scrollSpy);
                await openRoom(previewRoomId);

                // Entry space: [preview(0), room1(1), room2(2), room3(3)]
                dispatcher.dispatch({
                    action: Action.ViewRoom,
                    room_id: "!room2:server",
                    show_room_tile: true,
                });
                await waitFor(() => expect(scrollSpy).toHaveBeenCalledWith(2));

                // room3 is the first row below the fold
                vi.spyOn(RoomNotificationStateStore.instance, "getRoomState").mockImplementation(
                    (room) => ({ hasUnreadCount: room === room3 }) as unknown as RoomNotificationState,
                );
                viewModel.updateVisibleFold(2);
                expect(viewModel.getSnapshot().toast).toBe("unread_activity");
                viewModel.scrollToUnreadActivity();
                expect(scrollSpy).toHaveBeenLastCalledWith(3);

                // Alt+ArrowDown moves from the preview room to the next room
                const dispatchSpy = vi.spyOn(dispatcher, "dispatch");
                dispatcher.dispatch({ action: Action.ViewRoomDelta, delta: 1, unread: false });
                dispatchSpy.mockImplementation(() => {});
                await flushPromises();
                expect(dispatchSpy).toHaveBeenCalledWith(
                    expect.objectContaining({ action: Action.ViewRoom, room_id: "!room1:server" }),
                );
            });

            it("shows the room below the pinned rooms", async () => {
                const leftRoom = mkStubRoom(previewRoomId, "Left room", matrixClient);
                vi.mocked(leftRoom.getMyMembership).mockReturnValue(KnownMembership.Leave);
                vi.mocked(matrixClient.getRoom).mockImplementation((roomId) =>
                    roomId === previewRoomId ? leftRoom : null,
                );
                room1.tags = { [DefaultTagID.Favourite]: { order: 0.5 } };
                room2.tags = { [DefaultTagID.Favourite]: { order: 0.5 } };
                viewModel = createViewModel();

                await openRoom(previewRoomId);
                const roomIds = ["!room1:server", "!room2:server", previewRoomId, "!room3:server"];
                expect(viewModel.getSnapshot().roomIds).toEqual(roomIds);
                expect(viewModel.roomIds).toEqual(roomIds);
                expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(2);

                // Alt+ArrowDown moves from the preview room to the first room that isn't pinned
                const dispatchSpy = vi.spyOn(dispatcher, "dispatch");
                dispatcher.dispatch({ action: Action.ViewRoomDelta, delta: 1, unread: false });
                dispatchSpy.mockImplementation(() => {});
                await flushPromises();
                expect(dispatchSpy).toHaveBeenCalledWith(
                    expect.objectContaining({ action: Action.ViewRoom, room_id: "!room3:server" }),
                );
            });

            it("shows a room from its summary until it enters the room list", async () => {
                // The client doesn't know the room, so RoomView gets its summary
                vi.mocked(matrixClient.getRoom).mockReturnValue(null);
                viewModel = createViewModel();
                await openRoom(previewRoomId);
                expect(viewModel.getSnapshot().roomIds).not.toContain(previewRoomId);

                // The summary arrives after the room has been opened
                vi.spyOn(roomViewStore(), "getRoomSummary").mockReturnValue({
                    room_id: previewRoomId,
                    name: "Knock room",
                    membership: KnownMembership.Leave,
                    num_joined_members: 1,
                    world_readable: false,
                    guest_can_join: false,
                });
                roomViewStore().emit(UPDATE_EVENT);
                expect(viewModel.getSnapshot().roomIds[0]).toBe(previewRoomId);
                expect(viewModel.getRoomItemViewModel(previewRoomId)?.getSnapshot().name).toBe("Knock room");

                // The placeholder room has the same pending event ordering as the client's rooms,
                // so the unread checks below the fold can read its pending events
                expect(() => (viewModel as any).previewRoom.getPendingEvents()).not.toThrow();

                // The user has knocked, so the room is now in the room list
                const knockRoom = mkStubRoom(previewRoomId, "Knock room", matrixClient);
                vi.mocked(knockRoom.getMyMembership).mockReturnValue(KnownMembership.Knock);
                vi.mocked(matrixClient.getRoom).mockReturnValue(knockRoom);
                vi.mocked(RoomListStoreV3.instance.getSortedRoomsInActiveSpace).mockReturnValue({
                    spaceId: "home",
                    rooms: [knockRoom, room1, room2, room3],
                });
                RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsUpdate);
                expect(viewModel.getSnapshot().roomIds).toEqual([
                    previewRoomId,
                    "!room1:server",
                    "!room2:server",
                    "!room3:server",
                ]);
                expect(viewModel.getRoomItemViewModel(previewRoomId)).not.toBeInstanceOf(PreviewRoomListItemViewModel);
            });

            it("doesn't show a joined room", async () => {
                const joinedRoom = mkStubRoom(previewRoomId, "Joined room", matrixClient);
                vi.mocked(matrixClient.getRoom).mockReturnValue(joinedRoom);
                vi.spyOn(roomViewStore(), "getRoomSummary").mockReturnValue({
                    room_id: previewRoomId,
                    membership: KnownMembership.Join,
                    num_joined_members: 1,
                    world_readable: false,
                    guest_can_join: false,
                });
                viewModel = createViewModel();

                await openRoom(previewRoomId);
                expect(viewModel.getSnapshot().roomIds).not.toContain(previewRoomId);
                expect(viewModel.getRoomItemViewModel(previewRoomId)).toBeUndefined();
            });
        });
    });

    describe("Sticky room behavior", () => {
        it("should keep selected room at same index when room list updates", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            // Select room at index 1
            vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue("!room2:server");
            dispatcher.dispatch({
                action: Action.ActiveRoomChanged,
                newRoomId: "!room2:server",
            });

            await flushPromises();
            expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(1);

            // Simulate room list update that would move room2 to front
            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "home",
                rooms: [room2, room1, room3], // room2 moved to front
            });

            RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsUpdate);

            // Active room should still be at index 1 (sticky behavior)
            expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(1);
            expect(viewModel.getSnapshot().roomIds[1]).toBe("!room2:server");
        });

        it("should not apply sticky behavior when user changes rooms", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            // Select room at index 1
            vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue("!room2:server");
            dispatcher.dispatch({
                action: Action.ActiveRoomChanged,
                newRoomId: "!room2:server",
            });

            await flushPromises();

            // User switches to room3
            vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue("!room3:server");
            dispatcher.dispatch({
                action: Action.ActiveRoomChanged,
                oldRoomId: "!room2:server",
                newRoomId: "!room3:server",
            });

            await flushPromises();
            expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(2);
        });

        it("should not keep the selected room at its old index when rooms above were removed", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            // Select room at index 2
            vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue("!room3:server");
            dispatcher.dispatch({
                action: Action.ActiveRoomChanged,
                newRoomId: "!room3:server",
            });
            await flushPromises();
            expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(2);

            // The list shrinks so that index 2 no longer exists
            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "home",
                rooms: [room3, room1],
            });
            RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsUpdate);

            expect(viewModel.getSnapshot().roomIds).toEqual(["!room3:server", "!room1:server"]);
            expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(0);
        });

        it("should not apply sticky behavior when the selected room left the list", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue("!room2:server");
            dispatcher.dispatch({
                action: Action.ActiveRoomChanged,
                newRoomId: "!room2:server",
            });
            await flushPromises();

            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "home",
                rooms: [room3, room1],
            });
            RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsUpdate);

            expect(viewModel.getSnapshot().roomIds).toEqual(["!room3:server", "!room1:server"]);
            expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBeUndefined();
        });

        describe("with pinned rooms", () => {
            function pin(...rooms: Room[]): void {
                for (const room of rooms) room.tags = { [DefaultTagID.Favourite]: { order: 0.5 } };
            }

            async function openRoom(roomId: string): Promise<void> {
                vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue(roomId);
                dispatcher.dispatch({ action: Action.ActiveRoomChanged, newRoomId: roomId });
                await flushPromises();
            }

            function updateList(rooms: Room[]): void {
                vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                    spaceId: "home",
                    rooms,
                });
                RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsUpdate);
            }

            beforeEach(() => {
                viewModel = new RoomListViewModel({
                    client: matrixClient,
                    spaceStore: SDKContextClass.instance.spaceStore,
                    roomViewStore: SDKContextClass.instance.roomViewStore,
                });
            });

            it("should not keep the selected room above a room that was pinned", async () => {
                await openRoom("!room1:server");
                expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(0);

                pin(room3);
                updateList([room3, room1, room2]);

                expect(viewModel.getSnapshot().roomIds).toEqual(["!room3:server", "!room1:server", "!room2:server"]);
                expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(1);
            });

            it("should move the selected room up when it is pinned", async () => {
                await openRoom("!room3:server");

                pin(room3);
                updateList([room3, room1, room2]);

                expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(0);
            });

            it("should move the selected room down when it is unpinned", async () => {
                pin(room1, room2);
                updateList([room1, room2, room3]);
                await openRoom("!room1:server");

                room1.tags = {};
                updateList([room2, room1, room3]);

                expect(viewModel.getSnapshot().roomIds).toEqual(["!room2:server", "!room1:server", "!room3:server"]);
                expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(1);
            });

            it("should keep the selected room at its index among the pinned rooms", async () => {
                pin(room1, room2);
                updateList([room1, room2, room3]);
                await openRoom("!room2:server");

                updateList([room2, room1, room3]);

                expect(viewModel.getSnapshot().roomIds).toEqual(["!room1:server", "!room2:server", "!room3:server"]);
                expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(1);
            });

            it("should keep the selected room at its index below the pinned rooms", async () => {
                const room4 = mkStubRoom("!room4:server", "Room 4", matrixClient);
                pin(room1);
                updateList([room1, room2, room3, room4]);
                await openRoom("!room4:server");

                updateList([room1, room4, room2, room3]);

                expect(viewModel.getSnapshot().roomIds).toEqual([
                    "!room1:server",
                    "!room2:server",
                    "!room3:server",
                    "!room4:server",
                ]);
                expect(viewModel.getSnapshot().roomListState.activeRoomIndex).toBe(3);
            });
        });
    });

    describe("Filters", () => {
        it("should toggle filter on", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            expect(viewModel.getSnapshot().activeFilterId).toBeUndefined();

            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "home",
                rooms: [room1],
                filterKeys: [FilterEnum.UnreadFilter],
            });

            viewModel.onToggleFilter("unread");

            expect(viewModel.getSnapshot().activeFilterId).toBe("unread");
            expect(viewModel.getSnapshot().roomIds).toEqual(["!room1:server"]);
        });

        it("should toggle filter off", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            // Turn filter on
            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "home",
                rooms: [room1],
                filterKeys: [FilterEnum.UnreadFilter],
            });
            viewModel.onToggleFilter("unread");

            expect(viewModel.getSnapshot().activeFilterId).toBe("unread");

            // Turn filter off
            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "home",
                rooms: [room1, room2, room3],
            });
            viewModel.onToggleFilter("unread");

            expect(viewModel.getSnapshot().activeFilterId).toBeUndefined();
            expect(viewModel.getSnapshot().roomIds).toEqual(["!room1:server", "!room2:server", "!room3:server"]);
        });

        it("shows the filters in order, with none for pinned rooms", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                roomViewStore: sdkContext.roomViewStore,
                spaceStore: sdkContext.spaceStore,
            });

            expect(viewModel.getSnapshot().filterIds).toEqual([
                "unread",
                "people",
                "rooms",
                "mentions",
                "invites",
                "low_priority",
            ]);
        });
    });

    describe("Room item view models", () => {
        it("should create room item view model on demand", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            const itemViewModel = viewModel.getRoomItemViewModel("!room1:server");

            expect(itemViewModel).toBeDefined();
            expect(itemViewModel!.getSnapshot().room).toBe(room1);
        });

        it("should reuse existing room item view model", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            const itemViewModel1 = viewModel.getRoomItemViewModel("!room1:server");
            const itemViewModel2 = viewModel.getRoomItemViewModel("!room1:server");

            expect(itemViewModel1).toBe(itemViewModel2);
        });

        it("should return undefined for non-existent room", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            expect(viewModel.getRoomItemViewModel("!nonexistent:server")).toBeUndefined();
        });

        it("should not throw when requesting view model for a room removed from the list but still in roomsMap", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            // Normal list update removes room2 from the list
            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "home",
                rooms: [room1, room3],
            });

            RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsUpdate);

            expect(() => viewModel.getRoomItemViewModel("!room2:server")).not.toThrow();
        });

        it("should return undefined for a room from old space after space change", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            const spaceRoom = mkStubRoom("!newroom:server", "New Room", matrixClient);

            // Space change: new space only has spaceRoom
            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "!space:server",
                rooms: [spaceRoom],
            });
            vi.spyOn(SDKContextClass.instance.spaceStore, "getLastSelectedRoomIdForSpace").mockReturnValue(null);

            RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsUpdate);

            expect(viewModel.getRoomItemViewModel("!room1:server")).toBeUndefined();
        });

        it("should recover when roomsMap is stale but roomsResult has the room", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            // Manually clear roomsMap to simulate stale cache, but keep roomsResult intact
            (viewModel as any).roomsMap.clear();

            // getRoomItemViewModel should retry by re-populating roomsMap from roomsResult
            expect(() => viewModel.getRoomItemViewModel("!room1:server")).not.toThrow();
        });

        it("should dispose view models for rooms no longer visible", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            const vm1 = viewModel.getRoomItemViewModel("!room1:server")!;
            const vm2 = viewModel.getRoomItemViewModel("!room2:server")!;
            const vm3 = viewModel.getRoomItemViewModel("!room3:server")!;

            const disposeSpy1 = vi.spyOn(vm1, "dispose");
            const disposeSpy3 = vi.spyOn(vm3, "dispose");

            // Update to show only middle room (index 1)
            viewModel.updateVisibleRooms(1, 2);

            expect(disposeSpy1).toHaveBeenCalled();
            expect(disposeSpy3).toHaveBeenCalled();

            // vm2 should still exist
            const vm2Again = viewModel.getRoomItemViewModel("!room2:server");
            expect(vm2Again).toBe(vm2);
        });
    });

    describe("Room creation", () => {
        it("should dispatch CreateChat action when createChatRoom is called", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            const dispatchSpy = vi.spyOn(dispatcher, "fire").mockImplementation(() => {});

            viewModel.createChatRoom();

            expect(dispatchSpy).toHaveBeenCalledWith(Action.CreateChat);
        });

        it("should dispatch CreateRoom action without parent space", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            const dispatchSpy = vi.spyOn(dispatcher, "dispatch").mockImplementation(() => {});

            viewModel.createRoom();

            expect(dispatchSpy).toHaveBeenCalledWith({
                action: Action.CreateRoom,
            });
        });

        it("should dispatch CreateRoom action with parent space", () => {
            const spaceRoom = mkStubRoom("!space:server", "Space", matrixClient);
            vi.spyOn(SDKContextClass.instance.spaceStore, "activeSpaceRoom", "get").mockReturnValue(spaceRoom);

            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            const dispatchSpy = vi.spyOn(dispatcher, "dispatch").mockImplementation(() => {});

            viewModel.createRoom();

            expect(dispatchSpy).toHaveBeenCalledWith({
                action: Action.CreateRoom,
                parent_space: spaceRoom,
            });
        });
    });

    describe("Keyboard navigation (ViewRoomDelta)", () => {
        beforeEach(() => {
            // stubClient sets up MatrixClientPeg which is needed when ViewRoom action is dispatched
            stubClient();
        });

        it("should navigate to next room when delta is 1", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue("!room1:server");

            const dispatchSpy = vi.spyOn(dispatcher, "dispatch");

            dispatcher.dispatch({
                action: Action.ViewRoomDelta,
                delta: 1,
                unread: false,
            });
            dispatchSpy.mockImplementation(() => {});

            await flushPromises();

            expect(dispatchSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: Action.ViewRoom,
                    room_id: "!room2:server",
                }),
            );
        });

        it("should navigate to previous room when delta is -1", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue("!room2:server");

            const dispatchSpy = vi.spyOn(dispatcher, "dispatch");

            dispatcher.dispatch({
                action: Action.ViewRoomDelta,
                delta: -1,
                unread: false,
            });
            dispatchSpy.mockImplementation(() => {});

            await flushPromises();

            expect(dispatchSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: Action.ViewRoom,
                    room_id: "!room1:server",
                }),
            );
        });

        it("should wrap around to last room when navigating backwards from first room", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue("!room1:server");

            const dispatchSpy = vi.spyOn(dispatcher, "dispatch");

            dispatcher.dispatch({
                action: Action.ViewRoomDelta,
                delta: -1,
                unread: false,
            });
            dispatchSpy.mockImplementation(() => {});

            await flushPromises();

            expect(dispatchSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: Action.ViewRoom,
                    room_id: "!room3:server",
                }),
            );
        });

        it("should not navigate when current room is not found", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue("!unknown:server");

            const dispatchSpy = vi.spyOn(dispatcher, "dispatch");
            dispatchSpy.mockClear();

            dispatcher.dispatch({
                action: Action.ViewRoomDelta,
                delta: 1,
                unread: false,
            });
            dispatchSpy.mockImplementation(() => {});

            await flushPromises();

            // Should not dispatch ViewRoom since current room wasn't found
            expect(dispatchSpy).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    action: Action.ViewRoom,
                }),
            );
        });

        it("should navigate to the first room when no room is selected and delta is 1", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue(null);

            const dispatchSpy = vi.spyOn(dispatcher, "dispatch");
            dispatchSpy.mockClear();

            dispatcher.dispatch({
                action: Action.ViewRoomDelta,
                delta: 1,
                unread: false,
            });
            dispatchSpy.mockImplementation(() => {});

            await waitFor(() =>
                expect(dispatchSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        action: Action.ViewRoom,
                        room_id: "!room1:server",
                    }),
                ),
            );
        });

        it("should navigate to the last room when no room is selected and delta is -1", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue(null);

            const dispatchSpy = vi.spyOn(dispatcher, "dispatch");

            dispatcher.dispatch({
                action: Action.ViewRoomDelta,
                delta: -1,
                unread: false,
            });

            await waitFor(() =>
                expect(dispatchSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        action: Action.ViewRoom,
                        room_id: "!room3:server",
                    }),
                ),
            );
        });

        it("should navigate to the first unread room when no room is selected", async () => {
            vi.spyOn(RoomNotificationStateStore.instance, "getRoomState").mockImplementation(
                (room) =>
                    ({
                        isUnread: room.roomId === "!room2:server",
                        on: vi.fn(),
                        off: vi.fn(),
                    }) as unknown as RoomNotificationState,
            );

            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            vi.spyOn(SDKContextClass.instance.roomViewStore, "getRoomId").mockReturnValue(null);

            const dispatchSpy = vi.spyOn(dispatcher, "dispatch");

            dispatcher.dispatch({
                action: Action.ViewRoomDelta,
                delta: 1,
                unread: true,
            });

            await waitFor(() =>
                expect(dispatchSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        action: Action.ViewRoom,
                        room_id: "!room2:server",
                    }),
                ),
            );
        });
    });

    describe("Times", () => {
        // Friday 2026-11-13, 12:00 UTC, the test setup's time zone
        const NOW = Date.UTC(2026, 10, 13, 12);
        const HOUR = 60 * 60 * 1000;

        beforeEach(() => {
            vi.useFakeTimers({ now: NOW });
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        const createViewModel = (): RoomListViewModel =>
            new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

        it("should format the times of the rooms in view again at every midnight", () => {
            viewModel = createViewModel();
            const refresh = vi.spyOn(
                viewModel.getRoomItemViewModel("!room1:server") as RoomListItemViewModel,
                "refreshTimestamp",
            );

            vi.advanceTimersByTime(12 * HOUR - 1);
            expect(refresh).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1);
            expect(refresh).toHaveBeenCalledTimes(1);
            vi.advanceTimersByTime(24 * HOUR);
            expect(refresh).toHaveBeenCalledTimes(2);
        });

        it("should format them again before midnight when a time from yesterday turns into a weekday", () => {
            // Shown as a time until 20 hours later, 19:30 today
            vi.mocked(room2.getBumpStamp).mockReturnValue(Date.UTC(2026, 10, 12, 23, 30));
            viewModel = createViewModel();
            const refresh = vi.spyOn(
                viewModel.getRoomItemViewModel("!room1:server") as RoomListItemViewModel,
                "refreshTimestamp",
            );
            viewModel.getRoomItemViewModel("!room2:server");

            vi.advanceTimersByTime(7.5 * HOUR - 1);
            expect(refresh).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1);
            expect(refresh).toHaveBeenCalledTimes(1);
            // The time has turned into a weekday, so the next change is at midnight
            vi.advanceTimersByTime(4.5 * HOUR - 1);
            expect(refresh).toHaveBeenCalledTimes(1);
            vi.advanceTimersByTime(1);
            expect(refresh).toHaveBeenCalledTimes(2);
        });

        it.each(["showTwelveHourTimestamps", "userTimezone"] as const)(
            "should format them again when the %s setting changes",
            (setting) => {
                const watchSetting = vi.spyOn(SettingsStore, "watchSetting");
                viewModel = createViewModel();
                const refresh = vi.spyOn(
                    viewModel.getRoomItemViewModel("!room1:server") as RoomListItemViewModel,
                    "refreshTimestamp",
                );

                const [, , onChange] = watchSetting.mock.calls.find(([name]) => name === setting)!;
                onChange(setting, null, SettingLevel.DEVICE, true, true);

                expect(refresh).toHaveBeenCalledTimes(1);
            },
        );

        it("should stop the timer and the setting watchers when disposed", () => {
            const unwatchSetting = vi.spyOn(SettingsStore, "unwatchSetting");
            viewModel = createViewModel();
            const timers = vi.getTimerCount();

            viewModel.dispose();

            expect(vi.getTimerCount()).toBe(timers - 1);
            expect(unwatchSetting).toHaveBeenCalledTimes(2);
        });
    });

    describe("Cleanup", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("should dispose all room item view models on dispose", () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                spaceStore: SDKContextClass.instance.spaceStore,
                roomViewStore: SDKContextClass.instance.roomViewStore,
            });

            const vm1 = viewModel.getRoomItemViewModel("!room1:server")!;
            const vm2 = viewModel.getRoomItemViewModel("!room2:server")!;

            const disposeSpy1 = vi.spyOn(vm1, "dispose");
            const disposeSpy2 = vi.spyOn(vm2, "dispose");

            viewModel.dispose();

            expect(disposeSpy1).toHaveBeenCalled();
            expect(disposeSpy2).toHaveBeenCalled();
        });

        describe("Toast", () => {
            /** Make only `room3` report an unread count, so it is the unread room below the fold. */
            const mockRoom3Unread = (): void => {
                vi.spyOn(RoomNotificationStateStore.instance, "getRoomState").mockImplementation(
                    (room) =>
                        ({
                            hasUnreadCount: room === room3,
                            on: vi.fn(),
                            off: vi.fn(),
                        }) as unknown as RoomNotificationState,
                );
            };

            it("should show the unread-activity toast when an unread room is below the fold", () => {
                mockRoom3Unread();
                viewModel = new RoomListViewModel({
                    client: matrixClient,
                    spaceStore: SDKContextClass.instance.spaceStore,
                    roomViewStore: SDKContextClass.instance.roomViewStore,
                });

                // room1/room2 visible, room3 (unread) scrolled below the fold.
                viewModel.updateVisibleFold(1);

                expect(viewModel.getSnapshot().toast).toBe("unread_activity");
            });

            it("should not show the unread-activity toast before the view reports the fold", () => {
                mockRoom3Unread();
                viewModel = new RoomListViewModel({
                    client: matrixClient,
                    spaceStore: SDKContextClass.instance.spaceStore,
                    roomViewStore: SDKContextClass.instance.roomViewStore,
                });

                expect(viewModel.getSnapshot().toast).toBeUndefined();
            });

            it("should hide the unread-activity toast once the unread room scrolls into view", () => {
                mockRoom3Unread();
                viewModel = new RoomListViewModel({
                    client: matrixClient,
                    spaceStore: SDKContextClass.instance.spaceStore,
                    roomViewStore: SDKContextClass.instance.roomViewStore,
                });
                viewModel.updateVisibleFold(1);
                expect(viewModel.getSnapshot().toast).toBe("unread_activity");

                // Every room, room3 included, is now visible.
                viewModel.updateVisibleFold(2);
                expect(viewModel.getSnapshot().toast).toBeUndefined();
            });

            it("should scroll to the unread room below the fold when the toast is clicked", () => {
                mockRoom3Unread();
                viewModel = new RoomListViewModel({
                    client: matrixClient,
                    spaceStore: SDKContextClass.instance.spaceStore,
                    roomViewStore: SDKContextClass.instance.roomViewStore,
                });
                const scrollSpy = vi.fn();
                viewModel.setScrollToIndex(scrollSpy);
                viewModel.updateVisibleFold(1);

                viewModel.scrollToUnreadActivity();

                expect(scrollSpy).toHaveBeenCalledWith(2);
            });
        });
    });

    describe("scrolling the active room into view", () => {
        beforeEach(() => {
            // Dispatching ViewRoom is also handled by the global RoomViewStore, which calls
            // MatrixClientPeg.safeGet(); stubClient sets up the peg so that doesn't throw.
            stubClient();
        });

        it.each([
            [
                "a ViewRoom dispatch asking for the tile",
                { action: Action.ViewRoom, room_id: "!room2:server", show_room_tile: true },
            ],
            ["the active room changing", { action: Action.ActiveRoomChanged, newRoomId: "!room2:server" }],
        ])("should scroll a room into view on %s", async (_trigger, payload) => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                roomViewStore: sdkContext.roomViewStore,
                spaceStore: sdkContext.spaceStore,
            });
            const scrollSpy = vi.fn();
            viewModel.setScrollToIndex(scrollSpy);

            dispatcher.dispatch(payload);

            await waitFor(() => expect(scrollSpy).toHaveBeenCalledWith(1));
        });

        it("should not scroll when the room is not in the current list", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                roomViewStore: sdkContext.roomViewStore,
                spaceStore: sdkContext.spaceStore,
            });
            const scrollSpy = vi.fn();
            viewModel.setScrollToIndex(scrollSpy);

            dispatcher.dispatch({
                action: Action.ViewRoom,
                room_id: "!nope:server",
                show_room_tile: true,
            });

            await flushPromises();
            expect(scrollSpy).not.toHaveBeenCalled();
        });

        it("should scroll once the view registers its scroll handle", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                roomViewStore: sdkContext.roomViewStore,
                spaceStore: sdkContext.spaceStore,
            });

            // The room is opened before the view has mounted, so there is nothing to scroll with.
            vi.spyOn(sdkContext.roomViewStore, "getRoomId").mockReturnValue("!room2:server");
            dispatcher.dispatch({
                action: Action.ActiveRoomChanged,
                newRoomId: "!room2:server",
            });
            await flushPromises();

            const scrollSpy = vi.fn();
            viewModel.setScrollToIndex(scrollSpy);

            await waitFor(() => expect(scrollSpy).toHaveBeenCalledWith(1));
        });

        it("should scroll once the room shows up after a space change", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                roomViewStore: sdkContext.roomViewStore,
                spaceStore: sdkContext.spaceStore,
            });
            const scrollSpy = vi.fn();
            viewModel.setScrollToIndex(scrollSpy);

            // The room lives in another space, so it is not in the list yet.
            vi.spyOn(sdkContext.roomViewStore, "getRoomId").mockReturnValue("!spacereg:server");
            dispatcher.dispatch({
                action: Action.ActiveRoomChanged,
                newRoomId: "!spacereg:server",
            });
            await flushPromises();
            expect(scrollSpy).not.toHaveBeenCalled();

            // The space switch settles and the room list is refreshed.
            const spaceRoom = mkStubRoom("!spacereg:server", "Space Reg", matrixClient);
            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "!space:server",
                rooms: [room1, spaceRoom],
            });
            vi.spyOn(sdkContext.spaceStore, "getLastSelectedRoomIdForSpace").mockReturnValue(null);
            RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsUpdate);

            await waitFor(() => expect(scrollSpy).toHaveBeenCalledWith(1));
        });

        it("should drop a pending request once the user leaves the room", async () => {
            viewModel = new RoomListViewModel({
                client: matrixClient,
                roomViewStore: sdkContext.roomViewStore,
                spaceStore: sdkContext.spaceStore,
            });
            const scrollSpy = vi.fn();
            viewModel.setScrollToIndex(scrollSpy);

            // A room that isn't in the list, so the request has to wait.
            vi.spyOn(sdkContext.roomViewStore, "getRoomId").mockReturnValue("!spacereg:server");
            dispatcher.dispatch({
                action: Action.ActiveRoomChanged,
                newRoomId: "!spacereg:server",
            });
            await flushPromises();
            expect(scrollSpy).not.toHaveBeenCalled();

            // The user closes the room, so nothing replaces the waiting request.
            vi.spyOn(sdkContext.roomViewStore, "getRoomId").mockReturnValue(null);
            dispatcher.dispatch({ action: Action.ActiveRoomChanged, newRoomId: null });
            await flushPromises();
            scrollSpy.mockClear();

            // The room finally turns up, but the request has already been dropped.
            const spaceRoom = mkStubRoom("!spacereg:server", "Space Reg", matrixClient);
            vi.spyOn(RoomListStoreV3.instance, "getSortedRoomsInActiveSpace").mockReturnValue({
                spaceId: "home",
                rooms: [room1, spaceRoom],
            });
            RoomListStoreV3.instance.emit(RoomListStoreV3Event.ListsUpdate);
            await flushPromises();

            expect(scrollSpy).not.toHaveBeenCalled();
        });
    });
});
