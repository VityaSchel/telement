/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type CSSProperties, type JSX, type ReactNode, useEffect, useId, useRef } from "react";
import classNames from "classnames";

import { type ViewModel } from "../../../core/viewmodel/ViewModel";
import { useViewModel } from "../../../core/viewmodel/useViewModel";
import rowStyles from "../SettingsRow.module.css";
import styles from "./SliderRowView.module.css";

/** What {@link SliderRowView} shows. */
export interface SliderRowViewSnapshot {
    /** What the setting is, at the row's start. */
    label: string;
    /** The value the slider is at as text, at the row's end in secondary text and for assistive technologies. */
    value: string;
    /** The step the slider is at, from 0. */
    position: number;
    /** The slider's last step. */
    lastPosition: number;
}

/** What {@link SliderRowView} can do. */
export interface SliderRowViewActions {
    /** Shows the step the slider is at, as the pointer drags it or a key moves it. */
    preview: (position: number) => void;
    /** Applies the step the slider is at, once the pointer lets go of it or after a key moved it. */
    commit: (position: number) => void;
}

/** The view model of {@link SliderRowView}. */
export type SliderRowViewModel = ViewModel<SliderRowViewSnapshot, SliderRowViewActions>;

/** Props for {@link SliderRowView}. */
export interface SliderRowViewProps {
    /** The view model of the row. */
    vm: SliderRowViewModel;
    /** What the slider starts at, drawn before it, such as a small letter. Only decoration. */
    start?: ReactNode;
    /** What the slider ends at, drawn after it, such as a large letter. Only decoration. */
    end?: ReactNode;
    /** Extra class name for the row. */
    className?: string;
}

/**
 * A setting with a value on a scale, as Telegram for macOS draws Text Size: its label at the start and its value at the
 * end in secondary text, over a slider across the card. The slider is the browser's, so the arrow keys, Page Up and Page
 * Down, Home and End move it. It shows each step while it is dragged and applies only the one it is let go at.
 *
 * @example
 * ```tsx
 * <SliderRowView vm={fontSizeViewModel} start={<span>A</span>} end={<span>A</span>} />
 * ```
 */
export function SliderRowView({ vm, start, end, className }: Readonly<SliderRowViewProps>): JSX.Element {
    const { label, value, position, lastPosition } = useViewModel(vm);
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);

    // The browser's own change event, which only follows a drag; React's is one per step
    useEffect(() => {
        const input = inputRef.current!;
        const onCommit = (): void => vm.commit(Number(input.value));
        input.addEventListener("change", onCommit);
        return () => input.removeEventListener("change", onCommit);
    }, [vm]);

    return (
        <div className={classNames(styles.row, className)} data-settings-row="">
            <label className={rowStyles.label} htmlFor={inputId}>
                {label}
            </label>
            {/* Assistive technologies read it as the slider's value */}
            <span className={classNames(rowStyles.value, styles.value)} aria-hidden>
                {value}
            </span>
            <div className={styles.slider}>
                {start && (
                    <span className={styles.adornment} aria-hidden>
                        {start}
                    </span>
                )}
                <input
                    ref={inputRef}
                    id={inputId}
                    className={styles.range}
                    type="range"
                    min={0}
                    max={lastPosition}
                    step={1}
                    value={position}
                    aria-valuetext={value}
                    style={{ "--slider-fill": lastPosition > 0 ? position / lastPosition : 0 } as CSSProperties}
                    onChange={(event) => vm.preview(Number(event.target.value))}
                />
                {end && (
                    <span className={styles.adornment} aria-hidden>
                        {end}
                    </span>
                )}
            </div>
        </div>
    );
}
