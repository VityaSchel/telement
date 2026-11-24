/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Action } from "../../../dispatcher/actions";
import dis from "../../../dispatcher/dispatcher";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";
import { FontWatcher } from "../../../settings/watchers/FontWatcher";
import { FONT_SIZES, FontSizeViewModel } from "./FontSizeViewModel";

describe("FontSizeViewModel", () => {
    let vm: FontSizeViewModel;

    /** The sizes' steps, by size. */
    const step = (size: number): number => FONT_SIZES.indexOf(size);

    function createViewModel(delta = 0): FontSizeViewModel {
        vi.spyOn(FontWatcher, "getBrowserDefaultFontSize").mockReturnValue(16);
        vi.spyOn(SettingsStore, "getValue").mockReturnValue(delta);
        vm = new FontSizeViewModel();
        return vm;
    }

    beforeEach(() => {
        vi.spyOn(SettingsStore, "setValue").mockResolvedValue(undefined);
    });

    afterEach(() => {
        vm.dispose();
        vi.restoreAllMocks();
    });

    it("has a step for every size the dropdown had", () => {
        expect(FONT_SIZES).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36]);
        expect(createViewModel().getSnapshot()).toMatchObject({ lastPosition: 18 });
    });

    it("starts at the size that is set, the browser's own marked as the default", () => {
        expect(createViewModel().getSnapshot()).toEqual({
            label: "Font size",
            value: "16 (default)",
            position: step(16),
            lastPosition: 18,
            previewScale: 1,
        });
        vm.dispose();

        expect(createViewModel(4).getSnapshot()).toMatchObject({ value: "20", position: step(20) });
    });

    it("shows a size that has no step, such as one an older version set, at the nearest one", () => {
        expect(createViewModel(3).getSnapshot()).toMatchObject({ value: "19", position: step(18) });
    });

    it("shows the size it is dragged to, and the preview in it, without applying it", () => {
        createViewModel();
        vm.preview(step(24));

        expect(vm.getSnapshot()).toMatchObject({ value: "24", position: step(24), previewScale: 1.5 });
        expect(SettingsStore.setValue).not.toHaveBeenCalled();
    });

    it("applies the size it is let go at, and drops the preview's scale once the app's text has it", () => {
        createViewModel();
        vm.preview(step(24));
        void vm.commit(step(24));

        expect(SettingsStore.setValue).toHaveBeenCalledExactlyOnceWith("fontSizeDelta", null, SettingLevel.DEVICE, 8);
        expect(vm.getSnapshot().previewScale).toBe(1.5);

        dis.dispatch({ action: Action.UpdateFontSizeDelta, delta: 8 }, true);
        expect(vm.getSnapshot()).toMatchObject({ value: "24", position: step(24), previewScale: 1 });
    });

    it("applies nothing when it is let go where it was", () => {
        createViewModel();
        vm.preview(step(24));
        vm.preview(step(16));
        void vm.commit(step(16));

        expect(SettingsStore.setValue).not.toHaveBeenCalled();
        expect(vm.getSnapshot()).toMatchObject({ value: "16 (default)", previewScale: 1 });
    });

    it("goes back to the size that is set when applying one fails", async () => {
        createViewModel();
        vi.mocked(SettingsStore.setValue).mockRejectedValue(new Error("no"));
        vm.preview(step(24));
        await vm.commit(step(24));

        expect(vm.getSnapshot()).toMatchObject({ value: "16 (default)", position: step(16), previewScale: 1 });
    });

    it("follows the size when it is set elsewhere, until it is disposed", () => {
        createViewModel();
        dis.dispatch({ action: Action.UpdateFontSizeDelta, delta: 2 }, true);
        expect(vm.getSnapshot()).toMatchObject({ value: "18", position: step(18) });

        vm.dispose();
        dis.dispatch({ action: Action.UpdateFontSizeDelta, delta: 4 }, true);
        expect(vm.getSnapshot()).toMatchObject({ value: "18" });
    });
});
