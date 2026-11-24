/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { vi, describe, it, expect, beforeEach, afterEach, type Mock, type MockedObject } from "vitest";
import React, { createRef, type RefObject } from "react";
import {
    EventTimeline,
    EventType,
    type IEvent,
    JoinRule,
    type MatrixClient,
    MatrixError,
    MatrixEvent,
    MsgType,
    Room,
    RoomEvent,
    RoomMember,
    RoomStateEvent,
    SearchResult,
    User,
} from "matrix-js-sdk/src/matrix";
import { type CryptoApi, CryptoEvent, UserVerificationStatus } from "matrix-js-sdk/src/crypto-api";
import { KnownMembership } from "matrix-js-sdk/src/types";
import { act, cleanup, fireEvent, render, type RenderResult, screen, waitFor, findByRole } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import {
    createTestClient,
    emitPromise,
    filterConsole,
    flushPromises,
    mkEvent,
    mkRoomMemberJoinEvent,
    mkThirdPartyInviteEvent,
    mockPlatformPeg,
    setupAsyncStoreWithClient,
    stubClient,
    TestSDKContext,
    unmockPlatformPeg,
    untilDispatch,
} from "test-utils";

import { MatrixClientPeg } from "../../MatrixClientPeg";
import { Action } from "../../dispatcher/actions";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { type ViewRoomPayload } from "../../dispatcher/payloads/ViewRoomPayload";
import { type ActionPayload } from "../../dispatcher/payloads";
import { RoomView } from "./RoomView";
import SettingsStore from "../../settings/SettingsStore";
import { SettingLevel } from "../../settings/SettingLevel";
import DMRoomMap from "../../utils/DMRoomMap";
import { NotificationState, NotificationStateEvents } from "../../stores/notifications/NotificationState";
import { RoomNotificationStateStore } from "../../stores/notifications/RoomNotificationStateStore";
import { RightPanelPhases } from "../../stores/right-panel/RightPanelStorePhases";
import { type LocalRoom, LocalRoomState } from "../../models/LocalRoom";
import { DirectoryMember } from "../../utils/direct-messages";
import { createDmLocalRoom } from "../../utils/dm/createDmLocalRoom";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import { SDKContext } from "../../contexts/SDKContext";
import WidgetUtils from "../../utils/WidgetUtils";
import { WidgetType } from "../../widgets/WidgetType";
import WidgetStore from "../../stores/WidgetStore";
import { type ViewRoomErrorPayload } from "../../dispatcher/payloads/ViewRoomErrorPayload";
import { SearchScope } from "../../Searching";
import { MEGOLM_ENCRYPTION_ALGORITHM } from "../../utils/crypto";
import MatrixClientContext from "../../contexts/MatrixClientContext";
import { type ViewUserPayload } from "../../dispatcher/payloads/ViewUserPayload.ts";
import { CallStore } from "../../stores/CallStore.ts";
import MediaDeviceHandler, { MediaDeviceKindEnum } from "../../MediaDeviceHandler.ts";
import Modal, { type ComponentProps } from "../../Modal.tsx";
import ErrorDialog from "../views/dialogs/ErrorDialog.tsx";
import * as pinnedEventHooks from "../../hooks/usePinnedEvents";
import { TimelineRenderingType } from "../../contexts/RoomContext";
import { WALK_REPLY_TARGET } from "../../telement/room/replyWalk";
import { ModuleApi } from "../../modules/Api";
import MatrixClientBackedController from "../../settings/controllers/MatrixClientBackedController.ts";
import { type ComposerInsertPayload, ComposerType } from "../../dispatcher/payloads/ComposerInsertPayload.ts";

// Used by group calls
vi.spyOn(MediaDeviceHandler, "getDevices").mockResolvedValue({
    [MediaDeviceKindEnum.AudioInput]: [],
    [MediaDeviceKindEnum.VideoInput]: [],
    [MediaDeviceKindEnum.AudioOutput]: [],
});

