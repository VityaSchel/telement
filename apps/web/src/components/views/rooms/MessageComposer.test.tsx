/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, onTestFinished } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "test-utils-rtl";
import { EventType, type MatrixEvent, RoomMember, THREAD_RELATION_TYPE } from "matrix-js-sdk/src/matrix";
import userEvent from "@testing-library/user-event";
import { initOnce } from "@vector-im/matrix-wysiwyg";
import {
    clearAllModals,
    createTestClient,
    flushPromises,
    mkEvent,
    mkStubRoom,
    mockPlatformPeg,
    stubClient,
} from "test-utils";
import { addTextToComposerRTL } from "./__mocks__/composer.ts";

import MessageComposer from "./MessageComposer";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import ResizeNotifier from "../../../utils/ResizeNotifier";
import { RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { LocalRoom } from "../../../models/LocalRoom";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";
import dis from "../../../dispatcher/dispatcher";
import { E2EStatus } from "../../../utils/ShieldUtils";
import UIStore, { UI_EVENTS } from "../../../stores/UIStore";
import { Action } from "../../../dispatcher/actions";
import { UIFeature } from "../../../settings/UIFeature";
import { ScopedRoomContextProvider } from "../../../contexts/ScopedRoomContext.tsx";
import { TimelineRenderingType, type RoomContextType } from "../../../contexts/RoomContext.ts";
import { RoomUploadContextProvider } from "../../../viewmodels/room/RoomUploadViewModel.tsx";
import { SDKContext } from "../../../contexts/SDKContext.ts";
import { SDKContextClass } from "../../../contexts/SDKContextClass.ts";
import { onDraftChanged } from "../../../telement/room-list/roomDrafts";

const openStickerPicker = async (): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
    await userEvent.click(screen.getByRole("tab", { name: "Stickers" }));
    await userEvent.click(screen.getByRole("button", { name: "Open sticker packs" }));
};

const openAttachmentMenu = async (): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: "Attachment" }));
};

beforeAll(initOnce, 10000);

