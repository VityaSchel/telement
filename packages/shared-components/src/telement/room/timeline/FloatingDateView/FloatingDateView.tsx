/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import classNames from "classnames";

import { type ViewModel } from "../../../../core/viewmodel/ViewModel";
import { useViewModel } from "../../../../core/viewmodel/useViewModel";
import { DateSeparatorView } from "../../../../room/timeline/DateSeparatorView";
import styles from "./FloatingDateView.module.css";

/** What {@link FloatingDateView} shows. */
export interface FloatingDateViewSnapshot {
    /** The date of the first message in view, as the timeline's date separators write it ("Today", a weekday, a date). */
    label: string;
    /** Whether the pill is shown: while the timeline scrolls, and not over a date separator of the timeline's own. */
    visible: boolean;
    /** How far the timeline's content ends before the pill's container does, such as a scrollbar's width, in pixels. */
    endInset: number;
}

/** The view model of {@link FloatingDateView}. */
export type FloatingDateViewModel = ViewModel<FloatingDateViewSnapshot>;

/** Props for {@link FloatingDateView}. */
export interface FloatingDateViewProps {
    /** The view model of the pill. */
    vm: FloatingDateViewModel;
    /** Extra class name for the pill's container. */
    className?: string;
}

/**
 * Telegram's floating date: the timeline's date pill held at the top of the timeline while it scrolls, with the date of
 * the first message in view. It fades out when hidden. It is only a reminder of the date, so screen readers, which read
 * the timeline's own separators, and the pointer pass it by.
 */
export function FloatingDateView({ vm, className }: Readonly<FloatingDateViewProps>): JSX.Element {
    const { label, visible, endInset } = useViewModel(vm);
    return (
        <div
            className={classNames(styles.floatingDate, className, { [styles.visible]: visible })}
            style={{ insetInlineEnd: endInset }}
            aria-hidden={true}
            data-testid="floating-date"
        >
            {label && <DateSeparatorView vm={vm} />}
        </div>
    );
}
