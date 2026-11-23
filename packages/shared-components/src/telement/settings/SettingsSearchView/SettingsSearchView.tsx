/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type FocusEvent, type JSX, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import classNames from "classnames";

import { _t } from "../../../core/i18n/i18n";
import { type ViewModel } from "../../../core/viewmodel/ViewModel";
import { useViewModel } from "../../../core/viewmodel/useViewModel";
import { SearchFieldView } from "../../core/SearchFieldView";
import styles from "./SettingsSearchView.module.css";

/** A setting the search found. */
export interface SettingsSearchResult {
    /** Identifies the setting to the view model. */
    id: string;
    /** Where the setting is, from the tab to the setting itself, such as ["Preferences", "Room list", "Show previews"]. */
    path: string[];
}

/** What {@link SettingsSearchView} shows. */
export interface SettingsSearchViewSnapshot {
    /** What the user typed. */
    query: string;
    /** The settings matching the query, best first. */
    results: SettingsSearchResult[];
    /** The index of the result the arrow keys and the pointer are on, which Enter opens. */
    activeIndex: number;
}

/** What {@link SettingsSearchView} can do. */
export interface SettingsSearchViewActions {
    /** Searches for what the user typed. */
    setQuery: (query: string) => void;
    /** Moves the active result by `delta`, wrapping around the list, as the arrow keys do. */
    moveActive: (delta: number) => void;
    /** Makes the result under the pointer the active one. */
    setActiveIndex: (index: number) => void;
    /** Opens the setting: its tab, scrolled to it. */
    choose: (id: string) => void;
}

/** The view model of {@link SettingsSearchView}. */
export type SettingsSearchViewModel = ViewModel<SettingsSearchViewSnapshot, SettingsSearchViewActions>;

/** Props for {@link SettingsSearchView}. */
export interface SettingsSearchViewProps {
    /** The view model of the search. */
    vm: SettingsSearchViewModel;
    /** Extra class name for the search's box. */
    className?: string;
}

/**
 * Search in settings, as in Telegram's settings: the shared search pill above the tabs, and, while it holds text and
 * has focus, the matching settings in a menu under it, one row each, "Tab › Group › Setting". Typing filters, the arrow
 * keys and the pointer move one highlight, and Enter or a click opens the setting. Escape empties the field.
 *
 * @example
 * ```tsx
 * <SettingsSearchView vm={settingsSearchViewModel} />
 * ```
 */
export function SettingsSearchView({ vm, className }: Readonly<SettingsSearchViewProps>): JSX.Element {
    const { query, results, activeIndex } = useViewModel(vm);
    const [focused, setFocused] = useState(false);
    const listRef = useRef<HTMLUListElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();

    const open = focused && query.trim() !== "";
    const activeResult = results[activeIndex];
    const optionId = (index: number): string => `${listId}-${index}`;

    // Keep the active result in view as the arrow keys move it through a list that scrolls
    useEffect(() => {
        if (!open) return;
        listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
    }, [open, activeIndex]);

    // The field lets go of the focus, closing the list, so that the setting can take it
    const openResult = (id: string): void => {
        inputRef.current?.blur();
        vm.choose(id);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
        switch (event.key) {
            case "ArrowDown":
            case "ArrowUp":
                if (!open || results.length === 0) return;
                event.preventDefault();
                vm.moveActive(event.key === "ArrowDown" ? 1 : -1);
                break;
            case "Enter":
                if (!open || !activeResult) return;
                event.preventDefault();
                openResult(activeResult.id);
                break;
            case "Escape":
                // Only empties the field: with nothing typed, Escape closes the settings as before
                if (query === "") return;
                event.preventDefault();
                event.stopPropagation();
                vm.setQuery("");
                break;
        }
    };

    const onBlur = (event: FocusEvent<HTMLDivElement>): void => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    };

    return (
        <div className={classNames(styles.search, className)} onFocus={() => setFocused(true)} onBlur={onBlur}>
            <SearchFieldView
                ref={inputRef}
                value={query}
                onChange={vm.setQuery}
                placeholder={_t("telement|settings_search|placeholder")}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={open && activeResult ? optionId(activeIndex) : undefined}
            />
            {open && (
                <ul
                    ref={listRef}
                    id={listId}
                    className={styles.results}
                    role="listbox"
                    aria-label={_t("telement|settings_search|results")}
                >
                    {results.length === 0 && (
                        <li className={styles.empty} role="presentation">
                            {_t("telement|settings_search|no_results")}
                        </li>
                    )}
                    {results.map((result, index) => {
                        const setting = result.path[result.path.length - 1];
                        const where = result.path.slice(0, -1);
                        return (
                            // The keys move the highlight from the field, which keeps the focus, as in a combobox
                            // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
                            <li
                                key={result.id}
                                id={optionId(index)}
                                data-index={index}
                                className={classNames(styles.result, { [styles.active]: index === activeIndex })}
                                role="option"
                                aria-selected={index === activeIndex}
                                // Keep the focus in the field, which would otherwise close the list before the click
                                onMouseDown={(event) => event.preventDefault()}
                                // The pointer moves the one highlight the arrow keys move
                                onPointerMove={() => {
                                    if (index !== activeIndex) vm.setActiveIndex(index);
                                }}
                                onClick={() => openResult(result.id)}
                            >
                                {where.map((part, partIndex) => (
                                    // The parts of a path are fixed for the result, and the same name can repeat in it
                                    // oxlint-disable-next-line react/no-array-index-key
                                    <React.Fragment key={partIndex}>
                                        <span className={styles.where}>{part}</span>
                                        <span className={styles.separator}>{" › "}</span>
                                    </React.Fragment>
                                ))}
                                <span className={styles.setting}>{setting}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