describe("MessageComposer", () => {
    stubClient();
    const cli = createTestClient();

    beforeEach(() => {
        mockPlatformPeg();
    });

    afterEach(async () => {
        await clearAllModals();
        vi.useRealTimers();

        // restore settings
        await act(async () => {
            await Promise.all(
                (["MessageComposerInput.showPollsButton", "feature_wysiwyg_composer"] as const).map((setting) =>
                    SettingsStore.setValue(setting, null, SettingLevel.DEVICE, SettingsStore.getDefaultValue(setting)),
                ),
            );
        });
    });

    it("wysiwyg correctly persists state to and from localStorage", async () => {
        const room = mkStubRoom("!roomId:server", "Room 1", cli);
        const messageText = "Test Text";
        await SettingsStore.setValue("feature_wysiwyg_composer", null, SettingLevel.DEVICE, true);
        const { renderResult, rawComponent } = wrapAndRender({ room });
        const { unmount } = renderResult;

        await flushPromises();

        const key = `mx_wysiwyg_state_${room.roomId}`;
        const onDraft = vi.fn();
        const stopListening = onDraftChanged(room.roomId, onDraft);

        await userEvent.click(await screen.findByRole("textbox"));
        fireEvent.input(screen.getByRole("textbox"), {
            data: messageText,
            inputType: "insertText",
        });

        await waitFor(() => expect(screen.getByRole("textbox")).toHaveTextContent(messageText));

        // Wait for event dispatch to happen
        await flushPromises();

        // assert there is state persisted
        expect(localStorage.getItem(key)).toBeNull();

        // ensure the right state was persisted to localStorage
        unmount();

        // assert the persisted state
        expect(JSON.parse(localStorage.getItem(key)!)).toStrictEqual({
            content: messageText,
            isRichText: true,
        });
        stopListening();
        expect(onDraft).toHaveBeenCalledTimes(1);

        // ensure the correct state is re-loaded
        render(rawComponent);
        await waitFor(() => expect(screen.getByRole("textbox")).toHaveTextContent(messageText));
    }, 10000);

    describe("for a Room", () => {
        const room = mkStubRoom("!roomId:server", "Room 1", cli);

        it("Renders a SendMessageComposer and the composer buttons by default", () => {
            wrapAndRender({ room });
            expect(screen.getByLabelText("Send an unencrypted message…")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Attachment" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Emoji" })).toBeInTheDocument();
        });

        it("Does not render a SendMessageComposer or the composer buttons when user has no permission", () => {
            wrapAndRender({ room }, false);
            expect(screen.queryByLabelText("Send an unencrypted message…")).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Attachment" })).not.toBeInTheDocument();
            expect(screen.getByText("You do not have permission to post to this room")).toBeInTheDocument();
        });

        it("Does not render a SendMessageComposer or the composer buttons when room is tombstoned", () => {
            wrapAndRender(
                { room },
                true,
                false,
                mkEvent({
                    event: true,
                    type: "m.room.tombstone",
                    room: room.roomId,
                    user: "@user1:server",
                    skey: "",
                    content: {},
                    ts: Date.now(),
                }),
            );

            expect(screen.queryByLabelText("Send an unencrypted message…")).not.toBeInTheDocument();
            expect(screen.getByText("This room has been replaced and is no longer active.")).toBeInTheDocument();
        });

        describe("when receiving a »reply_to_event«", () => {
            let roomContext: RoomContextType;
            let resizeNotifier: ResizeNotifier;

            beforeEach(() => {
                vi.useFakeTimers();
                resizeNotifier = {
                    notifyTimelineHeightChanged: vi.fn(),
                } as unknown as ResizeNotifier;
                roomContext = wrapAndRender({
                    room,
                    resizeNotifier,
                }).roomContext;
            });

            it("should call notifyTimelineHeightChanged() for the same context", () => {
                dis.dispatch({
                    action: "reply_to_event",
                    context: roomContext.timelineRenderingType,
                });

                vi.advanceTimersByTime(150);
                expect(resizeNotifier.notifyTimelineHeightChanged).toHaveBeenCalled();
            });

            it("should not call notifyTimelineHeightChanged() for a different context", () => {
                dis.dispatch({
                    action: "reply_to_event",
                    context: "test",
                });

                vi.advanceTimersByTime(150);
                expect(resizeNotifier.notifyTimelineHeightChanged).not.toHaveBeenCalled();
            });
        });

        // test menu item display depending on settings
        [
            {
                setting: "MessageComposerInput.showPollsButton" as const,
                itemLabel: "Poll",
            },
        ].forEach(({ setting, itemLabel }) => {
            [true, false].forEach((value: boolean) => {
                describe(`when ${setting} = ${value}`, () => {
                    beforeEach(async () => {
                        await act(() => SettingsStore.setValue(setting, null, SettingLevel.DEVICE, value));
                        wrapAndRender({ room });
                        await openAttachmentMenu();
                    });

                    it(`should${value ? "" : " not"} display the menu item`, () => {
                        if (value) {
                            expect(screen.getByRole("menuitem", { name: itemLabel })).toBeInTheDocument();
                        } else {
                            expect(screen.queryByRole("menuitem", { name: itemLabel })).not.toBeInTheDocument();
                        }
                    });

                    describe(`and setting ${setting} to ${!value}`, () => {
                        beforeEach(async () => {
                            // simulate settings update
                            await act(async () => {
                                await SettingsStore.setValue(setting, null, SettingLevel.DEVICE, !value);
                                dis.dispatch(
                                    {
                                        action: Action.SettingUpdated,
                                        settingName: setting,
                                        newValue: !value,
                                    },
                                    true,
                                );
                            });
                        });

                        it(`should${!value || "not"} display the menu item`, () => {
                            if (!value) {
                                expect(screen.getByRole("menuitem", { name: itemLabel })).toBeInTheDocument();
                            } else {
                                expect(screen.queryByRole("menuitem", { name: itemLabel })).not.toBeInTheDocument();
                            }
                        });
                    });
                });
            });
        });

        it("should offer stickers in the emoji drawer", async () => {
            wrapAndRender({ room });
            await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
            expect(screen.getByRole("tab", { name: "Stickers" })).toBeInTheDocument();
        });

        it("should not offer stickers when widgets are disabled", async () => {
            const getValue = SettingsStore.getValue.bind(SettingsStore);
            const getValueSpy = vi
                .spyOn(SettingsStore, "getValue")
                .mockImplementation((setting, ...args) =>
                    setting === UIFeature.Widgets ? false : getValue(setting, ...args),
                );
            onTestFinished(() => getValueSpy.mockRestore());
            wrapAndRender({ room });
            await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
            expect(screen.getByRole("tab", { name: "Emoji" })).toBeInTheDocument();
            expect(screen.queryByRole("tab", { name: "Stickers" })).not.toBeInTheDocument();
        });

        it("should not render the send button", () => {
            wrapAndRender({ room });
            expect(screen.queryByLabelText("Send message")).not.toBeInTheDocument();
        });

        describe("when a message has been entered", () => {
            beforeEach(async () => {
                const renderResult = wrapAndRender({ room }).renderResult;
                await addTextToComposerRTL(renderResult, "Hello");
            });

            it("should render the send button", () => {
                expect(screen.getByLabelText("Send message")).toBeInTheDocument();
            });
        });

        describe("UIStore interactions", () => {
            let resizeCallback: (key: string, data: object) => void;

            beforeEach(() => {
                vi.spyOn(UIStore.instance, "on").mockImplementation(
                    (_event: string | symbol, listener: (key: string, data: object) => void): any => {
                        resizeCallback = listener;
                    },
                );
            });

            describe("when a non-resize event occurred in UIStore", () => {
                beforeEach(async () => {
                    wrapAndRender({ room });
                    await openStickerPicker();
                    resizeCallback("test", {});
                });

                it("should still display the sticker picker", () => {
                    expect(screen.getByText("You don't currently have any stickerpacks enabled")).toBeInTheDocument();
                });
            });

            describe.each([true, false])("when a resize event occurred in UIStore with narrow = %s", (narrow) => {
                beforeEach(async () => {
                    wrapAndRender({ room }, true, narrow);
                    await openStickerPicker();
                    act(() => resizeCallback(UI_EVENTS.Resize, {}));
                });

                it("should show the attachment button", () => {
                    expect(screen.getByRole("button", { name: "Attachment" })).toBeInTheDocument();
                });

                it("should close the sticker picker", () => {
                    expect(
                        screen.queryByText("You don't currently have any stickerpacks enabled"),
                    ).not.toBeInTheDocument();
                });
            });
        });

        describe("when not replying to an event", () => {
            it("should pass the expected placeholder to SendMessageComposer", () => {
                wrapAndRender({ room });
                expect(screen.getByLabelText("Send an unencrypted message…")).toBeInTheDocument();
            });

            it("and an e2e status it should pass the expected placeholder to SendMessageComposer", () => {
                wrapAndRender({
                    room,
                    e2eStatus: E2EStatus.Normal,
                });
                expect(screen.getByLabelText("Send a message…")).toBeInTheDocument();
            });
        });

        describe("when replying to an event", () => {
            let replyToEvent: MatrixEvent;
            let props: Partial<React.ComponentProps<typeof MessageComposer>>;

            const checkPlaceholder = (expected: string) => {
                it("should pass the expected placeholder to SendMessageComposer", () => {
                    wrapAndRender(props);
                    expect(screen.getByLabelText(expected)).toBeInTheDocument();
                });
            };

            const setEncrypted = () => {
                beforeEach(() => {
                    props.e2eStatus = E2EStatus.Normal;
                });
            };

            beforeEach(() => {
                replyToEvent = mkEvent({
                    event: true,
                    type: EventType.RoomMessage,
                    user: cli.getUserId()!,
                    content: {},
                });

                props = {
                    room,
                    replyToEvent,
                };
            });

            describe("without encryption", () => {
                checkPlaceholder("Send an unencrypted reply…");
            });

            describe("with encryption", () => {
                setEncrypted();
                checkPlaceholder("Send a reply…");
            });

            describe("with a non-thread relation", () => {
                beforeEach(() => {
                    props.relation = { rel_type: "test" };
                });

                checkPlaceholder("Send an unencrypted reply…");
            });

            describe("that is a thread", () => {
                beforeEach(() => {
                    props.relation = { rel_type: THREAD_RELATION_TYPE.name };
                });

                checkPlaceholder("Reply to unencrypted thread…");

                describe("with encryption", () => {
                    setEncrypted();
                    checkPlaceholder("Reply to thread…");
                });
            });
        });
    });

    describe("for a LocalRoom", () => {
        const localRoom = new LocalRoom("!room:example.com", cli, cli.getUserId()!);

        it("should not offer stickers", async () => {
            wrapAndRender({ room: localRoom });
            await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
            expect(screen.getByRole("tab", { name: "Emoji" })).toBeInTheDocument();
            expect(screen.queryByRole("tab", { name: "Stickers" })).not.toBeInTheDocument();
        });
    });
});

