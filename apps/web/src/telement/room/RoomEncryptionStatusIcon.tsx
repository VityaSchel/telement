/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { Tooltip } from "@vector-im/compound-web";
import { ErrorSolidIcon, LockOffIcon, VerifiedIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../languageHandler";
import { E2EStatus } from "../../utils/ShieldUtils";

interface RoomEncryptionStatusIconProps {
    /**
     * Whether the room is encrypted, or null while that is still loading.
     */
    isRoomEncrypted: boolean | null;
    /**
     * Whether the room is a DM. The room header already shows verification for DMs.
     */
    isDirectMessage: boolean;
    /**
     * Verification state of the room's members.
     */
    e2eStatus: E2EStatus | null;
}

/**
 * Room header icon showing the encryption state that Element shows in the composer. Telement's composer has no
 * encryption indicators, so the header shows that a room is unencrypted and, for group rooms, whether its members
 * are verified.
 */
export function RoomEncryptionStatusIcon({
    isRoomEncrypted,
    isDirectMessage,
    e2eStatus,
}: RoomEncryptionStatusIconProps): JSX.Element | null {
    if (isRoomEncrypted === false) {
        return (
            <Tooltip label={_t("composer|room_unencrypted")} placement="right">
                <LockOffIcon
                    width="16px"
                    height="16px"
                    className="mx_RoomHeader_icon"
                    color="var(--cpd-color-icon-info-primary)"
                    aria-label={_t("composer|room_unencrypted")}
                />
            </Tooltip>
        );
    }

    if (isDirectMessage || !isRoomEncrypted) return null;

    if (e2eStatus === E2EStatus.Verified) {
        return (
            <Tooltip label={_t("common|verified")} placement="right">
                <VerifiedIcon
                    width="16px"
                    height="16px"
                    className="mx_RoomHeader_icon mx_Verified"
                    aria-label={_t("common|verified")}
                />
            </Tooltip>
        );
    }

    if (e2eStatus === E2EStatus.Warning) {
        return (
            <Tooltip label={_t("room|header_untrusted_label")} placement="right">
                <ErrorSolidIcon
                    width="16px"
                    height="16px"
                    className="mx_RoomHeader_icon mx_Untrusted"
                    aria-label={_t("room|header_untrusted_label")}
                />
            </Tooltip>
        );
    }

    return null;
}
