/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, describe, expect, it } from "vitest";

import { ComposerDrawerTab, ComposerDrawerViewModel } from "./ComposerDrawerViewModel";

describe("ComposerDrawerViewModel", () => {
    const viewModels: ComposerDrawerViewModel[] = [];
    const createVm = (showStickers: boolean): ComposerDrawerViewModel => {
        const vm = new ComposerDrawerViewModel({ showStickers });
        viewModels.push(vm);
        return vm;
    };

    afterEach(() => {
        // Leave the remembered tab where every test expects to start.
        viewModels.splice(0).forEach((vm) => {
            vm.onTabSelected(ComposerDrawerTab.Emoji);
            vm.dispose();
        });
    });

    it("offers Emoji and Stickers tabs, opening on Emoji", () => {
        expect(createVm(true).getSnapshot()).toEqual({
            tabs: [
                { id: ComposerDrawerTab.Emoji, label: "Emoji" },
                { id: ComposerDrawerTab.Stickers, label: "Stickers" },
            ],
            activeTab: ComposerDrawerTab.Emoji,
        });
    });

    it("leaves out the Stickers tab when stickers aren't available", () => {
        expect(
            createVm(false)
                .getSnapshot()
                .tabs.map((tab) => tab.id),
        ).toEqual([ComposerDrawerTab.Emoji]);
    });

    it("reopens on the tab used last", () => {
        createVm(true).onTabSelected(ComposerDrawerTab.Stickers);

        expect(createVm(true).getSnapshot().activeTab).toBe(ComposerDrawerTab.Stickers);
    });

    it("falls back to Emoji when the remembered tab is no longer available", () => {
        const vm = createVm(true);
        vm.onTabSelected(ComposerDrawerTab.Stickers);

        vm.setShowStickers(false);

        expect(vm.getSnapshot().activeTab).toBe(ComposerDrawerTab.Emoji);
    });

    it("ignores tabs it doesn't offer", () => {
        const vm = createVm(false);

        vm.onTabSelected(ComposerDrawerTab.Stickers);

        expect(vm.getSnapshot().activeTab).toBe(ComposerDrawerTab.Emoji);
    });
});
