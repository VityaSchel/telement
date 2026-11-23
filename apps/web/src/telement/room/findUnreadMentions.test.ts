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
import { mkEvent, mkMembership, stubClient } from "test-utils";

import { haveRendererForEvent } from "../../events/EventTileFactory";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import { findUnreadMentions } from "./findUnreadMentions";

vi.mock("../../events/EventTileFactory", () => ({
    haveRendererForEvent: vi.fn(),
}));

describe("findUnreadMentions", () => {
    const roomId = "!room:server.org";
    const aliceId = "@alice:server.org";
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

    const muteRule = pushRule(roomId, {
        default: false,
        conditions: [{ kind: ConditionKind.EventMatch, key: "room_id", pattern: roomId }],
        actions: [PushRuleActionName.DontNotify],
    });

    const setPushRules = (muted: boolean): void => {
        client.pushRules = {
            global: {
                override: [
                    ...(muted ? [muteRule] : []),
                    pushRule(RuleId.IsUserMention, {
                        conditions: [
                            {
                                kind: ConditionKind.EventPropertyContains,
                                key: "content.m\\.mentions.user_ids",
                                value: myId,
                            },
                        ],
                    }),
                ],
                content: [],
                room: [],
                sender: [],
                underride: [
                    pushRule(RuleId.Message, {
                        conditions: [{ kind: ConditionKind.EventMatch, key: "type", pattern: EventType.RoomMessage }],
                        actions: [PushRuleActionName.Notify, { set_tweak: TweakName.Highlight, value: false }],
                    }),
                ],
            },
        };
    };

    const message = (sender: string, body: string, mentions?: IMentions): MatrixEvent =>
        mkEvent({
            event: true,
            type: EventType.RoomMessage,
            user: sender,
            room: roomId,
            content: { body, ...(mentions && { "m.mentions": mentions }) },
        });
    const mention = (body: string): MatrixEvent => message(aliceId, body, { user_ids: [myId] });

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

    const bodies = (events: MatrixEvent[]): string[] => events.map((event) => event.getContent().body);

    beforeEach(() => {
        room = new Room(roomId, client, myId);
        room.currentState.setStateEvents([
            mkMembership({ event: true, mship: "join", user: myId, room: roomId }),
            mkMembership({ event: true, mship: "join", user: aliceId, room: roomId }),
        ]);
        setPushRules(false);
        vi.mocked(client.getRoom).mockReturnValue(room);
        vi.mocked(client.supportsIntentionalMentions).mockReturnValue(true);
        vi.mocked(haveRendererForEvent).mockReturnValue(true);
    });

    it("finds nothing in a room without mentions", async () => {
        await addMessages(message(aliceId, "Hello"), message(aliceId, "Anyone?"));

        expect(findUnreadMentions(room)).toEqual([]);
    });

    it("finds the unread mentions of the user, oldest first", async () => {
        const [read] = await addMessages(mention("Old"), message(aliceId, "Read"));
        readUpTo(read);
        await addMessages(mention("First"), message(aliceId, "Between"), mention("Second"));

        expect(bodies(findUnreadMentions(room))).toEqual(["First", "Second"]);
    });

    it("counts the mentions before the user's own last message as read", async () => {
        await addMessages(mention("Answered"), message(myId, "Here"), mention("New"));

        expect(bodies(findUnreadMentions(room))).toEqual(["New"]);
    });

    it("finds the mentions of a muted room, as the room list's @ shows them", async () => {
        setPushRules(true);
        await addMessages(mention("Muted but mentioned"));

        expect(bodies(findUnreadMentions(room))).toEqual(["Muted but mentioned"]);
    });

    it("finds nothing before the push rules have loaded", async () => {
        client.pushRules = {} as IPushRules;
        await addMessages(mention("Too early"));

        expect(findUnreadMentions(room)).toEqual([]);
    });

    it("leaves out mentions the timeline doesn't show", async () => {
        vi.mocked(haveRendererForEvent).mockImplementation((event) => event.getContent().body !== "Hidden");
        await addMessages(mention("Hidden"), mention("Shown"));

        expect(bodies(findUnreadMentions(room))).toEqual(["Shown"]);
    });
});
