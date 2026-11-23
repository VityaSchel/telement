/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { Menu, MenuItem } from "@vector-im/compound-web";
import ChevronDownIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-down";
import CheckIcon from "@vector-im/compound-design-tokens/assets/web/icons/check";

import { type ViewModel } from "../../../core/viewmodel/ViewModel";
import { useViewModel } from "../../../core/viewmodel/useViewModel";
import { Avatar } from "../../core/Avatar";
import rowStyles from "../SettingsRow.module.css";
import styles from "./ValueRowView.module.css";

/** One of the choices a {@link ValueRowView} offers in its menu. */
export interface ValueRowOption {
    /** Identifies the choice to the view model. */
    key: string;
    /** The choice as the menu, and the row once it is chosen, show it. */
    label: string;
}

/** The person or room a {@link ValueRowView} is about, drawn as a 36px avatar before its label. */
export interface ValueRowAvatar {
    /** The Matrix ID, which picks the letter avatar's color. */
    id: string;
    /** The name, whose first letter the letter avatar shows. */
    name: string;
    /** The photo's URL, if there is one. */
    src?: string;
}

/** What {@link ValueRowView} shows. */
export interface ValueRowViewSnapshot {
    /** What the setting is, at the row's start. */
    label: string;
    /** A second line under the label in 13px secondary text, such as a person's Matrix ID. */
    description?: string;
    /** Makes the row a 52px two-line row with this avatar before the label. */
    avatar?: ValueRowAvatar;
    /** The current value at the row's end, in secondary text. */
    value: string;
    /** The choices the row's menu offers. */
    options: ValueRowOption[];
    /** The key of the chosen option, checked in the menu. */
    selectedKey?: string;
    /** Whether the value can't be changed: the row then shows it without a chevron or a menu. */
    disabled: boolean;
    /**
     * The label of a last menu item, such as "Custom…", that lets the user type a value of their own. It is checked
     * while no option is chosen.
     */
    customLabel?: string;
    /** While the user types their own value: what the field at the row's end holds. */
    customValue?: string;
}

/** What {@link ValueRowView} can do. */
export interface ValueRowViewActions {
    /** Chooses one of the options. */
    select: (key: string) => void;
    /** Replaces the value with a field to type one in, after the custom item was chosen. */
    startCustom: () => void;
    /** Updates what the field holds as the user types. */
    setCustomValue: (value: string) => void;
    /** Applies the typed value, when the field loses focus or the user presses Enter. */
    commitCustom: () => void;
    /** Leaves the field without applying it, when the user presses Escape. */
    cancelCustom: () => void;
}

/** The view model of {@link ValueRowView}. */
export type ValueRowViewModel = ViewModel<ValueRowViewSnapshot, ValueRowViewActions>;

/** Props for {@link ValueRowView}. */
export interface ValueRowViewProps {
    /** The view model of the row. */
    vm: ValueRowViewModel;
    /** Extra class name for the row. */
    className?: string;
}

/**
 * A setting with a value, as Telegram for macOS draws one: its label at the start and its value at the end in
 * secondary text, followed by a chevron. The whole row opens the shared menu of the choices, the chosen one checked at
 * the item's end. A row sits on a settings card's content edge like a menu row: its hover fill reaches 4px from the
 * card's sides, and rows one under another follow each other without gaps (see {@link ValueRowList}). A card puts a
 * row at its top or bottom 4px from its edge there too, which `data-settings-row` tells it.
 *
 * @example
 * ```tsx
 * <ValueRowView vm={fontSizeRowViewModel} />
 * ```
 */
