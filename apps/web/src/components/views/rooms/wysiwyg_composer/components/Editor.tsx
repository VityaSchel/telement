/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import classNames from "classnames";
import React, { type CSSProperties, memo, type RefObject } from "react";

import { useSelection } from "../hooks/useSelection";
import { _t } from "../../../../../i18n";

interface EditorProps {
    disabled: boolean;
    placeholder?: string;
    ref?: RefObject<HTMLDivElement | null>;
}

export const Editor = memo(function Editor({ disabled, placeholder, ref }: EditorProps) {
    const { onFocus, onBlur, onInput } = useSelection();

    return (
        <div data-testid="WysiwygComposerEditor" className="mx_WysiwygComposer_Editor">
            <div className="mx_WysiwygComposer_Editor_container">
                <div
                    className={classNames("mx_WysiwygComposer_Editor_content", {
                        mx_WysiwygComposer_Editor_content_placeholder: Boolean(placeholder),
                    })}
                    style={{ "--placeholder": `"${placeholder}"` } as CSSProperties}
                    ref={ref}
                    contentEditable={!disabled}
                    role="textbox"
                    aria-label={_t("a11y|message_composer")}
                    aria-multiline="true"
                    aria-autocomplete="list"
                    aria-haspopup="listbox"
                    dir="auto"
                    aria-disabled={disabled}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onInput={onInput}
                />
            </div>
        </div>
    );
});
