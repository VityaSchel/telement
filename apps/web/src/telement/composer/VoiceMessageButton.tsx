/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { MicOnIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../languageHandler";
import AccessibleButton from "../../components/views/elements/AccessibleButton";

interface VoiceMessageButtonProps {
    /**
     * Starts Element's voice message recorder.
     */
    onClick: () => void;
}

/**
 * The microphone that sits in the composer's send slot while there is nothing to send, as in Telegram. Send takes its
 * place once there is text or a recording.
 */
export function VoiceMessageButton({ onClick }: VoiceMessageButtonProps): JSX.Element {
    return (
        <AccessibleButton
            className="mx_MessageComposer_button"
            onClick={onClick}
            title={_t("composer|voice_message_button")}
        >
            <MicOnIcon />
        </AccessibleButton>
    );
}
