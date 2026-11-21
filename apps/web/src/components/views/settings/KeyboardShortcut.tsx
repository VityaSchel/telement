/*
Copyright 2024 New Vector Ltd.
Copyright 2022 Šimon Brandner <simon.bra.ag@gmail.com>

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ComponentType, type JSX, type SVGAttributes } from "react";
import {
    ArrowDownIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowUpIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";

import { ALTERNATE_KEY_NAME, KEY_ICON } from "../../../accessibility/KeyboardShortcuts";
import { type KeyCombo } from "../../../KeyBindingsManager";
import { IS_MAC, Key } from "../../../Keyboard";
import { _t } from "../../../languageHandler";

interface IKeyboardKeyProps {
    name: string;
    last?: boolean;
}

/**
 * Compound's arrows for the arrow keys. As characters, Inter draws ← and → long and thin and ↑ and ↓ short and heavy, so
 * they made keys of different sizes.
 */
const ARROW_KEY_ICON: Partial<Record<string, ComponentType<SVGAttributes<SVGElement>>>> = {
    [Key.ARROW_UP]: ArrowUpIcon,
    [Key.ARROW_DOWN]: ArrowDownIcon,
    [Key.ARROW_LEFT]: ArrowLeftIcon,
    [Key.ARROW_RIGHT]: ArrowRightIcon,
};

export const KeyboardKey: React.FC<IKeyboardKeyProps> = ({ name, last }) => {
    const icon = KEY_ICON[name];
    const alternateName = ALTERNATE_KEY_NAME[name];
    const ArrowIcon = ARROW_KEY_ICON[name];

    if (ArrowIcon) {
        // The arrow stays as text for screen readers and copying, hidden from view
        return (
            <React.Fragment>
                <kbd>
                    <ArrowIcon aria-hidden={true} width="16px" height="16px" />
                    <span className="mx_KeyboardKey_text">{icon}</span>
                </kbd>
                {!last && "+"}
            </React.Fragment>
        );
    }

    return (
        <React.Fragment>
            <kbd> {icon || (alternateName && _t(alternateName)) || name} </kbd>
            {!last && "+"}
        </React.Fragment>
    );
};

interface IKeyboardShortcutProps {
    value: KeyCombo;
    className?: string;
}

export const KeyboardShortcut: React.FC<IKeyboardShortcutProps> = ({ value, className = "mx_KeyboardShortcut" }) => {
    if (!value) return null;

    const modifiersElement: JSX.Element[] = [];
    if (value.ctrlOrCmdKey) {
        modifiersElement.push(<KeyboardKey key="ctrlOrCmdKey" name={IS_MAC ? Key.META : Key.CONTROL} />);
    } else if (value.ctrlKey) {
        modifiersElement.push(<KeyboardKey key="ctrlKey" name={Key.CONTROL} />);
    } else if (value.metaKey) {
        modifiersElement.push(<KeyboardKey key="metaKey" name={Key.META} />);
    }
    if (value.altKey) {
        modifiersElement.push(<KeyboardKey key="altKey" name={Key.ALT} />);
    }
    if (value.shiftKey) {
        modifiersElement.push(<KeyboardKey key="shiftKey" name={Key.SHIFT} />);
    }

    return (
        <div className={className}>
            {modifiersElement}
            <KeyboardKey name={value.key} last />
        </div>
    );
};
