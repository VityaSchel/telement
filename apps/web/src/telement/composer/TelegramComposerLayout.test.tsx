/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { render, screen, waitFor } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { initOnce } from "@vector-im/matrix-wysiwyg";
import { EventType, type IEventRelation, type Room, THREAD_RELATION_TYPE } from "matrix-js-sdk/src/matrix";
import { clearAllModals, createTestClient, mkEvent, mkStubRoom, mockPlatformPeg, stubClient } from "test-utils";

import MessageComposer from "../../components/views/rooms/MessageComposer";
import MatrixClientContext from "../../contexts/MatrixClientContext";
import { ScopedRoomContextProvider } from "../../contexts/ScopedRoomContext";
import { type RoomContextType, TimelineRenderingType } from "../../contexts/RoomContext";
import { SDKContext } from "../../contexts/SDKContext";
import { SDKContextClass } from "../../contexts/SDKContextClass";
import SettingsStore from "../../settings/SettingsStore";
import ResizeNotifier from "../../utils/ResizeNotifier";
import { RoomPermalinkCreator } from "../../utils/permalinks/Permalinks";
import { RoomUploadContextProvider } from "../../viewmodels/room/RoomUploadViewModel";
import MediaDeviceHandler, { MediaDeviceKindEnum } from "../../MediaDeviceHandler";
import { VoiceRecordingStore } from "../../stores/VoiceRecordingStore";
import { addTextToComposerRTL } from "../../components/views/rooms/__mocks__/composer";

type ComposerProps = Partial<React.ComponentProps<typeof MessageComposer>>;

beforeAll(initOnce, 10000);

