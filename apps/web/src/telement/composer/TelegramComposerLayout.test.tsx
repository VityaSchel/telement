/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { initOnce } from "@vector-im/matrix-wysiwyg";
import { type Room } from "matrix-js-sdk/src/matrix";
import { clearAllModals, createTestClient, mkStubRoom, mockPlatformPeg, stubClient } from "test-utils";

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
import { E2EStatus } from "../../utils/ShieldUtils";

beforeAll(initOnce, 10000);

describe("MessageComposer with the Telegram layout", () => {
    stubClient();
    const client = createTestClient();
    let wysiwygLab: boolean;
    let getValueSpy: ReturnType<typeof vi.spyOn>;

    const renderComposerWithContainer = (room: Room, e2eStatus?: E2EStatus): { container: HTMLElement } => {
        const roomContext = {
            room,
            canSendMessages: true,
            narrow: false,
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
                                e2eStatus={e2eStatus}
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

    it.each([E2EStatus.Warning, E2EStatus.Verified])("leaves the %s shield to the room header", (e2eStatus) => {
        const { container } = renderComposerWithContainer(mkStubRoom("!room:server", "Room", client), e2eStatus);

        expect(container.querySelector(".mx_MessageComposer_e2eIcon")).toBeNull();
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
