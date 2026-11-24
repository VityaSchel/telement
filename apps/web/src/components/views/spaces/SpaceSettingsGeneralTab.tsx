/*
Copyright 2024 New Vector Ltd.
Copyright 2021 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ChangeEvent, useState } from "react";
import classNames from "classnames";
import { type Room, EventType, type MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";
import { ActionRowView } from "@element-hq/web-shared-components";

import { _t } from "../../../languageHandler";
import AccessibleButton from "../elements/AccessibleButton";
import Field from "../elements/Field";
import AvatarSetting from "../settings/AvatarSetting";
import { htmlSerializeFromMdIfNeeded } from "../../../editor/serialize";
import { leaveSpace } from "../../../utils/leave-behaviour";
import { getTopic } from "../../../hooks/room/useTopic";
import SettingsTab from "../settings/tabs/SettingsTab";
import { SettingsSection } from "../settings/shared/SettingsSection";
import { SettingsSubsection } from "../settings/shared/SettingsSubsection";

interface IProps {
    matrixClient: MatrixClient;
    space: Room;
}

const SpaceSettingsGeneralTab: React.FC<IProps> = ({ matrixClient: cli, space }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const userId = cli.getUserId()!;

    const [newAvatar, setNewAvatar] = useState<File | null | undefined>(null); // undefined means to remove avatar
    const canSetAvatar = space.currentState.maySendStateEvent(EventType.RoomAvatar, userId);
    const avatarChanged = newAvatar !== null;
    const currentAvatar = space.getMxcAvatarUrl() ?? undefined;
    const shownAvatar = newAvatar === undefined ? undefined : (newAvatar ?? currentAvatar);

    const [name, setName] = useState<string>(space.name);
    const canSetName = space.currentState.maySendStateEvent(EventType.RoomName, userId);
    const nameChanged = name !== space.name;

    const currentTopic = getTopic(space)?.text ?? "";
    const [topic, setTopic] = useState(currentTopic);
    const canSetTopic = space.currentState.maySendStateEvent(EventType.RoomTopic, userId);
    const topicChanged = topic !== currentTopic;

    const onCancel = (): void => {
        setNewAvatar(null);
        setName(space.name);
        setTopic(currentTopic);
    };

    const anythingChanged = avatarChanged || nameChanged || topicChanged;

    const onSave = async (): Promise<void> => {
        setBusy(true);
        const promises: Promise<unknown>[] = [];

        if (avatarChanged) {
            if (newAvatar) {
                promises.push(
                    (async (): Promise<void> => {
                        const { content_uri: url } = await cli.uploadContent(newAvatar);
                        await cli.sendStateEvent(space.roomId, EventType.RoomAvatar, { url }, "");
                    })(),
                );
            } else {
                promises.push(cli.sendStateEvent(space.roomId, EventType.RoomAvatar, {}, ""));
            }
        }

        if (nameChanged) {
            promises.push(cli.setRoomName(space.roomId, name));
        }

        if (topicChanged) {
            const htmlTopic = htmlSerializeFromMdIfNeeded(topic, { forceHTML: false });
            promises.push(cli.setRoomTopic(space.roomId, topic, htmlTopic));
        }

        const results = await Promise.allSettled(promises);
        setBusy(false);
        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
            logger.error("Failed to save space settings: ", failures);
            setError(_t("room_settings|general|error_save_space_settings"));
        }
    };

    // Laid out as the room's profile (RoomProfileSettings): the avatar editor, whose letter avatar is square as the space
    // bar draws spaces, before the fields, and Cancel and Save disabled until something changes. The dialog's title
    // names the tab, so the section has no heading of its own.
    return (
        <SettingsTab>
            <SettingsSection>
                <form
                    className="mx_RoomProfileSettings"
                    autoComplete="off"
                    noValidate={true}
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (anythingChanged) void onSave();
                    }}
                >
                    {error && <div className="mx_SpaceRoomView_errorText">{error}</div>}

                    <div className="mx_RoomProfileSettings_profile">
                        <AvatarSetting
                            avatar={shownAvatar}
                            avatarAccessibleName={_t("common|avatar")}
                            disabled={busy || !canSetAvatar}
                            onChange={setNewAvatar}
                            removeAvatar={shownAvatar ? () => setNewAvatar(undefined) : undefined}
                            placeholderId={space.roomId}
                            placeholderName={space.name}
                            type="square"
                        />
                        <div className="mx_RoomProfileSettings_profile_controls">
                            <Field
                                name="spaceName"
                                label={_t("common|name")}
                                autoFocus={true}
                                value={name}
                                onChange={(ev: ChangeEvent<HTMLInputElement>) => setName(ev.target.value)}
                                disabled={busy || !canSetName}
                            />
                            <Field
                                className={classNames(
                                    "mx_RoomProfileSettings_profile_controls_topic",
                                    "mx_RoomProfileSettings_profile_controls_topic--room",
                                )}
                                name="spaceTopic"
                                element="textarea"
                                label={_t("common|description")}
                                value={topic}
                                onChange={(ev: ChangeEvent<HTMLTextAreaElement>) => setTopic(ev.target.value)}
                                disabled={busy || !canSetTopic}
                            />
                        </div>
                    </div>

                    <div className="mx_RoomProfileSettings_buttons">
                        <AccessibleButton onClick={onCancel} disabled={busy || !anythingChanged} kind="primary_outline">
                            {_t("action|cancel")}
                        </AccessibleButton>
                        <AccessibleButton onClick={onSave} disabled={busy || !anythingChanged} kind="primary">
                            {busy ? _t("common|saving") : _t("room_settings|general|save")}
                        </AccessibleButton>
                    </div>
                </form>

                {/* Telement: a red text row alone on its card, as Telegram's Leave, without a label saying it again */}
                <SettingsSubsection>
                    <ActionRowView
                        kind="critical"
                        onClick={() => {
                            leaveSpace(space);
                        }}
                    >
                        {_t("room_settings|general|leave_space")}
                    </ActionRowView>
                </SettingsSubsection>
            </SettingsSection>
        </SettingsTab>
    );
};

export default SpaceSettingsGeneralTab;
