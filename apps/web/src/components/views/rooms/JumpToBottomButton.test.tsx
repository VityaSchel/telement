/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { act, render, screen } from "test-utils-rtl";
import { type Room } from "matrix-js-sdk/src/matrix";
import { createTestClient, mkStubRoom } from "test-utils";
import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import JumpToBottomButton from "./JumpToBottomButton";
import { NotificationStateEvents } from "../../../stores/notifications/NotificationState";
import { RoomNotificationState } from "../../../stores/notifications/RoomNotificationState";
import { RoomNotificationStateStore } from "../../../stores/notifications/RoomNotificationStateStore";

describe("<JumpToBottomButton />", () => {
    let room: Room;
    let notificationState: RoomNotificationState;
    let muted: MockInstance<() => boolean>;

    beforeEach(() => {
        room = mkStubRoom("!room:example.org", "Room", createTestClient());
        notificationState = new RoomNotificationState(room, false);
        muted = vi.spyOn(notificationState, "muted", "get").mockReturnValue(false);
        vi.spyOn(RoomNotificationStateStore.instance, "getRoomState").mockReturnValue(notificationState);
    });

    /** The button of the room with three unread messages. */
    const button = (highlight = false): React.ReactElement => (
        <JumpToBottomButton room={room} numUnreadMessages={3} highlight={highlight} onScrollToBottomClick={() => {}} />
    );
    const count = (): HTMLElement => screen.getByText("3");

    it("marks the count as a muted room's only while the room is muted", () => {
        render(button());
        expect(count().closest(".mx_JumpToBottomButton_muted")).toBeNull();

        muted.mockReturnValue(true);
        act(() => {
            notificationState.emit(NotificationStateEvents.Update);
        });
        expect(count().closest(".mx_JumpToBottomButton_muted")).not.toBeNull();

        muted.mockReturnValue(false);
        act(() => {
            notificationState.emit(NotificationStateEvents.Update);
        });
        expect(count().closest(".mx_JumpToBottomButton_muted")).toBeNull();
    });

    it("marks the count of a muted room with mentions as both", () => {
        muted.mockReturnValue(true);
        render(button(true));

        expect(count().closest(".mx_JumpToBottomButton_muted.mx_JumpToBottomButton_highlight")).not.toBeNull();
    });

    it("draws no count without unread messages", () => {
        render(<JumpToBottomButton room={room} highlight={false} onScrollToBottomClick={() => {}} />);

        expect(screen.getByRole("button")).toHaveAccessibleName("Scroll to most recent messages");
        expect(document.querySelector(".mx_JumpToBottomButton_badge")).toBeNull();
    });
});
