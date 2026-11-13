/*
Copyright 2024,2025 New Vector Ltd.
Copyright 2021-2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import classNames from "classnames";
import { SettingsSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import { IconButton, Text, Tooltip } from "@vector-im/compound-web";

import { _t } from "../../../languageHandler";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";

/**
 * Settings button at the bottom of the space panel. Telement opens the settings dialog directly instead of
 * Element's quick settings menu, which only offered a theme switcher besides "All settings".
 */
const QuickSettingsButton: React.FC<{
    isPanelCollapsed: boolean;
}> = ({ isPanelCollapsed = false }) => {
    let button = (
        <IconButton
            aria-label={_t("common|settings")}
            className={classNames("mx_QuickSettingsButton", { expanded: !isPanelCollapsed })}
            onClick={() => defaultDispatcher.dispatch({ action: Action.ViewUserSettings })}
        >
            <>
                <SettingsSolidIcon />
                {/* This is dirty, but we need to add the label to the indicator icon */}
                {!isPanelCollapsed && (
                    <Text className="mx_QuickSettingsButton_label" as="span" size="md" title={_t("common|settings")}>
                        {_t("common|settings")}
                    </Text>
                )}
            </>
        </IconButton>
    );

    if (isPanelCollapsed) {
        button = (
            <Tooltip label={_t("common|settings")} placement="right">
                {button}
            </Tooltip>
        );
    }

    return button;
};

export default QuickSettingsButton;
