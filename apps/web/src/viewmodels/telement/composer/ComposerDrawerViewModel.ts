/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { BaseViewModel, type ComposerDrawerViewSnapshot } from "@element-hq/web-shared-components";

import { _t } from "../../../languageHandler";

export const ComposerDrawerTab = {
    Emoji: "emoji",
    Stickers: "stickers",
} as const;

export type ComposerDrawerTab = (typeof ComposerDrawerTab)[keyof typeof ComposerDrawerTab];

export interface ComposerDrawerViewModelProps {
    /**
     * Whether the Stickers tab is available: sticker settings on and an integration manager reachable.
     */
    showStickers: boolean;
}

/**
 * View model of the composer's emoji and stickers drawer. Like Telegram, it reopens on the tab the user last used
 * during the session.
 */
export class ComposerDrawerViewModel extends BaseViewModel<ComposerDrawerViewSnapshot, ComposerDrawerViewModelProps> {
    private static lastActiveTab: ComposerDrawerTab = ComposerDrawerTab.Emoji;

    public constructor(props: ComposerDrawerViewModelProps) {
        super(props, ComposerDrawerViewModel.computeSnapshot(props));
    }

    private static availableTabs(props: ComposerDrawerViewModelProps): ComposerDrawerTab[] {
        return props.showStickers ? [ComposerDrawerTab.Emoji, ComposerDrawerTab.Stickers] : [ComposerDrawerTab.Emoji];
    }

    private static computeSnapshot(props: ComposerDrawerViewModelProps): ComposerDrawerViewSnapshot {
        const tabs = ComposerDrawerViewModel.availableTabs(props);
        const labels: Record<ComposerDrawerTab, string> = {
            [ComposerDrawerTab.Emoji]: _t("common|emoji"),
            [ComposerDrawerTab.Stickers]: _t("telement|composer|stickers"),
        };
        const lastActiveTab = ComposerDrawerViewModel.lastActiveTab;
        return {
            tabs: tabs.map((id) => ({ id, label: labels[id] })),
            activeTab: tabs.includes(lastActiveTab) ? lastActiveTab : ComposerDrawerTab.Emoji,
        };
    }

    public setShowStickers(showStickers: boolean): void {
        if (this.props.showStickers === showStickers) return;
        this.props = { ...this.props, showStickers };
        this.snapshot.set(ComposerDrawerViewModel.computeSnapshot(this.props));
    }

    public onTabSelected = (id: string): void => {
        const tab = ComposerDrawerViewModel.availableTabs(this.props).find((available) => available === id);
        if (!tab) return;
        ComposerDrawerViewModel.lastActiveTab = tab;
        this.snapshot.set(ComposerDrawerViewModel.computeSnapshot(this.props));
    };
}
