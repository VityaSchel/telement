/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import {
    BaseViewModel,
    type SettingsSearchResult,
    type SettingsSearchViewModel as SettingsSearchViewModelInterface,
    type SettingsSearchViewSnapshot,
} from "@element-hq/web-shared-components";

/** A place search can open, in the user's language. */
export interface SettingsSearchTarget {
    /** The tab it is on. */
    tabId: string;
    /** From the tab's name to the setting's label, as the settings show them. */
    path: string[];
    /** The label of its group, which the setting is looked for under. */
    group?: string;
    /** The label of the setting, or nothing for a tab or a group. */
    label?: string;
}

export interface SettingsSearchViewModelProps {
    /** Builds what search can open, in the current language, from the tabs the dialog shows. */
    getTargets: () => SettingsSearchTarget[];
    /** Opens a place the user chose. */
    onChoose: (target: SettingsSearchTarget) => void;
}

/** The most results the list shows, which is more than a search narrowed by a word or two finds. */
const MAX_RESULTS = 50;

function normalize(text: string): string {
    return text.toLocaleLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
}

/**
 * How well a target matches the words of a query: every word must start a word of its path. A match in the setting's
 * own label ranks above one in its tab's or group's name, and a label starting with the query above the rest.
 * @returns the rank, lower first, or undefined if it doesn't match
 */
function rank(target: SettingsSearchTarget, words: string[], query: string): number | undefined {
    const pathWords = target.path.map((part) => normalize(part).split(/[^\p{L}\p{N}]+/u));
    const all = pathWords.flat();
    if (!words.every((word) => all.some((candidate) => candidate.startsWith(word)))) return undefined;

    const own = normalize(target.path[target.path.length - 1]);
    if (own.startsWith(query)) return 0;
    const ownWords = pathWords[pathWords.length - 1];
    if (words.every((word) => ownWords.some((candidate) => candidate.startsWith(word)))) return 1;
    return 2;
}

/**
 * View model of search in the user settings: it finds the tabs, groups and settings whose names hold the words typed,
 * and opens the one chosen.
 */
export class SettingsSearchViewModel
    extends BaseViewModel<SettingsSearchViewSnapshot, SettingsSearchViewModelProps>
    implements SettingsSearchViewModelInterface
{
    private targets: SettingsSearchTarget[] = [];

    public constructor(props: SettingsSearchViewModelProps) {
        super(props, { query: "", results: [], activeIndex: 0 });
    }

    public setQuery = (query: string): void => {
        const words = normalize(query)
            .split(/[^\p{L}\p{N}]+/u)
            .filter(Boolean);
        if (words.length === 0) {
            this.snapshot.merge({ query, results: [], activeIndex: 0 });
            return;
        }

        // The labels are read in the language at the time of the search, as the settings show them
        this.targets = this.props.getTargets();
        const normalized = normalize(query.trim());
        const results: SettingsSearchResult[] = this.targets
            .map((target, index) => ({ target, index, rank: rank(target, words, normalized) }))
            .filter(
                (match): match is { target: SettingsSearchTarget; index: number; rank: number } =>
                    match.rank !== undefined,
            )
            .sort((a, b) => a.rank - b.rank || a.index - b.index)
            .slice(0, MAX_RESULTS)
            .map(({ target, index }) => ({ id: String(index), path: target.path }));
        this.snapshot.merge({ query, results, activeIndex: 0 });
    };

    public moveActive = (delta: number): void => {
        const { results, activeIndex } = this.getSnapshot();
        if (results.length === 0) return;
        this.snapshot.merge({ activeIndex: (activeIndex + delta + results.length) % results.length });
    };

    public setActiveIndex = (index: number): void => {
        this.snapshot.merge({ activeIndex: index });
    };

    public choose = (id: string): void => {
        const target = this.targets[Number(id)];
        if (target) this.props.onChoose(target);
    };
}
