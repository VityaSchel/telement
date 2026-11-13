/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventType, type MatrixClient, type MatrixEvent, type Room } from "matrix-js-sdk/src/matrix";
import { makePollStartEvent, mkEvent, mkMessage, stubClient } from "test-utils";

import { type MessagePreview, MessagePreviewStore } from "../../stores/message-preview";
import { DefaultTagID } from "../../stores/room-list-v3/skip-list/tag";
import { splitMessagePreview } from "./splitMessagePreview";

const ROOM_ID = "!room:server";
const ALICE = "@alice:server";

describe("splitMessagePreview", () => {
    let client: MatrixClient;
    let joinedMembers: number;

    beforeEach(() => {
        client = stubClient();
        joinedMembers = 5;
        vi.mocked(client.getRoom).mockReturnValue({
            currentState: { getJoinedMemberCount: () => joinedMembers },
        } as unknown as Room);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function fromAlice(event: MatrixEvent): MatrixEvent {
        Object.defineProperty(event, "sender", { value: { name: "Alice" } });
        return event;
    }

    function message(user: string, body: string): MatrixEvent {
        return mkMessage({ event: true, room: ROOM_ID, user, msg: body });
    }

    /** The preview as the store makes it: the event, with the text Element would show. */
    function preview(event: MatrixEvent, text: string): MessagePreview {
        return { event, text, isThreadReply: false };
    }

    it("puts the sender of a message in a group room before its text", () => {
        const event = fromAlice(message(ALICE, "Has anyone tried the new release?"));
        expect(
            splitMessagePreview(preview(event, "Alice: Has anyone tried the new release?"), DefaultTagID.Untagged),
        ).toEqual({
            text: "Has anyone tried the new release?",
            sender: "Alice",
        });
    });

    it("puts You before the user's own message in a group room", () => {
        const event = message(client.getSafeUserId(), "Pushed the spec");
        expect(splitMessagePreview(preview(event, "Pushed the spec"), DefaultTagID.Untagged)).toEqual({
            text: "Pushed the spec",
            sender: "You",
        });
    });

    it("shows only the text in a one-to-one chat, although the store's text names the sender", () => {
        joinedMembers = 2;
        const theirs = fromAlice(message(ALICE, "See you tomorrow"));
        const mine = message(client.getSafeUserId(), "See you");

        expect(splitMessagePreview(preview(theirs, "Alice: See you tomorrow"), DefaultTagID.DM)).toEqual({
            text: "See you tomorrow",
        });
        expect(splitMessagePreview(preview(mine, "See you"), DefaultTagID.DM)).toEqual({ text: "See you" });
    });

    it("puts the sender before messages in a direct chat with several people", () => {
        joinedMembers = 3;
        const event = fromAlice(message(ALICE, "Hi all"));
        expect(splitMessagePreview(preview(event, "Alice: Hi all"), DefaultTagID.DM)).toEqual({
            text: "Hi all",
            sender: "Alice",
        });
    });

    it("splits stickers and polls like messages", () => {
        const sticker = fromAlice(
            mkEvent({ event: true, room: ROOM_ID, user: ALICE, type: EventType.Sticker, content: { body: "Cat" } }),
        );
        const poll = makePollStartEvent("Lunch?", client.getSafeUserId(), undefined, { roomId: ROOM_ID });

        expect(splitMessagePreview(preview(sticker, "Alice: Cat"), DefaultTagID.Untagged)).toEqual({
            text: "Cat",
            sender: "Alice",
        });
        expect(splitMessagePreview(preview(poll, "Lunch?"), DefaultTagID.Untagged)).toEqual({
            text: "Lunch?",
            sender: "You",
        });
    });

    it.each([
        [
            "an emote",
            () =>
                fromAlice(
                    mkEvent({
                        event: true,
                        room: ROOM_ID,
                        user: ALICE,
                        type: EventType.RoomMessage,
                        content: { msgtype: "m.emote", body: "waves" },
                    }),
                ),
            "* Alice waves",
        ],
        [
            "an edit to an emote",
            () =>
                fromAlice(
                    mkEvent({
                        event: true,
                        room: ROOM_ID,
                        user: ALICE,
                        type: EventType.RoomMessage,
                        content: {
                            "msgtype": "m.emote",
                            "body": "* waves",
                            "m.new_content": { msgtype: "m.emote", body: "waves" },
                            "m.relates_to": { rel_type: "m.replace", event_id: "$original" },
                        },
                    }),
                ),
            "* Alice waves",
        ],
        [
            "a call",
            () =>
                fromAlice(
                    mkEvent({ event: true, room: ROOM_ID, user: ALICE, type: EventType.CallInvite, content: {} }),
                ),
            "Alice started a call",
        ],
        [
            "a reaction",
            () =>
                mkEvent({
                    event: true,
                    room: ROOM_ID,
                    user: client.getSafeUserId(),
                    type: EventType.Reaction,
                    content: {},
                }),
            "You reacted 👍 to hello",
        ],
    ])("keeps Element's whole sentence for %s, which names who did it", (_, makeEvent, text) => {
        const generate = vi.spyOn(MessagePreviewStore.instance, "generatePreviewForEvent");
        expect(splitMessagePreview(preview(makeEvent(), text), DefaultTagID.Untagged)).toEqual({ text });
        expect(generate).not.toHaveBeenCalled();
    });
});
