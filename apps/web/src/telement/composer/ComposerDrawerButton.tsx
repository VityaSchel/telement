/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useEffect } from "react";
import classNames from "classnames";
import { ReactionIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import { Button, Text } from "@vector-im/compound-web";
import { ComposerDrawerView, useCreateAutoDisposedViewModel, useViewModel } from "@element-hq/web-shared-components";

import { _t } from "../../languageHandler";
import ContextMenu, { aboveLeftOf, type MenuProps, useContextMenu } from "../../components/structures/ContextMenu";
import { CollapsibleButton } from "../../components/views/rooms/CollapsibleButton";
import { EmojiPickerWithRecents } from "../../emojipicker/EmojiPickerWithRecents";
import { ComposerDrawerTab, ComposerDrawerViewModel } from "../../viewmodels/telement/composer/ComposerDrawerViewModel";

interface ComposerDrawerButtonProps {
    /**
     * Inserts an emoji into the composer.
     */
    addEmoji: (unicode: string) => boolean;
    /**
     * Where the drawer should appear.
     */
    menuPosition?: MenuProps;
    /**
     * Whether the Stickers tab is available.
     */
    showStickers: boolean;
    /**
     * Opens Element's integration-manager sticker picker.
     */
    onOpenStickerPicker: () => void;
}

interface ComposerDrawerProps extends Omit<ComposerDrawerButtonProps, "menuPosition"> {
    onClose: () => void;
}

function ComposerDrawer({ addEmoji, showStickers, onOpenStickerPicker, onClose }: ComposerDrawerProps): JSX.Element {
    const vm = useCreateAutoDisposedViewModel(() => new ComposerDrawerViewModel({ showStickers }));
    const { activeTab } = useViewModel(vm);

    useEffect(() => {
        vm.setShowStickers(showStickers);
    }, [vm, showStickers]);

    return (
        <ComposerDrawerView vm={vm} className="mx_TelementComposerDrawer">
            {activeTab === ComposerDrawerTab.Stickers ? (
                <div className="mx_TelementComposerDrawer_stickers">
                    <Text size="sm" className="mx_TelementComposerDrawer_stickersDescription">
                        {_t("telement|composer|integration_stickers_description")}
                    </Text>
                    <Button
                        kind="secondary"
                        size="md"
                        onClick={() => {
                            onClose();
                            onOpenStickerPicker();
                        }}
                    >
                        {_t("telement|composer|open_integration_stickers")}
                    </Button>
                </div>
            ) : (
                <EmojiPickerWithRecents onChoose={addEmoji} onFinished={onClose} showQuickReactions={false} />
            )}
        </ComposerDrawerView>
    );
}

/**
 * The emoji button of the Telegram composer layout. It opens a drawer with Emoji and Stickers tabs above the
 * composer.
 */
export function ComposerDrawerButton({ menuPosition, ...drawerProps }: ComposerDrawerButtonProps): JSX.Element {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();

    let drawer: JSX.Element | null = null;
    if (menuDisplayed && button.current) {
        const position = menuPosition ?? aboveLeftOf(button.current.getBoundingClientRect());
        drawer = (
            <ContextMenu
                {...position}
                menuClassName="mx_TelementComposerDrawer_menu"
                onFinished={closeMenu}
                managed={false}
                focusLock
            >
                <ComposerDrawer {...drawerProps} onClose={closeMenu} />
            </ContextMenu>
        );
    }

    return (
        <>
            <CollapsibleButton
                className={classNames("mx_MessageComposer_button", {
                    mx_EmojiButton_highlight: menuDisplayed,
                })}
                onClick={openMenu}
                title={_t("common|emoji")}
                inputRef={button}
            >
                <ReactionIcon />
            </CollapsibleButton>
            {drawer}
        </>
    );
}
