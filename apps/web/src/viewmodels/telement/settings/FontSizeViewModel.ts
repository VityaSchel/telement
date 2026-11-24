/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import {
    BaseViewModel,
    type SliderRowViewModel as SliderRowViewModelInterface,
    type SliderRowViewSnapshot,
} from "@element-hq/web-shared-components";

import { Action } from "../../../dispatcher/actions";
import dis from "../../../dispatcher/dispatcher";
import { type ActionPayload } from "../../../dispatcher/payloads";
import { _t } from "../../../languageHandler";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";
import { FontWatcher } from "../../../settings/watchers/FontWatcher";

/** The font sizes that can be chosen, in px, one per step of the slider. */
export const FONT_SIZES = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36];

export interface FontSizeViewModelSnapshot extends SliderRowViewSnapshot {
    /** How much larger a preview's text is than the app's, while a size is shown that isn't applied. */
    previewScale: number;
}

/** The step of the size nearest to one that may not be offered, such as one set by an older version. */
function nearestPosition(size: number): number {
    const distances = FONT_SIZES.map((candidate) => Math.abs(candidate - size));
    return distances.indexOf(Math.min(...distances));
}

function snapshotOf(size: number, appliedSize: number, browserSize: number): FontSizeViewModelSnapshot {
    return {
        label: _t("settings|appearance|font_size"),
        value: size === browserSize ? _t("settings|appearance|font_size_default", { fontSize: size }) : String(size),
        position: nearestPosition(size),
        lastPosition: FONT_SIZES.length - 1,
        previewScale: size / appliedSize,
    };
}

/**
 * View model of the font size slider. A size is only applied once the slider is let go, as applying it moves everything in
 * the window, the slider too; until then its name and the preview's scale show it.
 */
export class FontSizeViewModel
    extends BaseViewModel<FontSizeViewModelSnapshot, object>
    implements SliderRowViewModelInterface
{
    /** The browser's own font size, which the setting is a difference from. */
    private readonly browserSize: number;
    private appliedSize: number;

    public constructor() {
        const browserSize = FontWatcher.getBrowserDefaultFontSize();
        const appliedSize = browserSize + SettingsStore.getValue("fontSizeDelta");
        super({}, snapshotOf(appliedSize, appliedSize, browserSize));
        this.browserSize = browserSize;
        this.appliedSize = appliedSize;

        // FontWatcher, which has listened since the app started, has changed the size by the time this hears of it
        const dispatcherRef = dis.register(this.onAction);
        this.disposables.track(() => dis.unregister(dispatcherRef));
    }

    private onAction = (payload: ActionPayload): void => {
        if (payload.action !== Action.UpdateFontSizeDelta) return;
        this.appliedSize = this.browserSize + payload.delta;
        this.show(this.appliedSize);
    };

    private show(size: number): void {
        this.snapshot.merge(snapshotOf(size, this.appliedSize, this.browserSize));
    }

    public preview = (position: number): void => {
        this.show(FONT_SIZES[position]);
    };

    public commit = async (position: number): Promise<void> => {
        const size = FONT_SIZES[position];
        this.show(size);
        if (size === this.appliedSize) return;

        try {
            await SettingsStore.setValue("fontSizeDelta", null, SettingLevel.DEVICE, size - this.browserSize);
        } catch {
            if (!this.isDisposed) this.show(this.appliedSize);
        }
    };
}
