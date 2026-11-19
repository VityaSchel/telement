/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";

import { getSeenByOwnEvents, type SeenByEvent } from "./EventTileSeenBy";

const own = (eventId: string): SeenByEvent => ({ eventId, isOwn: true });
const other = (eventId: string): SeenByEvent => ({ eventId, isOwn: false });
const receipt = (userId: string, ts: number): { userId: string; ts: number } => ({ userId, ts });

describe("getSeenByOwnEvents", () => {
    it("counts a message read by everyone whose receipt is on it or on a later message", () => {
        const seenBy = getSeenByOwnEvents(
            [own("$1"), own("$2"), other("$3"), own("$4")],
            new Map([
                ["$2", [receipt("@bob:example.org", 20)]],
                ["$3", [receipt("@carol:example.org", 30)]],
            ]),
        );

        expect(seenBy.get("$1")!.map((r) => r.userId)).toEqual(["@carol:example.org", "@bob:example.org"]);
        expect(seenBy.get("$2")!.map((r) => r.userId)).toEqual(["@carol:example.org", "@bob:example.org"]);
        expect(seenBy.get("$4")).toEqual([]);
    });

    it("leaves other people's messages out", () => {
        const seenBy = getSeenByOwnEvents(
            [other("$1"), own("$2")],
            new Map([["$2", [receipt("@bob:example.org", 1)]]]),
        );

        expect([...seenBy.keys()]).toEqual(["$2"]);
    });

    it("lists the readers most recent first", () => {
        const seenBy = getSeenByOwnEvents(
            [own("$1"), other("$2")],
            new Map([
                ["$1", [receipt("@bob:example.org", 10), receipt("@dave:example.org", 40)]],
                ["$2", [receipt("@carol:example.org", 30)]],
            ]),
        );

        expect(seenBy.get("$1")!.map((r) => r.ts)).toEqual([40, 30, 10]);
    });

    it("counts each reader once, by their latest receipt", () => {
        const seenBy = getSeenByOwnEvents(
            [own("$1"), own("$2")],
            new Map([
                ["$1", [receipt("@bob:example.org", 10)]],
                ["$2", [receipt("@bob:example.org", 20)]],
            ]),
        );

        expect(seenBy.get("$1")).toEqual([receipt("@bob:example.org", 20)]);
    });

    it("counts the readers of messages after the shown ones as having read every message shown", () => {
        const seenBy = getSeenByOwnEvents(
            [own("$1"), other("$2"), own("$3")],
            new Map([["$2", [receipt("@bob:example.org", 20)]]]),
            [receipt("@carol:example.org", 30), receipt("@bob:example.org", 40)],
        );

        expect(seenBy.get("$3")!.map((r) => r.userId)).toEqual(["@bob:example.org", "@carol:example.org"]);
        expect(seenBy.get("$1")!.map((r) => r.ts)).toEqual([40, 30]);
    });

    it("shares one list between the messages it is the same for", () => {
        const seenBy = getSeenByOwnEvents(
            [own("$1"), own("$2"), own("$3")],
            new Map([["$3", [receipt("@bob:example.org", 10)]]]),
        );

        expect(seenBy.get("$1")).toBe(seenBy.get("$3"));
        expect(seenBy.get("$2")).toBe(seenBy.get("$3"));
    });
});
