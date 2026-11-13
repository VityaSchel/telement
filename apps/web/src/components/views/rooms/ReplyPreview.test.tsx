/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { render, screen } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type MatrixClient, type MatrixEvent, type Room, RoomMember } from "matrix-js-sdk/src/matrix";
import { getRoomContext, mkEvent, stubClient } from "test-utils";

import ReplyPreview from "./ReplyPreview";
import dis from "../../../dispatcher/dispatcher";
import { TimelineRenderingType } from "../../../contexts/RoomContext";
import { ScopedRoomContextProvider } from "../../../contexts/ScopedRoomContext";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { getUserNameColorClass } from "../../../utils/FormattingUtils";

const ALICE = "@alice:example.org";

describe("ReplyPreview", () => {
    let cli: MatrixClient;
    let room: Room;

    beforeEach(async () => {
        cli = stubClient();
        const { room_id: roomId } = await cli.createRoom({});
        room = cli.getRoom(roomId)!;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function mkReplyTarget(displayName: string | null, body = "Hello there", disambiguate = false): MatrixEvent {
        const event = mkEvent({
            event: true,
            type: "m.room.message",
            user: ALICE,
            room: room.roomId,
            id: "$replied",
            content: { msgtype: "m.text", body },
        });
        if (displayName === null) {
            event.sender = null;
        } else {
            const member = new RoomMember(room.roomId, ALICE);
            member.rawDisplayName = displayName;
            member.name = displayName;
            member.disambiguate = disambiguate;
            event.sender = member;
        }
        return event;
    }

    function renderPreview(
        replyToEvent?: MatrixEvent,
        timelineRenderingType = TimelineRenderingType.Room,
    ): ReturnType<typeof render> {
        return render(
            <MatrixClientContext.Provider value={cli}>
                <ScopedRoomContextProvider {...getRoomContext(room, { timelineRenderingType })}>
                    <ReplyPreview replyToEvent={replyToEvent} />
                </ScopedRoomContextProvider>
            </MatrixClientContext.Provider>,
        );
    }

    it("renders nothing when not replying", () => {
        const { container } = renderPreview(undefined);

        expect(container).toBeEmptyDOMElement();
    });

    it("titles the preview with the sender's name, coloured like the quote's sender", () => {
        const { container } = renderPreview(mkReplyTarget("Alice"));

        const title = screen.getByText((_, element) => element?.textContent === "Reply to Alice", {
            selector: ".mx_ReplyPreview_title",
        });
        expect(title.querySelector("bdi")).toHaveTextContent("Alice");
        expect(container.querySelector(".mx_ReplyPreview_section")).toHaveClass(getUserNameColorClass(ALICE));
        expect(container.querySelector(".mx_ReplyPreview_mxid")).not.toBeInTheDocument();
        expect(screen.queryByText("Replying")).not.toBeInTheDocument();
    });

    it("tells apart a member who shares their name with another by their Matrix ID", () => {
        renderPreview(mkReplyTarget("Alice", "Hello there", true));

        const mxid = screen.getByText(ALICE);
        expect(mxid.tagName).toBe("BDI");
        expect(mxid).toHaveClass("mx_ReplyPreview_mxid");
        expect(mxid.closest(".mx_ReplyPreview_title")).toHaveTextContent(`Reply to Alice ${ALICE}`, {
            normalizeWhitespace: false,
        });
    });

    it("shows the replied message as an excerpt without a second sender row", () => {
        renderPreview(mkReplyTarget("Alice"));

        expect(screen.getByTestId("reply-tile-body")).toHaveTextContent("Hello there");
        expect(screen.queryByTestId("reply-tile-sender")).not.toBeInTheDocument();
    });

    it("isolates a right-to-left name from the title around it", () => {
        renderPreview(mkReplyTarget("אליס (2)"));

        const name = screen.getByText("אליס (2)");
        expect(name.tagName).toBe("BDI");
        expect(name.closest(".mx_ReplyPreview_title")).toHaveTextContent("Reply to אליס (2)");
    });

    it("falls back to the user ID when the sender isn't a known member", () => {
        renderPreview(mkReplyTarget(null));

        expect(screen.getByText(ALICE).closest(".mx_ReplyPreview_title")).toHaveTextContent(`Reply to ${ALICE}`);
    });

    it.each([TimelineRenderingType.Room, TimelineRenderingType.Thread])(
        "cancels the reply in the %s composer",
        async (timelineRenderingType) => {
            const dispatch = vi.spyOn(dis, "dispatch");
            renderPreview(mkReplyTarget("Alice"), timelineRenderingType);

            await userEvent.click(screen.getByRole("button", { name: "Cancel reply" }));

            expect(dispatch).toHaveBeenCalledWith({
                action: "reply_to_event",
                event: null,
                context: timelineRenderingType,
            });
        },
    );

    it("keeps the cancel button in the title's row", () => {
        renderPreview(mkReplyTarget("Alice"));

        const cancel = screen.getByRole("button", { name: "Cancel reply" });
        expect(cancel.parentElement).toHaveClass("mx_ReplyPreview_header");
        expect(cancel.parentElement).toContainElement(
            cancel.parentElement!.querySelector<HTMLElement>(".mx_ReplyPreview_title"),
        );
    });
});
