/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IconButton, Link } from "@vector-im/compound-web";
import {
    ChevronDownIcon,
    ChevronUpIcon,
    CloseIcon,
    SearchIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import fontSizes from "../../../../res/css/_font-sizes.pcss?raw";
import roomSearchAuxPanelStyles from "../../../../res/css/views/rooms/_RoomSearchAuxPanel.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../../test/telement/browserCss";
import { tokenColor } from "../../../test/telement/computedStyle";

/**
 * The bar RoomSearchAuxPanel puts above the search results, with its scope switch and close button, and while a result
 * shows in the timeline the place of the result and the arrows that step through them.
 */
function renderPanel({ stepping = false }: { stepping?: boolean } = {}): HTMLElement {
    const html = (element: ReturnType<typeof createElement>): string => renderToStaticMarkup(element);
    const iconButton = (label: string, icon: typeof CloseIcon): string =>
        html(
            createElement(
                IconButton,
                {
                    "size": "var(--tl-control-size)",
                    "style": { padding: "var(--cpd-space-1-5x)" },
                    "aria-label": label,
                },
                createElement(icon),
            ),
        );
    const steps = stepping
        ? `<div class="mx_RoomSearchAuxPanel_steps">
               <span class="mx_RoomSearchAuxPanel_position">2 of 15</span>
               ${iconButton("Older result", ChevronUpIcon)}${iconButton("Newer result", ChevronDownIcon)}
           </div>`
        : "";
    document.body.innerHTML = `
        <div class="cpd-theme-light" style="width: 640px">
            <div class="mx_RoomSearchAuxPanel">
                <div class="mx_RoomSearchAuxPanel_summary">
                    ${html(createElement(SearchIcon, { width: "24px", height: "24px" }))}
                    <div class="mx_RoomSearchAuxPanel_summary_text">5 results found for “lunch”</div>
                </div>
                <div class="mx_RoomSearchAuxPanel_buttons">
                    ${html(createElement(Link, { kind: "primary", className: "mx_RoomSearchAuxPanel_scopeButton" }, "Search all rooms"))}
                    ${steps}
                    ${html(
                        createElement(
                            IconButton,
                            {
                                "size": "var(--tl-control-size)",
                                "style": { padding: "var(--cpd-space-1-5x)" },
                                "aria-label": "Cancel",
                            },
                            createElement(CloseIcon),
                        ),
                    )}
                </div>
            </div>
        </div>
    `;
    return document.querySelector<HTMLElement>(".mx_RoomSearchAuxPanel")!;
}

let stylesheet: HTMLStyleElement;

describe("RoomSearchAuxPanel styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} }
            @layer app-web {
                body { margin: 0; }
                ${toBrowserCss(roomSearchAuxPanelStyles, lightTheme, fontSizes)}
            }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("shows the scope switch as a text button in the accent, without a link's underline", () => {
        const panel = renderPanel();
        const style = getComputedStyle(panel.querySelector(".mx_RoomSearchAuxPanel_scopeButton")!);

        expect(style.color).toBe(tokenColor("--cpd-color-text-action-accent", panel));
        expect(style.textDecorationLine).toBe("none");
    });

    it("closes with a gray 36px icon button around a 24px icon, its box on the panel's 12px edge", () => {
        const panel = renderPanel();
        const close = panel.querySelector<HTMLElement>('[aria-label="Cancel"]')!;
        const box = close.getBoundingClientRect();
        const icon = close.querySelector("svg")!;

        expect([box.width, box.height]).toEqual([36, 36]);
        expect(icon.getBoundingClientRect().width).toBe(24);
        expect(getComputedStyle(close).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(getComputedStyle(icon).color).toBe(tokenColor("--cpd-color-icon-secondary", panel));
        expect(panel.getBoundingClientRect().right - box.right).toBe(12);
    });

    it("steps through the results with gray 36px arrows after the result's place, spaced as the bar's other buttons", () => {
        const panel = renderPanel({ stepping: true });
        const position = panel.querySelector<HTMLElement>(".mx_RoomSearchAuxPanel_position")!;
        const [older, newer, close] = ["Older result", "Newer result", "Cancel"].map((label) =>
            panel.querySelector<HTMLElement>(`[aria-label="${label}"]`)!.getBoundingClientRect(),
        );

        expect([older.width, older.height, newer.width, newer.height]).toEqual([36, 36, 36, 36]);
        expect(older.left - position.getBoundingClientRect().right).toBe(24);
        expect(newer.left - older.right).toBe(24);
        expect(close.left - newer.right).toBe(24);
        expect(getComputedStyle(position).color).toBe(tokenColor("--cpd-color-text-secondary", panel));
        expect(getComputedStyle(position).fontVariantNumeric).toBe("tabular-nums");
        expect(
            Math.abs(
                position.getBoundingClientRect().top + position.getBoundingClientRect().height / 2 - (older.top + 18),
            ),
        ).toBeLessThanOrEqual(1);
    });
});
