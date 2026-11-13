/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type KeyboardEvent, type PropsWithChildren, useId, useRef } from "react";
import classNames from "classnames";

import { type ViewModel, useViewModel } from "../../../../core/viewmodel";
import styles from "./ComposerDrawerView.module.css";

export interface ComposerDrawerTab {
    id: string;
    label: string;
}

export interface ComposerDrawerViewSnapshot {
    /**
     * Tabs in display order, such as Emoji, Stickers and GIFs.
     */
    tabs: ComposerDrawerTab[];
    /**
     * Id of the tab whose content is shown.
     */
    activeTab: string;
}

export interface ComposerDrawerViewActions {
    /**
     * Invoked when the user picks a tab.
     */
    onTabSelected?: (id: string) => void;
}

export type ComposerDrawerViewModel = ViewModel<ComposerDrawerViewSnapshot, ComposerDrawerViewActions>;

interface ComposerDrawerViewProps {
    /**
     * View model providing the tabs and actions.
     */
    vm: ComposerDrawerViewModel;
    /**
     * Content of the active tab.
     */
    children?: PropsWithChildren["children"];
    /**
     * Optional host CSS class.
     */
    className?: string;
}

/**
 * The composer's emoji, stickers and GIF drawer: the active tab's content above a row of tabs, as in Telegram for
 * macOS. Arrow keys move between tabs, following the WAI-ARIA tabs pattern.
 *
 * The panel lets the content fill it. Content that has a search, such as the emoji picker, starts its own scroll
 * container with a `SearchFieldView`, so the search scrolls away with the results.
 */
export function ComposerDrawerView({ vm, children, className }: Readonly<ComposerDrawerViewProps>): JSX.Element {
    const { tabs, activeTab } = useViewModel(vm);
    const baseId = useId();
    const tabRefs = useRef(new Map<string, HTMLButtonElement>());
    const tabId = (id: string): string => `${baseId}-tab-${id}`;
    const panelId = `${baseId}-panel`;

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
        const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
        const offset = offsets[event.key];
        if (offset === undefined || tabs.length === 0) return;
        event.preventDefault();
        const index = tabs.findIndex((tab) => tab.id === activeTab);
        const next = tabs[(index + offset + tabs.length) % tabs.length];
        vm.onTabSelected?.(next.id);
        tabRefs.current.get(next.id)?.focus();
    };

    return (
        <div className={classNames(className, styles.drawer)}>
            <div role="tabpanel" id={panelId} aria-labelledby={tabId(activeTab)} className={styles.panel}>
                {children}
            </div>
            <div role="tablist" className={styles.tabs}>
                {tabs.map((tab) => {
                    const selected = tab.id === activeTab;
                    return (
                        <button
                            key={tab.id}
                            ref={(element) => {
                                if (element) tabRefs.current.set(tab.id, element);
                                else tabRefs.current.delete(tab.id);
                            }}
                            type="button"
                            role="tab"
                            id={tabId(tab.id)}
                            aria-selected={selected}
                            aria-controls={panelId}
                            tabIndex={selected ? 0 : -1}
                            // For the drawer's focus lock, which picks the first marked element: content can mark its
                            // own, such as the emoji picker's selected category.
                            data-autofocus={selected || undefined}
                            className={classNames(styles.tab, { [styles.selected]: selected })}
                            onClick={() => vm.onTabSelected?.(tab.id)}
                            onKeyDown={onKeyDown}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
