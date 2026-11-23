/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type HTMLAttributes, type JSX } from "react";
import classNames from "classnames";

import { type ViewModel, useViewModel } from "../../../../../core/viewmodel";
import { useEventPresentation } from "../../../EventPresentation";
import { ReactionsRowButtonTooltipView, type ReactionsRowButtonTooltipViewModel } from "../ReactionsRowButtonTooltip";
import { Avatar } from "../../../../../telement/core/Avatar";
import styles from "./ReactionsRowButton.module.css";

/**
 * Someone who reacted, as their avatar shows them.
 */
export interface ReactionsRowButtonReactor {
    /**
     * Their Matrix user ID, which also picks the color of a letter avatar.
     */
    id: string;
    /**
     * Their display name, whose first letter a letter avatar shows.
     */
    name: string;
    /**
     * Their avatar's picture, if they have one.
     */
    avatarUrl?: string;
}

export interface ReactionsRowButtonViewSnapshot extends Pick<
    HTMLAttributes<HTMLButtonElement>,
    "className" | "aria-label"
> {
    /**
     * The reaction content to display when not using a custom image.
     */
    content?: string;
    /**
     * The total number of reactions for this content.
     */
    count: number;
    /**
     * Whether the reaction button is selected by the current user.
     */
    isSelected: boolean;
    /**
     * Whether the reaction button is disabled.
     * @default false
     */
    isDisabled?: boolean;
    /**
     * The image URL to render when using a custom reaction image.
     */
    imageSrc?: string;
    /**
     * The alt text for the custom reaction image.
     */
    imageAlt?: string;
    /**
     * View model for the tooltip wrapper.
     */
    tooltipVm: ReactionsRowButtonTooltipViewModel;
    /**
     * The people who reacted, when there are few enough to show their avatars in place of the count, as Telegram does
     * in groups. Shown in the bubble layout only.
     */
    reactors?: ReactionsRowButtonReactor[];
}

export interface ReactionsRowButtonViewActions {
    /**
     * Called when the user activates the reaction button.
     */
    onClick: () => void;
}

export type ReactionsRowButtonViewModel = ViewModel<ReactionsRowButtonViewSnapshot> & ReactionsRowButtonViewActions;

interface ReactionsRowButtonViewProps {
    /**
     * The view model for the reactions row button.
     */
    vm: ReactionsRowButtonViewModel;
}

/**
 * Renders a single reaction button within a reactions row.
 *
 * The button supports text or image reactions, selected and disabled
 * styling, and wraps its content in the reactions tooltip view. In the bubble
 * layout it takes the filled look of reactions inside a bubble.
 */
export function ReactionsRowButtonView({ vm }: Readonly<ReactionsRowButtonViewProps>): JSX.Element {
    const snapshot = useViewModel(vm) as ReactionsRowButtonViewSnapshot & { ariaLabel?: string };
    const { layout } = useEventPresentation();
    const { content, count, className, isSelected, isDisabled, imageSrc, imageAlt, tooltipVm, reactors } = snapshot;
    const showReactors = layout === "bubble" && !!reactors?.length;
    const ariaLabel = snapshot["aria-label"] ?? snapshot.ariaLabel;
    const ariaDisabled = isDisabled ? true : undefined;
    const classes = classNames(className, styles.reactionsRowButton, {
        [styles.reactionsRowButtonSelected]: isSelected,
        [styles.reactionsRowButtonDisabled]: isDisabled,
        [styles.reactionsRowButtonInBubble]: layout === "bubble",
    });

    const reactionContent = imageSrc ? (
        <img className={styles.reactionsRowButtonContent} alt={imageAlt ?? ""} src={imageSrc} width="16" height="16" />
    ) : (
        <span className={styles.reactionsRowButtonContent} aria-hidden="true">
            {content ?? ""}
        </span>
    );

    return (
        <ReactionsRowButtonTooltipView vm={tooltipVm}>
            <button
                type="button"
                className={classes}
                tabIndex={0}
                aria-label={ariaLabel}
                aria-disabled={ariaDisabled}
                onClick={isDisabled ? undefined : vm.onClick}
            >
                {reactionContent}
                {showReactors ? (
                    <span className={styles.reactionsRowButtonReactors} aria-hidden="true">
                        {reactors.map(({ id, name, avatarUrl }) => (
                            <Avatar
                                key={id}
                                id={id}
                                name={name}
                                src={avatarUrl}
                                size="16px"
                                type="round"
                                className={styles.reactionsRowButtonReactor}
                            />
                        ))}
                    </span>
                ) : (
                    <span className={styles.reactionsRowButtonCount} aria-hidden="true">
                        {count}
                    </span>
                )}
            </button>
        </ReactionsRowButtonTooltipView>
    );
}
