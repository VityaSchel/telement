/*
Copyright 2024 New Vector Ltd.
Copyright 2019 The Matrix.org Foundation C.I.C.
Copyright 2018 New Vector Ltd.
Copyright 2017 Aidan Gauland

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type ReactNode } from "react";
import classNames from "classnames";
import { DialogFooterButton, DialogFooterView } from "@element-hq/web-shared-components";

import { _t } from "../../../languageHandler";

interface IProps {
    // The primary button which is styled differently and has default focus.
    primaryButton: React.ReactNode;

    // A node to insert into the cancel button instead of default "Cancel"
    cancelButton?: React.ReactNode;

    // If true, make the primary button a form submit button (input type="submit")
    primaryIsSubmit?: boolean;

    // onClick handler for the primary button. Note that the returned promise, if
    // returning a promise, is not used.
    onPrimaryButtonClick?: (ev: React.MouseEvent) => void | Promise<void>;

    // should there be a cancel button? default: true
    hasCancel?: boolean;

    /**
     * The class of the cancel button, only used if a cancel button is enabled
     * @default "cancel"
     */
    cancelButtonClass?: string;

    // onClick handler for the cancel button.
    onCancel?: (...args: any[]) => void;

    focus?: boolean;

    // disables the primary and cancel buttons
    disabled?: boolean;

    // disables only the primary button
    primaryDisabled?: boolean;

    // something to stick next to the buttons, optionally
    additive?: ReactNode;

    primaryButtonClass?: string;
    children?: ReactNode;
}

/** Whether a button class that callers pass marks the button as destructive, which the footer draws in red. */
function isDestructive(className?: string): boolean {
    return !!className && /(^|\s)(danger|warning)(\s|$)/.test(className);
}

/**
 * Basic container for buttons in modal dialogs.
 *
 * Telement: the shared dialog footer (DialogFooterView), Telegram's accent text buttons with Cancel before the action and
 * a "danger" one in red. The buttons keep their classes for the callers and tests that look them up.
 */
export default class DialogButtons extends React.Component<IProps> {
    public static defaultProps: Partial<IProps> = {
        hasCancel: true,
        disabled: false,
        cancelButtonClass: "cancel",
    };

    private onCancelClick = (event: React.MouseEvent): void => {
        this.props.onCancel?.(event);
    };

    public render(): React.ReactNode {
        let cancelButton: JSX.Element | undefined;
        if (this.props.hasCancel) {
            cancelButton = (
                <DialogFooterButton
                    // important: the default type is 'submit' and this button comes before the
                    // primary in the DOM so will get form submissions unless we make it not a submit.
                    data-testid="dialog-cancel-button"
                    type="button"
                    onClick={this.onCancelClick}
                    className={this.props.cancelButtonClass}
                    destructive={isDestructive(this.props.cancelButtonClass)}
                    disabled={this.props.disabled}
                >
                    {this.props.cancelButton || _t("action|cancel")}
                </DialogFooterButton>
            );
        }

        return (
            <DialogFooterView className="mx_Dialog_buttons" start={this.props.additive}>
                {cancelButton}
                {this.props.children}
                <DialogFooterButton
                    type={this.props.primaryIsSubmit ? "submit" : "button"}
                    data-testid="dialog-primary-button"
                    className={classNames("mx_Dialog_primary", this.props.primaryButtonClass)}
                    destructive={isDestructive(this.props.primaryButtonClass)}
                    onClick={this.props.onPrimaryButtonClick}
                    autoFocus={this.props.focus}
                    disabled={this.props.disabled || this.props.primaryDisabled}
                >
                    {this.props.primaryButton}
                </DialogFooterButton>
            </DialogFooterView>
        );
    }
}
