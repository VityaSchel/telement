/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";
import { type ISearchResults, MatrixEvent, type SearchResult } from "matrix-js-sdk/src/matrix";

import { type SearchInfo, SearchScope } from "../../Searching";
import { searchHighlights, searchHitEvents, searchHitIndex } from "./searchHits";

describe("searchHits", () => {
    const result = (eventId: string): SearchResult =>
        ({ context: { getEvent: () => new MatrixEvent({ event_id: eventId }) } }) as unknown as SearchResult;
    const results: ISearchResults = { results: [result("$newer"), result("$older")], highlights: ["pizzas"] };
    const search = (scope: SearchScope): SearchInfo => ({
        searchId: 1,
        term: "pizza",
        scope,
        promise: Promise.resolve(results),
        results,
    });

    it("lists the messages the search found, newest first", () => {
        expect(searchHitEvents(results).map((event) => event.getId())).toEqual(["$newer", "$older"]);
        expect(searchHitEvents(undefined)).toEqual([]);
    });

    it("finds a message among the results of a search of the room", () => {
        expect(searchHitIndex(search(SearchScope.Room), "$older")).toBe(1);
        expect(searchHitIndex(search(SearchScope.Room), "$elsewhere")).toBeUndefined();
        expect(searchHitIndex(search(SearchScope.Room), undefined)).toBeUndefined();
    });

    it("leaves the results of a search of all rooms to the list, as the room's timeline can't show them", () => {
        expect(searchHitIndex(search(SearchScope.All), "$older")).toBeUndefined();
    });

    it("marks what the server matched and the term itself, longest first", () => {
        expect(searchHighlights(results, "pizza")).toEqual(["pizzas", "pizza"]);
        expect(searchHighlights({ ...results, highlights: ["pizza"] }, "pizza")).toEqual(["pizza"]);
        expect(searchHighlights(undefined, "pizza")).toEqual(["pizza"]);
    });
});