describe("RoomView", () => {
    let cli: MockedObject<MatrixClient>;
    let room: Room;
    let rooms: Map<string, Room>;
    let stores: TestSDKContext;
    let crypto: CryptoApi;

    // mute some noise
    filterConsole("RVS update", "does not have an m.room.create event", "Current version: 1", "Version capability");

    beforeEach(() => {
        mockPlatformPeg({ reload: () => {} });
        cli = vi.mocked(stubClient());
        MatrixClientBackedController.matrixClient = cli;

        const roomName = (expect.getState().currentTestName ?? "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

        room = new Room(`!${roomName}:example.org`, cli, "@alice:example.org");
        vi.spyOn(room, "findPredecessor");
        room.getPendingEvents = () => [];
        rooms = new Map();
        rooms.set(room.roomId, room);
        cli.getRoom.mockImplementation((roomId: string | undefined) => rooms.get(roomId || "") || null);
        cli.getRooms.mockImplementation(() => [...rooms.values()]);
        // Re-emit certain events on the mocked client
        room.on(RoomEvent.Timeline, (...args) => cli.emit(RoomEvent.Timeline, ...args));
        room.on(RoomEvent.TimelineReset, (...args) => cli.emit(RoomEvent.TimelineReset, ...args));

        DMRoomMap.makeShared(cli);
        stores = new TestSDKContext();
        stores._client = cli;
        stores.rightPanelStore.useUnitTestClient(cli);

        crypto = cli.getCrypto()!;
        vi.spyOn(cli, "getCrypto").mockReturnValue(undefined);
    });

    afterEach(() => {
        unmockPlatformPeg();
        vi.clearAllMocks();

        // Can't vi.restoreAllMocks() because some tests will break
        vi.spyOn(pinnedEventHooks, "usePinnedEvents").mockRestore();
        vi.spyOn(pinnedEventHooks, "useSortedFetchedPinnedEvents").mockRestore();

        cleanup();
    });

    const mountRoomView = async (
        ref?: RefObject<RoomView | null>,
        props?: Partial<ComponentProps<typeof RoomView>>,
    ): Promise<RenderResult> => {
        if (stores.roomViewStore.getRoomId() !== room.roomId) {
            const switchedRoom = new Promise<void>((resolve) => {
                const subFn = () => {
                    if (stores.roomViewStore.getRoomId()) {
                        stores.roomViewStore.off(UPDATE_EVENT, subFn);
                        resolve();
                    }
                };
                stores.roomViewStore.on(UPDATE_EVENT, subFn);
            });

            act(() =>
                defaultDispatcher.dispatch<ViewRoomPayload>({
                    action: Action.ViewRoom,
                    room_id: room.roomId,
                }),
            );

            await switchedRoom;
        }

        const roomView = render(
            <RoomView
                // threepidInvite should be optional on RoomView props
                // it is treated as optional in RoomView
                threepidInvite={undefined as any}
                forceTimeline={false}
                ref={ref}
                {...props}
            />,
            {
                wrapper: ({ children }) => (
                    <MatrixClientContext.Provider value={cli}>
                        <SDKContext.Provider value={stores}>{children}</SDKContext.Provider>
                    </MatrixClientContext.Provider>
                ),
            },
        );
        await flushPromises();
        return roomView;
    };

    const renderRoomView = async (switchRoom = true): Promise<ReturnType<typeof render>> => {
        if (switchRoom && stores.roomViewStore.getRoomId() !== room.roomId) {
            const switchedRoom = new Promise<void>((resolve) => {
                const subFn = () => {
                    if (stores.roomViewStore.getRoomId()) {
                        stores.roomViewStore.off(UPDATE_EVENT, subFn);
                        resolve();
                    }
                };
                stores.roomViewStore.on(UPDATE_EVENT, subFn);
            });

            defaultDispatcher.dispatch<ViewRoomPayload>({
                action: Action.ViewRoom,
                room_id: room.roomId,
            });

            await switchedRoom;
        }

        const roomView = render(
            <MatrixClientContext.Provider value={cli}>
                <SDKContext.Provider value={stores}>
                    <RoomView
                        // threepidInvite should be optional on RoomView props
                        // it is treated as optional in RoomView
                        threepidInvite={undefined}
                        forceTimeline={false}
                        onRegistered={vi.fn()}
                    />
                </SDKContext.Provider>
            </MatrixClientContext.Provider>,
        );
        await flushPromises();
        return roomView;
    };
    const getRoomViewInstance = async (): Promise<RoomView> => {
        const ref = createRef<RoomView>();
        await mountRoomView(ref);
        return ref.current!;
    };

    it("gets a room view store from MultiRoomViewStore when given a room ID", async () => {
        stores.multiRoomViewStore.getRoomViewStoreForRoom = vi.fn().mockReturnValue(stores.roomViewStore);

        const ref = createRef<RoomView>();
        render(
            <MatrixClientContext.Provider value={cli}>
                <SDKContext.Provider value={stores}>
                    <RoomView
                        threepidInvite={undefined as any}
                        forceTimeline={false}
                        ref={ref}
                        roomId="!room:example.dummy"
                    />
                </SDKContext.Provider>
            </MatrixClientContext.Provider>,
        );

        expect(stores.multiRoomViewStore.getRoomViewStoreForRoom).toHaveBeenCalledWith("!room:example.dummy");
    });

    it("should show member list right panel phase on Action.ViewUser without `payload.member`", async () => {
        const spy = vi.spyOn(stores.rightPanelStore, "showOrHidePhase");
        await renderRoomView(false);

        defaultDispatcher.dispatch<ViewUserPayload>(
            {
                action: Action.ViewUser,
                member: undefined,
            },
            true,
        );

        expect(spy).toHaveBeenCalledWith(RightPanelPhases.MemberList);
    });

    it("when there is no room predecessor, getHiddenHighlightCount should return 0", async () => {
        const instance = await getRoomViewInstance();
        expect(instance.getHiddenHighlightCount()).toBe(0);
    });

    it("should hide the composer when hideComposer=true", async () => {
        // Join the room
        vi.spyOn(room, "getMyMembership").mockReturnValue(KnownMembership.Join);
        const { asFragment } = await mountRoomView(undefined, { hideComposer: true });

        expect(screen.queryByRole("textbox", { name: "Write a message…" })).not.toBeInTheDocument();
        expect(asFragment()).toMatchSnapshot();
    });

    it("should hide the header when hideHeader=true", async () => {
        // Join the room
        vi.spyOn(room, "getMyMembership").mockReturnValue(KnownMembership.Join);
        const { asFragment } = await mountRoomView(undefined, { hideHeader: true });

        // Check that the room name button in the header is not rendered
        expect(screen.queryByRole("button", { name: room.name })).not.toBeInTheDocument();
        expect(asFragment()).toMatchSnapshot();
    });

    it("should hide the right panel when hideRightPanel=true", async () => {
        // Join the room
        vi.spyOn(room, "getMyMembership").mockReturnValue(KnownMembership.Join);
        const { asFragment, rerender } = await mountRoomView(undefined);

        defaultDispatcher.dispatch<ViewUserPayload>(
            {
                action: Action.ViewUser,
                member: undefined,
            },
            true,
        );

        // Check that the right panel is rendered
        await expect(screen.findByTestId("right-panel")).resolves.toBeTruthy();
        // Now rerender with hideRightPanel=true
        rerender(<RoomView threepidInvite={undefined} forceTimeline={false} hideRightPanel={true} />);
        // Check that the right panel is not rendered
        await expect(screen.findByTestId("right-panel")).rejects.toThrow();
        expect(asFragment()).toMatchSnapshot();
    });

    it("should hide the pinned message banner when hidePinnedMessageBanner=true", async () => {
        // Join the room
        vi.spyOn(room, "getMyMembership").mockReturnValue(KnownMembership.Join);

        const pinnedEvent = new MatrixEvent({
            type: EventType.RoomMessage,
            sender: "@alice:example.org",
            content: {
                body: "First pinned message",
                msgtype: "m.text",
            },
            room_id: room.roomId,
            origin_server_ts: 0,
            event_id: "$eventId",
        });

        vi.spyOn(pinnedEventHooks, "usePinnedEvents").mockReturnValue([pinnedEvent.getId()!]);
        vi.spyOn(pinnedEventHooks, "useSortedFetchedPinnedEvents").mockReturnValue([pinnedEvent]);

        const { asFragment, rerender } = await mountRoomView(undefined);
        // Check that the pinned message banner is rendered
        await expect(screen.findByTestId("pinned-message-banner")).resolves.toBeTruthy();
        // Now rerender with hidePinnedMessagesBanner=true
        rerender(<RoomView threepidInvite={undefined} forceTimeline={false} hidePinnedMessageBanner={true} />);
        // Check that the pinned message banner is not rendered
        await expect(screen.findByTestId("pinned-message-banner")).rejects.toThrow();
        expect(asFragment()).toMatchSnapshot();
    });

    /** The private parts of RoomView that the Telement tests reach: its timeline panel and its handlers. */
    interface RoomViewInternals {
        messagePanel: Record<string, unknown>;
        onAction(payload: ActionPayload): Promise<void>;
        onMessageListScroll(): void;
        onRoomViewStoreUpdate(initial?: boolean): Promise<void>;
    }
    const internals = (instance: RoomView): RoomViewInternals => instance as unknown as RoomViewInternals;

    describe("jumping back (Telement)", () => {
        afterEach(() => {
            vi.mocked(defaultDispatcher.dispatch).mockRestore?.();
        });

        /** A room view whose timeline is read at `$reading`, away from its bottom, and the jumps it dispatches. */
        const mountScrolledUp = async (): Promise<{ instance: RoomView; dispatched: ViewRoomPayload[] }> => {
            vi.spyOn(room, "getMyMembership").mockReturnValue(KnownMembership.Join);
            const ref = createRef<RoomView>();
            await mountRoomView(ref);
            await waitFor(() => expect(screen.getByTestId("timeline")).not.toBeNull());
            const instance = ref.current!;
            internals(instance).messagePanel = {
                getScrollState: () => ({ stuckAtBottom: false, trackedScrollToken: "$reading" }),
                isAtEndOfLiveTimeline: () => false,
                jumpToLiveTimeline: vi.fn(),
            };
            act(() => instance.setState({ atEndOfLiveTimeline: false }));

            const dispatched: ViewRoomPayload[] = [];
            vi.spyOn(defaultDispatcher, "dispatch").mockImplementation((payload) => {
                if (payload.action === Action.ViewRoom) dispatched.push(payload as ViewRoomPayload);
            });
            return { instance, dispatched };
        };

        const jump = async (instance: RoomView, payload: Partial<ViewRoomPayload>): Promise<void> => {
            await act(() =>
                internals(instance).onAction({ action: Action.ViewRoom, room_id: room.roomId, ...payload }),
            );
        };

        it("returns from a quote's message to the reply it was clicked in, then goes to the bottom", async () => {
            const { instance, dispatched } = await mountScrolledUp();
            const button = (): HTMLElement => screen.getByRole("button", { name: /Back to where you were|Scroll to/ });
            expect(button()).toHaveAccessibleName("Scroll to most recent messages");

            await jump(instance, {
                event_id: "$quoted",
                highlighted: true,
                telement_jump_origin: { eventId: "$reply" },
            });
            expect(button()).toHaveAccessibleName("Back to where you were");

            fireEvent.click(button());

            expect(dispatched.at(-1)).toMatchObject({ event_id: "$reply", highlighted: true });
            expect(button()).toHaveAccessibleName("Scroll to most recent messages");

            fireEvent.click(button());
            expect(internals(instance).messagePanel.jumpToLiveTimeline).toHaveBeenCalled();
        });

        it("counts unread messages in gray while the room is muted", async () => {
            const { instance } = await mountScrolledUp();
            act(() => instance.setState({ numUnreadMessages: 3 }));
            const notificationState = RoomNotificationStateStore.instance.getRoomState(room);
            const count = (): HTMLElement => document.querySelector<HTMLElement>(".mx_JumpToBottomButton_badge")!;
            expect(count()).toHaveTextContent("3");
            expect(count().closest(".mx_JumpToBottomButton_muted")).toBeNull();

            vi.spyOn(notificationState, "muted", "get").mockReturnValue(true);
            act(() => {
                notificationState.emit(NotificationStateEvents.Update);
            });

            expect(count().closest(".mx_JumpToBottomButton_muted")).not.toBeNull();
        });

        it("returns from a pinned message to where the timeline was read", async () => {
            const { instance, dispatched } = await mountScrolledUp();

            await jump(instance, { event_id: "$pinned", highlighted: true, telement_jump_origin: "readingPosition" });
            fireEvent.click(screen.getByRole("button", { name: "Back to where you were" }));

            expect(dispatched.at(-1)).toMatchObject({ event_id: "$reading", highlighted: true });
        });

        it("returns from a search result to where the timeline was read before the search", async () => {
            const { instance, dispatched } = await mountScrolledUp();
            const search = {
                searchId: 1,
                term: "pizza",
                scope: SearchScope.Room,
                promise: new Promise<never>(() => {}),
            };
            act(() => instance.setState({ search, timelineRenderingType: TimelineRenderingType.Search }));

            await jump(instance, { event_id: "$result", highlighted: true });
            act(() => instance.setState({ search: undefined, timelineRenderingType: TimelineRenderingType.Room }));
            fireEvent.click(screen.getByRole("button", { name: "Back to where you were" }));

            expect(dispatched.at(-1)).toMatchObject({ event_id: "$reading", highlighted: true });
        });

        it("forgets where it came from once the timeline reaches its bottom", async () => {
            const { instance } = await mountScrolledUp();
            await jump(instance, {
                event_id: "$quoted",
                highlighted: true,
                telement_jump_origin: { eventId: "$reply" },
            });
            internals(instance).messagePanel.isAtEndOfLiveTimeline = () => true;
            act(() => internals(instance).onMessageListScroll());

            expect(instance.state.canJumpBack).toBe(false);
        });

        it("doesn't remember other jumps, such as to a link in a message", async () => {
            const { instance } = await mountScrolledUp();
            await jump(instance, { event_id: "$linked", highlighted: true });

            expect(instance.state.canJumpBack).toBeFalsy();
        });
    });

    describe("choosing the message to reply to with the composer's keys (Telement)", () => {
        afterEach(() => {
            vi.mocked(defaultDispatcher.dispatch).mockRestore?.();
        });

        it("replies to the timeline's messages one after another, marking and scrolling to each", async () => {
            vi.spyOn(room, "getMyMembership").mockReturnValue(KnownMembership.Join);
            const ref = createRef<RoomView>();
            await mountRoomView(ref);
            const instance = ref.current!;
            const [older, newer] = ["$older", "$newer"].map(
                (eventId) =>
                    new MatrixEvent({
                        type: EventType.RoomMessage,
                        event_id: eventId,
                        room_id: room.roomId,
                        sender: "@alice:example.org",
                        content: { msgtype: MsgType.Text, body: eventId },
                    }),
            );
            const scrollToEventIfNeeded = vi.fn();
            internals(instance).messagePanel = {
                state: { events: [older, newer] },
                scrollToEventIfNeeded,
                getScrollState: () => null,
                isAtEndOfLiveTimeline: () => true,
            };
            const replies: unknown[] = [];
            vi.spyOn(defaultDispatcher, "dispatch").mockImplementation((payload) => {
                if (payload.action === "reply_to_event") replies.push(payload.event);
            });
            const walk = async (direction: "previous" | "next"): Promise<void> => {
                await act(() =>
                    internals(instance).onAction({
                        action: WALK_REPLY_TARGET,
                        direction,
                        timelineRenderingType: TimelineRenderingType.Room,
                    }),
                );
            };

            await walk("previous");

            expect(replies).toEqual([newer]);
            expect(instance.state.keyboardReplyEventId).toBe("$newer");
            expect(scrollToEventIfNeeded).toHaveBeenCalledWith("$newer");

            act(() => instance.setState({ replyToEvent: newer }));
            await walk("previous");
            act(() => instance.setState({ replyToEvent: older }));
            await walk("next");
            act(() => instance.setState({ replyToEvent: newer }));
            await walk("next");

            // Past the newest message it stops replying
            expect(replies).toEqual([newer, older, newer, null]);
            expect(instance.state.keyboardReplyEventId).toBeUndefined();
        });

        it("leaves a thread's composer to its thread", async () => {
            const ref = createRef<RoomView>();
            await mountRoomView(ref);
            const dispatch = vi.spyOn(defaultDispatcher, "dispatch").mockImplementation(() => {});
            await act(() =>
                internals(ref.current!).onAction({
                    action: WALK_REPLY_TARGET,
                    direction: "previous",
                    timelineRenderingType: TimelineRenderingType.Thread,
                }),
            );

            expect(dispatch).not.toHaveBeenCalled();
        });
    });

    describe("enableReadReceiptsAndMarkersOnActivity", () => {
        it.each([
            {
                enabled: false,
                testName: "should send read receipts and update read marker on focus when disabled",
                checkCall: (sendReadReceiptsSpy: Mock, updateReadMarkerSpy: Mock) => {
                    expect(sendReadReceiptsSpy).toHaveBeenCalled();
                    expect(updateReadMarkerSpy).toHaveBeenCalled();
                },
            },
            {
                enabled: true,
                testName: "should not send read receipts and update read marker on focus when enabled",
                checkCall: (sendReadReceiptsSpy: Mock, updateReadMarkerSpy: Mock) => {
                    expect(sendReadReceiptsSpy).not.toHaveBeenCalled();
                    expect(updateReadMarkerSpy).not.toHaveBeenCalled();
                },
            },
        ])("$testName", async ({ enabled, checkCall }) => {
            // Join the room
            vi.spyOn(room, "getMyMembership").mockReturnValue(KnownMembership.Join);
            const ref = createRef<RoomView>();
            await mountRoomView(ref, {
                enableReadReceiptsAndMarkersOnActivity: enabled,
            });

            // Wait for the timeline to be rendered
            await waitFor(() => expect(screen.getByTestId("timeline")).not.toBeNull());

            // Get the RoomView instance and mock the messagePanel methods
            const instance = ref.current!;
            const sendReadReceiptsSpy = vi.fn();
            const updateReadMarkerSpy = vi.fn();
            // @ts-ignore - accessing private property for testing
            instance.messagePanel = {
                sendReadReceipts: sendReadReceiptsSpy,
                updateReadMarker: updateReadMarkerSpy,
                getScrollState: vi.fn(),
            };

            // Find the main RoomView div and trigger focus
            const timeline = screen.getByTestId("timeline");
            fireEvent.focus(timeline);

            // Verify that sendReadReceipts and updateReadMarker were called or not based on the enabled state
            checkCall(sendReadReceiptsSpy, updateReadMarkerSpy);
        });
    });

    describe("invites", () => {
        beforeEach(() => {
            const member = new RoomMember(room.roomId, cli.getSafeUserId());
            member.membership = KnownMembership.Invite;
            member.events.member = new MatrixEvent({
                sender: "@bob:example.org",
                content: { membership: KnownMembership.Invite },
            });
            room.getMyMembership = vi.fn().mockReturnValue(KnownMembership.Invite);
            room.getMember = vi.fn().mockReturnValue(member);
        });

        it("renders an invite room", async () => {
            const { asFragment } = await mountRoomView();
            expect(asFragment()).toMatchSnapshot();
        });

        it("handles accepting an invite", async () => {
            const { getByRole } = await mountRoomView();

            fireEvent.click(getByRole("button", { name: "Accept" }));

            await expect(untilDispatch(Action.JoinRoomReady, defaultDispatcher)).resolves.toStrictEqual(
                expect.objectContaining({
                    roomId: "!roomviewinviteshandlesacceptinganinvite:example.org",
                }),
            );
        });
        it("handles declining an invite", async () => {
            const { getByRole } = await mountRoomView();
            vi.spyOn(Modal, "createDialog").mockReturnValue({
                finished: Promise.resolve([true, false, false]),
                close: vi.fn(),
            });
            await fireEvent.click(getByRole("button", { name: "Decline" }));
            await waitFor(() => expect(cli.leave).toHaveBeenCalledWith(room.roomId));
            expect(cli.setIgnoredUsers).not.toHaveBeenCalled();
        });
        it("handles declining an invite and ignoring the user", async () => {
            const { getByRole } = await mountRoomView();
            cli.getIgnoredUsers.mockReturnValue(["@carol:example.org"]);
            vi.spyOn(Modal, "createDialog").mockReturnValue({
                finished: Promise.resolve([true, true, false]),
                close: vi.fn(),
            });
            await act(() => fireEvent.click(getByRole("button", { name: "Decline and block" })));
            expect(cli.leave).toHaveBeenCalledWith(room.roomId);
            expect(cli.setIgnoredUsers).toHaveBeenCalledWith(["@carol:example.org", "@bob:example.org"]);
        });
        it("prevents ignoring own user", async () => {
            const member = new RoomMember(room.roomId, cli.getSafeUserId());
            member.membership = KnownMembership.Invite;
            member.events.member = new MatrixEvent({
                /*
                It doesn't matter that this is an invite event coming from own user, we just
                want to simulate a situation where the sender of the membership event somehow
                ends up being own user.
                 */
                sender: cli.getSafeUserId(),
                content: { membership: KnownMembership.Invite },
            });
            vi.spyOn(room, "getMyMembership").mockReturnValue(KnownMembership.Invite);
            vi.spyOn(room, "getMember").mockReturnValue(member);

            const { getByRole } = await mountRoomView();
            cli.getIgnoredUsers.mockReturnValue(["@carol:example.org"]);
            vi.spyOn(Modal, "createDialog").mockReturnValue({
                finished: Promise.resolve([true, true, false]),
                close: vi.fn(),
            });

            await act(() => fireEvent.click(getByRole("button", { name: "Decline and block" })));

            // Should show error in a modal dialog
            await waitFor(() => {
                expect(Modal.createDialog).toHaveBeenLastCalledWith(ErrorDialog, {
                    title: "Failed to reject invite",
                    description: "Cannot determine which user to ignore since the member event has changed.",
                });
            });

            // The ignore call should not go through
            expect(cli.setIgnoredUsers).not.toHaveBeenCalled();
        });
        it("handles declining an invite and reporting the room", async () => {
            const { getByRole } = await mountRoomView();
            vi.spyOn(Modal, "createDialog").mockReturnValue({
                finished: Promise.resolve([true, false, "with a reason"]),
                close: vi.fn(),
            });
            await fireEvent.click(getByRole("button", { name: "Decline and block" }));
            expect(cli.leave).toHaveBeenCalledWith(room.roomId);
            expect(cli.reportRoom).toHaveBeenCalledWith(room.roomId, "with a reason");
        });
    });

    describe("when there is an old room", () => {
        let instance: RoomView;
        let oldRoom: Room;

        beforeEach(async () => {
            instance = await getRoomViewInstance();
            oldRoom = new Room("!old:example.com", cli, cli.getSafeUserId());
            rooms.set(oldRoom.roomId, oldRoom);
            vi.spyOn(room, "findPredecessor").mockReturnValue({ roomId: oldRoom.roomId });
        });

        it("and it has 0 unreads, getHiddenHighlightCount should return 0", async () => {
            vi.spyOn(oldRoom, "getUnreadNotificationCount").mockReturnValue(0);
            expect(instance.getHiddenHighlightCount()).toBe(0);
            // assert that msc3946ProcessDynamicPredecessor is false by default
            expect(room.findPredecessor).toHaveBeenCalledWith(false);
        });

        it("and it has 23 unreads, getHiddenHighlightCount should return 23", async () => {
            vi.spyOn(oldRoom, "getUnreadNotificationCount").mockReturnValue(23);
            expect(instance.getHiddenHighlightCount()).toBe(23);
        });

        describe("and feature_dynamic_room_predecessors is enabled", () => {
            beforeEach(() => {
                act(() => instance.setState({ msc3946ProcessDynamicPredecessor: true }));
            });

            afterEach(() => {
                act(() => instance.setState({ msc3946ProcessDynamicPredecessor: false }));
            });

            it("should pass the setting to findPredecessor", async () => {
                expect(instance.getHiddenHighlightCount()).toBe(0);
                expect(room.findPredecessor).toHaveBeenCalledWith(true);
            });
        });
    });

    it("updates url preview visibility on encryption state change", async () => {
        room.getMyMembership = vi.fn().mockReturnValue(KnownMembership.Join);
        vi.spyOn(cli, "getCrypto").mockReturnValue(crypto);
        // we should be starting unencrypted
        expect(await cli.getCrypto()?.isEncryptionEnabledInRoom(room.roomId)).toEqual(false);

        const roomViewInstance = await getRoomViewInstance();

        // in a default (non-encrypted room, it should start out with url previews enabled)
        // This is a white-box test in that we're asserting things about the state, which
        // is not ideal, but asserting that a URL preview just isn't there could risk the
        // test being invalid because the previews just hasn't rendered yet. This feels
        // like the safest way I think?
        // This also relies on the default settings being URL previews on normally and
        // off for e2e rooms because 1) it's probably useful to assert this and
        // 2) SettingsStore is a static class and so very hard to mock out.
        expect(roomViewInstance.state.showUrlPreview).toBe(true);

        // now enable encryption
        vi.spyOn(cli.getCrypto()!, "isEncryptionEnabledInRoom").mockResolvedValue(true);

        // and fake an encryption event into the room to prompt it to re-check
        act(() => {
            const encryptionEvent = new MatrixEvent({
                type: EventType.RoomEncryption,
                sender: cli.getUserId()!,
                content: {},
                event_id: "someid",
                room_id: room.roomId,
            });
            const roomState = room.getLiveTimeline().getState(EventTimeline.FORWARDS)!;
            cli.emit(RoomStateEvent.Events, encryptionEvent, roomState, null);
        });

        // URL previews should now be disabled
        await waitFor(() => expect(roomViewInstance.state.showUrlPreview).toBe(false));
    });

    it("should not display the timeline when the room encryption is loading", async () => {
        vi.spyOn(room, "getMyMembership").mockReturnValue(KnownMembership.Join);
        vi.spyOn(cli, "getCrypto").mockReturnValue(crypto);
        const deferred = Promise.withResolvers<boolean>();
        vi.spyOn(cli.getCrypto()!, "isEncryptionEnabledInRoom").mockImplementation(() => deferred.promise);

        const { asFragment, container } = await mountRoomView();
        expect(container.querySelector(".mx_RoomView_messagePanel")).toBeNull();
        expect(asFragment()).toMatchSnapshot();

        deferred.resolve(true);
        await waitFor(() => expect(container.querySelector(".mx_RoomView_messagePanel")).not.toBeNull());
        expect(asFragment()).toMatchSnapshot();
    });

    it("updates live timeline when a timeline reset happens", async () => {
        const roomViewInstance = await getRoomViewInstance();
        const oldTimeline = roomViewInstance.state.liveTimeline;

        act(() => room.getUnfilteredTimelineSet().resetLiveTimeline());
        expect(roomViewInstance.state.liveTimeline).not.toEqual(oldTimeline);
    });

    it("should update when the e2e status when the user verification changed", async () => {
        room.currentState.setStateEvents([
            mkRoomMemberJoinEvent(cli.getSafeUserId(), room.roomId),
            mkRoomMemberJoinEvent("user@example.com", room.roomId),
        ]);
        room.getMyMembership = vi.fn().mockReturnValue(KnownMembership.Join);
        // Not all the calls to cli.isRoomEncrypted are migrated, so we need to mock both.
        vi.mocked(cli.isRoomEncrypted).mockReturnValue(true);
        vi.spyOn(cli, "getCrypto").mockReturnValue(crypto);
        vi.spyOn(cli.getCrypto()!, "isEncryptionEnabledInRoom").mockResolvedValue(true);
        vi.spyOn(cli.getCrypto()!, "getUserVerificationStatus").mockResolvedValue(
            new UserVerificationStatus(false, false, false),
        );
        vi.spyOn(cli.getCrypto()!, "getUserDeviceInfo").mockResolvedValue(
            new Map([["user@example.com", new Map<string, any>()]]),
        );

        const { container } = await renderRoomView();
        // The room header shows no shield while the members are neither verified nor warned about.
        const verifiedIconSelector = ".mx_RoomHeader_icon.mx_Verified";
        await waitFor(() => expect(container.querySelector(verifiedIconSelector)).not.toBeInTheDocument());

        const verificationStatus = new UserVerificationStatus(true, true, false);
        vi.spyOn(cli.getCrypto()!, "getUserVerificationStatus").mockResolvedValue(verificationStatus);
        cli.emit(CryptoEvent.UserTrustStatusChanged, cli.getSafeUserId(), verificationStatus);
        await waitFor(() => expect(container.querySelector(verifiedIconSelector)).toHaveAccessibleName("Verified"));
    });

    describe("video rooms", () => {
        beforeEach(async () => {
            await setupAsyncStoreWithClient(CallStore.instance, MatrixClientPeg.safeGet());
            // Make it a video room
            room.isElementVideoRoom = () => true;
            await SettingsStore.setValue("feature_video_rooms", null, SettingLevel.DEVICE, true);
        });

        it("normally doesn't open the chat panel", async () => {
            vi.spyOn(NotificationState.prototype, "isUnread", "get").mockReturnValue(false);
            await mountRoomView();
            expect(stores.rightPanelStore.isOpen).toEqual(false);
        });

        it("opens the chat panel if there are unread messages", async () => {
            vi.spyOn(NotificationState.prototype, "isUnread", "get").mockReturnValue(true);
            await mountRoomView();
            expect(stores.rightPanelStore.isOpen).toEqual(true);
            expect(stores.rightPanelStore.currentCard.phase).toEqual(RightPanelPhases.Timeline);
        });

        it("should render joined video room view", async () => {
            vi.spyOn(room, "getMyMembership").mockReturnValue(KnownMembership.Join);
            const { asFragment } = await mountRoomView();
            expect(asFragment()).toMatchSnapshot();
        });

        it("should open timeline card when navigating to permalink", async () => {
            vi.spyOn(room, "getMyMembership").mockReturnValue(KnownMembership.Join);
            await mountRoomView();

            stores.rightPanelStore.setCard({ phase: RightPanelPhases.RoomSummary });

            expect(stores.rightPanelStore.isOpen).toEqual(true);
            expect(stores.rightPanelStore.currentCard.phase).not.toEqual(RightPanelPhases.Timeline);

            await stores.roomViewStore.viewRoom({
                action: Action.ViewRoom,
                room_id: stores.roomViewStore.getRoomId()!,
                event_id: "$eventId",
            });

            expect(stores.rightPanelStore.isOpen).toEqual(true);
            expect(stores.rightPanelStore.currentCard.phase).toEqual(RightPanelPhases.Timeline);
        });
    });

    describe("group calls", () => {
        beforeEach(async () => {
            await setupAsyncStoreWithClient(CallStore.instance, MatrixClientPeg.safeGet());
            vi.spyOn(room, "getMyMembership").mockReturnValue(KnownMembership.Join);
        });

        it("hides the right panel chat when closing a call", async () => {
            await mountRoomView();

            // Open the call
            await act(() =>
                stores.roomViewStore.viewRoom({
                    action: Action.ViewRoom,
                    room_id: stores.roomViewStore.getRoomId()!,
                    event_id: "$eventId",
                    view_call: true,
                }),
            );
            // Open the chat in the right panel
            act(() => stores.rightPanelStore.setCard({ phase: RightPanelPhases.Timeline }));
            // Chat should be visible in the right panel
            await findByRole(await screen.findByRole("complementary"), "heading", { name: "Chat" });

            // Close the call
            await act(() =>
                stores.roomViewStore.viewRoom({
                    action: Action.ViewRoom,
                    room_id: stores.roomViewStore.getRoomId()!,
                    event_id: "$eventId",
                    view_call: false,
                }),
            );
            // Right panel should be gone
            expect(screen.queryByRole("complementary")).toBe(null);
            // Opening the right panel again should just show the room summary
            act(() => stores.rightPanelStore.show(room.roomId));
            await findByRole(await screen.findByRole("complementary"), "heading", { name: room.roomId });
        });

        it("hides the right panel chat when returning to a room that previously showed a call", async () => {
            const room2 = new Room(`!roomswitchtest:example.org`, cli, "@alice:example.org");
            rooms.set(room2.roomId, room2);
            await mountRoomView();

            // Open the call
            await act(() =>
                stores.roomViewStore.viewRoom({
                    action: Action.ViewRoom,
                    room_id: room.roomId,
                    event_id: "$eventId",
                    view_call: true,
                }),
            );
            // Open the chat in the right panel
            act(() => stores.rightPanelStore.setCard({ phase: RightPanelPhases.Timeline }));
            // Chat should be visible in the right panel
            await findByRole(await screen.findByRole("complementary"), "heading", { name: "Chat" });

            // Navigate away to another room
            await act(() =>
                stores.roomViewStore.viewRoom({
                    action: Action.ViewRoom,
                    room_id: room2.roomId,
                    event_id: "$eventId",
                }),
            );
            // Navigate back to the original room
            await act(() =>
                stores.roomViewStore.viewRoom({
                    action: Action.ViewRoom,
                    room_id: room.roomId,
                    event_id: "$eventId",
                }),
            );
            // Right panel should be gone
            expect(screen.queryByRole("complementary")).toBe(null);
        });
    });

    describe("for a local room", () => {
        let localRoom: LocalRoom;

        beforeEach(async () => {
            localRoom = room = await createDmLocalRoom(cli, [new DirectoryMember({ user_id: "@user:example.com" })]);
            rooms.set(localRoom.roomId, localRoom);
            cli.store.storeRoom(room);
        });

        it("should remove the room from the store on unmount", async () => {
            const { unmount } = await renderRoomView();
            unmount();
            expect(cli.store.removeRoom).toHaveBeenCalledWith(room.roomId);
        });

        describe("in state NEW", () => {
            it("should match the snapshot", async () => {
                const { container } = await renderRoomView();
                expect(container).toMatchSnapshot();
            });

            describe("that is encrypted", () => {
                beforeEach(() => {
                    // Not all the calls to cli.isRoomEncrypted are migrated, so we need to mock both.
                    vi.mocked(cli.isRoomEncrypted).mockReturnValue(true);
                    vi.spyOn(cli, "getCrypto").mockReturnValue(crypto);
                    vi.spyOn(cli.getCrypto()!, "isEncryptionEnabledInRoom").mockResolvedValue(true);
                    vi.spyOn(cli.getCrypto()!, "getUserVerificationStatus").mockResolvedValue(
                        new UserVerificationStatus(false, false, false),
                    );
                    localRoom.encrypted = true;
                    localRoom.currentState.setStateEvents([
                        new MatrixEvent({
                            event_id: `~${localRoom.roomId}:${cli.makeTxnId()}`,
                            type: EventType.RoomEncryption,
                            content: {
                                algorithm: MEGOLM_ENCRYPTION_ALGORITHM,
                            },
                            sender: cli.getUserId()!,
                            state_key: "",
                            room_id: localRoom.roomId,
                            origin_server_ts: Date.now(),
                        }),
                    ]);
                });

                it("should match the snapshot", async () => {
                    const { container } = await renderRoomView();
                    await waitFor(() => expect(container).toMatchSnapshot());
                });
            });
        });

        it("in state CREATING should match the snapshot", async () => {
            localRoom.state = LocalRoomState.CREATING;
            const { container } = await renderRoomView();
            expect(container).toMatchSnapshot();
        });

        describe("in state ERROR", () => {
            beforeEach(async () => {
                localRoom.state = LocalRoomState.ERROR;
            });

            it("should match the snapshot", async () => {
                const { container } = await renderRoomView();
                expect(container).toMatchSnapshot();
            });

            it("clicking retry should set the room state to new dispatch a local room event", async () => {
                vi.spyOn(defaultDispatcher, "dispatch");
                const { getByText } = await renderRoomView();
                fireEvent.click(getByText("Retry"));
                expect(localRoom.state).toBe(LocalRoomState.NEW);
                expect(defaultDispatcher.dispatch).toHaveBeenCalledWith({
                    action: "local_room_event",
                    roomId: room.roomId,
                });
            });
        });
    });

    describe("when rendering a DM room with a single third-party invite", () => {
        beforeEach(async () => {
            room.currentState.setStateEvents([
                mkRoomMemberJoinEvent(cli.getSafeUserId(), room.roomId),
                mkThirdPartyInviteEvent(cli.getSafeUserId(), "user@example.com", room.roomId),
            ]);
            vi.spyOn(DMRoomMap.shared(), "getUserIdForRoomId").mockReturnValue(cli.getSafeUserId());
            vi.spyOn(DMRoomMap.shared(), "getRoomIds").mockReturnValue(new Set([room.roomId]));
            vi.spyOn(cli, "getCrypto").mockReturnValue(crypto);
            vi.spyOn(cli.getCrypto()!, "isEncryptionEnabledInRoom").mockResolvedValue(true);
            await renderRoomView();
        });

        it("should render the »waiting for third-party« view", () => {
            expect(screen.getByText("Waiting for users to join Matrix")).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Once invited users have joined Matrix, you will be able to chat and the room will be end-to-end encrypted",
                ),
            ).toBeInTheDocument();

            // no message composer
            expect(screen.queryByRole("textbox", { name: "Write a message…" })).not.toBeInTheDocument();
        });
    });

    it("should show error view if failed to look up room alias", async () => {
        const { asFragment, findByText } = await renderRoomView(false);

        act(() =>
            defaultDispatcher.dispatch<ViewRoomErrorPayload>({
                action: Action.ViewRoomError,
                room_alias: "#addy:server",
                room_id: null,
                err: new MatrixError({ errcode: "M_NOT_FOUND" }),
            }),
        );
        await emitPromise(stores.roomViewStore, UPDATE_EVENT);

        await findByText("Are you sure you're at the right place?");
        expect(asFragment()).toMatchSnapshot();
    });

    describe("rooms the client does not know about", () => {
        beforeEach(() => {
            // All we know about the room is what its summary tells us
            rooms.delete(room.roomId);
        });

        it("peeks into a world readable room", async () => {
            cli.getRoomSummary.mockResolvedValue({
                room_id: room.roomId,
                world_readable: true,
                guest_can_join: true,
                num_joined_members: 1,
            });
            cli.peekInRoom.mockResolvedValue(room);

            const instance = await getRoomViewInstance();

            expect(cli.peekInRoom).toHaveBeenCalledWith(room.roomId);
            expect(instance.state.room).toBe(room);
            expect(instance.state.isPeeking).toBe(true);
            expect(instance.state.peekAndSummaryLoading).toBe(false);
        });

        it("shows the join prompt when peeking fails", async () => {
            cli.getRoomSummary.mockResolvedValue({
                room_id: room.roomId,
                world_readable: true,
                guest_can_join: true,
                num_joined_members: 1,
            });
            cli.peekInRoom.mockRejectedValue(new MatrixError({ errcode: "M_FORBIDDEN" }));

            const instance = await getRoomViewInstance();

            expect(screen.getByRole("button", { name: "Join the discussion" })).toBeInTheDocument();
            expect(instance.state.isPeeking).toBe(false);
        });

        it("does not peek into a room which is not world readable and hands the summary to the store", async () => {
            const summary = {
                room_id: room.roomId,
                membership: KnownMembership.Leave,
                world_readable: false,
                guest_can_join: false,
                num_joined_members: 1,
            };
            cli.getRoomSummary.mockResolvedValue(summary);

            await mountRoomView();

            expect(cli.peekInRoom).not.toHaveBeenCalled();
            expect(screen.getByRole("button", { name: "Join the discussion" })).toBeInTheDocument();
            expect(stores.roomViewStore.getRoomSummary()).toEqual(summary);
        });

        it("peeks into a room we have already joined", async () => {
            cli.getRoomSummary.mockResolvedValue({
                room_id: room.roomId,
                membership: KnownMembership.Join,
                world_readable: false,
                guest_can_join: false,
                num_joined_members: 1,
            });
            cli.peekInRoom.mockResolvedValue(room);

            const instance = await getRoomViewInstance();

            expect(cli.peekInRoom).toHaveBeenCalledWith(room.roomId);
            expect(instance.state.room).toBe(room);
            expect(instance.state.peekAndSummaryLoading).toBe(false);
        });
    });

    describe("knock rooms", () => {
        const client = createTestClient();

        beforeEach(() => {
            vi.spyOn(SettingsStore, "getValue").mockImplementation((setting) => setting === "feature_ask_to_join");
            vi.spyOn(room, "getJoinRule").mockReturnValue(JoinRule.Knock);
            vi.spyOn(defaultDispatcher, "dispatch");
        });

        it("allows to request to join", async () => {
            vi.spyOn(MatrixClientPeg, "safeGet").mockReturnValue(client);
            vi.spyOn(client, "knockRoom").mockResolvedValue({ room_id: room.roomId });

            await mountRoomView();
            fireEvent.click(screen.getByRole("button", { name: "Request to join" }));
            await untilDispatch(Action.SubmitAskToJoin, defaultDispatcher);

            expect(defaultDispatcher.dispatch).toHaveBeenCalledWith({
                action: "submit_ask_to_join",
                roomId: room.roomId,
                opts: { reason: undefined },
            });
        });

        it("allows to request to join a room we don't know about yet", async () => {
            rooms.delete(room.roomId);
            cli.getRoomSummary.mockResolvedValue({
                room_id: room.roomId,
                join_rule: JoinRule.Knock,
                world_readable: false,
                guest_can_join: false,
                num_joined_members: 1,
            });

            await mountRoomView();

            expect(screen.getByRole("heading", { name: "Ask to join?" })).toBeInTheDocument();
            expect(cli.peekInRoom).not.toHaveBeenCalled();
        });

        it("shows the join prompt when the room summary cannot be fetched", async () => {
            rooms.delete(room.roomId);
            cli.getRoomSummary.mockRejectedValue(new MatrixError({ errcode: "M_NOT_FOUND" }));

            await mountRoomView();

            expect(screen.getByRole("button", { name: "Join the discussion" })).toBeInTheDocument();
        });

        it("allows to cancel a join request", async () => {
            vi.spyOn(MatrixClientPeg, "safeGet").mockReturnValue(client);
            vi.spyOn(client, "leave").mockResolvedValue({});
            vi.spyOn(room, "getMyMembership").mockReturnValue(KnownMembership.Knock);

            await mountRoomView();
            fireEvent.click(screen.getByRole("button", { name: "Cancel request" }));
            await untilDispatch(Action.CancelAskToJoin, defaultDispatcher);

            expect(defaultDispatcher.dispatch).toHaveBeenCalledWith({
                action: "cancel_ask_to_join",
                roomId: room.roomId,
            });
        });
    });

    describe("message search", () => {
        /** Edits a message as Telement does: from its right-click menu, which holds the toolbar's actions. */
        const editFromContextMenu = async (tile: HTMLElement): Promise<void> => {
            // The menu lists unsent messages, which this client's chronological ordering can't give
            room.getPendingEvents = vi.fn().mockReturnValue([]);
            fireEvent.contextMenu(tile);
            await userEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
        };

        it("should close search results when edit is clicked", async () => {
            room.getMyMembership = vi.fn().mockReturnValue(KnownMembership.Join);

            const eventMapper = (obj: Partial<IEvent>) => new MatrixEvent(obj);

            const roomViewRef = createRef<RoomView>();
            const { container, getByText } = await mountRoomView(roomViewRef);
            await waitFor(() => expect(roomViewRef.current).toBeTruthy());
            // @ts-ignore - triggering a search organically is a lot of work
            act(() =>
                roomViewRef.current!.setState({
                    search: {
                        searchId: 1,
                        roomId: room.roomId,
                        term: "search term",
                        scope: SearchScope.Room,
                        promise: Promise.resolve({
                            results: [
                                SearchResult.fromJson(
                                    {
                                        rank: 1,
                                        result: {
                                            content: {
                                                body: "search term",
                                                msgtype: "m.text",
                                            },
                                            type: "m.room.message",
                                            event_id: "$eventId",
                                            sender: cli.getSafeUserId(),
                                            origin_server_ts: 123456789,
                                            room_id: room.roomId,
                                        },
                                        context: {
                                            events_before: [],
                                            events_after: [],
                                            profile_info: {},
                                        },
                                    },
                                    eventMapper,
                                ),
                            ],
                            highlights: [],
                            count: 1,
                        }),
                        inProgress: false,
                        count: 1,
                    },
                }),
            );

            await waitFor(() => {
                expect(container.querySelector(".mx_RoomView_searchResultsPanel")).toBeVisible();
            });

            const searchResultTile = getByText("search term").closest(".mx_EventTile");
            expect(searchResultTile).not.toBeNull();

            await editFromContextMenu(searchResultTile as HTMLElement);

            await waitFor(() => {
                expect(container.querySelector(".mx_RoomView_searchResultsPanel")).not.toBeInTheDocument();
            });
        });

        describe("stepping through the results in the timeline (Telement)", () => {
            afterEach(() => {
                vi.mocked(defaultDispatcher.dispatch).mockRestore?.();
                vi.mocked(stores.roomViewStore.getInitialEventId).mockRestore?.();
            });

            const searchResult = (eventId: string, ts: number): SearchResult =>
                SearchResult.fromJson(
                    {
                        rank: 1,
                        result: {
                            content: { body: `pizza ${eventId}`, msgtype: "m.text" },
                            type: "m.room.message",
                            event_id: eventId,
                            sender: cli.getSafeUserId(),
                            origin_server_ts: ts,
                            room_id: room.roomId,
                        },
                        context: { events_before: [], events_after: [], profile_info: {} },
                    },
                    (obj: Partial<IEvent>) => new MatrixEvent(obj),
                );

            /** A room view showing the list of a search's two results, newest first, and the jumps it dispatches. */
            const searchRoom = async (): Promise<{ instance: RoomView; jumps: ViewRoomPayload[] }> => {
                room.getMyMembership = vi.fn().mockReturnValue(KnownMembership.Join);
                const ref = createRef<RoomView>();
                await mountRoomView(ref);
                await waitFor(() => expect(ref.current).toBeTruthy());
                const results = {
                    results: [searchResult("$newer", 2000), searchResult("$older", 1000)],
                    highlights: [],
                    count: 2,
                };
                act(() =>
                    ref.current!.setState({
                        timelineRenderingType: TimelineRenderingType.Search,
                        search: {
                            searchId: 1,
                            roomId: room.roomId,
                            term: "pizza",
                            scope: SearchScope.Room,
                            promise: Promise.resolve(results),
                        },
                    }),
                );
                await screen.findByRole("button", { name: "Older result" });

                const jumps: ViewRoomPayload[] = [];
                vi.spyOn(defaultDispatcher, "dispatch").mockImplementation((payload) => {
                    if (payload.action === Action.ViewRoom) jumps.push(payload as ViewRoomPayload);
                });
                return { instance: ref.current!, jumps };
            };

            it("opens the newest result in the timeline under the search bar, then older ones", async () => {
                const { instance, jumps } = await searchRoom();

                await userEvent.click(screen.getByRole("button", { name: "Older result" }));

                expect(jumps.at(-1)).toMatchObject({
                    event_id: "$newer",
                    highlighted: true,
                    telement_jump_origin: "readingPosition",
                });
                expect(screen.getByText("1 of 2")).toBeInTheDocument();
                expect(document.querySelector(".mx_RoomView_searchResultsPanel")).toBeNull();
                expect(instance.state.timelineRenderingType).toBe(TimelineRenderingType.Room);

                await userEvent.click(screen.getByRole("button", { name: "Older result" }));

                // Jump to bottom returns to where the timeline was read before the search, not to each result
                expect(jumps.at(-1)).toMatchObject({ event_id: "$older", telement_jump_origin: undefined });
                expect(screen.getByText("2 of 2")).toBeInTheDocument();
            });

            it("shows the list again", async () => {
                await searchRoom();
                await userEvent.click(screen.getByRole("button", { name: "Older result" }));

                await userEvent.click(screen.getByText("Show results"));

                await waitFor(() => expect(document.querySelector(".mx_RoomView_searchResultsPanel")).toBeVisible());
                expect(screen.queryByText("1 of 2")).toBeNull();
            });

            it("keeps the search bar for a result opened from the list, to step on from it", async () => {
                const { instance } = await searchRoom();
                vi.spyOn(stores.roomViewStore, "getInitialEventId").mockReturnValue("$older");

                await act(() => internals(instance).onRoomViewStoreUpdate());

                expect(instance.state.search?.hit).toBe(1);
                expect(instance.state.timelineRenderingType).toBe(TimelineRenderingType.Room);
                expect(screen.getByText("2 of 2")).toBeInTheDocument();
            });
        });

        it("should switch rooms when edit is clicked on a search result for a different room", async () => {
            const room2 = new Room(`!roomswitchtest:example.org`, cli, "@alice:example.org");
            rooms.set(room2.roomId, room2);
            // The result's own room decides whether its message menu offers Edit
            room2.getMyMembership = vi.fn().mockReturnValue(KnownMembership.Join);
            room2.getPendingEvents = vi.fn().mockReturnValue([]);

            room.getMyMembership = vi.fn().mockReturnValue(KnownMembership.Join);

            const eventMapper = (obj: Partial<IEvent>) => new MatrixEvent(obj);

            const roomViewRef = createRef<RoomView>();
            const { container, getByText } = await mountRoomView(roomViewRef);
            await waitFor(() => expect(roomViewRef.current).toBeTruthy());
            // @ts-ignore - triggering a search organically is a lot of work
            act(() =>
                roomViewRef.current!.setState({
                    search: {
                        searchId: 1,
                        roomId: room.roomId,
                        term: "search term",
                        scope: SearchScope.All,
                        promise: Promise.resolve({
                            results: [
                                SearchResult.fromJson(
                                    {
                                        rank: 1,
                                        result: {
                                            content: {
                                                body: "search term",
                                                msgtype: "m.text",
                                            },
                                            type: "m.room.message",
                                            event_id: "$eventId",
                                            sender: cli.getSafeUserId(),
                                            origin_server_ts: 123456789,
                                            room_id: room2.roomId,
                                        },
                                        context: {
                                            events_before: [],
                                            events_after: [],
                                            profile_info: {},
                                        },
                                    },
                                    eventMapper,
                                ),
                            ],
                            highlights: [],
                            count: 1,
                        }),
                        inProgress: false,
                        count: 1,
                    },
                }),
            );

            await waitFor(() => {
                expect(container.querySelector(".mx_RoomView_searchResultsPanel")).toBeVisible();
            });
            const prom = untilDispatch(Action.ViewRoom, defaultDispatcher);

            const searchResultTile = getByText("search term").closest(".mx_EventTile");
            expect(searchResultTile).not.toBeNull();

            await editFromContextMenu(searchResultTile as HTMLElement);

            await expect(prom).resolves.toEqual(expect.objectContaining({ room_id: room2.roomId }));
        });

        it.each(["", "  "])(
            "should search for nothing and show the timeline again for the query '%s'",
            async (query) => {
                room.getMyMembership = vi.fn().mockReturnValue(KnownMembership.Join);
                const roomViewRef = createRef<RoomView>();
                await mountRoomView(roomViewRef);
                await waitFor(() => expect(roomViewRef.current).toBeTruthy());
                const search = vi.spyOn(cli, "search").mockResolvedValue({ search_categories: {} as any });
                const onSearchChange = roomViewRef.current!["onSearchChange"];

                act(() => {
                    onSearchChange("pizza");
                    onSearchChange.flush();
                });
                await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
                expect(roomViewRef.current!.state.search?.term).toBe("pizza");

                act(() => {
                    onSearchChange(query);
                    onSearchChange.flush();
                });
                await flushPromises();

                expect(search).toHaveBeenCalledTimes(1);
                expect(roomViewRef.current!.state.search).toBeUndefined();
                expect(roomViewRef.current!.state.timelineRenderingType).toBe(TimelineRenderingType.Room);
            },
        );

        it("should pre-fill search field on FocusMessageSearch dispatch", async () => {
            room.getMyMembership = vi.fn().mockReturnValue(KnownMembership.Join);

            const roomViewRef = createRef<RoomView>();
            const { findByPlaceholderText } = await mountRoomView(roomViewRef);
            await waitFor(() => expect(roomViewRef.current).toBeTruthy());

            act(() =>
                defaultDispatcher.dispatch({
                    action: Action.FocusMessageSearch,
                    initialText: "search term",
                }),
            );

            await expect(findByPlaceholderText("Search messages…")).resolves.toHaveValue("search term");
        });
    });

    // Regression test for https://github.com/element-hq/element-web/issues/29072
    it("does not force a reload on sync unless the client is coming back online", async () => {
        cli.isInitialSyncComplete.mockReturnValue(false);

        const instance = await getRoomViewInstance();
        const onRoomViewUpdateMock = vi.fn();
        (instance as any).onRoomViewStoreUpdate = onRoomViewUpdateMock;

        act(() => {
            // As if a connectivity check happened (we are still offline)
            defaultDispatcher.dispatch({ action: "MatrixActions.sync" }, true);
            // ...so it still should not force a reload
            expect(onRoomViewUpdateMock).not.toHaveBeenCalledWith(true);
        });

        act(() => {
            // set us to online again
            cli.isInitialSyncComplete.mockReturnValue(true);
            defaultDispatcher.dispatch({ action: "MatrixActions.sync" }, true);
        });

        // It should now force a reload
        expect(onRoomViewUpdateMock).toHaveBeenCalledWith(true);
    });

    describe("handles Action.ComposerInsert", () => {
        it("redispatches an empty composerType with the current state", async () => {
            await mountRoomView();
            const promise = untilDispatch((payload) => {
                try {
                    expect(payload).toEqual({
                        action: Action.ComposerInsert,
                        text: "Hello world",
                        timelineRenderingType: TimelineRenderingType.Room,
                        composerType: ComposerType.Send,
                    });
                } catch {
                    return false;
                }
                return true;
            }, defaultDispatcher);
            defaultDispatcher.dispatch({
                action: Action.ComposerInsert,
                text: "Hello world",
                timelineRenderingType: TimelineRenderingType.Room,
            } satisfies ComposerInsertPayload);
            await promise;
        });
        it("ignores payloads with a timelineRenderingType != TimelineRenderingType.Thread", async () => {
            await mountRoomView();
            const promise = untilDispatch(
                (payload) => {
                    try {
                        expect(payload).toStrictEqual({
                            action: Action.ComposerInsert,
                            text: "Hello world",
                            timelineRenderingType: TimelineRenderingType.Thread,
                            composerType: ComposerType.Send,
                        });
                    } catch {
                        return false;
                    }
                    return true;
                },
                defaultDispatcher,
                500,
            );
            defaultDispatcher.dispatch({
                action: Action.ComposerInsert,
                text: "Hello world",
                composerType: ComposerType.Send,
                timelineRenderingType: TimelineRenderingType.Room,
                viaTest: true,
            } satisfies ComposerInsertPayload);
            await expect(promise).rejects.toThrow();
        });
    });

    it("should handle Action.ViewUser", async () => {
        await mountRoomView();
        vi.spyOn(stores.rightPanelStore, "setCards");
        const member = new User("@user:server");
        defaultDispatcher.dispatch(
            {
                action: Action.ViewUser,
                member,
            },
            true,
        );
        expect(stores.rightPanelStore.setCards).toHaveBeenCalledWith([
            { phase: RightPanelPhases.RoomSummary },
            { phase: RightPanelPhases.MemberList },
            { phase: RightPanelPhases.MemberInfo, state: { member } },
        ]);
    });

    it("should handle Action.ViewUser with push", async () => {
        await mountRoomView();
        vi.spyOn(stores.rightPanelStore, "pushCard");
        const member = new User("@user:server");
        defaultDispatcher.dispatch(
            {
                action: Action.ViewUser,
                member,
                push: true,
            },
            true,
        );
        expect(stores.rightPanelStore.pushCard).toHaveBeenCalledWith({
            phase: RightPanelPhases.MemberInfo,
            state: { member },
        });
    });

    it("should handle Action.View3pidInvite", async () => {
        await mountRoomView();
        vi.spyOn(stores.rightPanelStore, "showOrHidePhase");
        defaultDispatcher.dispatch(
            {
                action: Action.View3pidInvite,
            },
            true,
        );
        expect(stores.rightPanelStore.showOrHidePhase).toHaveBeenCalledWith("MemberList");
    });

    describe("when there is a RoomView", () => {
        const widget1Id = "widget1";
        const widget2Id = "widget2";
        const otherUserId = "@other:example.com";

        const addJitsiWidget = async (id: string, user: string, ts?: number): Promise<void> => {
            const widgetEvent = mkEvent({
                event: true,
                room: room.roomId,
                user,
                type: "im.vector.modular.widgets",
                content: {
                    id,
                    name: "Jitsi",
                    type: WidgetType.JITSI.preferred,
                    url: "https://example.com",
                },
                skey: id,
                ts,
            });
            await room.addLiveEvents([widgetEvent], { addToState: false });
            room.currentState.setStateEvents([widgetEvent]);
            cli.emit(RoomStateEvent.Events, widgetEvent, room.currentState, null);
            await flushPromises();
        };

        beforeEach(async () => {
            vi.spyOn(WidgetUtils, "setRoomWidget");
            const widgetStore = WidgetStore.instance;
            await setupAsyncStoreWithClient(widgetStore, cli);
            await getRoomViewInstance();
        });

        const itShouldNotRemoveTheLastWidget = (): void => {
            it("should not remove the last widget", (): void => {
                expect(WidgetUtils.setRoomWidget).not.toHaveBeenCalledWith(room.roomId, widget2Id);
            });
        };

        describe("and there is a Jitsi widget from another user", () => {
            beforeEach(async () => {
                await addJitsiWidget(widget1Id, otherUserId, 10_000);
            });

            describe("and the current user adds a Jitsi widget after 10s", () => {
                beforeEach(async () => {
                    await addJitsiWidget(widget2Id, cli.getSafeUserId(), 20_000);
                });

                it("the last Jitsi widget should be removed", () => {
                    expect(WidgetUtils.setRoomWidget).toHaveBeenCalledWith(cli, room.roomId, widget2Id);
                });
            });

            describe("and the current user adds a Jitsi widget after two minutes", () => {
                beforeEach(async () => {
                    await addJitsiWidget(widget2Id, cli.getSafeUserId(), 130_000);
                });

                itShouldNotRemoveTheLastWidget();
            });

            describe("and the current user adds a Jitsi widget without timestamp", () => {
                beforeEach(async () => {
                    await addJitsiWidget(widget2Id, cli.getSafeUserId());
                });

                itShouldNotRemoveTheLastWidget();
            });
        });

        describe("and there is a Jitsi widget from another user without timestamp", () => {
            beforeEach(async () => {
                await addJitsiWidget(widget1Id, otherUserId);
            });

            describe("and the current user adds a Jitsi widget", () => {
                beforeEach(async () => {
                    await addJitsiWidget(widget2Id, cli.getSafeUserId(), 10_000);
                });

                itShouldNotRemoveTheLastWidget();
            });
        });
    });

    it("should not change room when editing event in a room displayed in module", async () => {
        const room2 = new Room("!room2:example.org", cli, "@alice:example.org");
        rooms.set(room2.roomId, room2);
        room.getMyMembership = vi.fn().mockReturnValue(KnownMembership.Join);
        room2.getMyMembership = vi.fn().mockReturnValue(KnownMembership.Join);

        await mountRoomView();

        // Mock the spaceStore activeSpace and ModuleApi setup
        vi.spyOn(stores.spaceStore, "activeSpace", "get").mockReturnValue("space1");
        // Mock that room2 is displayed in a module
        ModuleApi.instance.extras.getVisibleRoomBySpaceKey("space1", () => [room2.roomId]);

        // Mock the roomViewStore method
        vi.spyOn(stores.roomViewStore, "isRoomDisplayedInModule").mockReturnValue(true);

        // Create an event in room2 to edit
        const eventInRoom2 = new MatrixEvent({
            type: "m.room.message",
            event_id: "$edit-event:example.org",
            room_id: room2.roomId,
            sender: "@alice:example.org",
            content: {
                body: "Original message",
                msgtype: "m.text",
            },
        });

        const dispatchSpy = vi.spyOn(defaultDispatcher, "dispatch");

        // Dispatch EditEvent for event in room2 (which is displayed in module)
        defaultDispatcher.dispatch({
            action: Action.EditEvent,
            event: eventInRoom2,
            timelineRenderingType: TimelineRenderingType.Room,
        });

        await flushPromises();

        // Should not dispatch ViewRoom action since room2 is displayed in module
        expect(dispatchSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({
                action: Action.ViewRoom,
                room_id: room2.roomId,
            }),
        );
    });
});
