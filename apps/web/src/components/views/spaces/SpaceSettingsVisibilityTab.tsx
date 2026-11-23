/*
Copyright 2024 New Vector Ltd.
Copyright 2021-2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ChangeEventHandler, type JSX, useCallback, useState } from "react";
import {
    type Room,
    EventType,
    GuestAccess,
    HistoryVisibility,
    JoinRule,
    type MatrixClient,
} from "matrix-js-sdk/src/matrix";
import { Form, SettingsToggleInput } from "@vector-im/compound-web";
import { ActionRowView } from "@element-hq/web-shared-components";

import { _t } from "../../../languageHandler";
import AliasSettings from "../room_settings/AliasSettings";
import { useStateToggle } from "../../../hooks/useStateToggle";
import { useLocalEcho } from "../../../hooks/useLocalEcho";
import JoinRuleSettings from "../settings/JoinRuleSettings";
import { useRoomState } from "../../../hooks/useRoomState";
import SettingsFieldset from "../settings/SettingsFieldset";
import { useAsyncMemo } from "../../../hooks/useAsyncMemo";
import { SettingsSection } from "../settings/shared/SettingsSection";
import { SettingsSubsection } from "../settings/shared/SettingsSubsection";
import SettingsTab from "../settings/tabs/SettingsTab";

interface IProps {
    matrixClient: MatrixClient;
    space: Room;
    closeSettingsFn(this: void): void;
}

const SpaceSettingsVisibilityTab: React.FC<IProps> = ({ matrixClient: cli, space, closeSettingsFn }) => {
    const [error, setError] = useState("");
    const serverSupportsExploringSpaces = useAsyncMemo<boolean>(
        async (): Promise<boolean> => {
            return cli.isVersionSupported("v1.4").then((supported) => {
                return supported || cli.doesServerSupportUnstableFeature("org.matrix.msc3827.stable");
            });
        },
        [cli],
        false,
    );

    const userId = cli.getUserId()!;

    const joinRule = useRoomState(space, (state) => state.getJoinRule());

    const [guestAccessEnabled, setGuestAccessEnabled] = useLocalEcho<boolean>(
        () =>
            space.currentState.getStateEvents(EventType.RoomGuestAccess, "")?.getContent()?.guest_access ===
            GuestAccess.CanJoin,
        (guestAccessEnabled) =>
            cli.sendStateEvent(
                space.roomId,
                EventType.RoomGuestAccess,
                {
                    guest_access: guestAccessEnabled ? GuestAccess.CanJoin : GuestAccess.Forbidden,
                },
                "",
            ),
        () => setError(_t("room_settings|visibility|error_update_guest_access")),
    );
    const onGuestAccessEnabledChanged = useCallback<ChangeEventHandler<HTMLInputElement>>(
        (e) => setGuestAccessEnabled(e.target.checked),
        [setGuestAccessEnabled],
    );
    const [historyVisibility, setHistoryVisibility] = useLocalEcho<HistoryVisibility>(
        () =>
            space.currentState.getStateEvents(EventType.RoomHistoryVisibility, "")?.getContent()?.history_visibility ||
            HistoryVisibility.Shared,
        (historyVisibility) =>
            cli.sendStateEvent(
                space.roomId,
                EventType.RoomHistoryVisibility,
                {
                    history_visibility: historyVisibility,
                },
                "",
            ),
        () => setError(_t("room_settings|visibility|error_update_history_visibility")),
    );

    const [showAdvancedSection, toggleAdvancedSection] = useStateToggle();

    const canSetGuestAccess = space.currentState.maySendStateEvent(EventType.RoomGuestAccess, userId);
    const canSetHistoryVisibility = space.currentState.maySendStateEvent(EventType.RoomHistoryVisibility, userId);
    const canSetCanonical = space.currentState.mayClientSendStateEvent(EventType.RoomCanonicalAlias, cli);
    const canonicalAliasEv = space.currentState.getStateEvents(EventType.RoomCanonicalAlias, "");

    let advancedSection;
    if (joinRule === JoinRule.Public) {
        // Telement: straight in the card's form, so that the card hugs the row as its last row
        advancedSection = (
            <>
                {/* Telement: an accent text row, as Telegram's one-off actions */}
                <ActionRowView
                    kind="accent"
                    data-testid="toggle-guest-access-btn"
                    onClick={toggleAdvancedSection}
                    aria-expanded={showAdvancedSection}
                >
                    {showAdvancedSection ? _t("action|hide_advanced") : _t("action|show_advanced")}
                </ActionRowView>

                {showAdvancedSection && (
                    <SettingsToggleInput
                        name="guest-access-enabled"
                        checked={guestAccessEnabled}
                        onChange={onGuestAccessEnabledChanged}
                        disabled={!canSetGuestAccess}
                        disabledMessage={_t("room_settings|visibility|guest_access_disabled")}
                        helpMessage={_t("room_settings|visibility|guest_access_explainer")}
                        label={_t("room_settings|visibility|guest_access_label")}
                    />
                )}
            </>
        );
    }

    let addressesSection: JSX.Element | undefined;
    if (space.getJoinRule() === JoinRule.Public) {
        addressesSection = (
            <SettingsSection heading={_t("room_settings|visibility|alias_section")}>
                <AliasSettings
                    roomId={space.roomId}
                    canSetCanonicalAlias={canSetCanonical}
                    canSetAliases={true}
                    canonicalAliasEvent={canonicalAliasEv ?? undefined}
                    hidePublishSetting={!serverSupportsExploringSpaces}
                />
            </SettingsSection>
        );
    }

    const preventSubmit = (evt: React.FormEvent): void => {
        evt.preventDefault();
        evt.stopPropagation();
    };

    // The dialog's title names the tab, so the section has no heading of its own. Previewing the space is about its
    // history rather than who can join, so it is a group of its own under the join rules rather than a row after
    // "Anyone", and the recommendation is part of its help.
    return (
        <SettingsTab>
            <SettingsSection>
                {error && (
                    <div data-testid="space-settings-error" className="mx_SpaceRoomView_errorText">
                        {error}
                    </div>
                )}

                <SettingsFieldset
                    data-testid="access-fieldset"
                    legend={_t("room_settings|access|title")}
                    description={_t("room_settings|access|description_space", { spaceName: space.name })}
                >
                    <JoinRuleSettings
                        room={space}
                        onError={(): void => setError(_t("room_settings|visibility|error_failed_save"))}
                        closeSettingsFn={closeSettingsFn}
                    />
                    {advancedSection && <Form.Root onSubmit={preventSubmit}>{advancedSection}</Form.Root>}
                </SettingsFieldset>

                <SettingsSubsection heading={_t("telement|space_settings|preview")}>
                    <Form.Root onSubmit={preventSubmit}>
                        <SettingsToggleInput
                            name="space-history-visibility"
                            checked={historyVisibility === HistoryVisibility.WorldReadable}
                            onChange={(evt): void => {
                                setHistoryVisibility(
                                    evt.target.checked ? HistoryVisibility.WorldReadable : HistoryVisibility.Shared,
                                );
                            }}
                            helpMessage={`${_t("room_settings|visibility|history_visibility_anyone_space_description")} ${_t(
                                "room_settings|visibility|history_visibility_anyone_space_recommendation",
                            )}`}
                            disabled={!canSetHistoryVisibility}
                            disabledMessage={_t("room_settings|visibility|history_visibility_anyone_space_disabled")}
                            label={_t("room_settings|visibility|history_visibility_anyone_space")}
                        />
                    </Form.Root>
                </SettingsSubsection>

                {addressesSection}
            </SettingsSection>
        </SettingsTab>
    );
};

export default SpaceSettingsVisibilityTab;
