/*
 * Copyright 2025 New Vector Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

// @vitest-environment happy-dom

import EventEmitter from "node:events";
import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from "vitest";
import {
    ClientEvent,
    EventType,
    type MatrixClient,
    MatrixEvent,
    MatrixEventEvent,
    KnownMembership,
    Room,
    RoomEvent,
    PendingEventOrdering,
    type RoomMember,
} from "matrix-js-sdk/src/matrix";
import { CallType } from "matrix-js-sdk/src/webrtc/call";
import { createTestClient, flushPromises } from "test-utils";

import { RoomNotificationState } from "../../stores/notifications/RoomNotificationState";
import { RoomNotificationStateStore } from "../../stores/notifications/RoomNotificationStateStore";
import { NotificationStateEvents } from "../../stores/notifications/NotificationState";
import { type MessagePreview, MessagePreviewStore } from "../../stores/message-preview";
import SettingsStore from "../../settings/SettingsStore";
import DMRoomMap from "../../utils/DMRoomMap";
import { DefaultTagID } from "../../stores/room-list-v3/skip-list/tag";
import dispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import { CallStore } from "../../stores/CallStore";
import { CallEvent, type Call } from "../../models/Call";
import { RoomListItemViewModel } from "./RoomListItemViewModel";
import * as tagRoomModule from "../../utils/room/tagRoom";
import { EchoChamber } from "../../stores/local-echo/EchoChamber";
import { type RoomEchoChamber } from "../../stores/local-echo/RoomEchoChamber";
import { RoomNotifState } from "../../RoomNotifs";
import { NotificationLevel } from "../../stores/notifications/NotificationLevel";
import { countUnreadMessages } from "../../telement/room-list/countUnreadMessages";
import { MARKED_UNREAD_TYPE_STABLE } from "../../utils/notifications";

vi.mock("./utils", () => ({
    hasAccessToOptionsMenu: vi.fn().mockReturnValue(true),
    hasAccessToNotificationMenu: vi.fn().mockReturnValue(true),
}));

vi.mock("../../telement/room-list/countUnreadMessages", () => ({
    countUnreadMessages: vi.fn().mockReturnValue({ count: 0, mentionsMe: false }),
}));

vi.mock("../../stores/CallStore", () => ({
    __esModule: true,
    CallStore: {
        instance: {
            getCall: vi.fn(),
            on: vi.fn(),
            off: vi.fn(),
            emit: vi.fn(),
        },
    },
    CallStoreEvent: {
        ConnectedCalls: "connected_calls",
    },
}));

describe("RoomListItemViewModel", () => {
    let matrixClient: MatrixClient;
    let room: Room;
    let notificationState: RoomNotificationState;
    let viewModel: RoomListItemViewModel;

    beforeEach(() => {
        matrixClient = createTestClient();
        room = new Room("!room:server", matrixClient, matrixClient.getSafeUserId(), {
            pendingEventOrdering: PendingEventOrdering.Detached,
        });

        // Set room name
        room.name = "Test Room";

        notificationState = new RoomNotificationState(room, false);
        vi.spyOn(RoomNotificationStateStore.instance, "getRoomState").mockReturnValue(notificationState);

        const dmRoomMap = {
            getUserIdForRoomId: vi.fn().mockReturnValue(undefined),
        } as unknown as DMRoomMap;
        DMRoomMap.setShared(dmRoomMap);

        vi.spyOn(SettingsStore, "getValue").mockImplementation(() => false);
        vi.spyOn(SettingsStore, "setValue").mockResolvedValue(undefined);
        vi.spyOn(SettingsStore, "watchSetting").mockImplementation(() => "watcher-id");

        vi.spyOn(MessagePreviewStore.instance, "getPreviewForRoom").mockResolvedValue(null);
        vi.spyOn(CallStore.instance, "getCall").mockReturnValue(null);
    });

    afterEach(() => {
        viewModel?.dispose();
        vi.restoreAllMocks();
    });

    describe("Initialization", () => {
        it("should initialize with room data", async () => {
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            // Wait for async initialization
            await flushPromises();

            const snapshot = viewModel.getSnapshot();
            expect(snapshot.id).toBe("!room:server");
            expect(snapshot.name).toBe("Test Room");
        });

        it("should load message preview", async () => {
            vi.spyOn(MessagePreviewStore.instance, "getPreviewForRoom").mockResolvedValue({
                text: "Hello world!",
            } as MessagePreview);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            // Wait for async message preview load
            await flushPromises();

            expect(viewModel.getSnapshot().messagePreview).toBe("Hello world!");
        });
    });

    describe("Notification state", () => {
        it("should reflect notification state", async () => {
            vi.spyOn(notificationState, "hasAnyNotificationOrActivity", "get").mockReturnValue(true);
            vi.spyOn(notificationState, "count", "get").mockReturnValue(5);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();

            const snapshot = viewModel.getSnapshot();
            expect(snapshot.notification.hasAnyNotificationOrActivity).toBe(true);
            expect(snapshot.notification.count).toBe(5);
        });

        it("should update when notification state changes", async () => {
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();
            expect(viewModel.getSnapshot().notification.count).toBe(0);

            vi.spyOn(notificationState, "count", "get").mockReturnValue(3);
            notificationState.emit(NotificationStateEvents.Update);

            await flushPromises();
            expect(viewModel.getSnapshot().notification.count).toBe(3);
        });

        it("should show bold text when has notifications", async () => {
            vi.spyOn(notificationState, "hasAnyNotificationOrActivity", "get").mockReturnValue(true);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();

            expect(viewModel.getSnapshot().isBold).toBe(true);
        });

        it("should show mention badge", async () => {
            vi.spyOn(notificationState, "isMention", "get").mockReturnValue(true);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();

            expect(viewModel.getSnapshot().notification.isMention).toBe(true);
        });

        it("should show invitation state", async () => {
            vi.spyOn(notificationState, "invited", "get").mockReturnValue(true);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();

            expect(viewModel.getSnapshot().notification.invited).toBe(true);
        });
    });

    describe("Muted rooms", () => {
        const mute = (): void => {
            vi.spyOn(EchoChamber, "forRoom").mockReturnValue({
                notificationVolume: RoomNotifState.Mute,
            } as unknown as RoomEchoChamber);
            // A muted room's push rule gives it no notification level
            vi.spyOn(notificationState, "level", "get").mockReturnValue(NotificationLevel.None);
        };

        beforeEach(() => {
            vi.spyOn(room, "getMyMembership").mockReturnValue(KnownMembership.Join);
            vi.mocked(countUnreadMessages).mockReturnValue({ count: 0, mentionsMe: false });
            // Its updates are mocked here, and its own listeners on the room would need full events
            notificationState.destroy();
        });

        it("should count the unread messages of a muted room, to show them in a grey counter", () => {
            mute();
            vi.mocked(countUnreadMessages).mockReturnValue({ count: 4, mentionsMe: false });

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            const snapshot = viewModel.getSnapshot();
            expect(countUnreadMessages).toHaveBeenCalledWith(room);
            expect(snapshot.notification).toEqual(
                expect.objectContaining({
                    muted: true,
                    hasAnyNotificationOrActivity: true,
                    isNotification: true,
                    hasUnreadCount: true,
                    count: 4,
                    isMention: false,
                }),
            );
            // Like Telegram, a muted room isn't emphasised
            expect(snapshot.isBold).toBe(false);
            expect(snapshot.canMarkAsRead).toBe(true);
            expect(snapshot.canMarkAsUnread).toBe(false);
        });

        it("should show the @ of a muted room whose unread messages mention the user, with the grey counter", () => {
            mute();
            vi.mocked(countUnreadMessages).mockReturnValue({ count: 3, mentionsMe: true });

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            const snapshot = viewModel.getSnapshot();
            expect(snapshot.notification).toEqual(
                expect.objectContaining({
                    muted: true,
                    hasAnyNotificationOrActivity: true,
                    isMention: true,
                    isNotification: false,
                    hasUnreadCount: true,
                    count: 3,
                }),
            );
            expect(snapshot.isBold).toBe(false);
            expect(snapshot.canMarkAsRead).toBe(true);
        });

        it("should show nothing for a muted room without unread messages", () => {
            mute();

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            const snapshot = viewModel.getSnapshot();
            expect(snapshot.notification).toEqual(
                expect.objectContaining({ muted: true, hasAnyNotificationOrActivity: false, isNotification: false }),
            );
            expect(snapshot.canMarkAsRead).toBe(false);
            expect(snapshot.canMarkAsUnread).toBe(true);
        });

        it("should show a muted room marked as unread with an empty counter", () => {
            mute();
            room.addAccountData([new MatrixEvent({ type: MARKED_UNREAD_TYPE_STABLE, content: { unread: true } })]);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            expect(viewModel.getSnapshot().notification).toEqual(
                expect.objectContaining({ isNotification: true, hasUnreadCount: false, count: 0 }),
            );
            expect(viewModel.getSnapshot().canMarkAsRead).toBe(true);
        });

        it("should not count the unread messages of a room that isn't muted", () => {
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            expect(countUnreadMessages).not.toHaveBeenCalled();
            expect(viewModel.getSnapshot().notification.isNotification).toBe(false);
        });

        it.each([
            ["an unsent message", NotificationLevel.Unsent],
            ["an invitation", NotificationLevel.Highlight],
        ])("should keep the notification state of a muted room with %s", (_, level) => {
            mute();
            vi.spyOn(notificationState, "level", "get").mockReturnValue(level);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            expect(countUnreadMessages).not.toHaveBeenCalled();
        });

        // The handlers don't look at the arguments of the room's events
        const emitOnRoom = (event: RoomEvent): void => {
            (room as unknown as EventEmitter).emit(event);
        };
        const addMessage = (): Promise<void> =>
            room.addLiveEvents(
                [
                    new MatrixEvent({
                        type: "m.room.message",
                        room_id: room.roomId,
                        sender: "@alice:server",
                        event_id: "$message",
                        content: { body: "Hello" },
                    }),
                ],
                { addToState: false },
            );
        const emitDecrypted = (roomId: string): void => {
            matrixClient.emit(MatrixEventEvent.Decrypted, new MatrixEvent({ room_id: roomId }));
        };
        const emitAccountData = (type: string): void => {
            matrixClient.emit(ClientEvent.AccountData, new MatrixEvent({ type, content: {} }));
        };

        it.each([
            ["a message arrives", addMessage],
            ["a message is redacted", (): void => emitOnRoom(RoomEvent.Redaction)],
            ["a read receipt arrives", (): void => emitOnRoom(RoomEvent.Receipt)],
            ["the room is marked as unread", (): void => emitOnRoom(RoomEvent.AccountData)],
            ["a message is decrypted", (): void => emitDecrypted(room.roomId)],
            ["the user's push rules change", (): void => emitAccountData(EventType.PushRules)],
        ])("should recount the unread messages of a muted room when %s", async (_, emit) => {
            mute();
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });
            expect(viewModel.getSnapshot().notification.count).toBe(0);

            vi.mocked(countUnreadMessages).mockReturnValue({ count: 2, mentionsMe: false });
            await emit();

            expect(viewModel.getSnapshot().notification.count).toBe(2);
        });

        it("should not recount when a message of another room is decrypted", () => {
            mute();
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });
            vi.mocked(countUnreadMessages).mockClear();

            emitDecrypted("!other:server");

            expect(countUnreadMessages).not.toHaveBeenCalled();
        });

        it("should not recount when other account data of the user changes", () => {
            mute();
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });
            vi.mocked(countUnreadMessages).mockClear();

            emitAccountData(EventType.Direct);

            expect(countUnreadMessages).not.toHaveBeenCalled();
        });

        it("should not recount a room that isn't muted when a message arrives", async () => {
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });
            const getSnapshot = viewModel.getSnapshot();

            await addMessage();

            expect(viewModel.getSnapshot()).toBe(getSnapshot);
        });

        it("should stop listening to the client when disposed", () => {
            mute();
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });
            viewModel.dispose();
            vi.mocked(countUnreadMessages).mockClear();

            emitDecrypted(room.roomId);
            emitAccountData(EventType.PushRules);

            expect(countUnreadMessages).not.toHaveBeenCalled();
        });
    });

    describe("Message preview", () => {
        it("should update message preview when store emits update", async () => {
            vi.spyOn(MessagePreviewStore.instance, "getPreviewForRoom").mockResolvedValue({
                text: "Initial message",
            } as MessagePreview);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();
            expect(viewModel.getSnapshot().messagePreview).toBe("Initial message");

            // Update preview
            vi.spyOn(MessagePreviewStore.instance, "getPreviewForRoom").mockResolvedValue({
                text: "Updated message",
            } as MessagePreview);

            MessagePreviewStore.instance.emit(MessagePreviewStore.getPreviewChangedEventName(room));

            await flushPromises();
            expect(viewModel.getSnapshot().messagePreview).toBe("Updated message");
        });
    });

    describe("Room tags", () => {
        it("should reflect favorite tag", async () => {
            room.tags = { [DefaultTagID.Favourite]: { order: 0 } };

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();

            expect(viewModel.getSnapshot().isFavourite).toBe(true);
        });

        it("should reflect low priority tag", async () => {
            room.tags = { [DefaultTagID.LowPriority]: { order: 0 } };

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();

            expect(viewModel.getSnapshot().isLowPriority).toBe(true);
        });

        it("should update when room tags change", async () => {
            room.tags = {};
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();
            expect(viewModel.getSnapshot().isFavourite).toBe(false);

            room.tags = { [DefaultTagID.Favourite]: { order: 0 } };
            const tagEvent = {
                getContent: () => ({ tags: { [DefaultTagID.Favourite]: { order: 0 } } }),
            } as MatrixEvent;
            room.emit(RoomEvent.Tags, tagEvent, room);

            await flushPromises();
            expect(viewModel.getSnapshot().isFavourite).toBe(true);
        });
    });

    describe("Call state", () => {
        it("should show voice call indicator", async () => {
            const mockCall = {
                callType: CallType.Voice,
                participants: new Map([[matrixClient.getUserId()!, {}]]),
                off: vi.fn(),
                on: vi.fn(),
            } as unknown as Call;

            vi.spyOn(CallStore.instance, "getCall").mockReturnValue(mockCall);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();

            expect(viewModel.getSnapshot().notification.callType).toBe("voice");
        });

        it("should show video call indicator", async () => {
            const mockCall = {
                callType: CallType.Video,
                participants: new Map([[matrixClient.getUserId()!, {}]]),
                off: vi.fn(),
                on: vi.fn(),
            } as unknown as Call;

            vi.spyOn(CallStore.instance, "getCall").mockReturnValue(mockCall);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();

            expect(viewModel.getSnapshot().notification.callType).toBe("video");
        });

        it("should not show call indicator when no participants", async () => {
            const mockCall = {
                callType: CallType.Voice,
                participants: new Map(),
                off: vi.fn(),
                on: vi.fn(),
            } as unknown as Call;

            vi.spyOn(CallStore.instance, "getCall").mockReturnValue(mockCall);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();

            expect(viewModel.getSnapshot().notification.callType).toBeUndefined();
        });

        it("should listen to call participant changes", () => {
            const mockCall = {
                callType: CallType.Voice,
                participants: new Map(),
                off: vi.fn(),
                on: vi.fn(),
            };
            vi.spyOn(CallStore.instance, "getCall").mockReturnValue(mockCall as unknown as Call);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });
            expect(viewModel.getSnapshot().notification.callType).toBeUndefined();

            // Get the callback registered for call state changes
            const mockCalls = (CallStore.instance.on as Mock).mock.calls;
            const callStateCallback = mockCalls[mockCalls.length - 1][1];
            callStateCallback();

            // Simulate participant joining
            mockCall.participants.set(matrixClient.getUserId()! as unknown as RoomMember, new Set());

            // Get the callback registered for participant changes
            const participantsChangeCallback = mockCall.on.mock.calls[0][1];
            participantsChangeCallback();

            expect(viewModel.getSnapshot().notification.callType).toBe("voice");
        });

        it("should not update the item when there is already an active call and participants join", () => {
            const mockCall = {
                callType: CallType.Voice,
                participants: new Map([[matrixClient.getUserId()! as unknown as RoomMember, new Set<string>()]]),
                off: vi.fn(),
                on: vi.fn(),
            };
            vi.spyOn(CallStore.instance, "getCall").mockReturnValue(mockCall as unknown as Call);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            // Trigger onCallStateChanged so the call is tracked and the participant listener is registered
            const mockCalls = (CallStore.instance.on as Mock).mock.calls;
            const callStateCallback = mockCalls[mockCalls.length - 1][1];
            callStateCallback();

            expect(viewModel.getSnapshot().notification.callType).toBe("voice");

            // Record the snapshot version before the participant event fires
            const snapshotBefore = viewModel.getSnapshot();

            // Simulate another participant joining while the call is already active
            mockCall.participants.set("@other:server" as unknown as RoomMember, new Set<string>());
            const participantsChangeCallback = mockCall.on.mock.calls[0][1];
            participantsChangeCallback(mockCall.participants);

            // Snapshot should not have changed
            expect(viewModel.getSnapshot()).toBe(snapshotBefore);
        });

        it("should react to participant changes when a call already exists at instantiation time", () => {
            const mockCall = {
                callType: CallType.Voice,
                participants: new Map([]),
                off: vi.fn(),
                on: vi.fn(),
            };
            vi.spyOn(CallStore.instance, "getCall").mockReturnValue(mockCall as unknown as Call);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });
            expect(viewModel.getSnapshot().notification.callType).toBeUndefined();

            // Simulate participant joining
            mockCall.participants.set(matrixClient.getUserId()! as unknown as RoomMember, new Set());

            // Get the callback registered for participant changes
            const participantsChangeCallback = mockCall.on.mock.calls[0][1];
            participantsChangeCallback();

            expect(viewModel.getSnapshot().notification.callType).toBe("voice");
        });

        it("should unsubscribe from old call participants when the call changes", () => {
            const firstCall = {
                callType: CallType.Voice,
                participants: new Map([[matrixClient.getUserId()! as unknown as RoomMember, new Set<string>()]]),
                off: vi.fn(),
                on: vi.fn(),
            };
            const secondCall = {
                callType: CallType.Video,
                participants: new Map([[matrixClient.getUserId()! as unknown as RoomMember, new Set<string>()]]),
                off: vi.fn(),
                on: vi.fn(),
            };

            vi.spyOn(CallStore.instance, "getCall").mockReturnValue(firstCall as unknown as Call);
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            // Trigger onCallStateChanged to register the first call
            const mockCalls = (CallStore.instance.on as Mock).mock.calls;
            const callStateCallback = mockCalls[mockCalls.length - 1][1];
            callStateCallback();

            const participantsCallback = firstCall.on.mock.calls[0][1];
            expect(firstCall.on).toHaveBeenCalledWith("participants", participantsCallback);

            // Now switch to a different call
            vi.spyOn(CallStore.instance, "getCall").mockReturnValue(secondCall as unknown as Call);
            callStateCallback();

            // The old call's listener must have been removed
            expect(firstCall.off).toHaveBeenCalledWith("participants", participantsCallback);
            // The new call must have a listener registered
            expect(secondCall.on).toHaveBeenCalledWith("participants", expect.any(Function));
        });

        it("should listen to call type changes", async () => {
            // Start with a voice call
            let callType = CallType.Voice;
            const mockCall = new (class extends EventEmitter {
                get callType() {
                    return callType;
                }
                participants = new Map([[matrixClient.getUserId()!, {}]]);
            })() as unknown as Call;
            vi.spyOn(CallStore.instance, "getCall").mockReturnValue(mockCall);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });
            await flushPromises();

            expect(viewModel.getSnapshot().notification.callType).toBe("voice");

            // Now turn it into a video call
            callType = CallType.Video;
            mockCall.emit(CallEvent.CallTypeChanged, callType);
            expect(viewModel.getSnapshot().notification.callType).toBe("video");
        });
    });

    describe("Room name updates", () => {
        it("should update when room name changes", async () => {
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();
            expect(viewModel.getSnapshot().name).toBe("Test Room");

            room.name = "Updated Room";
            room.emit(RoomEvent.Name, room);

            await flushPromises();
            expect(viewModel.getSnapshot().name).toBe("Updated Room");
        });
    });

    describe("DM detection", () => {
        it("should detect DM rooms", async () => {
            const dmRoomMap = DMRoomMap.shared();
            vi.spyOn(dmRoomMap, "getUserIdForRoomId").mockReturnValue("@user:server");

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();

            // DM rooms should not show copy room link option
            expect(viewModel.getSnapshot().canCopyRoomLink).toBe(false);
        });

        it("should detect non-DM rooms", async () => {
            const dmRoomMap = DMRoomMap.shared();
            vi.spyOn(dmRoomMap, "getUserIdForRoomId").mockReturnValue(undefined);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            await flushPromises();

            expect(viewModel.getSnapshot().canCopyRoomLink).toBe(true);
        });
    });

    describe("Actions", () => {
        it("should dispatch view room action on openRoom", () => {
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            const dispatchSpy = vi.spyOn(dispatcher, "dispatch");

            viewModel.onOpenRoom();

            expect(dispatchSpy).toHaveBeenCalledWith({
                action: Action.ViewRoom,
                room_id: "!room:server",
            });
        });

        it("should return room object", () => {
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            expect(viewModel.getSnapshot().room).toBe(room);
        });

        it("should dispatch view_invite action when onInvite is called", () => {
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });
            const dispatchSpy = vi.spyOn(dispatcher, "dispatch");

            viewModel.onInvite();

            expect(dispatchSpy).toHaveBeenCalledWith({
                action: "view_invite",
                roomId: "!room:server",
            });
        });

        it("should dispatch copy_room action when onCopyRoomLink is called", () => {
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });
            const dispatchSpy = vi.spyOn(dispatcher, "dispatch");

            viewModel.onCopyRoomLink();

            expect(dispatchSpy).toHaveBeenCalledWith({
                action: "copy_room",
                room_id: "!room:server",
            });
        });

        it("should dispatch leave_room action when onLeaveRoom is called for normal room", () => {
            room.tags = {};
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });
            const dispatchSpy = vi.spyOn(dispatcher, "dispatch");

            viewModel.onLeaveRoom();

            expect(dispatchSpy).toHaveBeenCalledWith({
                action: "leave_room",
                room_id: "!room:server",
            });
        });

        it("should dispatch forget_room action when onLeaveRoom is called for archived room", () => {
            room.tags = { [DefaultTagID.Archived]: { order: 0 } };

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });
            const dispatchSpy = vi.spyOn(dispatcher, "dispatch");

            viewModel.onLeaveRoom();

            expect(dispatchSpy).toHaveBeenCalledWith({
                action: "forget_room",
                room_id: "!room:server",
            });
        });
    });

    describe("Favourite and low priority", () => {
        it.each([
            { action: "onToggleFavorite" as const, tag: DefaultTagID.Favourite },
            { action: "onToggleLowPriority" as const, tag: DefaultTagID.LowPriority },
        ])("should toggle $tag when $action is called", ({ action, tag }) => {
            const tagRoomSpy = vi.spyOn(tagRoomModule, "tagRoom").mockImplementation(() => {});
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            viewModel[action]();

            expect(tagRoomSpy).toHaveBeenCalledWith(room, tag);
        });

        it.each([
            { membership: KnownMembership.Join, expected: true },
            { membership: KnownMembership.Invite, expected: false },
        ])("should set canChangeSection to $expected when membership is $membership", ({ membership, expected }) => {
            vi.spyOn(room, "getMyMembership").mockReturnValue(membership);

            viewModel = new RoomListItemViewModel({ room, client: matrixClient });
            expect(viewModel.getSnapshot().canChangeSection).toBe(expected);
        });
    });

    describe("Cleanup", () => {
        it("should unsubscribe from all events on dispose", () => {
            viewModel = new RoomListItemViewModel({ room, client: matrixClient });

            const offSpy = vi.spyOn(notificationState, "off");

            viewModel.dispose();

            expect(offSpy).toHaveBeenCalled();
        });
    });
});
