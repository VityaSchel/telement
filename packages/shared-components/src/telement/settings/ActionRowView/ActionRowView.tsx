/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, {
    type ButtonHTMLAttributes,
    type ComponentType,
    type JSX,
    type ReactNode,
    type SVGAttributes,
} from "react";
import classNames from "classnames";
import ChevronDownIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-down";
import ChevronRightIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-right";
import ChevronUpIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-up";

import rowStyles from "../SettingsRow.module.css";
import styles from "./ActionRowView.module.css";

/** Props for {@link ActionRowView}. */
export interface ActionRowViewProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
    /**
     * How the label is drawn: in red for an action that destroys something or can't be undone (leaving, deactivating,
     * signing out), in the accent for any other one-off action, or in the text color for a row that opens a list.
     * @default "accent"
     */
    kind?: "critical" | "accent" | "default";
    /** What the row does, at its start. */
    children: ReactNode;
    /** A 20px icon before the label. */
    Icon?: ComponentType<SVGAttributes<SVGElement>>;
    /** What the row is at, at its end in secondary text, such as how many rooms a list holds or an update's status. */
    value?: ReactNode;
    /**
     * Ends the row with a chevron, for a row that opens a list of its own. With `aria-expanded`, the row shows more
     * under it instead: its chevron points down, and up while it shows.
     */
    navigation?: boolean;
}

/** The chevron at the row's end. */
function Chevron({ expanded }: { expanded: ActionRowViewProps["aria-expanded"] }): JSX.Element {
    if (expanded === undefined) {
        return <ChevronRightIcon className={classNames(rowStyles.chevron, rowStyles.chevronRight)} aria-hidden />;
    }
    const Icon = expanded === true || expanded === "true" ? ChevronUpIcon : ChevronDownIcon;
    return <Icon className={rowStyles.chevron} aria-hidden />;
}

/**
 * A settings row that does something, as Telegram for macOS draws Log Out, Delete Account or Clear Cache: a 44px row
 * of semibold text on the card's content edge rather than a button, red when it destroys something and in the accent
 * otherwise, with the row hover fill (the menus' red hover for a red row). A row in the text color, regular, with a
 * chevron opens a list or shows more under it.
 *
 * @example
 * ```tsx
 * <ActionRowView kind="critical" onClick={onLeave}>Leave room</ActionRowView>
 * <ActionRowView kind="default" value="3" navigation onClick={onOpen}>Rooms with their own setting</ActionRowView>
 * <ActionRowView kind="default" navigation aria-expanded={open} onClick={onToggle}>Access token</ActionRowView>
 * ```
 */
export function ActionRowView({
    kind = "accent",
    children,
    Icon,
    value,
    navigation,
    className,
    type = "button",
    ...props
}: Readonly<ActionRowViewProps>): JSX.Element {
    return (
        <button
            // The type is "button" unless the caller asks for a submit button
            // oxlint-disable-next-line react/button-has-type
            type={type}
            className={classNames(rowStyles.row, rowStyles.interactive, styles[kind], className)}
            data-settings-row=""
            {...props}
        >
            {Icon && <Icon className={styles.icon} aria-hidden />}
            <span className={rowStyles.text}>
                <span className={classNames(rowStyles.label, styles.label)}>{children}</span>
            </span>
            {(value !== undefined || navigation) && (
                <span className={rowStyles.end}>
                    {value !== undefined && <span className={rowStyles.value}>{value}</span>}
                    {navigation && <Chevron expanded={props["aria-expanded"]} />}
                </span>
            )}
        </button>
    );
}
