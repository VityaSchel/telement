/*
Copyright 2019-2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ContextType } from "react";
import { type Room } from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";

import { _t } from "../../../../../languageHandler";
import RoomProfileSettings from "../../../room_settings/RoomProfileSettings";
import AccessibleButton, { type ButtonEvent } from "../../../elements/AccessibleButton";
import dis from "../../../../../dispatcher/dispatcher";
import MatrixClientContext from "../../../../../contexts/MatrixClientContext";
import { SettingsSubsection } from "../../shared/SettingsSubsection";
import SettingsTab from "../SettingsTab";
import { SettingsSection } from "../../shared/SettingsSection";

interface IProps {
    room: Room;
}

interface IState {
    isRoomPublished: boolean;
}

export default class GeneralRoomSettingsTab extends React.Component<IProps, IState> {
    public static contextType = MatrixClientContext;
    declare public context: ContextType<typeof MatrixClientContext>;

    public constructor(props: IProps) {
        super(props);

        this.state = {
            isRoomPublished: false, // loaded async
        };
    }

    private onLeaveClick = (ev: ButtonEvent): void => {
        dis.dispatch({
            action: "leave_room",
            room_id: this.props.room.roomId,
        });
    };

    public render(): React.ReactNode {
        const room = this.props.room;

        let leaveSection;
        if (room.getMyMembership() === KnownMembership.Join) {
            leaveSection = (
                <SettingsSubsection heading={_t("action|leave_room")}>
                    <AccessibleButton kind="danger" onClick={this.onLeaveClick}>
                        {_t("action|leave_room")}
                    </AccessibleButton>
                </SettingsSubsection>
            );
        }

        return (
            <SettingsTab data-testid="General">
                {/* Telement: the room's profile and leaving it. The addresses are on the Security & privacy tab and this
                    room's media on its Notifications tab, with the other personal settings */}
                <SettingsSection>
                    <RoomProfileSettings roomId={room.roomId} />
                </SettingsSection>

                {leaveSection && <SettingsSection>{leaveSection}</SettingsSection>}
            </SettingsTab>
        );
    }
}
