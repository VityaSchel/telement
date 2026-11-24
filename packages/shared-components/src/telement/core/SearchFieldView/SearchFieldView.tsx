/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, {
    type FocusEvent,
    type InputHTMLAttributes,
    type JSX,
    type MouseEvent,
    type Ref,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import classNames from "classnames";
import { CloseIcon, SearchIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../../core/i18n/i18n";
import styles from "./SearchFieldView.module.css";

export interface SearchFieldViewProps extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type" | "className" | "placeholder"
> {
    /**
     * The search query.
     */
    value: string;
    /**
     * Called with the new query when the user types or clears the field.
     */
    onChange: (value: string) => void;
    /**
     * Lets go of the focus when the user clears the field with the pointer. By default it goes to what holds the field,
     * as with a click beside it. A field that has to keep the focus, or to give it to something else, says so here.
     */
    releaseFocus?: () => void;
    /**
     * Placeholder, also used as the input's accessible name. Defaults to "Search".
     */
    placeholder?: string;
    /**
     * Ref to the input element.
     */
    ref?: Ref<HTMLInputElement>;
    /**
     * Optional host CSS class for the field's container.
     */
    className?: string;
}

/**
 * Takes the focus out of `field` as a click beside it would: to what can take it around the field, such as the dialog
 * it is in, which then still closes on Escape, or to nothing. No focus ring, as the pointer asked for it.
 */
function leaveField(field: HTMLElement): void {
    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement) || !field.contains(focused)) return;
    const holder = field.closest<HTMLElement>("[tabindex]");
    if (holder) holder.focus({ preventScroll: true, focusVisible: false });
    else focused.blur();
}

/**
 * Telegram's search field: a filled pill with the magnifier and placeholder in the middle. When the user focuses the
 * field or it holds text, they slide to the left edge and a round button to clear the text appears on the right. Clearing
 * with the pointer also lets go of the focus, so that the field rests again; from the keyboard the focus returns to the
 * input.
 *
 * @example
 * ```tsx
 * <SearchFieldView value={query} onChange={setQuery} />
 * ```
 */
export function SearchFieldView({
    value,
    onChange,
    releaseFocus,
    placeholder,
    ref,
    className,
    ...inputProps
}: Readonly<SearchFieldViewProps>): JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current!, []);

    // Whether focus is in the input or the clear button.
    const [engaged, setEngaged] = useState(false);

    const onBlur = (event: FocusEvent<HTMLDivElement>): void => {
        if (!event.currentTarget.contains(event.relatedTarget)) setEngaged(false);
    };

    const hasValue = value !== "";

    const onClear = (event: MouseEvent<HTMLButtonElement>): void => {
        // An empty field, whose button shows while it has the focus, has no search to change
        if (hasValue) onChange("");

        // A click without a pointer comes from the keyboard
        if (event.detail === 0) inputRef.current?.focus();
        else if (releaseFocus) releaseFocus();
        else leaveField(event.currentTarget.parentElement!);
    };

    const label = placeholder ?? _t("action|search");

    return (
        <div
            className={classNames(styles.field, className, {
                [styles.active]: engaged || hasValue,
                [styles.hasValue]: hasValue,
            })}
            onFocus={() => setEngaged(true)}
            onBlur={onBlur}
        >
            <span className={styles.decoration} aria-hidden="true">
                <SearchIcon className={styles.icon} />
                <span className={styles.placeholder}>{label}</span>
            </span>
            {/* No type attribute: the app's global input[type="text"] styles would override the field's */}
            <input
                autoComplete="off"
                spellCheck={false}
                aria-label={label}
                {...inputProps}
                ref={inputRef}
                className={styles.input}
                placeholder={label}
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
            <button
                type="button"
                className={styles.clear}
                aria-label={_t("telement|search_field|clear")}
                // Keep the focus in the input while the pointer is down, otherwise the field rests and hides this button
                onMouseDown={(event) => event.preventDefault()}
                onClick={onClear}
            >
                <CloseIcon />
            </button>
        </div>
    );
}