function wrapAndRender(
    props: Partial<React.ComponentProps<typeof MessageComposer>> = {},
    canSendMessages = true,
    narrow = false,
    tombstone?: MatrixEvent,
) {
    const mockClient = MatrixClientPeg.safeGet();
    const roomId = "myroomid";
    const room: any = props.room || {
        currentState: undefined,
        roomId,
        client: mockClient,
        getMember: function (userId: string): RoomMember {
            return new RoomMember(roomId, userId);
        },
    };

    const roomContext = {
        room,
        canSendMessages,
        tombstone,
        narrow,
        timelineRenderingType: TimelineRenderingType.Room,
    } satisfies Partial<RoomContextType> as RoomContextType;

    const defaultProps = {
        room,
        resizeNotifier: new ResizeNotifier(),
        permalinkCreator: new RoomPermalinkCreator(room),
    };

    const getRawComponent = (props = {}, context = roomContext, client = mockClient) => (
        <SDKContext.Provider value={SDKContextClass.instance}>
            <MatrixClientContext.Provider value={client}>
                <ScopedRoomContextProvider {...context}>
                    <RoomUploadContextProvider>
                        <MessageComposer {...defaultProps} {...props} />
                    </RoomUploadContextProvider>
                </ScopedRoomContextProvider>
            </MatrixClientContext.Provider>
        </SDKContext.Provider>
    );
    return {
        rawComponent: getRawComponent(props, roomContext, mockClient),
        renderResult: render(getRawComponent(props, roomContext, mockClient)),
        roomContext,
    };
}
