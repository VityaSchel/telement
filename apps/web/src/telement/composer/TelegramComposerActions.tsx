/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { TextFormattingIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../languageHandler";
import { type MenuProps } from "../../components/structures/ContextMenu";
import { CollapsibleButton } from "../../components/views/rooms/CollapsibleButton";
import { ComposerDrawerButton } from "./ComposerDrawerButton";

interface TelegramComposerActionsProps {
    /**
     * Inserts an emoji into the composer.
     */
    addEmoji: (unicode: string) => boolean;
    /**
     * Where menus opened from the composer should appear.
     */
    menuPosition?: MenuProps;
    /**
     * Whether stickers are enabled and available in this room.
     */
    showStickers: boolean;
    /**
     * Opens Element's integration-manager sticker picker.
     */
    onOpenStickerPicker: () => void;
    /**
     * Whether Element's rich-text composer lab is on, which adds its "Show formatting" button.
     */
    isWysiwygLabEnabled: boolean;
    isRichTextEnabled: boolean;
    onRichTextToggle: () => void;
}

/**
 * Buttons on the right of the text field in the Telegram composer layout.
 */
export function TelegramComposerActions({
    isWysiwygLabEnabled,
    isRichTextEnabled,
    onRichTextToggle,
    ...drawerProps
}: TelegramComposerActionsProps): JSX.Element {
    return (
        <>
            {isWysiwygLabEnabled && (
                <CollapsibleButton
                    className="mx_MessageComposer_button mx_TelementFormattingButton"
                    onClick={onRichTextToggle}
                    title={isRichTextEnabled ? _t("composer|mode_plain") : _t("composer|mode_rich_text")}
                >
                    <TextFormattingIcon />
                </CollapsibleButton>
            )}
            <ComposerDrawerButton {...drawerProps} />
        </>
    );
}