describe("MessageComposer with the Telegram layout", () => {
    stubClient();
    const client = createTestClient();
    let wysiwygLab: boolean;
    let getValueSpy: ReturnType<typeof vi.spyOn>;

    const renderComposerWithContainer = (
        room: Room,
        props: ComposerProps = {},
        narrow = false,
    ): ReturnType<typeof render> => {
        const roomContext = {
            room,
            canSendMessages: true,
            narrow,
            timelineRenderingType: TimelineRenderingType.Room,
        } satisfies Partial<RoomContextType> as RoomContextType;

        return render(
            <SDKContext.Provider value={SDKContextClass.instance}>
                <MatrixClientContext.Provider value={client}>
                    <ScopedRoomContextProvider {...roomContext}>
                        <RoomUploadContextProvider>
                            <MessageComposer
                                room={room}
                                resizeNotifier={new ResizeNotifier()}
                                permalinkCreator={new RoomPermalinkCreator(room)}
                                {...props}
                            />
                        </RoomUploadContextProvider>
                    </ScopedRoomContextProvider>
                </MatrixClientContext.Provider>
            </SDKContext.Provider>,
        );
    };

    const renderComposer = (room: Room): void => {
        renderComposerWithContainer(room);
    };

    beforeEach(() => {
        mockPlatformPeg();
        wysiwygLab = false;
        const originalGetValue = SettingsStore.getValue;
        getValueSpy = vi.spyOn(SettingsStore, "getValue").mockImplementation((setting, ...args) => {
            if (setting === "feature_wysiwyg_composer" && wysiwygLab) return true;
            return originalGetValue(setting, ...args);
        });
    });

    afterEach(async () => {
        await clearAllModals();
        // Only undo this file's spy: stubClient() above mocks the client for the whole file.
        getValueSpy.mockRestore();
    });

    it("puts the paperclip before the text field and drops Element's overflow menu", () => {
        renderComposer(mkStubRoom("!room:server", "Room", client));

        const attachment = screen.getByRole("button", { name: "Attachment" });
        // Only the Compound tooltip names it, not the browser's own tooltip as well
        expect(attachment).not.toHaveAttribute("title");
        const textbox = screen.getByRole("textbox");
        expect(attachment.compareDocumentPosition(textbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByRole("button", { name: "Emoji" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "More options" })).toBeNull();
    });

    it("lists photos and videos, files, polls and location in the paperclip menu", async () => {
        renderComposer(mkStubRoom("!room:server", "Room", client));

        await userEvent.click(screen.getByRole("button", { name: "Attachment" }));

        await waitFor(() =>
            expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
                "Photo or video",
                "File",
                "Poll",
                "Location",
            ]),
        );
        expect(screen.getByTestId("telement-photo-or-video-input")).toHaveAttribute("accept", "image/*,video/*");
    });

    it("leaves the unencrypted lock to the room header", () => {
        renderComposer(mkStubRoom("!room:server", "Room", client));

        expect(screen.queryByLabelText("Messages in this room are not end-to-end encrypted")).toBeNull();
    });

    describe("asks to write a message in every state, as the room header shows the encryption", () => {
        const reply = (): ComposerProps => ({
            replyToEvent: mkEvent({ event: true, type: EventType.RoomMessage, user: "@alice:server", content: {} }),
        });
        const thread: IEventRelation = { rel_type: THREAD_RELATION_TYPE.name, event_id: "$root" };

        it.each<[string, () => ComposerProps]>([
            ["in a room", () => ({})],
            ["when replying", reply],
            ["when replying in a thread", () => ({ ...reply(), relation: thread })],
        ])("%s", (_, props) => {
            renderComposerWithContainer(mkStubRoom("!room:server", "Room", client), props());

            expect(screen.getByRole("textbox")).toHaveAccessibleName("Write a message…");
        });

        it("with the rich-text composer lab on", async () => {
            wysiwygLab = true;
            renderComposer(mkStubRoom("!room:server", "Room", client));

            // The rich-text editor draws its placeholder from a custom property
            const textbox = await screen.findByRole("textbox");
            expect(textbox.style.getPropertyValue("--placeholder")).toBe('"Write a message…"');
        });
    });

    it("shows a microphone in the send slot while there is nothing to send, and Send once there is text", async () => {
        // A room of its own, as the composer keeps the text as the room's draft
        const result = renderComposerWithContainer(mkStubRoom("!draft:server", "Room", client));

        expect(screen.getByRole("button", { name: "Voice Message" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Send message" })).toBeNull();

        await addTextToComposerRTL(result, "Hello");

        expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Voice Message" })).toBeNull();
    });

    it("starts Element's voice message recorder from the microphone", async () => {
        const getDevices = vi.spyOn(MediaDeviceHandler, "getDevices").mockResolvedValue({
            [MediaDeviceKindEnum.AudioInput]: [{ deviceId: "default", kind: "audioinput" } as MediaDeviceInfo],
            [MediaDeviceKindEnum.AudioOutput]: [],
            [MediaDeviceKindEnum.VideoInput]: [],
        });
        // Stops at the recorder: there is no microphone to record from in tests
        const startRecording = vi.spyOn(VoiceRecordingStore.instance, "startRecording").mockImplementation(() => {
            throw new Error("No microphone");
        });
        onTestFinished(() => {
            getDevices.mockRestore();
            startRecording.mockRestore();
        });
        const room = mkStubRoom("!room:server", "Room", client);
        renderComposerWithContainer(room);

        await userEvent.click(screen.getByRole("button", { name: "Voice Message" }));

        await waitFor(() => expect(startRecording).toHaveBeenCalledWith(room.roomId));
    });

    it("offers the microphone only in wide composers, as Element's recording controls don't fit in narrow ones", () => {
        const room = mkStubRoom("!room:server", "Room", client);
        const wide = renderComposerWithContainer(room);
        expect(screen.getByRole("button", { name: "Voice Message" })).toBeInTheDocument();
        wide.unmount();

        renderComposerWithContainer(room, {}, true);

        expect(screen.getByRole("button", { name: "Emoji" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Voice Message" })).toBeNull();
    });

    it("keeps Element's formatting button when the rich-text composer lab is on", async () => {
        wysiwygLab = true;
        renderComposer(mkStubRoom("!room:server", "Room", client));

        // Its glyph is small for its box, so it keeps a bigger icon than its neighbors
        expect(await screen.findByRole("button", { name: /^(Show|Hide) formatting$/ })).toHaveClass(
            "mx_TelementFormattingButton",
        );
        expect(screen.getByRole("button", { name: "Emoji" })).toBeInTheDocument();
    });
});
