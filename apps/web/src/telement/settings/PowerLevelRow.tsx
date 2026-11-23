/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { type ValueRowAvatar } from "@element-hq/web-shared-components";

import * as Roles from "../../Roles";
import { _t } from "../../languageHandler";
import { SettingsValueRow } from "./SettingsValueRow";
import { type ValueRowViewModelProps } from "../../viewmodels/telement/settings/ValueRowViewModel";

interface PowerLevelRowProps {
    /** What the power level is for: a permission, or a person's name. */
    label: string;
    /** A second line under the label, a person's Matrix ID. */
    description?: string;
    /** The person whose power level it is. */
    avatar?: ValueRowAvatar;
    /** The current power level. */
    value: number;
    /** The highest level that can be chosen, the user's own. */
    maxValue?: number;
    /** The room's default power level for users. */
    usersDefault?: number;
    /** Whether the level can't be changed. */
    disabled?: boolean;
    /** Applies a level. A rejected promise puts the previous one back. */
    onChange: (value: number) => void | Promise<void>;
}

/** The {@link SettingsValueRow} props of a power level: its roles as the choices, then a level of one's own. */
export function powerLevelRowProps({
    label,
    description,
    avatar,
    value,
    maxValue = Infinity,
    usersDefault = 0,
    disabled,
    onChange,
}: PowerLevelRowProps): ValueRowViewModelProps {
    const roles = Roles.levelRoleMap(usersDefault);
    // The roles up to the user's own level, and the current one, as the power selector offers them
    const levels = Object.keys(roles)
        .map((level) => parseInt(level, 10))
        .filter((level) => Number.isFinite(level) && (level <= maxValue || level === value));
    const isCustom = roles[value] === undefined;

    return {
        label,
        description,
        avatar,
        disabled,
        options: levels.map((level) => ({ key: String(level), label: Roles.textualPowerLevel(level, usersDefault) })),
        selectedKey: isCustom ? undefined : String(value),
        // A level that isn't a role shows as its number
        value: isCustom ? String(value) : Roles.textualPowerLevel(value, usersDefault),
        customLabel: _t("telement|power_level|custom"),
        customValue: String(value),
        onSelect: (key) => onChange(parseInt(key, 10)),
        onCustom: async (text) => {
            const level = parseInt(text, 10);
            if (!Number.isFinite(level)) throw new Error(`Not a power level: ${text}`);
            await onChange(level);
        },
    };
}

/**
 * A power level as a settings value row: the role, or a custom level's number, at the end, and a menu of the roles up to
 * the user's own level, ending with "Custom…", which turns the value into a field for a number. Replaces the power
 * selector's dropdown in the room's Roles & permissions.
 */
export function PowerLevelRow(props: Readonly<PowerLevelRowProps>): JSX.Element {
    return <SettingsValueRow {...powerLevelRowProps(props)} />;
}
