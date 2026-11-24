/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi, type MockedObject } from "vitest";
import { render, fireEvent, screen } from "test-utils-rtl";
import { Room, type MatrixClient, JoinRule, MatrixEvent, HistoryVisibility } from "matrix-js-sdk/src/matrix";
import userEvent from "@testing-library/user-event";
import { LinkedTextContext } from "@element-hq/web-shared-components";
import { flushPromises, stubClient } from "test-utils";

import RoomSummaryCardView from "./RoomSummaryCardView";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { _t } from "../../../languageHandler";
import {
    type RoomSummaryCardState,
    useRoomSummaryCardViewModel,
} from "../../viewmodels/right_panel/RoomSummaryCardViewModel";
import DMRoomMap from "../../../utils/DMRoomMap";
import { E2EStatus } from "../../../utils/ShieldUtils";
import { SDKContext } from "../../../contexts/SDKContext";
import { SDKContextClass } from "../../../contexts/SDKContextClass";

// Mock the viewmodel hooks
vi.mock("../../viewmodels/right_panel/RoomSummaryCardViewModel", () => ({
    useRoomSummaryCardViewModel: vi.fn(),
}));

describe("<RoomSummaryCard />", () => {
    const userId = "@alice:domain.org";

    const roomId = "!room:domain.org";
    let mockClient!: MockedObject<MatrixClient>;
    let room!: Room;

    const getComponent = (props = {}) => {
        const defaultProps = {
            room,
            permalinkCreator: new RoomPermalinkCreator(room),
        };

        return render(<RoomSummaryCardView {...defaultProps} {...props} />, {
            wrapper: ({ children }) => (
                <SDKContext.Provider value={SDKContextClass.instance}>
                    <MatrixClientContext.Provider value={mockClient}>
                        <LinkedTextContext.Provider value={{}}>{children}</LinkedTextContext.Provider>
                    </MatrixClientContext.Provider>
                </SDKContext.Provider>
            ),
        });
    };

    // Setup mock view models
    const vmDefaultValues: RoomSummaryCardState = {
        isDirectMessage: false,
        userStatus: undefined,
        isRoomEncrypted: false,
        e2eStatus: undefined,
        isVideoRoom: false,
        roomJoinRule: JoinRule.Public,
        historyVisibility: HistoryVisibility.Shared,
        alias: "",
        isFavorite: false,
        canInviteToState: true,
        pinCount: 0,
        showPeople: false,
        onRoomMembersClick: vi.fn(),
        onRoomFilesClick: vi.fn(),
        onRoomExtensionsClick: vi.fn(),
        onRoomPinsClick: vi.fn(),
        onRoomSettingsClick: vi.fn(),
        onLeaveRoomClick: vi.fn(),
        onShareRoomClick: vi.fn(),
        onRoomExportClick: vi.fn(),
        onRoomPollHistoryClick: vi.fn(),
        onReportRoomClick: vi.fn(),
        onFavoriteToggleClick: vi.fn(),
        onInviteToRoomClick: vi.fn(),
    };

    beforeEach(() => {
        mockClient = vi.mocked(stubClient());
        room = new Room(roomId, mockClient, userId);
        vi.mocked(useRoomSummaryCardViewModel).mockReturnValue(vmDefaultValues);
        DMRoomMap.makeShared(mockClient);

        mockClient.getRoom.mockReturnValue(room);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders the room summary", () => {
        const { container } = getComponent();
        expect(container).toMatchSnapshot();
    });

    it("renders the room topic in the summary", () => {
        room.currentState.setStateEvents([
            new MatrixEvent({
                type: "m.room.topic",
                room_id: roomId,
                sender: userId,
                content: {
                    topic: "This is the room's topic.",
                },
                state_key: "",
            }),
        ]);
        const { container } = getComponent();
        expect(container).toMatchSnapshot();
    });

    it("has button to edit topic", () => {
        room.currentState.setStateEvents([
            new MatrixEvent({
                type: "m.room.topic",
                room_id: roomId,
                sender: userId,
                content: {
                    topic: "This is the room's topic.",
                },
                state_key: "",
            }),
        ]);
        const { container, getByText } = getComponent();
        expect(getByText("Edit")).toBeInTheDocument();
        expect(container).toMatchSnapshot();
    });

    it("is titled Room info, without a search field or a close button", () => {
        getComponent();

        expect(screen.getByRole("heading", { name: "Room info" })).toBeInTheDocument();
        expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    });

    describe("keyboard", () => {
        const items = (): HTMLElement[] => [
            ...screen.getByRole("menubar").querySelectorAll<HTMLElement>('[role^="menuitem"]'),
        ];

        it("makes the items one Tab stop, which the up and down arrows, Home and End move through, as a menu's", async () => {
            const user = userEvent.setup();
            getComponent();
            const [pin, invite, pinnedMessages] = items();

            expect(items().filter((item) => item.tabIndex === 0)).toEqual([pin]);
            pin.focus();
            await user.keyboard("{ArrowDown}");
            expect(invite).toHaveFocus();
            await user.keyboard("{ArrowDown}");
            expect(pinnedMessages).toHaveFocus();
            expect(items().filter((item) => item.tabIndex === 0)).toEqual([pinnedMessages]);
            await user.keyboard("{End}");
            expect(items().at(-1)).toHaveFocus();
            await user.keyboard("{Home}");
            expect(pin).toHaveFocus();
            await user.keyboard("{ArrowUp}");
            expect(pin).toHaveFocus();
        });

        it("skips a disabled item, which can't take the focus", async () => {
            vi.mocked(useRoomSummaryCardViewModel).mockReturnValue({ ...vmDefaultValues, canInviteToState: false });
            const user = userEvent.setup();
            getComponent();
            const [pin, invite, pinnedMessages] = items();

            expect(invite.tabIndex).toBe(-1);
            pin.focus();
            await user.keyboard("{ArrowDown}");
            expect(pinnedMessages).toHaveFocus();
        });

        it("keeps Pin to top a toggle that reads whether the room is pinned", () => {
            vi.mocked(useRoomSummaryCardViewModel).mockReturnValue({ ...vmDefaultValues, isFavorite: true });
            getComponent();
            const [pin] = items();

            expect(pin).toHaveAttribute("role", "menuitemcheckbox");
            expect(pin).toHaveAttribute("aria-checked", "true");
            expect(pin.querySelector('input[role="switch"], input[type="checkbox"]')).toBeChecked();
        });
    });

    it("opens room file panel on button click", () => {
        const { getByText } = getComponent();

        fireEvent.click(getByText("Files"));

        expect(vmDefaultValues.onRoomFilesClick).toHaveBeenCalled();
    });

    it("opens room export dialog on button click", () => {
        const { getByText } = getComponent();

        fireEvent.click(getByText(_t("export_chat|title")));

        expect(vmDefaultValues.onRoomExportClick).toHaveBeenCalled();
    });

    it("opens share room dialog on button click", () => {
        const { getByText } = getComponent();

        fireEvent.click(getByText(_t("action|copy_link")));

        expect(vmDefaultValues.onShareRoomClick).toHaveBeenCalled();
    });

    it("opens invite dialog on button click", () => {
        const { getByText } = getComponent();

        fireEvent.click(getByText(_t("action|invite")));

        expect(vmDefaultValues.onInviteToRoomClick).toHaveBeenCalled();
    });

    it("fires favourite dispatch on button click", () => {
        const { getByText } = getComponent();

        fireEvent.click(getByText("Pin to top"));

        expect(vmDefaultValues.onFavoriteToggleClick).toHaveBeenCalled();
    });

    it("opens room settings on button click", () => {
        const { getByText } = getComponent();

        fireEvent.click(getByText(_t("common|settings")));

        expect(vmDefaultValues.onRoomSettingsClick).toHaveBeenCalled();
    });

    it("opens room member list on button click, where it lists the people", () => {
        vi.mocked(useRoomSummaryCardViewModel).mockReturnValue({ ...vmDefaultValues, showPeople: true });
        const { getByText } = getComponent();

        fireEvent.click(getByText("People"));

        expect(vmDefaultValues.onRoomMembersClick).toHaveBeenCalled();
    });

    it("leaves the people and the threads to their own buttons in the room header", () => {
        getComponent();

        expect(screen.queryByRole("menuitem", { name: "People" })).not.toBeInTheDocument();
        expect(screen.queryByRole("menuitem", { name: "Threads" })).not.toBeInTheDocument();
    });

    describe("encryption badge", () => {
        const badgeOf = (label: string): HTMLElement => screen.getByText(label);

        it.each<[string, Partial<RoomSummaryCardState>]>([
            ["whether the room is encrypted", { isRoomEncrypted: null }],
            ["whether its members are trusted", { isRoomEncrypted: true, e2eStatus: undefined }],
        ])("keeps its place, unseen, until it is known %s", (_, state) => {
            vi.mocked(useRoomSummaryCardViewModel).mockReturnValue({ ...vmDefaultValues, ...state });
            getComponent();

            // Hidden by its style (RightPanel.test.browser.ts)
            expect(badgeOf("Encrypted")).toHaveClass("mx_RoomSummaryCard_badge_unknown");
            expect(screen.queryByText("Not encrypted")).not.toBeInTheDocument();
            expect(screen.queryByText("Not trusted")).not.toBeInTheDocument();
        });

        it.each<[string, Partial<RoomSummaryCardState>]>([
            ["Encrypted", { isRoomEncrypted: true, e2eStatus: E2EStatus.Normal }],
            ["Encrypted", { isRoomEncrypted: true, e2eStatus: E2EStatus.Verified }],
            ["Not trusted", { isRoomEncrypted: true, e2eStatus: E2EStatus.Warning }],
            ["Not encrypted", { isRoomEncrypted: false }],
        ])("says %s alone once it is known", (label, state) => {
            vi.mocked(useRoomSummaryCardViewModel).mockReturnValue({ ...vmDefaultValues, ...state });
            getComponent();

            expect(badgeOf(label)).not.toHaveClass("mx_RoomSummaryCard_badge_unknown");
            for (const other of ["Encrypted", "Not trusted", "Not encrypted"].filter((other) => other !== label)) {
                expect(screen.queryByText(other)).not.toBeInTheDocument();
            }
        });
    });

    it("opens room pinned messages on button click", () => {
        const { getByText } = getComponent();

        fireEvent.click(getByText("Pinned messages"));

        expect(vmDefaultValues.onRoomPinsClick).toHaveBeenCalled();
    });

    it("does not render irrelevant options if video room", () => {
        vi.mocked(useRoomSummaryCardViewModel).mockReturnValue({
            ...vmDefaultValues,
            isVideoRoom: true,
        });
        const { queryByText } = getComponent();

        // options not rendered
        expect(queryByText("Files")).not.toBeInTheDocument();
        expect(queryByText("Pinned")).not.toBeInTheDocument();
        expect(queryByText("Export chat")).not.toBeInTheDocument();
    });

    describe("pinning", () => {
        it("renders pins options", () => {
            const { getByText } = getComponent();

            expect(getByText("Pinned messages")).toBeInTheDocument();
        });
    });

    describe("poll history", () => {
        it("renders poll history option", () => {
            const { getByText } = getComponent();

            expect(getByText("Polls")).toBeInTheDocument();
        });

        it("opens poll history dialog on button click", () => {
            const permalinkCreator = new RoomPermalinkCreator(room);
            const { getByText } = getComponent({ permalinkCreator });

            fireEvent.click(getByText("Polls"));

            expect(vmDefaultValues.onRoomPollHistoryClick).toHaveBeenCalled();
        });
    });

    describe("public room label", () => {
        it("does not show public room label for a DM", async () => {
            vi.mocked(useRoomSummaryCardViewModel).mockReturnValue({
                ...vmDefaultValues,
                isDirectMessage: true,
            });

            getComponent();

            await flushPromises();

            expect(screen.queryByText("Public room")).not.toBeInTheDocument();
        });

        it("does not show public room label for non public room", async () => {
            vi.mocked(useRoomSummaryCardViewModel).mockReturnValue({
                ...vmDefaultValues,
                isDirectMessage: false,
                roomJoinRule: JoinRule.Invite,
            });
            getComponent();

            await flushPromises();

            expect(screen.queryByText("Public room")).not.toBeInTheDocument();
        });

        it("shows a public room label for a public room", async () => {
            getComponent();

            await flushPromises();

            expect(screen.queryByText("Public room")).toBeInTheDocument();
        });
    });

    describe("user status", () => {
        it("shows the other user's status when set", () => {
            vi.mocked(useRoomSummaryCardViewModel).mockReturnValue({
                ...vmDefaultValues,
                isDirectMessage: true,
                userStatus: { emoji: "💬", text: "In a meeting" },
            });

            getComponent();

            expect(screen.getByText("In a meeting")).toBeInTheDocument();
            expect(screen.getByText("💬")).toBeInTheDocument();
        });

        it("does not show a status when there is none", () => {
            vi.mocked(useRoomSummaryCardViewModel).mockReturnValue({
                ...vmDefaultValues,
                isDirectMessage: true,
                userStatus: undefined,
            });

            getComponent();

            expect(screen.queryByText("In a meeting")).not.toBeInTheDocument();
        });
    });
});
