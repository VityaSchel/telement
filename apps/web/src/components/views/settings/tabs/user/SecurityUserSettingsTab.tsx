/*
Copyright 2024 New Vector Ltd.
Copyright 2019-2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type ReactNode } from "react";
import { sleep } from "matrix-js-sdk/src/utils";
import { type Room, RoomEvent, type EmptyObject } from "matrix-js-sdk/src/matrix";
import { KnownMembership, type Membership } from "matrix-js-sdk/src/types";
import { logger } from "matrix-js-sdk/src/logger";
import { WarningIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../../../../languageHandler";
import { MatrixClientPeg } from "../../../../../MatrixClientPeg";
import AccessibleButton from "../../../elements/AccessibleButton";
import dis from "../../../../../dispatcher/dispatcher";
import { SettingLevel } from "../../../../../settings/SettingLevel";
import SettingsStore from "../../../../../settings/SettingsStore";
import { UIFeature } from "../../../../../settings/UIFeature";
import { type ActionPayload } from "../../../../../dispatcher/payloads";
import SettingsFlag from "../../../elements/SettingsFlag";
import { type BooleanSettingKey } from "../../../../../settings/Settings.tsx";
import EventIndexPanel from "../../EventIndexPanel";
import InlineSpinner from "../../../elements/InlineSpinner";
import { privateShouldBeEncrypted } from "../../../../../utils/rooms";
import SettingsTab from "../SettingsTab";
import { SettingsSection } from "../../shared/SettingsSection";
import { SettingsSubsection, SettingsSubsectionText } from "../../shared/SettingsSubsection";
import { DiscoverySettings } from "../../discovery/DiscoverySettings";
import SetIntegrationManager from "../../SetIntegrationManager";
import { InviteAvatarsAccountSetting, MediaPreviewAccountSettings } from "./MediaPreviewAccountSettings.tsx";
import { InviteRulesAccountSetting } from "./InviteRulesAccountSettings.tsx";

interface IIgnoredUserProps {
    userId: string;
    onUnignored: (userId: string) => void;
    inProgress: boolean;
}

export class IgnoredUser extends React.Component<IIgnoredUserProps> {
    private onUnignoreClicked = (): void => {
        this.props.onUnignored(this.props.userId);
    };

    public render(): React.ReactNode {
        const id = `mx_SecurityUserSettingsTab_ignoredUser_${this.props.userId}`;
        return (
            <li className="mx_SecurityUserSettingsTab_ignoredUser" aria-label={this.props.userId}>
                <AccessibleButton
                    onClick={this.onUnignoreClicked}
                    kind="primary_sm"
                    aria-describedby={id}
                    disabled={this.props.inProgress}
                >
                    {_t("action|unignore")}
                </AccessibleButton>
                <span id={id}>{this.props.userId}</span>
            </li>
        );
    }
}

interface IState {
    ignoredUserIds: string[];
    waitingUnignored: string[];
    managingInvites: boolean;
    invitedRoomIds: Set<string>;
}

export default class SecurityUserSettingsTab extends React.Component<EmptyObject, IState> {
    // Telement: what you share with others, moved here from Preferences so that every privacy setting is on this tab
    private static PRESENCE_SETTINGS: BooleanSettingKey[] = ["sendReadReceipts", "sendTypingNotifications"];

    private dispatcherRef?: string;

    public constructor(props: EmptyObject) {
        super(props);

        // Get rooms we're invited to
        const invitedRoomIds = new Set(this.getInvitedRooms().map((room) => room.roomId));

        this.state = {
            ignoredUserIds: MatrixClientPeg.safeGet().getIgnoredUsers(),
            waitingUnignored: [],
            managingInvites: false,
            invitedRoomIds,
        };
    }

    private onAction = ({ action }: ActionPayload): void => {
        if (action === "ignore_state_changed") {
            const ignoredUserIds = MatrixClientPeg.safeGet().getIgnoredUsers();
            const newWaitingUnignored = this.state.waitingUnignored.filter((e) => ignoredUserIds.includes(e));
            this.setState({ ignoredUserIds, waitingUnignored: newWaitingUnignored });
        }
    };

    public componentDidMount(): void {
        this.dispatcherRef = dis.register(this.onAction);
        MatrixClientPeg.safeGet().on(RoomEvent.MyMembership, this.onMyMembership);
    }

    public componentWillUnmount(): void {
        dis.unregister(this.dispatcherRef);
        MatrixClientPeg.safeGet().removeListener(RoomEvent.MyMembership, this.onMyMembership);
    }

    private onMyMembership = (room: Room, membership: Membership): void => {
        if (room.isSpaceRoom()) {
            return;
        }

        if (membership === KnownMembership.Invite) {
            this.addInvitedRoom(room);
        } else if (this.state.invitedRoomIds.has(room.roomId)) {
            // The user isn't invited anymore
            this.removeInvitedRoom(room.roomId);
        }
    };

    private addInvitedRoom = (room: Room): void => {
        this.setState(({ invitedRoomIds }) => ({
            invitedRoomIds: new Set(invitedRoomIds).add(room.roomId),
        }));
    };

    private removeInvitedRoom = (roomId: string): void => {
        this.setState(({ invitedRoomIds }) => {
            const newInvitedRoomIds = new Set(invitedRoomIds);
            newInvitedRoomIds.delete(roomId);

            return {
                invitedRoomIds: newInvitedRoomIds,
            };
        });
    };

    private onUserUnignored = async (userId: string): Promise<void> => {
        const { ignoredUserIds, waitingUnignored } = this.state;
        const currentlyIgnoredUserIds = ignoredUserIds.filter((e) => !waitingUnignored.includes(e));

        const index = currentlyIgnoredUserIds.indexOf(userId);
        if (index !== -1) {
            currentlyIgnoredUserIds.splice(index, 1);
            this.setState(({ waitingUnignored }) => ({ waitingUnignored: [...waitingUnignored, userId] }));
            await MatrixClientPeg.safeGet().setIgnoredUsers(currentlyIgnoredUserIds);
        }
    };

    private getInvitedRooms = (): Room[] => {
        return MatrixClientPeg.safeGet()
            .getRooms()
            .filter((r) => {
                return r.hasMembershipState(MatrixClientPeg.safeGet().getUserId()!, KnownMembership.Invite);
            });
    };

    private manageInvites = async (accept: boolean): Promise<void> => {
        this.setState({
            managingInvites: true,
        });

        // iterate with a normal for loop in order to retry on action failure
        const invitedRoomIdsValues = Array.from(this.state.invitedRoomIds);

        // Execute all acceptances/rejections sequentially
        const cli = MatrixClientPeg.safeGet();
        const action = accept ? cli.joinRoom.bind(cli) : cli.leave.bind(cli);
        for (let i = 0; i < invitedRoomIdsValues.length; i++) {
            const roomId = invitedRoomIdsValues[i];

            // Accept/reject invite
            await action(roomId).then(
                () => {
                    // No error, update invited rooms button
                    this.removeInvitedRoom(roomId);
                },
                async (e): Promise<void> => {
                    // Action failure
                    if (e.errcode === "M_LIMIT_EXCEEDED") {
                        // Add a delay between each invite change in order to avoid rate
                        // limiting by the server.
                        await sleep(e.retry_after_ms || 2500);

                        // Redo last action
                        i--;
                    } else {
                        // Print out error with joining/leaving room
                        logger.warn(e);
                    }
                },
            );
        }

        this.setState({
            managingInvites: false,
        });
    };

    private onAcceptAllInvitesClicked = (): void => {
        void this.manageInvites(true);
    };

    private onRejectAllInvitesClicked = (): void => {
        void this.manageInvites(false);
    };

    private renderIgnoredUsers(): JSX.Element {
        const { waitingUnignored, ignoredUserIds } = this.state;
        if (!ignoredUserIds?.length) {
            return (
                <SettingsSubsection heading={_t("settings|security|ignore_users_section")}>
                    <SettingsSubsectionText>{_t("settings|security|ignore_users_empty")}</SettingsSubsectionText>
                </SettingsSubsection>
            );
        }

        return (
            <SettingsSubsection
                id="mx_SecurityUserSettingsTab_ignoredUsersHeading"
                heading={_t("settings|security|ignore_users_section")}
            >
                <SettingsSubsectionText>
                    <ul
                        aria-label={_t("settings|security|ignore_users_section")}
                        className="mx_SecurityUserSettingsTab_ignoredUsers"
                    >
                        {ignoredUserIds.map((u) => (
                            <IgnoredUser
                                userId={u}
                                onUnignored={this.onUserUnignored}
                                key={u}
                                inProgress={waitingUnignored.includes(u)}
                            />
                        ))}
                    </ul>
                </SettingsSubsectionText>
            </SettingsSubsection>
        );
    }

    private renderManageInvites(): ReactNode {
        const { invitedRoomIds } = this.state;

        if (invitedRoomIds.size === 0) {
            return null;
        }

        return (
            <SettingsSubsection heading={_t("settings|security|bulk_options_section")}>
                <div className="mx_SecurityUserSettingsTab_bulkOptions">
                    <AccessibleButton
                        onClick={this.onAcceptAllInvitesClicked}
                        kind="primary_outline"
                        disabled={this.state.managingInvites}
                    >
                        {_t("settings|security|bulk_options_accept_all_invites", { invitedRooms: invitedRoomIds.size })}
                    </AccessibleButton>
                    <AccessibleButton
                        onClick={this.onRejectAllInvitesClicked}
                        kind="danger_outline"
                        disabled={this.state.managingInvites}
                    >
                        {_t("settings|security|bulk_options_reject_all_invites", { invitedRooms: invitedRoomIds.size })}
                    </AccessibleButton>
                    {this.state.managingInvites ? <InlineSpinner /> : <div />}
                </div>
            </SettingsSubsection>
        );
    }

    public render(): React.ReactNode {
        const eventIndex = (
            <SettingsSubsection heading={_t("settings|security|message_search_section")}>
                <EventIndexPanel />
            </SettingsSubsection>
        );

        let warning;
        if (!privateShouldBeEncrypted(MatrixClientPeg.safeGet())) {
            warning = (
                <div className="mx_SecurityUserSettingsTab_warning">
                    <WarningIcon />
                    {_t("settings|security|e2ee_default_disabled_warning")}
                </div>
            );
        }

        let advancedSection;
        if (SettingsStore.getValue(UIFeature.AdvancedSettings)) {
            const ignoreUsersPanel = this.renderIgnoredUsers();
            const invitesPanel = this.renderManageInvites();
            // only show the section if there's something to show
            if (ignoreUsersPanel || invitesPanel) {
                advancedSection = (
                    <SettingsSection heading={_t("common|advanced")}>
                        {ignoreUsersPanel}
                        {invitesPanel}
                    </SettingsSection>
                );
            }
        }

        let discoverySection;
        if (SettingsStore.getValue(UIFeature.ThirdPartyID)) {
            discoverySection = <DiscoverySettings />;
        }

        // Telement: every privacy setting is here: what you share (moved from Preferences), what others' rooms and
        // invites can show you, and how people find you. This device's settings are on the Devices tab
        const privacySection = (
            <SettingsSection heading={_t("common|privacy")}>
                <SettingsSubsection
                    heading={_t("common|presence")}
                    description={_t("settings|preferences|presence_description")}
                    formWrap
                >
                    {SecurityUserSettingsTab.PRESENCE_SETTINGS.map((setting) => (
                        <SettingsFlag key={setting} name={setting} level={SettingLevel.ACCOUNT} />
                    ))}
                    <SettingsFlag name="userTimezonePublish" level={SettingLevel.DEVICE} />
                </SettingsSubsection>
                <SettingsSubsection heading={_t("common|moderation_and_safety")} legacy={false}>
                    <InviteAvatarsAccountSetting />
                    <InviteRulesAccountSetting />
                </SettingsSubsection>
                {/* The choices are a group of their own, labelled above their card */}
                <SettingsSubsection
                    heading={_t("settings|media_preview|media_preview_label")}
                    description={_t("settings|media_preview|media_preview_description")}
                    legacy={false}
                >
                    <MediaPreviewAccountSettings />
                </SettingsSubsection>
                {discoverySection}
            </SettingsSection>
        );

        // Telement: the privacy settings first, then message search without the "Encryption" label it shared with the
        // offline device (now on the Devices tab), and the integration manager last
        return (
            <SettingsTab>
                {warning}
                {privacySection}
                <SettingsSection>{eventIndex}</SettingsSection>
                {advancedSection}
                <SetIntegrationManager />
            </SettingsTab>
        );
    }
}
