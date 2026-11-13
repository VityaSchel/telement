/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    ConditionKind,
    EventType,
    type IContent,
    type IMentions,
    type IPushRule,
    type IPushRules,
    MatrixEvent,
    PushRuleActionName,
    ReceiptType,
    Room,
    RuleId,
    TweakName,
} from "matrix-js-sdk/src/matrix";
import { PushProcessor } from "matrix-js-sdk/src/pushprocessor";
import { mkEvent, mkMembership, stubClient } from "test-utils";

import { haveRendererForEvent } from "../../events/EventTileFactory";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import { countUnreadMessages } from "./countUnreadMessages";

vi.mock("../../events/EventTileFactory", () => ({
    haveRendererForEvent: vi.fn(),
}));

describe("countUnreadMessages", () => {
    const roomId = "!room:server.org";
    const aliceId = "@alice:server.org";
    const moderatorId = "@moderator:server.org";
    const myDisplayName = "Dana";
    stubClient();
    const client = MatrixClientPeg.safeGet();
    const myId = client.getSafeUserId();
    let room: Room;

    const pushRule = (ruleId: string, rule: Partial<IPushRule>): IPushRule => ({
        rule_id: ruleId,
        default: true,
        enabled: true,
        actions: [PushRuleActionName.Notify, { set_tweak: TweakName.Highlight }],
        ...rule,
    });

    // The default rules a server sends, a keyword, and the room muted the way Element mutes it
    const mutedRoomPushRules = (): IPushRules => ({
        global: {
            override: [
                pushRule(RuleId.Master, { enabled: false, conditions: [], actions: [PushRuleActionName.DontNotify] }),
                pushRule(roomId, {
                    default: false,
                    conditions: [{ kind: ConditionKind.EventMatch, key: "room_id", pattern: roomId }],
                    actions: [PushRuleActionName.DontNotify],
                }),
                pushRule(RuleId.IsUserMention, {
                    conditions: [
                        {
                            kind: ConditionKind.EventPropertyContains,
                            key: "content.m\\.mentions.user_ids",
                            value: myId,
                        },
                    ],
                }),
                pushRule(RuleId.ContainsDisplayName, { conditions: [{ kind: ConditionKind.ContainsDisplayName }] }),
                pushRule(RuleId.IsRoomMention, {
                    conditions: [
                        { kind: ConditionKind.EventPropertyIs, key: "content.m\\.mentions.room", value: true },
                        { kind: ConditionKind.SenderNotificationPermission, key: "room" },
                    ],
                }),
                pushRule(RuleId.AtRoomNotification, {
                    conditions: [
                        { kind: ConditionKind.SenderNotificationPermission, key: "room" },
                        { kind: ConditionKind.EventMatch, key: "content.body", pattern: "@room" },
                    ],
                }),
            ],
            content: [
                pushRule(RuleId.ContainsUserName, { pattern: "userId" }),
                pushRule("pizza", { default: false, pattern: "pizza", actions: [PushRuleActionName.Notify] }),
            ],
            room: [],
            sender: [],
            underride: [
                pushRule(RuleId.Message, {
                    conditions: [{ kind: ConditionKind.EventMatch, key: "type", pattern: EventType.RoomMessage }],
                    actions: [PushRuleActionName.Notify, { set_tweak: TweakName.Highlight, value: false }],
                }),
            ],
        },
    });

    const messageWithContent = (sender: string, content: IContent): MatrixEvent =>
        mkEvent({ event: true, type: EventType.RoomMessage, user: sender, room: roomId, content });

    const message = (sender: string, body = "Hello", mentions?: IMentions): MatrixEvent =>
        messageWithContent(sender, { body, ...(mentions && { "m.mentions": mentions }) });

    const addMessages = async (...events: MatrixEvent[]): Promise<MatrixEvent[]> => {
        await room.addLiveEvents(events, { addToState: false });
        return events;
    };

    const readUpTo = (event: MatrixEvent): void => {
        room.addReceipt(
            new MatrixEvent({
                type: "m.receipt",
                room_id: roomId,
                content: { [event.getId()!]: { [ReceiptType.Read]: { [myId]: { ts: 1 } } } },
            }),
        );
    };

    beforeEach(() => {
        room = new Room(roomId, client, myId);
        room.currentState.setStateEvents([
            mkEvent({
                event: true,
                type: EventType.RoomCreate,
                user: moderatorId,
                room: roomId,
                skey: "",
                content: { room_version: "10" },
            }),
            mkMembership({ event: true, mship: "join", user: myId, room: roomId, name: myDisplayName }),
            mkMembership({ event: true, mship: "join", user: aliceId, room: roomId }),
            mkMembership({ event: true, mship: "join", user: moderatorId, room: roomId }),
            mkEvent({
                event: true,
                type: EventType.RoomPowerLevels,
                user: moderatorId,
                room: roomId,
                skey: "",
                content: { users: { [moderatorId]: 50 } },
            }),
        ]);
        client.pushRules = mutedRoomPushRules();
        vi.mocked(client.getRoom).mockReturnValue(room);
        vi.mocked(client.supportsIntentionalMentions).mockReturnValue(true);
        vi.mocked(haveRendererForEvent).mockReturnValue(true);
    });

    it("counts nothing in an empty room", () => {
        expect(countUnreadMessages(room)).toEqual({ count: 0, mentionsMe: false });
    });

    it("counts the messages after the read receipt", async () => {
        const [first] = await addMessages(message(aliceId), message(aliceId), message(aliceId));
        readUpTo(first);
        expect(countUnreadMessages(room).count).toBe(2);
    });

    it("counts nothing when the read receipt is at the latest message", async () => {
        const events = await addMessages(message(aliceId), message(aliceId));
        readUpTo(events[1]);
        expect(countUnreadMessages(room).count).toBe(0);
    });

    it("counts only the messages after the last one the user sent", async () => {
        await addMessages(message(aliceId), message(myId), message(aliceId), message(aliceId));
        expect(countUnreadMessages(room).count).toBe(2);
    });

    it("counts every loaded message when there is no read receipt", async () => {
        await addMessages(message(aliceId), message(aliceId), message(aliceId));
        expect(countUnreadMessages(room).count).toBe(3);
    });

    it("leaves out events that don't count as unread messages", async () => {
        const [first] = await addMessages(message(aliceId));
        readUpTo(first);
        await addMessages(
            message(aliceId),
            mkMembership({ event: true, mship: "join", user: "@bob:server.org", room: roomId }),
            message(aliceId),
        );
        vi.mocked(haveRendererForEvent).mockImplementation((event) => event.getContent().body !== "hidden");
        await addMessages(message(aliceId, "hidden"));

        expect(countUnreadMessages(room).count).toBe(2);
    });

    it("finds a mention of the user among the unread messages", async () => {
        const [first] = await addMessages(message(aliceId));
        readUpTo(first);
        await addMessages(message(aliceId, "Hi", { user_ids: [myId] }), message(aliceId));

        expect(countUnreadMessages(room)).toEqual({ count: 2, mentionsMe: true });
    });

    it.each<[string, string, IContent]>([
        ["an intentional mention of the user", aliceId, { "body": "Hi", "m.mentions": { user_ids: [myId] } }],
        [
            "a reply to the user",
            aliceId,
            {
                "body": "Sure",
                "m.mentions": { user_ids: [myId] },
                "m.relates_to": { "m.in_reply_to": { event_id: "$mine" } },
            },
        ],
        [
            "the user's display name in a message without mentions",
            aliceId,
            { body: `${myDisplayName}, are you there?` },
        ],
        ["the user's user name in a message without mentions", aliceId, { body: "userId, are you there?" }],
        ["@room from a sender allowed to notify the room", moderatorId, { "body": "Hi", "m.mentions": { room: true } }],
        ["a plain @room from a sender allowed to notify the room", moderatorId, { body: "@room hi" }],
        ["one of the user's keywords", aliceId, { body: "Pizza tonight?" }],
    ])("takes %s for a mention of the user", async (_, sender, content) => {
        await addMessages(messageWithContent(sender, content));
        expect(countUnreadMessages(room)).toEqual({ count: 1, mentionsMe: true });
    });

    it.each<[string, string, IContent]>([
        ["a plain message", aliceId, { body: "Hello" }],
        ["a mention of someone else", aliceId, { "body": "Hi", "m.mentions": { user_ids: [aliceId] } }],
        ["@room from a sender not allowed to notify the room", aliceId, { "body": "Hi", "m.mentions": { room: true } }],
        ["a plain @room from a sender not allowed to notify the room", aliceId, { body: "@room hi" }],
        [
            "the user's display name in a message whose mentions leave them out",
            aliceId,
            { "body": `${myDisplayName} said hi`, "m.mentions": {} },
        ],
    ])("doesn't take %s for a mention of the user", async (_, sender, content) => {
        await addMessages(messageWithContent(sender, content));
        expect(countUnreadMessages(room)).toEqual({ count: 1, mentionsMe: false });
    });

    it("finds a mention that the room's mute rule silences", async () => {
        const [mention] = await addMessages(message(aliceId, `${myDisplayName}, are you there?`));

        expect(new PushProcessor(client).actionsForEvent(mention).tweaks.highlight).toBe(false);
        expect(countUnreadMessages(room)).toEqual({ count: 1, mentionsMe: true });
    });

    it("finds no mentions when the user has turned off all notifications", async () => {
        client.pushRules!.global.override!.find((rule) => rule.rule_id === RuleId.Master)!.enabled = true;
        await addMessages(message(aliceId, `${myDisplayName}, are you there?`, { user_ids: [myId] }));

        expect(countUnreadMessages(room)).toEqual({ count: 1, mentionsMe: false });
    });

    it("leaves out a mention that the user has read", async () => {
        const [mention] = await addMessages(message(aliceId, "Hi", { user_ids: [myId] }));
        readUpTo(mention);
        await addMessages(message(aliceId));

        expect(countUnreadMessages(room)).toEqual({ count: 1, mentionsMe: false });
    });

    it("leaves out a mention that comes before the user's last message", async () => {
        await addMessages(message(aliceId, "Hi", { user_ids: [myId] }), message(myId), message(aliceId));

        expect(countUnreadMessages(room)).toEqual({ count: 1, mentionsMe: false });
    });

    it("leaves out mentions in events that don't count as unread messages", async () => {
        vi.mocked(haveRendererForEvent).mockImplementation((event) => event.getContent().body !== "hidden");
        await addMessages(message(aliceId, "hidden", { user_ids: [myId] }));

        expect(countUnreadMessages(room)).toEqual({ count: 0, mentionsMe: false });
    });
});
