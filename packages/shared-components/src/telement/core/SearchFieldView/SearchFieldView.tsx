/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, {
    type FocusEvent,
    type InputHTMLAttributes,
    type JSX,
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
 * Telegram's search field: a filled pill with the magnifier and placeholder in the middle. When the user focuses the
 * field or it holds text, they slide to the left edge and a round button to clear the text appears on the right.
 *
 * @example
 * ```tsx
 * <SearchFieldView value={query} onChange={setQuery} />
 * ```
 */
export function SearchFieldView({
    value,
    onChange,
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

    const onClear = (): void => {
        onChange("");
        inputRef.current?.focus();
    };

    const label = placeholder ?? _t("action|search");
    const hasValue = value !== "";

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
