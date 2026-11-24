/*
Copyright 2024 New Vector Ltd.
Copyright 2022, 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { vi, describe, it, expect, beforeEach, afterEach, type Mocked } from "vitest";
import { render, waitFor, screen, act, cleanup } from "test-utils-rtl";
import {
    ClientEvent,
    ReceiptType,
    EventTimelineSet,
    EventType,
    type MatrixClient,
    MatrixEvent,
    PendingEventOrdering,
    RelationType,
    Room,
    RoomEvent,
    RoomMember,
    RoomState,
    SyncState,
    TimelineWindow,
    EventTimeline,
    FeatureSupport,
    Thread,
    THREAD_RELATION_TYPE,
    ThreadEvent,
    ThreadFilterType,
} from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";
import React from "react";
import { forEachRight } from "lodash";
import {
    clientAndSDKContextRenderOptions,
    filterConsole,
    flushPromises,
    mkMembership,
    mkRoom,
    stubClient,
} from "test-utils";
import { mkThread } from "test-utils/threads";
import { createMessageEventContent } from "test-utils/events";

import TimelinePanel from "./TimelinePanel";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import SettingsStore from "../../settings/SettingsStore";
import ScrollPanel from "./ScrollPanel";
import MessagePanel from "./MessagePanel";
import UserActivity from "../../UserActivity";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import { SettingLevel } from "../../settings/SettingLevel";
import MatrixClientBackedController from "../../settings/controllers/MatrixClientBackedController";
import { SDKContextClass } from "../../contexts/SDKContextClass";
import type Timer from "../../utils/Timer";
import { AppFocusTimer } from "../../telement/timeline/AppFocusTimer";

// ScrollPanel calls this, but jsdom doesn't mock it for us
HTMLDivElement.prototype.scrollBy = () => {};

const newReceipt = (eventId: string, userId: string, readTs: number, fullyReadTs: number): MatrixEvent => {
    const receiptContent = {
        [eventId]: {
            [ReceiptType.Read]: { [userId]: { ts: readTs } },
            [ReceiptType.ReadPrivate]: { [userId]: { ts: readTs } },
            [ReceiptType.FullyRead]: { [userId]: { ts: fullyReadTs } },
        },
    };
    return new MatrixEvent({ content: receiptContent, type: EventType.Receipt });
};

const mkTimeline = (room: Room, events: MatrixEvent[]): [EventTimeline, EventTimelineSet] => {
    const timelineSet = {
        room: room as Room,
        getLiveTimeline: () => timeline,
        getTimelineForEvent: () => timeline,
        getPendingEvents: () => [] as MatrixEvent[],
    } as unknown as EventTimelineSet;
    const timeline = new EventTimeline(timelineSet);
    events.forEach((event) => timeline.addEvent(event, { toStartOfTimeline: false, addToState: true }));

    return [timeline, timelineSet];
};

const getProps = (room: Room, events: MatrixEvent[]): TimelinePanel["props"] => {
    const [, timelineSet] = mkTimeline(room, events);

    return {
        timelineSet,
        manageReadReceipts: true,
        sendReadReceiptOnLoad: true,
    };
};

const mockEvents = (room: Room, count = 2): MatrixEvent[] => {
    const events: MatrixEvent[] = [];
    for (let index = 0; index < count; index++) {
        const event = new MatrixEvent({
            room_id: room.roomId,
            event_id: `${room.roomId}_event_${index}`,
            type: EventType.RoomMessage,
            sender: "userId",
            content: createMessageEventContent("`Event${index}`"),
            origin_server_ts: index,
        });
        event.localTimestamp = index;
        events.push(event);
    }

    return events;
};

const setupTestData = (): [MatrixClient, Room, MatrixEvent[]] => {
    const client = MatrixClientPeg.safeGet();
    const room = mkRoom(client, "roomId");
    const events = mockEvents(room);
    return [client, room, events];
};

const expectEvents = (container: HTMLElement, events: MatrixEvent[]): void => {
    const eventTiles = container.querySelectorAll(".mx_EventTile");
    const eventTileIds = [...eventTiles].map((tileElement) => tileElement.getAttribute("data-event-id"));
    expect(eventTileIds).toEqual(events.map((ev) => ev.getId()));
};

const withScrollPanelMountSpy = async (
    continuation: (mountSpy: ReturnType<typeof vi.spyOn>) => Promise<void>,
): Promise<void> => {
    const mountSpy = vi.spyOn(ScrollPanel.prototype, "componentDidMount");
    try {
        await continuation(mountSpy);
    } finally {
        mountSpy.mockRestore();
    }
};

const setupPagination = (
    client: MatrixClient,
    timeline: EventTimeline,
    previousPage: MatrixEvent[] | null,
    nextPage: MatrixEvent[] | null,
): void => {
    timeline.setPaginationToken(previousPage === null ? null : "start", EventTimeline.BACKWARDS);
    timeline.setPaginationToken(nextPage === null ? null : "end", EventTimeline.FORWARDS);
    vi.mocked(client).paginateEventTimeline.mockImplementation(async (tl, { backwards }) => {
        if (tl === timeline) {
            if (backwards) {
                forEachRight(previousPage ?? [], (event) =>
                    tl.addEvent(event, { toStartOfTimeline: true, addToState: true }),
                );
            } else {
                (nextPage ?? []).forEach((event) => tl.addEvent(event, { toStartOfTimeline: false, addToState: true }));
            }
            // Prevent any further pagination attempts in this direction
            tl.setPaginationToken(null, backwards ? EventTimeline.BACKWARDS : EventTimeline.FORWARDS);
            return true;
        } else {
            return false;
        }
    });
};

describe("TimelinePanel", () => {
    let client: Mocked<MatrixClient>;
    let sdkContext: SDKContextClass;
    let userId: string;

    filterConsole("checkForPreJoinUISI: showing all messages, skipping check");

    beforeEach(() => {
        client = vi.mocked(stubClient());
        userId = client.getSafeUserId();
        sdkContext = new SDKContextClass();
    });

    describe("read receipts and markers", () => {
        const roomId = "#room:example.com";
        let room: Room;
        let timelineSet: EventTimelineSet;
        let timelinePanel: TimelinePanel | null = null;

        const ev1 = new MatrixEvent({
            event_id: "ev1",
            sender: "@u2:m.org",
            origin_server_ts: 111,
            type: EventType.RoomMessage,
            content: createMessageEventContent("hello 1"),
        });

        const ev2 = new MatrixEvent({
            event_id: "ev2",
            sender: "@u2:m.org",
            origin_server_ts: 222,
            type: EventType.RoomMessage,
            content: createMessageEventContent("hello 2"),
        });

        const renderTimelinePanel = async (): Promise<void> => {
            render(
                <TimelinePanel
                    timelineSet={timelineSet}
                    manageReadMarkers={true}
                    manageReadReceipts={true}
                    ref={(ref) => {
                        timelinePanel = ref;
                    }}
                />,
                clientAndSDKContextRenderOptions(client, sdkContext),
            );
            await flushPromises();
            await waitFor(() => expect(timelinePanel).toBeTruthy());
        };

        const setUpTimelineSet = (threadRoot?: MatrixEvent) => {
            let thread: Thread | undefined = undefined;

            if (threadRoot) {
                thread = new Thread(threadRoot.getId()!, threadRoot, {
                    client: client,
                    room,
                });
            }

            timelineSet = new EventTimelineSet(room, {}, client, thread);
            timelineSet.on(RoomEvent.Timeline, (...args) => {
                // TimelinePanel listens for live events on the client.
                // → Re-emit on the client.
                client.emit(RoomEvent.Timeline, ...args);
            });
        };

        beforeEach(() => {
            room = new Room(roomId, client, userId, { pendingEventOrdering: PendingEventOrdering.Detached });
        });

        afterEach(async () => {
            TimelinePanel.roomReadMarkerTsMap = {};
            cleanup();
        });

        it("when there is no event, it should not send any receipt", async () => {
            setUpTimelineSet();
            await renderTimelinePanel();
            await flushPromises();

            // @ts-ignore
            await timelinePanel.sendReadReceipts();

            expect(client.setRoomReadMarkers).not.toHaveBeenCalled();
            expect(client.sendReadReceipt).not.toHaveBeenCalled();
        });

        describe("when there is a non-threaded timeline", () => {
            beforeEach(() => {
                setUpTimelineSet();
            });

            describe("and reading the timeline", () => {
                beforeEach(async () => {
                    await renderTimelinePanel();
                    timelineSet.addLiveEvent(ev1, { addToState: true });
                    await flushPromises();
                    // @ts-ignore
                    await timelinePanel.sendReadReceipts();
                    // @ts-ignore Simulate user activity by calling updateReadMarker on the TimelinePanel.
                    await timelinePanel.updateReadMarker();
                });

                it("should send a fully read marker and a public receipt", async () => {
                    expect(client.setRoomReadMarkers).toHaveBeenCalledWith(roomId, ev1.getId());
                    expect(client.sendReadReceipt).toHaveBeenCalledWith(ev1, ReceiptType.Read);
                });

                describe("and reading the timeline again", () => {
                    beforeEach(async () => {
                        client.sendReadReceipt.mockClear();
                        client.setRoomReadMarkers.mockClear();

                        // @ts-ignore Simulate user activity by calling updateReadMarker on the TimelinePanel.
                        await act(() => timelinePanel.updateReadMarker());
                    });

                    it("should not send receipts again", () => {
                        expect(client.sendReadReceipt).not.toHaveBeenCalled();
                        expect(client.setRoomReadMarkers).not.toHaveBeenCalled();
                    });

                    it("and forgetting the read markers, should send the stored marker again", async () => {
                        timelineSet.addLiveEvent(ev2, { addToState: true });
                        // Add the event to the room as well as the timeline, so we can find it when we
                        // call findEventById in getEventReadUpTo. This is odd because in our test
                        // setup, timelineSet is not actually the timelineSet of the room.
                        await room.addLiveEvents([ev2], { addToState: true });
                        room.addEphemeralEvents([newReceipt(ev2.getId()!, userId, 222, 200)]);
                        await timelinePanel!.forgetReadMarker();
                        expect(client.setRoomReadMarkers).toHaveBeenCalledWith(roomId, ev2.getId());
                    });
                });
            });

            describe("and sending receipts is disabled", () => {
                beforeEach(async () => {
                    // Ensure this setting is supported, otherwise it will use the default value.
                    client.isVersionSupported.mockImplementation(async (v) => v === "v1.4");
                    MatrixClientBackedController.matrixClient = client;
                    await SettingsStore.setValue("sendReadReceipts", null, SettingLevel.DEVICE, false);
                });

                afterEach(() => {
                    SettingsStore.reset();
                });

                it("should send a fully read marker and a private receipt", async () => {
                    await renderTimelinePanel();
                    act(() => timelineSet.addLiveEvent(ev1, { addToState: true }));
                    await flushPromises();

                    // @ts-ignore
                    await timelinePanel.sendReadReceipts();

                    // Expect the private reception to be sent directly
                    expect(client.sendReadReceipt).toHaveBeenCalledWith(ev1, ReceiptType.ReadPrivate);
                    // Expect the fully_read marker not to be send yet
                    expect(client.setRoomReadMarkers).not.toHaveBeenCalled();

                    await flushPromises();
                    client.sendReadReceipt.mockClear();

                    // @ts-ignore simulate user activity
                    await timelinePanel.updateReadMarker();

                    // It should not send the receipt again.
                    expect(client.sendReadReceipt).not.toHaveBeenCalledWith(ev1, ReceiptType.ReadPrivate);
                    // Expect the fully_read marker to be sent after user activity.
                    await waitFor(() => expect(client.setRoomReadMarkers).toHaveBeenCalledWith(roomId, ev1.getId()));
                });
            });
        });

        describe("and there is a thread timeline", () => {
            const threadEv1 = new MatrixEvent({
                event_id: "thread_ev1",
                sender: "@u2:m.org",
                origin_server_ts: 222,
                type: EventType.RoomMessage,
                content: {
                    ...createMessageEventContent("hello 2"),
                    "m.relates_to": {
                        event_id: ev1.getId(),
                        rel_type: RelationType.Thread,
                    },
                },
            });

            beforeEach(() => {
                client.supportsThreads.mockReturnValue(true);
                setUpTimelineSet(ev1);
            });

            it("should send receipts but no fully_read when reading the thread timeline", async () => {
                await renderTimelinePanel();
                act(() => timelineSet.addLiveEvent(threadEv1, { addToState: true }));
                await flushPromises();

                // @ts-ignore
                await act(() => timelinePanel.sendReadReceipts());

                // fully_read is not supported for threads per spec
                expect(client.setRoomReadMarkers).not.toHaveBeenCalled();
                expect(client.sendReadReceipt).toHaveBeenCalledWith(threadEv1, ReceiptType.Read);
            });
        });
    });

    describe("enableReadReceiptsAndMarkersOnActivity", () => {
        it.each([
            {
                enabled: false,
                testName: "should not set up activity timers when disabled",
                checkCall: (
                    readReceiptTimer: Timer | null,
                    readMarkerTimer: Timer | null,
                    readMarkerFocusTimer: AppFocusTimer | null,
                ) => {
                    expect(readReceiptTimer).toBeNull();
                    expect(readMarkerTimer).toBeNull();
                    expect(readMarkerFocusTimer).toBeNull();
                },
            },
            {
                enabled: true,
                testName: "should set up activity timers when enabled",
                checkCall: (
                    readReceiptTimer: Timer | null,
                    readMarkerTimer: Timer | null,
                    readMarkerFocusTimer: AppFocusTimer | null,
                ) => {
                    expect(readReceiptTimer).toBeTruthy();
                    expect(readMarkerTimer).toBeTruthy();
                    expect(readMarkerFocusTimer).toBeTruthy();
                },
            },
        ])("$testName", async ({ enabled, checkCall }) => {
            const room = mkRoom(client, "roomId");
            const events = mockEvents(room);
            const [, timelineSet] = mkTimeline(room, events);

            let timelinePanel: TimelinePanel | null = null;

            render(
                <TimelinePanel
                    timelineSet={timelineSet}
                    manageReadMarkers={true}
                    manageReadReceipts={true}
                    enableReadReceiptsAndMarkersOnActivity={enabled}
                    ref={(ref) => {
                        timelinePanel = ref;
                    }}
                />,
                clientAndSDKContextRenderOptions(client, sdkContext),
            );

            await waitFor(() => expect(timelinePanel).toBeTruthy());

            // Check if the activity timers were set up
            // @ts-ignore - accessing private property for testing
            const readReceiptTimer = timelinePanel!.readReceiptActivityTimer;
            // @ts-ignore - accessing private property for testing
            const readMarkerTimer = timelinePanel!.readMarkerActivityTimer;
            // @ts-ignore - accessing private property for testing
            const readMarkerFocusTimer = timelinePanel!.readMarkerFocusTimer;

            checkCall(readReceiptTimer, readMarkerTimer, readMarkerFocusTimer);
        });
    });

    describe("unread line", () => {
        const roomId = "!room:example.com";
        const otherUserId = "@u2:m.org";
        const IN_VIEW_MS = 3000;
        const OUT_OF_VIEW_MS = 30000;
        // How long the position of the line is left to settle before it is looked at
        const DEBOUNCE_MS = 100;
        const RECEIPT_MS = 500;

        let room: Room;
        let timelineSet: EventTimelineSet;
        let container: HTMLElement;
        let markerPosition: number | null;
        let isAtBottom: boolean;

        const mkMessage = (eventId: string, sender = otherUserId, threadRootId?: string): MatrixEvent =>
            new MatrixEvent({
                event_id: eventId,
                room_id: roomId,
                sender,
                origin_server_ts: Number(eventId.slice(2)),
                type: EventType.RoomMessage,
                content: {
                    ...createMessageEventContent(`message ${eventId}`),
                    ...(threadRootId && {
                        "m.relates_to": { event_id: threadRootId, rel_type: RelationType.Thread },
                    }),
                },
            });

        const setFocused = (focused: boolean): void => {
            vi.spyOn(document, "hasFocus").mockReturnValue(focused);
            window.dispatchEvent(new Event(focused ? "focus" : "blur"));
        };

        const setVisible = (visible: boolean): void => {
            vi.spyOn(document, "visibilityState", "get").mockReturnValue(visible ? "visible" : "hidden");
            document.dispatchEvent(new Event("visibilitychange"));
        };

        const advance = (ms: number): Promise<void> =>
            act(async () => {
                await vi.advanceTimersByTimeAsync(ms);
            });

        const receive = async (...events: MatrixEvent[]): Promise<void> => {
            act(() => events.forEach((event) => timelineSet.addLiveEvent(event, { addToState: true })));
            await advance(0);
        };

        const setFullyRead = (eventId: string): void =>
            room.addAccountData([new MatrixEvent({ type: EventType.FullyRead, content: { event_id: eventId } })]);

        /** Opens a room where `ev1` is the last message read. */
        const openRoom = async (
            events: MatrixEvent[],
            props: Partial<TimelinePanel["props"]> = {},
            thread?: Thread,
        ): Promise<void> => {
            timelineSet = new EventTimelineSet(room, {}, client, thread);
            timelineSet.on(RoomEvent.Timeline, (...args) => {
                client.emit(RoomEvent.Timeline, ...args);
            });
            events.forEach((event) => timelineSet.addLiveEvent(event, { addToState: true }));
            await openTimeline(props);
        };

        const openTimeline = async (props: Partial<TimelinePanel["props"]> = {}): Promise<void> => {
            ({ container } = render(
                <TimelinePanel
                    timelineSet={timelineSet}
                    manageReadMarkers={true}
                    manageReadReceipts={true}
                    {...props}
                />,
                clientAndSDKContextRenderOptions(client, sdkContext),
            ));
            await advance(DEBOUNCE_MS);
            vi.mocked(client.sendReadReceipt).mockClear();
            vi.mocked(client.setRoomReadMarkers).mockClear();
        };

        /** The messages that a line is drawn under, the one being faded out included. */
        const messagesAboveLines = (): (string | null | undefined)[] =>
            [...container.querySelectorAll(".mx_MessagePanel_myReadMarker")]
                .filter((marker) => marker.querySelector("hr"))
                .map((marker) => marker.previousElementSibling?.getAttribute("data-event-id"));

        /** The message that the marker is under, whether its line is drawn or not. */
        const messageAboveMarker = (): string | null | undefined =>
            container
                .querySelector(".mx_MessagePanel_myReadMarker[data-scroll-tokens]")
                ?.previousElementSibling?.getAttribute("data-event-id");

        /** Ends the transitions that fade out a line. */
        const endFades = (): void =>
            container.querySelectorAll(".mx_MessagePanel_myReadMarker:not([data-scroll-tokens]) hr").forEach((line) => {
                act(() => {
                    line.dispatchEvent(new Event("transitionend", { bubbles: true }));
                });
            });

        const expectLineToGoAfter = async (ms: number): Promise<void> => {
            await advance(ms - 1);
            expect(messagesAboveLines()).toEqual(["ev1"]);
            await advance(1);
            endFades();
            expect(messagesAboveLines()).toEqual([]);
        };

        beforeEach(() => {
            vi.useFakeTimers();
            window.mxUserActivity = new UserActivity(window, document);
            room = new Room(roomId, client, userId, { pendingEventOrdering: PendingEventOrdering.Detached });
            setFullyRead("ev1");
            setFocused(true);
            setVisible(true);
            markerPosition = 0;
            isAtBottom = true;
            vi.spyOn(MessagePanel.prototype, "getReadMarkerPosition").mockImplementation(() => markerPosition);
            vi.spyOn(MessagePanel.prototype, "getScrollState").mockImplementation(() => ({
                stuckAtBottom: isAtBottom,
            }));
        });

        afterEach(() => {
            cleanup();
            window.mxUserActivity.stop();
            TimelinePanel.roomReadMarkerTsMap = {};
            vi.useRealTimers();
            vi.restoreAllMocks();
        });

        it("isn't drawn for a message that arrives at the bottom while the app is focused, whose marker moves", async () => {
            await openRoom([mkMessage("ev1")]);
            await receive(mkMessage("ev2"));

            expect(messagesAboveLines()).toEqual([]);
            expect(messageAboveMarker()).toBe("ev2");
        });

        it("is drawn for a message that arrives while the app is focused but hidden", async () => {
            await openRoom([mkMessage("ev1")]);
            setVisible(false);
            await receive(mkMessage("ev2"));

            expect(messagesAboveLines()).toEqual(["ev1"]);
        });

        it("stays while the app isn't focused, and goes on its own once it is", async () => {
            await openRoom([mkMessage("ev1")]);
            setFocused(false);
            await receive(mkMessage("ev2"));
            await advance(2 * OUT_OF_VIEW_MS);
            expect(messagesAboveLines()).toEqual(["ev1"]);

            setFocused(true);
            await expectLineToGoAfter(IN_VIEW_MS);
            expect(messageAboveMarker()).toBe("ev2");
        });

        it.each([
            ["the app loses the focus", setFocused],
            ["the app is hidden", setVisible],
        ])("starts its time over when %s", async (_, setAttended) => {
            await openRoom([mkMessage("ev1"), mkMessage("ev2")]);
            setAttended(false);
            setAttended(true);
            await advance(IN_VIEW_MS - 1);
            setAttended(false);
            await advance(2 * OUT_OF_VIEW_MS);
            expect(messagesAboveLines()).toEqual(["ev1"]);

            setAttended(true);
            await expectLineToGoAfter(IN_VIEW_MS);
        });

        it("is drawn above the first unread message of a room that is opened, and goes on its own", async () => {
            await openRoom([mkMessage("ev1"), mkMessage("ev2"), mkMessage("ev3")]);

            expect(messagesAboveLines()).toEqual(["ev1"]);
            await expectLineToGoAfter(IN_VIEW_MS - DEBOUNCE_MS);
            expect(messageAboveMarker()).toBe("ev3");
        });

        it("goes on its own after a longer time while it is above the messages in view", async () => {
            markerPosition = -1;
            await openRoom([mkMessage("ev1"), mkMessage("ev2")]);

            await expectLineToGoAfter(OUT_OF_VIEW_MS - DEBOUNCE_MS);
            expect(messageAboveMarker()).toBe("ev2");
        });

        it("marks where the unread messages start if they arrive while the timeline isn't at the bottom", async () => {
            await openRoom([mkMessage("ev1"), mkMessage("ev2")]);
            isAtBottom = false;
            await receive(mkMessage("ev3"));

            expect(messagesAboveLines()).toEqual(["ev1"]);
            await expectLineToGoAfter(IN_VIEW_MS - DEBOUNCE_MS);
        });

        it("stays where it is while it is below the messages in view", async () => {
            await openRoom([mkMessage("ev1"), mkMessage("ev2")]);
            isAtBottom = false;
            markerPosition = 1;
            await advance(2 * OUT_OF_VIEW_MS);

            expect(messageAboveMarker()).toBe("ev1");
        });

        it("doesn't come back with the next events until a message arrives while the app isn't focused", async () => {
            await openRoom([mkMessage("ev1")]);
            await receive(mkMessage("ev2"));
            await act(async () => setFullyRead("ev1"));
            await receive(mkMessage("ev3"), mkMessage("ev4", userId));
            await receive(mkMessage("ev5"));
            await advance(OUT_OF_VIEW_MS);
            expect(messagesAboveLines()).toEqual([]);

            setFocused(false);
            await receive(mkMessage("ev6"));
            expect(messagesAboveLines()).toEqual(["ev5"]);
        });

        describe("and what is sent to the server", () => {
            const beActive = async (): Promise<void> => {
                window.mxUserActivity.start();
                document.dispatchEvent(new Event("keydown"));
                await advance(RECEIPT_MS);
            };

            it("sends nothing for messages that the user only watches arriving", async () => {
                await openRoom([mkMessage("ev1")]);
                await receive(mkMessage("ev2"));
                await advance(2 * OUT_OF_VIEW_MS);

                expect(messageAboveMarker()).toBe("ev2");
                expect(client.sendReadReceipt).not.toHaveBeenCalled();
                expect(client.setRoomReadMarkers).not.toHaveBeenCalled();
            });

            it("sends nothing for a line that goes on its own", async () => {
                setFocused(false);
                await openRoom([mkMessage("ev1")]);
                await receive(mkMessage("ev2"));
                setFocused(true);
                await advance(2 * OUT_OF_VIEW_MS);

                expect(messageAboveMarker()).toBe("ev2");
                expect(client.sendReadReceipt).not.toHaveBeenCalled();
                expect(client.setRoomReadMarkers).not.toHaveBeenCalled();
            });

            it("sends the receipt and the fully_read of the watched message once the user is active", async () => {
                await openRoom([mkMessage("ev1")]);
                const watched = mkMessage("ev2");
                await receive(watched);
                await beActive();

                expect(client.sendReadReceipt).toHaveBeenCalledWith(watched, ReceiptType.Read);
                expect(client.setRoomReadMarkers).toHaveBeenCalledWith(roomId, "ev2");
            });

            it.each([
                ["a message that arrived", true],
                ["a line that went on its own", false],
            ])("sends no fully_read when the timeline is loaded again after %s", async (_, focused) => {
                await openRoom([mkMessage("ev1")]);
                setFocused(focused);
                await receive(mkMessage("ev2"));
                setFocused(true);
                await advance(IN_VIEW_MS);
                act(() => {
                    client.emit(RoomEvent.TimelineReset, room, timelineSet, true);
                });
                await advance(DEBOUNCE_MS);

                expect(messageAboveMarker()).toBe("ev2");
                expect(client.sendReadReceipt).toHaveBeenCalled();
                expect(client.setRoomReadMarkers).not.toHaveBeenCalled();
            });

            it("isn't drawn when a room whose watched messages the user was active after is opened again", async () => {
                vi.mocked(client.setRoomReadMarkers).mockImplementation(async (_roomId, eventId) => {
                    setFullyRead(eventId);
                    return {};
                });
                await openRoom([mkMessage("ev1")]);
                await receive(mkMessage("ev2"));
                await beActive();
                cleanup();
                await openTimeline();

                expect(messageAboveMarker()).toBe("ev2");
                expect(messagesAboveLines()).toEqual([]);
            });
        });

        it("isn't drawn for a message that arrives in a focused app's thread, and nothing is sent for it", async () => {
            vi.mocked(client.supportsThreads).mockReturnValue(true);
            const threadRoot = mkMessage("ev0");
            const thread = new Thread(threadRoot.getId()!, threadRoot, { client, room });
            await openRoom([mkMessage("ev1", otherUserId, "ev0")], { hideThreadedMessages: false }, thread);
            await receive(mkMessage("ev2", otherUserId, "ev0"));
            await advance(2 * OUT_OF_VIEW_MS);

            expect(messagesAboveLines()).toEqual([]);
            expect(messageAboveMarker()).toBe("ev2");
            expect(client.sendReadReceipt).not.toHaveBeenCalled();
            expect(client.setRoomReadMarkers).not.toHaveBeenCalled();
        });

        it("follows the focus of the app no more than the user's activity where neither moves the marker", async () => {
            await openRoom([mkMessage("ev1")], { enableReadReceiptsAndMarkersOnActivity: false });
            await receive(mkMessage("ev2"));
            await advance(2 * OUT_OF_VIEW_MS);

            expect(messagesAboveLines()).toEqual(["ev1"]);
        });

        it("stops following the focus of the app when the timeline is closed", async () => {
            const stopTimer = vi.spyOn(AppFocusTimer.prototype, "stop");
            await openRoom([mkMessage("ev1")]);
            expect(stopTimer).not.toHaveBeenCalled();

            cleanup();
            expect(stopTimer).toHaveBeenCalledTimes(1);
        });

        it("doesn't exist in a timeline that doesn't manage read markers", async () => {
            await openRoom([mkMessage("ev1")], { manageReadMarkers: false });
            await receive(mkMessage("ev2"));
            await advance(2 * OUT_OF_VIEW_MS);

            expect(container.querySelector(".mx_MessagePanel_myReadMarker")).toBeNull();
            expect(client.setRoomReadMarkers).not.toHaveBeenCalled();
        });
    });

    it("should scroll event into view when props.eventId changes", () => {
        const client = MatrixClientPeg.safeGet();
        const room = mkRoom(client, "roomId");
        const events = mockEvents(room);

        const props = {
            ...getProps(room, events),
            onEventScrolledIntoView: vi.fn(),
        };

        const { rerender } = render(<TimelinePanel {...props} />);
        expect(props.onEventScrolledIntoView).toHaveBeenCalledWith(undefined);
        props.eventId = events[1].getId();
        rerender(<TimelinePanel {...props} />);
        expect(props.onEventScrolledIntoView).toHaveBeenCalledWith(events[1].getId());
    });

    it("should scroll the event into view again when the same event is re-requested", () => {
        const client = MatrixClientPeg.safeGet();
        const room = mkRoom(client, "roomId");
        const events = mockEvents(room);

        const props = {
            ...getProps(room, events),
            eventId: events[1].getId(),
            eventScrollIntoView: true,
            onEventScrolledIntoView: vi.fn(),
        };

        const { rerender } = render(<TimelinePanel {...props} />);
        expect(props.onEventScrolledIntoView).toHaveBeenCalledTimes(1);

        // RoomView clears the flag once the jump has landed, so the event stays put on re-render.
        props.eventScrollIntoView = false;
        rerender(<TimelinePanel {...props} />);
        expect(props.onEventScrolledIntoView).toHaveBeenCalledTimes(1);

        // Clicking the same permalink a second time asks for the very same event again.
        props.eventScrollIntoView = true;
        rerender(<TimelinePanel {...props} />);
        expect(props.onEventScrolledIntoView).toHaveBeenCalledTimes(2);
    });

    it("paginates", async () => {
        const [client, room, events] = setupTestData();
        const eventsPage1 = events.slice(0, 1);
        const eventsPage2 = events.slice(1, 2);

        // Start with only page 2 of the main events in the window
        const [timeline, timelineSet] = mkTimeline(room, eventsPage2);
        setupPagination(client, timeline, eventsPage1, null);

        await withScrollPanelMountSpy(async (mountSpy) => {
            const { container } = render(
                <TimelinePanel {...getProps(room, events)} timelineSet={timelineSet} />,
                clientAndSDKContextRenderOptions(client, sdkContext),
            );

            await waitFor(() => expectEvents(container, [events[1]]));

            // ScrollPanel has no chance of working in jsdom, so we've no choice
            // but to do some shady stuff to trigger the fill callback by hand
            const scrollPanel = mountSpy.mock.contexts[0] as ScrollPanel;
            await scrollPanel.props.onFillRequest!(true);

            await waitFor(() => expectEvents(container, [events[0], events[1]]));
        });
    });

    it("unpaginates", async () => {
        const [, room, events] = setupTestData();

        await withScrollPanelMountSpy(async (mountSpy) => {
            const { container } = render(
                <TimelinePanel {...getProps(room, events)} />,
                clientAndSDKContextRenderOptions(client, sdkContext),
            );

            await waitFor(() => expectEvents(container, [events[0], events[1]]));

            // ScrollPanel has no chance of working in jsdom, so we've no choice
            // but to do some shady stuff to trigger the unfill callback by hand
            const scrollPanel = mountSpy.mock.contexts[0] as ScrollPanel;
            scrollPanel.props.onUnfillRequest!(true, events[0].getId()!);

            await waitFor(() => expectEvents(container, [events[1]]));
        });
    });

    it.each([SyncState.Prepared, SyncState.Catchup])(
        "shows no spinner under the timeline while the sync state is %s, as the room list's header says it's updating",
        async (syncState) => {
            const [client, room, events] = setupTestData();
            vi.mocked(client.getSyncState).mockReturnValue(syncState);

            const { container } = render(
                <TimelinePanel {...getProps(room, events)} />,
                clientAndSDKContextRenderOptions(client, sdkContext),
            );
            await waitFor(() => expectEvents(container, events));
            await act(async () => {
                client.emit(ClientEvent.Sync, syncState, SyncState.Syncing);
                await flushPromises();
            });

            // So the timeline doesn't move up when the sync arrives and the spinner would have gone
            expect(container.querySelector(".mx_RoomView_MessageList .mx_Spinner")).toBeNull();
        },
    );

    describe("onRoomTimeline", () => {
        it("ignores events for other timelines", () => {
            const [client, room, events] = setupTestData();

            const otherTimelineSet = { room: room as Room } as EventTimelineSet;
            const otherTimeline = new EventTimeline(otherTimelineSet);

            const props = {
                ...getProps(room, events),
                onEventScrolledIntoView: vi.fn(),
            };

            const paginateSpy = vi.spyOn(TimelineWindow.prototype, "paginate").mockClear();

            render(<TimelinePanel {...props} />);

            const event = new MatrixEvent({ type: RoomEvent.Timeline, origin_server_ts: 0 });
            const data = { timeline: otherTimeline, liveEvent: true };
            client.emit(RoomEvent.Timeline, event, room, false, false, data);

            expect(paginateSpy).not.toHaveBeenCalled();
        });

        it("ignores timeline updates without a live event", () => {
            const [client, room, events] = setupTestData();

            const props = getProps(room, events);

            const paginateSpy = vi.spyOn(TimelineWindow.prototype, "paginate").mockClear();

            render(<TimelinePanel {...props} />);

            const event = new MatrixEvent({ type: RoomEvent.Timeline, origin_server_ts: 0 });
            const data = { timeline: props.timelineSet.getLiveTimeline(), liveEvent: false };
            client.emit(RoomEvent.Timeline, event, room, false, false, data);

            expect(paginateSpy).not.toHaveBeenCalled();
        });

        it("ignores timeline where toStartOfTimeline is true", () => {
            const [client, room, events] = setupTestData();

            const props = getProps(room, events);

            const paginateSpy = vi.spyOn(TimelineWindow.prototype, "paginate").mockClear();

            render(<TimelinePanel {...props} />);

            const event = new MatrixEvent({ type: RoomEvent.Timeline, origin_server_ts: 0 });
            const data = { timeline: props.timelineSet.getLiveTimeline(), liveEvent: false };
            const toStartOfTimeline = true;
            client.emit(RoomEvent.Timeline, event, room, toStartOfTimeline, false, data);

            expect(paginateSpy).not.toHaveBeenCalled();
        });

        it("advances the timeline window", () => {
            const [client, room, events] = setupTestData();

            const props = getProps(room, events);

            const paginateSpy = vi.spyOn(TimelineWindow.prototype, "paginate").mockClear();

            render(<TimelinePanel {...props} />, clientAndSDKContextRenderOptions(client, sdkContext));

            const event = new MatrixEvent({ type: RoomEvent.Timeline, origin_server_ts: 0 });
            const data = { timeline: props.timelineSet.getLiveTimeline(), liveEvent: true };
            client.emit(RoomEvent.Timeline, event, room, false, false, data);

            expect(paginateSpy).toHaveBeenCalledWith(EventTimeline.FORWARDS, 1, false);
        });
    });

    describe("when a thread updates", () => {
        let client: MatrixClient;
        let room: Room;
        let allThreads: EventTimelineSet;
        let root: MatrixEvent;
        let reply1: MatrixEvent;
        let reply2: MatrixEvent;

        beforeEach(() => {
            client = MatrixClientPeg.safeGet();

            Thread.hasServerSideSupport = FeatureSupport.Stable;
            room = new Room("roomId", client, "userId", { pendingEventOrdering: PendingEventOrdering.Detached });
            allThreads = new EventTimelineSet(
                room,
                {
                    pendingEvents: false,
                },
                undefined,
                undefined,
                ThreadFilterType.All,
            );
            const timeline = new EventTimeline(allThreads);
            allThreads.getLiveTimeline = () => timeline;
            allThreads.getTimelineForEvent = () => timeline;

            reply1 = new MatrixEvent({
                room_id: room.roomId,
                event_id: "event_reply_1",
                type: EventType.RoomMessage,
                sender: "userId",
                content: createMessageEventContent("ReplyEvent1"),
                origin_server_ts: 0,
            });

            reply2 = new MatrixEvent({
                room_id: room.roomId,
                event_id: "event_reply_2",
                type: EventType.RoomMessage,
                sender: "userId",
                content: createMessageEventContent("ReplyEvent2"),
                origin_server_ts: 0,
            });

            root = new MatrixEvent({
                room_id: room.roomId,
                event_id: "event_root_1",
                type: EventType.RoomMessage,
                sender: "userId",
                content: createMessageEventContent("RootEvent"),
                origin_server_ts: 0,
            });

            const eventMap: { [key: string]: MatrixEvent } = {
                [root.getId()!]: root,
                [reply1.getId()!]: reply1,
                [reply2.getId()!]: reply2,
            };

            room.findEventById = (eventId: string) => eventMap[eventId];
            client.fetchRoomEvent = async (roomId: string, eventId: string) =>
                roomId === room.roomId ? eventMap[eventId]?.event : {};
        });

        it("updates thread previews", async () => {
            vi.mocked(client.supportsThreads).mockReturnValue(true);
            reply1.getContent()["m.relates_to"] = {
                rel_type: RelationType.Thread,
                event_id: root.getId(),
            };
            reply2.getContent()["m.relates_to"] = {
                rel_type: RelationType.Thread,
                event_id: root.getId(),
            };

            const thread = room.createThread(root.getId()!, root, [], true);
            // So that we do not have to mock the thread loading
            thread.initialEventsFetched = true;
            // @ts-ignore
            thread.fetchEditsWhereNeeded = () => Promise.resolve();
            await thread.addEvent(reply1, false, true);
            await allThreads
                .getLiveTimeline()
                .addEvent(thread.rootEvent!, { toStartOfTimeline: true, addToState: true });
            const replyToEvent = vi.spyOn(thread, "replyToEvent", "get");

            const dom = render(
                <TimelinePanel timelineSet={allThreads} manageReadReceipts sendReadReceiptOnLoad />,
                clientAndSDKContextRenderOptions(client, sdkContext),
            );
            await dom.findByText("RootEvent");
            await dom.findByText("ReplyEvent1");
            expect(replyToEvent).toHaveBeenCalled();

            replyToEvent.mockClear();
            await thread.addEvent(reply2, false, true);
            await dom.findByText("RootEvent");
            await dom.findByText("ReplyEvent2");
            expect(replyToEvent).toHaveBeenCalled();
        });

        it("ignores thread updates for unknown threads", async () => {
            root.setUnsigned({
                "m.relations": {
                    [THREAD_RELATION_TYPE.name]: {
                        latest_event: reply1.event,
                        count: 1,
                        current_user_participated: true,
                    },
                },
            });

            const realThread = room.createThread(root.getId()!, root, [], true);
            // So that we do not have to mock the thread loading
            realThread.initialEventsFetched = true;
            // @ts-ignore
            realThread.fetchEditsWhereNeeded = () => Promise.resolve();
            await realThread.addEvent(reply1, true);
            await allThreads
                .getLiveTimeline()
                .addEvent(realThread.rootEvent!, { toStartOfTimeline: true, addToState: true });
            const replyToEvent = vi.spyOn(realThread, "replyToEvent", "get");

            // @ts-ignore
            const fakeThread1: Thread = {
                id: undefined!,
                get roomId(): string {
                    return room.roomId;
                },
            };

            const fakeRoom = new Room("thisroomdoesnotexist", client, "userId");
            // @ts-ignore
            const fakeThread2: Thread = {
                id: root.getId()!,
                get roomId(): string {
                    return fakeRoom.roomId;
                },
            };

            const dom = render(
                <TimelinePanel timelineSet={allThreads} manageReadReceipts sendReadReceiptOnLoad />,
                clientAndSDKContextRenderOptions(client, sdkContext),
            );
            await dom.findByText("RootEvent");
            await dom.findByText("ReplyEvent1");
            expect(replyToEvent).toHaveBeenCalled();

            replyToEvent.mockClear();
            room.emit(ThreadEvent.Update, fakeThread1);
            room.emit(ThreadEvent.Update, fakeThread2);
            await dom.findByText("ReplyEvent1");
            expect(replyToEvent).not.toHaveBeenCalled();
            replyToEvent.mockClear();
        });
    });

    it("renders when the last message is an undecryptable thread root", async () => {
        const client = MatrixClientPeg.safeGet();
        client.isRoomEncrypted = () => true;
        client.supportsThreads = () => true;
        client.decryptEventIfNeeded = () => Promise.resolve();
        const authorId = client.getUserId()!;
        const room = new Room("roomId", client, authorId, {
            lazyLoadMembers: false,
            pendingEventOrdering: PendingEventOrdering.Detached,
        });

        const events = mockEvents(room);
        const timelineSet = room.getUnfilteredTimelineSet();

        const { rootEvent } = mkThread({
            room,
            client,
            authorId,
            participantUserIds: [authorId],
        });

        events.push(rootEvent);

        events.forEach((event) =>
            timelineSet.getLiveTimeline().addEvent(event, { toStartOfTimeline: true, addToState: true }),
        );

        const roomMembership = mkMembership({
            mship: KnownMembership.Join,
            prevMship: KnownMembership.Join,
            user: authorId,
            room: room.roomId,
            event: true,
            skey: "123",
        });

        events.push(roomMembership);

        const member = new RoomMember(room.roomId, authorId);
        member.membership = KnownMembership.Join;

        const roomState = new RoomState(room.roomId);
        vi.spyOn(roomState, "getMember").mockReturnValue(member);

        vi.spyOn(timelineSet.getLiveTimeline(), "getState").mockReturnValue(roomState);
        timelineSet.addEventToTimeline(roomMembership, timelineSet.getLiveTimeline(), {
            toStartOfTimeline: false,
            addToState: true,
        });

        for (const event of events) {
            vi.spyOn(event, "isDecryptionFailure").mockReturnValue(true);
            vi.spyOn(event, "shouldAttemptDecryption").mockReturnValue(false);
        }

        const { container } = render(
            <TimelinePanel timelineSet={timelineSet} manageReadReceipts={true} sendReadReceiptOnLoad={true} />,
            clientAndSDKContextRenderOptions(client, sdkContext),
        );

        await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
        await waitFor(() => expect(container.querySelector(".mx_RoomView_MessageList")).not.toBeEmptyDOMElement());
    });

    it("should dump debug logs on Action.DumpDebugLogs", async () => {
        const spy = vi.spyOn(console, "debug");

        const [, room, events] = setupTestData();
        const eventsPage2 = events.slice(1, 2);

        // Start with only page 2 of the main events in the window
        const [, timelineSet] = mkTimeline(room, eventsPage2);
        room.getTimelineSets = vi.fn().mockReturnValue([timelineSet]);

        await withScrollPanelMountSpy(async () => {
            const { container } = render(
                <TimelinePanel {...getProps(room, events)} timelineSet={timelineSet} />,
                clientAndSDKContextRenderOptions(client, sdkContext),
            );

            await waitFor(() => expectEvents(container, [events[1]]));
        });

        act(() => defaultDispatcher.fire(Action.DumpDebugLogs));

        await waitFor(() =>
            expect(spy).toHaveBeenCalledWith(expect.stringContaining("TimelinePanel(Room): Debugging info for roomId")),
        );
    });
});
