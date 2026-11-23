/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useEffect } from "react";
import { ValueRowView, useCreateAutoDisposedViewModel } from "@element-hq/web-shared-components";

import { ValueRowViewModel, type ValueRowViewModelProps } from "../../viewmodels/telement/settings/ValueRowViewModel";

/**
 * A single-choice setting drawn as Telegram's value row (ValueRowView), for legacy settings components: label, value
 * and chevron, opening a menu of the choices. It passes each render's props on to its view model.
 */
export function SettingsValueRow(props: Readonly<ValueRowViewModelProps>): JSX.Element {
    const vm = useCreateAutoDisposedViewModel(() => new ValueRowViewModel(props));
    useEffect(() => vm.setProps(props));
    return <ValueRowView vm={vm} />;
}
