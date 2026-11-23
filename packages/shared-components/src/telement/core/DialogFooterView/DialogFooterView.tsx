/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type ButtonHTMLAttributes, forwardRef, type HTMLAttributes, type JSX, type ReactNode } from "react";
import classNames from "classnames";

import styles from "./DialogFooterView.module.css";

export interface DialogFooterViewProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * What sits at the start of the footer's line, before the buttons, such as a "Remember my choice" checkbox.
     */
    start?: ReactNode;
    /**
     * The footer's {@link DialogFooterButton}s: Cancel or the other choices first, the dialog's action last.
     */
    children?: ReactNode;
}

/**
 * The footer of a dialog, as Telegram draws it: flat text buttons at the end of the dialog's last line, Cancel before
 * the action. Place it at the end of a dialog's content, on its 24px edges: the buttons' text, not their boxes, keeps
 * that spacing, so a dialog only adds the space between its content and the footer.
 *
 * @example
 * ```tsx
 * <DialogFooterView>
 *     <DialogFooterButton onClick={onCancel}>Cancel</DialogFooterButton>
 *     <DialogFooterButton destructive onClick={onLeave}>Leave</DialogFooterButton>
 * </DialogFooterView>
 * ```
 */
export function DialogFooterView({
    start,
    children,
    className,
    ...props
}: Readonly<DialogFooterViewProps>): JSX.Element {
    return (
        <div className={classNames(styles.footer, className)} {...props}>
            {start && <div className={styles.start}>{start}</div>}
            {children}
        </div>
    );
}

export interface DialogFooterButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * Writes the label in red, for an action that deletes something or can't be undone.
     */
    destructive?: boolean;
}

/**
 * A button of a {@link DialogFooterView}: its label in the accent, or in red when destructive, without a fill until it
 * is hovered or pressed. A plain button rather than a form's submit button unless `type` says otherwise.
 */
export const DialogFooterButton = forwardRef<HTMLButtonElement, DialogFooterButtonProps>(function DialogFooterButton(
    { destructive = false, type = "button", className, ...props },
    ref,
) {
    return (
        <button
            ref={ref}
            // The type is "button" unless the caller asks for a submit button
            // oxlint-disable-next-line react/button-has-type
            type={type}
            className={classNames(styles.button, { [styles.destructive]: destructive }, className)}
            {...props}
        />
    );
});
