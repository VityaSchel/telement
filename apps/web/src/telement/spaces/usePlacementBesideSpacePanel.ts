/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type CSSProperties, type RefObject, useLayoutEffect, useState } from "react";

import UIStore, { UI_EVENTS } from "../../stores/UIStore";

/**
 * Where a popover opened by a button of the space panel goes, as custom properties for its stylesheet, which keeps it in
 * the window whatever its height:
 * - `--space-panel-end`: the panel's end, which it opens beside;
 * - `--space-panel-top`: the panel's top, under the macOS app's title bar, which it stays clear of;
 * - `--space-panel-button-top`: the button's top, which it opens level with.
 * @param button - The button, in the space panel. Measured once the panel has collapsed, where opening it does that.
 */
export function usePlacementBesideSpacePanel(button: RefObject<HTMLElement | null>): CSSProperties {
    const [placement, setPlacement] = useState<CSSProperties>({});

    useLayoutEffect(() => {
        const place = (): void => {
            const panel = button.current?.closest(".mx_SpacePanel")?.getBoundingClientRect();
            if (!button.current || !panel) return;
            setPlacement({
                "--space-panel-end": `${panel.right}px`,
                "--space-panel-top": `${panel.top}px`,
                "--space-panel-button-top": `${button.current.getBoundingClientRect().top}px`,
            } as CSSProperties);
        };
        place();
        UIStore.instance.on(UI_EVENTS.Resize, place);
        return () => {
            UIStore.instance.off(UI_EVENTS.Resize, place);
        };
    }, [button]);

    return placement;
}