export function ValueRowView({ vm, className }: Readonly<ValueRowViewProps>): JSX.Element {
    const { label, description, avatar, value, options, selectedKey, disabled, customLabel, customValue } =
        useViewModel(vm);
    const [open, setOpen] = useState(false);
    const editing = customValue !== undefined;

    const start = (
        <>
            {avatar && (
                // The label names the row, so the avatar is only decoration
                <Avatar
                    className={rowStyles.avatar}
                    id={avatar.id}
                    name={avatar.name}
                    src={avatar.src}
                    size="36px"
                    aria-hidden
                />
            )}
            <span className={rowStyles.text}>
                <span className={rowStyles.label}>{label}</span>
                {description && <span className={rowStyles.description}>{description}</span>}
            </span>
        </>
    );
    const rowClassName = classNames(rowStyles.row, { [rowStyles.twoLine]: !!avatar }, className);

    if (editing) {
        return (
            <div className={rowClassName} data-settings-row="">
                {start}
                <CustomValueField vm={vm} label={label} value={customValue} />
            </div>
        );
    }

    if (disabled) {
        return (
            <div className={rowClassName} data-settings-row="" aria-disabled="true">
                {start}
                <span className={rowStyles.end}>
                    <span className={rowStyles.value}>{value}</span>
                </span>
            </div>
        );
    }

    const customChecked = customLabel !== undefined && !options.some((option) => option.key === selectedKey);
    return (
        <Menu
            open={open}
            onOpenChange={setOpen}
            title={label}
            showTitle={false}
            // Under the value it changes, ending with the row
            align="end"
            trigger={
                <button type="button" className={classNames(rowClassName, rowStyles.interactive)} data-settings-row="">
                    {start}
                    <span className={rowStyles.end}>
                        <span className={rowStyles.value}>{value}</span>
                        <ChevronDownIcon className={rowStyles.chevron} aria-hidden />
                    </span>
                </button>
            }
        >
            {options.map((option) => (
                <ValueRowMenuItem
                    key={option.key}
                    label={option.label}
                    checked={option.key === selectedKey}
                    onSelect={() => vm.select(option.key)}
                />
            ))}
            {customLabel !== undefined && (
                <ValueRowMenuItem label={customLabel} checked={customChecked} onSelect={vm.startCustom} />
            )}
        </Menu>
    );
}

/** A choice in the row's menu: a radio item without the radio, its check at the item's end, as in Telegram's menus. */
function ValueRowMenuItem({
    label,
    checked,
    onSelect,
}: {
    label: string;
    checked: boolean;
    onSelect: () => void;
}): JSX.Element {
    return (
        <MenuItem role="menuitemradio" aria-checked={checked} label={label} onSelect={onSelect} hideChevron>
            {checked && <CheckIcon className={styles.check} aria-hidden />}
        </MenuItem>
    );
}

/** The field that takes the row's value's place while the user types one of their own. */
function CustomValueField({ vm, label, value }: { vm: ValueRowViewModel; label: string; value: string }): JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null);
    // Set when Escape left the field, so that losing focus then doesn't apply what it held
    const cancelled = useRef(false);

    // The menu that offered the custom item gives focus back to the row it opened from as it closes, after this field
    // has replaced it, so the field takes focus once the menu is gone
    useEffect(() => {
        const timer = setTimeout(() => inputRef.current?.focus());
        return () => clearTimeout(timer);
    }, []);

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === "Enter") {
            event.preventDefault();
            // Applied on blur, so that a dialog the change opens can't blur the field into applying it twice
            inputRef.current?.blur();
        } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            cancelled.current = true;
            vm.cancelCustom();
        }
    };

    return (
        <input
            ref={inputRef}
            className={styles.field}
            type="number"
            aria-label={label}
            value={value}
            onChange={(event) => vm.setCustomValue(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => {
                if (!cancelled.current) vm.commitCustom();
            }}
        />
    );
}

/** Props for {@link ValueRowList}. */
export interface ValueRowListProps {
    /** The rows, one under another without gaps. */
    children?: ReactNode;
    /** Extra class name for the list. */
    className?: string;
}

/**
 * Rows of a settings card one under another, as Telegram lists them: without the gaps the card leaves between its
 * other content. A card puts the list, like a single row, 4px from its edge when it is at the card's top or bottom.
 */
export function ValueRowList({ children, className }: Readonly<ValueRowListProps>): JSX.Element {
    return (
        <div className={classNames(rowStyles.list, className)} data-settings-row="">
            {children}
        </div>
    );
}
