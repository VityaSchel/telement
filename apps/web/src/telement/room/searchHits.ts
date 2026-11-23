/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type ISearchResults, type MatrixEvent } from "matrix-js-sdk/src/matrix";

import { type SearchInfo, SearchScope } from "../../Searching";

/** Which way the search bar's arrows step: up to older results, down to newer ones. */
export type SearchStep = "older" | "newer";

/** The messages a search found, newest first, as the server and the local index return them. */
export function searchHitEvents(results: ISearchResults | undefined): MatrixEvent[] {
    return results?.results.map((result) => result.context.getEvent()) ?? [];
}

/**
 * Where a message is among the results of a search of this room, which the search bar can step through from it. A search
 * of all rooms finds messages in other rooms, which the room's timeline can't show, so it has no steps.
 */
export function searchHitIndex(search: SearchInfo | undefined, eventId: string | undefined): number | undefined {
    if (!eventId || search?.scope !== SearchScope.Room) return undefined;
    const index = searchHitEvents(search.results).findIndex((event) => event.getId() === eventId);
    return index === -1 ? undefined : index;
}

/**
 * The words to mark in a message a search found, as the results list marks them: those the server matched and the term
 * itself, longest first, so that a longer match wins where they overlap.
 */
export function searchHighlights(results: ISearchResults | undefined, term: string): string[] {
    const highlights = results?.highlights ?? [];
    return [...highlights, ...(highlights.includes(term) ? [] : [term])].sort((a, b) => b.length - a.length);
}
