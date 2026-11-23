/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/** What a filter finds a choice by. */
interface FilterableChoice {
    /** The choice as the menu shows it. */
    label: string;
    /** What else it is called. */
    searchTerms?: string[];
}

/** In lower case and without accents, so that "sao paulo" finds "São Paulo". */
function normalize(text: string): string {
    return text.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
}

/**
 * The choices that hold every word of the query, in any case and with or without accents, in their own order. Anything
 * but letters and digits separates words, so that "buenos aires" finds "America/Argentina/Buenos_Aires".
 */
export function filterChoices<T extends FilterableChoice>(choices: T[], query: string): T[] {
    const words = normalize(query)
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean);
    if (words.length === 0) return choices;

    return choices.filter(({ label, searchTerms = [] }) => {
        const text = normalize([label, ...searchTerms].join("\n"));
        return words.every((word) => text.includes(word));
    });
}
