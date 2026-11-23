/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import ErrorIcon from "@vector-im/compound-design-tokens/assets/web/icons/error";
import { DialogFooterButton, DialogFooterView } from "@element-hq/web-shared-components";
import { PopOutIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../../languageHandler";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { EncryptionCard } from "../settings/encryption/EncryptionCard";
import { type OpenToTabPayload } from "../../../dispatcher/payloads/OpenToTabPayload";
import { Action } from "../../../dispatcher/actions";
import { UserTab } from "./UserTab";
import SdkConfig from "../../../SdkConfig";

interface Props {
    onFinished: (dismissed: boolean) => void;
}

/**
 * Ask the user whether they really want to dismiss the toast about key storage.
 *
 * Launched from the {@link SetupEncryptionToast} in mode `TURN_ON_KEY_STORAGE`,
 * when the user clicks "Dismiss". The caller handles any action via the
 * `onFinished` prop which takes a boolean that is true if the user clicked
 * "Yes, dismiss".
 */
export default class ConfirmKeyStorageOffDialog extends React.Component<Props> {
    public constructor(props: Props) {
        super(props);
    }

    private onGoToSettingsClick = (): void => {
        // Open Settings at the Encryption tab
        const payload: OpenToTabPayload = {
            action: Action.ViewUserSettings,
            initialTabId: UserTab.Encryption,
        };
        defaultDispatcher.dispatch(payload);
        this.props.onFinished(false);
    };

    private onDismissClick = (): void => {
        this.props.onFinished(true);
    };

    public render(): React.ReactNode {
        return (
            <EncryptionCard
                Icon={ErrorIcon}
                destructive={true}
                title={_t("settings|encryption|confirm_key_storage_off")}
            >
                {_t("settings|encryption|confirm_key_storage_off_description", undefined, {
                    a: (sub) => (
                        <>
                            <br />
                            <a href={SdkConfig.get("help_key_storage_url")} target="_blank" rel="noreferrer noopener">
                                {sub} <PopOutIcon />
                            </a>
                        </>
                    ),
                })}
                {/* Telement: the shared dialog footer, dismissing before going to the settings */}
                <DialogFooterView className="mx_Dialog_buttons">
                    <DialogFooterButton onClick={this.onDismissClick}>{_t("action|yes_dismiss")}</DialogFooterButton>
                    <DialogFooterButton onClick={this.onGoToSettingsClick} autoFocus>
                        {_t("common|go_to_settings")}
                    </DialogFooterButton>
                </DialogFooterView>
            </EncryptionCard>
        );
    }
}
