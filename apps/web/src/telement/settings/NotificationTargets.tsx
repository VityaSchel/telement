/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { type IPusher } from "matrix-js-sdk/src/matrix";

import { SettingsValueRow } from "./SettingsValueRow";

/** Props for {@link NotificationTargets}. */
interface NotificationTargetsProps {
    /** Where the account's notifications are sent. */
    pushers: IPusher[];
}

/**
 * The devices and email addresses that get the account's notifications, as rows of a settings card: the device's name,
 * with the app's in secondary text at the row's end.
 */
export function NotificationTargets({ pushers }: Readonly<NotificationTargetsProps>): JSX.Element {
    return (
        <ul className="mx_NotificationTargets" data-settings-row="">
            {pushers.map(({ app_id: appId, pushkey, app_display_name: app, device_display_name: device }) => (
                <li key={`${appId} ${pushkey}`}>
                    {/* Nothing to choose from: the row only shows what it is about */}
                    <SettingsValueRow
                        label={device || app}
                        value={device ? app : ""}
                        options={[]}
                        onSelect={() => {}}
                        disabled
                    />
                </li>
            ))}
        </ul>
    );
}
