/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, {
    type JSX,
    type KeyboardEvent,
    memo,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import classNames from "classnames";
import { MenuScrollArea } from "@vector-im/compound-web";

import { _t } from "../../../core/i18n/i18n";
import { SearchFieldView } from "../../core/SearchFieldView";
import { filterChoices } from "./filterChoices";
import { ValueRowMenuItem } from "./ValueRowMenuItem";
import styles from "./ValueRowView.module.css";

/** An item of a value row's menu. */
export interface ValueRowChoice {
    /** Tells the item from the menu's other items. */
    key: string;
    /** The choice as the menu shows it. */
    label: string;
    /** What else the filter finds it by. */
    searchTerms?: string[];
    /** Whether it is the current choice. */
    checked: boolean;
    /** Chooses it. */
    onSelect: () => void;
}

/** Props for {@link FilterableChoices}. */
interface FilterableChoicesProps {
    /** Every choice of the menu. */
    choices: ValueRowChoice[];
    /** Closes the menu. */
    onClose: () => void;
}

/** Where the highlight starts: on the current choice in the whole list, on the first match once it is filtered. */
function startIndex(choices: ValueRowChoice[], query: string): number {
    if (query !== "") return 0;
    return Math.max(
        choices.findIndex(({ checked }) => checked),
        0,
    );
}

/**
 * The content of a value row's menu with many choices: the shared search pill, which has the focus, over the list of
 * the choices it filters. The arrow keys and the pointer move one highlight, and Enter chooses what it is on. Escape
 * empties the pill, then closes the menu. What is typed lives as long as the menu is open, and like whether it is open
 * it is no part of the row's snapshot.
 */
export function FilterableChoices({ choices, onClose }: Readonly<FilterableChoicesProps>): JSX.Element {
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(() => startIndex(choices, ""));
    const matches = useMemo(() => filterChoices(choices, query), [choices, query]);
    const active = matches.at(activeIndex);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const listId = useId();
    const choiceId = ({ key }: ValueRowChoice): string => `${listId}-${encodeURIComponent(key)}`;

    const changeQuery = (newQuery: string): void => {
        setQuery(newQuery);
        setActiveIndex(startIndex(choices, newQuery));
    };

    useLayoutEffect(() => {
        inputRef.current?.focus({ preventScroll: true });
        // The list keeps the width its longest choice gives it, so that the menu doesn't narrow as it is filtered
        const list = listRef.current;
        if (list) list.style.minInlineSize = `${list.getBoundingClientRect().width}px`;
    }, []);

    // The whole list starts with the current choice in the middle of what it shows, a filtered one at its top
    useLayoutEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const current = query === "" ? list.querySelector<HTMLElement>("[aria-checked='true']") : null;
        list.scrollTop = current ? current.offsetTop - (list.clientHeight - current.offsetHeight) / 2 : 0;
    }, [query]);

    // Radix closes a menu on Escape from the document, before the pill hears of the key, which then goes on to the
    // dialog around the row where the menu fades out, with reduced motion. So the menu takes it first, from the window.
    useEffect(() => {
        const onEscape = (event: globalThis.KeyboardEvent): void => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            // Left to the input method, which it cancels
            if (event.isComposing) return;
            event.preventDefault();
            if (query === "") onClose();
            else changeQuery("");
        };
        window.addEventListener("keydown", onEscape, { capture: true });
        return () => window.removeEventListener("keydown", onEscape, { capture: true });
    });

    const moveActive = (delta: number): void => {
        if (matches.length === 0) return;
        const index = (activeIndex + delta + matches.length) % matches.length;
        setActiveIndex(index);
        document.getElementById(choiceId(matches[index]))?.scrollIntoView({ block: "nearest" });
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
        if (event.nativeEvent.isComposing) return;

        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            moveActive(event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Enter") {
            event.preventDefault();
            if (!active) return;
            active.onSelect();
            onClose();
        } else if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
            // Radix would take a typed character as the start of an item's name, and focus that item
            event.stopPropagation();
        }
    };

    return (
        <>
            {/* A menu may only hold items, so the pill is in one, as Compound's menus hold other controls */}
            <div className={styles.filter} role="menuitem" aria-label={_t("action|search")}>
                <SearchFieldView
                    ref={inputRef}
                    value={query}
                    onChange={changeQuery}
                    // The pill keeps the focus as long as the menu is open
                    releaseFocus={() => inputRef.current?.focus()}
                    onKeyDown={onKeyDown}
                    aria-controls={listId}
                    aria-activedescendant={active && choiceId(active)}
                />
            </div>
            <MenuScrollArea
                ref={listRef}
                id={listId}
                className={styles.choices}
                role="group"
                // The pill keeps the focus while the pointer chooses or scrolls
                onMouseDown={(event) => event.preventDefault()}
            >
                {matches.length === 0 && (
                    <div className={styles.empty}>{_t("telement|settings_search|no_results")}</div>
                )}
                {matches.map((choice, index) => (
                    <FilterableChoice
                        key={choice.key}
                        choice={choice}
                        id={choiceId(choice)}
                        index={index}
                        active={index === activeIndex}
                        onActivate={setActiveIndex}
                    />
                ))}
            </MenuScrollArea>
        </>
    );
}

/** Props for {@link FilterableChoice}. */
interface FilterableChoiceProps {
    choice: ValueRowChoice;
    id: string;
    /** Where it is among the choices the filter leaves. */
    index: number;
    /** Whether the highlight is on it. */
    active: boolean;
    /** Moves the highlight to the item at `index`. */
    onActivate: (index: number) => void;
}

/** A choice of a filterable menu. Memoized, as the highlight moves among hundreds of them. */
const FilterableChoice = memo(function FilterableChoice({
    choice,
    id,
    index,
    active,
    onActivate,
}: Readonly<FilterableChoiceProps>): JSX.Element {
    return (
        <ValueRowMenuItem
            id={id}
            className={classNames(styles.choice, { [styles.active]: active })}
            label={choice.label}
            checked={choice.checked}
            onSelect={choice.onSelect}
            // The pointer moves the one highlight the arrow keys move. With it Radix would move the focus, out of the
            // pill, unless the event's default is prevented
            onPointerMove={(event) => {
                event.preventDefault();
                onActivate(index);
            }}
            onPointerLeave={(event) => event.preventDefault()}
        />
    );
});
