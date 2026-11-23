/*
Copyright 2019-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import classNames from "classnames";
import { type Room } from "matrix-js-sdk/src/matrix";
import { ChevronDownIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../../languageHandler";
import AccessibleButton, { type ButtonEvent } from "../elements/AccessibleButton";
import { useTypedEventEmitterState } from "../../../hooks/useEventEmitter";
import { NotificationStateEvents } from "../../../stores/notifications/NotificationState";
import { RoomNotificationStateStore } from "../../../stores/notifications/RoomNotificationStateStore";

interface IProps {
    /** Telement: the room whose messages are counted: as in the room list, the count is gray while it is muted. */
    room: Room;
    numUnreadMessages?: number;
    highlight: boolean;
    /** Telement: whether the button first returns to where the timeline jumped from, rather than to the bottom. */
    jumpBack?: boolean;
    onScrollToBottomClick: (e: ButtonEvent) => void;
}

const JumpToBottomButton: React.FC<IProps> = (props) => {
    const notificationState = RoomNotificationStateStore.instance.getRoomState(props.room);
    const muted = useTypedEventEmitterState(
        notificationState,
        NotificationStateEvents.Update,
        () => notificationState.muted,
    );
    const className = classNames({
        mx_JumpToBottomButton: true,
        mx_JumpToBottomButton_highlight: props.highlight,
        mx_JumpToBottomButton_muted: muted,
    });
    let badge;
    if (props.numUnreadMessages) {
        badge = <div className="mx_JumpToBottomButton_badge">{props.numUnreadMessages}</div>;
    }
    return (
        <div className={className}>
            <AccessibleButton
                className="mx_JumpToBottomButton_scrollDown"
                title={props.jumpBack ? _t("telement|timeline|jump_back") : _t("room|jump_to_bottom_button")}
                onClick={props.onScrollToBottomClick}
            >
                <ChevronDownIcon />
            </AccessibleButton>
            {badge}
        </div>
    );
};

export default JumpToBottomButton;
