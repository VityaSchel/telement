/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import classNames from "classnames";
import OnlineOrUnavailableIcon from "@vector-im/compound-design-tokens/assets/web/icons/presence-solid-8x8";
import DNDIcon from "@vector-im/compound-design-tokens/assets/web/icons/presence-strikethrough-8x8";
import { Tooltip } from "@vector-im/compound-web";
import { UnstableValue } from "matrix-js-sdk/src/NamespacedValue";

import { _t } from "../../../../../../languageHandler";

interface Props {
    className?: string;
    presenceState: string;
}

export const BUSY_PRESENCE_NAME = new UnstableValue("busy", "org.matrix.msc3026.busy");

/** Telement: someone offline has no icon, as in Telegram, and neither has an unknown state. */
function getIconForPresenceState(state: string): JSX.Element | null {
    switch (state) {
        case "online":
            return <OnlineOrUnavailableIcon height="8px" width="8px" className="mx_PresenceIconView_online" />;
        case "unavailable":
        case "io.element.unreachable":
            return <OnlineOrUnavailableIcon height="8px" width="8px" className="mx_PresenceIconView_unavailable" />;
        case BUSY_PRESENCE_NAME.name:
        case BUSY_PRESENCE_NAME.altName:
            return <DNDIcon height="8px" width="8px" className="mx_PresenceIconView_dnd" />;
        default:
            return null;
    }
}

function getTooltipText(state: string): string {
    switch (state) {
        case "online":
            return _t("presence|online");
        case "unavailable":
        case "io.element.unreachable":
            return _t("presence|away");
        case BUSY_PRESENCE_NAME.name:
        case BUSY_PRESENCE_NAME.altName:
            return _t("presence|busy");
        default:
            throw new Error(`Presence state "${state}" is unknown.`);
    }
}

const AvatarPresenceIconView: React.FC<Props> = ({ className, presenceState }) => {
    const icon = getIconForPresenceState(presenceState);
    if (!icon) return null;

    const names = classNames("mx_PresenceIconView", className);
    return (
        <Tooltip label={getTooltipText(presenceState)} placement="bottom" isTriggerInteractive={false}>
            <div className={names}>{icon}</div>
        </Tooltip>
    );
};

export default AvatarPresenceIconView;
