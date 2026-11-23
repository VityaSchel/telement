/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { beforeEach, describe, expect, it, vi } from "vitest";

import { TimelineReturns } from "./TimelineReturns";

describe("TimelineReturns", () => {
    const onChange = vi.fn();
    const readAt = (eventId?: string) => () => eventId;
    let returns: TimelineReturns;

    beforeEach(() => {
        onChange.mockReset();
        returns = new TimelineReturns(onChange);
    });

    it("returns to the reply whose quote was clicked", () => {
        returns.recordJump("$quoted", { eventId: "$reply" }, readAt("$reading"));

        expect(returns.canReturn).toBe(true);
        expect(returns.pop()).toBe("$reply");
        expect(returns.canReturn).toBe(false);
        expect(returns.pop()).toBeUndefined();
    });

    it("returns to where the timeline was read for a pin or a search result", () => {
        returns.recordJump("$pinned", "readingPosition", readAt("$reading"));

        expect(returns.pop()).toBe("$reading");
    });

    it("has nowhere to return to from the bottom of the timeline, where jump to bottom goes anyway", () => {
        returns.recordJump("$pinned", "readingPosition", readAt(undefined));

        expect(returns.canReturn).toBe(false);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("goes back through a chain of jumps, the last first", () => {
        returns.recordJump("$b", { eventId: "$a" }, readAt());
        returns.recordJump("$c", { eventId: "$b" }, readAt());

        expect([returns.pop(), returns.pop()]).toEqual(["$b", "$a"]);
    });

    it("doesn't remember a jump to where it already is, nor the same place twice in a row", () => {
        returns.recordJump("$a", { eventId: "$a" }, readAt());
        returns.recordJump("$b", { eventId: "$a" }, readAt());
        returns.recordJump("$c", { eventId: "$a" }, readAt());

        expect([returns.pop(), returns.pop()]).toEqual(["$a", undefined]);
    });

    it("keeps the last ten places", () => {
        for (let i = 0; i < 12; i++) returns.recordJump(`$target${i}`, { eventId: `$from${i}` }, readAt());

        const popped: Array<string | undefined> = [];
        while (returns.canReturn) popped.push(returns.pop());

        expect(popped).toHaveLength(10);
        expect(popped[0]).toBe("$from11");
        expect(popped.at(-1)).toBe("$from2");
    });

    it("tells when it gains its first place and loses its last", () => {
        returns.recordJump("$b", { eventId: "$a" }, readAt());
        returns.recordJump("$c", { eventId: "$b" }, readAt());
        returns.pop();

        expect(onChange.mock.calls).toEqual([[true]]);

        returns.pop();

        expect(onChange.mock.calls).toEqual([[true], [false]]);
    });

    it("forgets every place when cleared", () => {
        returns.recordJump("$b", { eventId: "$a" }, readAt());
        returns.clear();
        returns.clear();

        expect(returns.canReturn).toBe(false);
        expect(onChange.mock.calls).toEqual([[true], [false]]);
    });
});
