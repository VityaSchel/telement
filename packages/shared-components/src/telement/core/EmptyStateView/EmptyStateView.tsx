/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type ComponentType, type HTMLAttributes, type JSX, type ReactNode, type SVGAttributes } from "react";
import classNames from "classnames";

import { Flex } from "../../../core/utils/Flex";
import styles from "./EmptyStateView.module.css";

interface CommonProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "onClick"> {
    /** The icon drawn in the tile above the text, such as Compound's threads icon for an empty thread list */
    Icon: ComponentType<SVGAttributes<SVGElement>>;
}

/** The empty state of a panel: the right panel's cards, the room list, a space's home. */
interface PanelProps extends CommonProps {
    size?: "panel";
    /** What is empty, in 20px semibold */
    title: ReactNode;
    /** What to do about it, in 15px secondary text under the title */
    description?: ReactNode;
    /** Buttons that fill what is empty, stacked under the text at its width */
    children?: ReactNode;
}

/** The empty state of a popover, such as the threads activity: the tile and a caption, without a title or buttons. */
interface CompactProps extends CommonProps {
    size: "compact";
    title?: never;
    /** What is empty, in 13px secondary text */
    description: ReactNode;
    children?: never;
}

/**
 * Props for {@link EmptyStateView}.
 */
export type EmptyStateViewProps = PanelProps | CompactProps;

/**
 * What a panel or popover shows when it has nothing to list: an icon in a 56px tile, then a title and a description, and
 * the buttons that would fill it, all centered in the space it is given. The panel size is for the right panel, the room
 * list and a space's home; the compact one, the tile and a 13px caption, is for popovers.
 *
 * @example
 * ```tsx
 * <EmptyStateView Icon={ThreadsIcon} title="No threads yet" description="Reply to a message to start one." />
 * <EmptyStateView size="compact" Icon={ThreadsIcon} description="You don't have unread threads." />
 * ```
 */
export function EmptyStateView({
    size = "panel",
    Icon,
    title,
    description,
    children,
    className,
    ...props
}: Readonly<EmptyStateViewProps>): JSX.Element {
    return (
        <Flex
            className={classNames(styles.emptyState, size === "compact" ? styles.compact : styles.panel, className)}
            direction="column"
            align="center"
            justify="center"
            gap="var(--cpd-space-4x)"
            {...props}
        >
            <Icon className={styles.tile} aria-hidden />
            <div className={styles.text}>
                {title && <p className={styles.title}>{title}</p>}
                {description && <p className={styles.description}>{description}</p>}
            </div>
            {children && <div className={styles.actions}>{children}</div>}
        </Flex>
    );
}
