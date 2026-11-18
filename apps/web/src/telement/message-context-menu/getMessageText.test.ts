/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it, vi } from "vitest";
import { EventType, MatrixEvent, MsgType, RelationType } from "matrix-js-sdk/src/matrix";

import { getMessageText } from "./getMessageText";

function message(content: object, type: string = EventType.RoomMessage): MatrixEvent {
    return new MatrixEvent({ type, room_id: "!room:example.org", event_id: "$message", content });
}

describe("getMessageText", () => {
    it.each([MsgType.Text, MsgType.Notice, MsgType.Emote])("is the body of a %s message", (msgtype) => {
        expect(getMessageText(message({ msgtype, body: "Hello\nworld" }))).toBe("Hello\nworld");
    });

    it("leaves out the quote older clients put at the start of a reply", () => {
        const reply = message({
            "msgtype": MsgType.Text,
            "body": "> <@alice:example.org> How are you?\n\nFine, thanks",
            "m.relates_to": { "m.in_reply_to": { event_id: "$question" } },
        });

        expect(getMessageText(reply)).toBe("Fine, thanks");
    });

    it("keeps a quote that starts the edited text of a reply, which has no quote of the message replied to", () => {
        const reply = message({
            "msgtype": MsgType.Text,
            "body": "> <@alice:example.org> How are you?\n\nFine",
            "m.relates_to": { "m.in_reply_to": { event_id: "$question" } },
        });
        const edit = new MatrixEvent({
            type: EventType.RoomMessage,
            room_id: "!room:example.org",
            event_id: "$edit",
            content: {
                "msgtype": MsgType.Text,
                "body": "* > You asked\n\nFine, thanks",
                "m.new_content": { msgtype: MsgType.Text, body: "> You asked\n\nFine, thanks" },
                "m.relates_to": { rel_type: RelationType.Replace, event_id: "$message" },
            },
        });
        reply.makeReplaced(edit);

        expect(getMessageText(reply)).toBe("> You asked\n\nFine, thanks");
    });

    it("keeps a quote that starts a message which isn't a reply", () => {
        expect(getMessageText(message({ msgtype: MsgType.Text, body: "> To be\n\nor not" }))).toBe("> To be\n\nor not");
    });

    it.each([MsgType.Image, MsgType.Video, MsgType.Audio, MsgType.File])("is the caption of a %s", (msgtype) => {
        const file = message({ msgtype, body: "Look at this", filename: "file.bin", url: "mxc://example.org/file" });

        expect(getMessageText(file)).toBe("Look at this");
    });

    it("is undefined for a file without a caption, whose body is its name", () => {
        expect(
            getMessageText(message({ msgtype: MsgType.File, body: "file.bin", filename: "file.bin" })),
        ).toBeUndefined();
        expect(getMessageText(message({ msgtype: MsgType.Image, body: "photo.jpg" }))).toBeUndefined();
    });

    it.each([
        ["a location", message({ msgtype: MsgType.Location, body: "Somewhere", geo_uri: "geo:51.5,-0.1" })],
        ["a message that could not be decrypted", message({ msgtype: "m.bad.encrypted", body: "Unable to decrypt" })],
        ["a message without a body", message({ msgtype: MsgType.Text })],
        ["a message of only spaces", message({ msgtype: MsgType.Text, body: " \n " })],
        ["a sticker", message({ body: "A cat", url: "mxc://example.org/cat" }, EventType.Sticker)],
        ["a room name change", message({ name: "Room" }, EventType.RoomName)],
    ])("is undefined for %s", (_name, event) => {
        expect(getMessageText(event)).toBeUndefined();
    });

    it("is undefined for a removed message", () => {
        const event = message({ msgtype: MsgType.Text, body: "Oops" });
        vi.spyOn(event, "isRedacted").mockReturnValue(true);

        expect(getMessageText(event)).toBeUndefined();
    });
});
