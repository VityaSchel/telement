/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, IconButton, Link } from "@vector-im/compound-web";
import { ChevronDownIcon, ChevronUpIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import fontSizes from "../../../../res/css/_font-sizes.pcss?raw";
import compoundOverrides from "../../../../res/css/telement/_CompoundOverrides.pcss?raw";
import roomSearchAuxPanelStyles from "../../../../res/css/views/rooms/_RoomSearchAuxPanel.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../../test/telement/browserCss";
import { tokenColor } from "../../../test/telement/computedStyle";

/**
 * The bar RoomSearchAuxPanel puts over the timeline: the search field, a 36px pill, and Cancel, and with a search what
 * it found and its scope switch, and while a result shows in the timeline the place of the result and the arrows that
 * step through them.
 */
function renderPanel({
    searching = true,
    stepping = false,
    dir = "ltr",
    width = 640,
}: { searching?: boolean; stepping?: boolean; dir?: string; width?: number } = {}): HTMLElement {
    const html = (element: ReturnType<typeof createElement>): string => renderToStaticMarkup(element);
    const iconButton = (label: string, icon: typeof ChevronUpIcon): string =>
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
    const details = searching
        ? `<div class="mx_RoomSearchAuxPanel_details">
               <div class="mx_RoomSearchAuxPanel_summary_text">
                   <span>5 results found for “<strong>lunch</strong>”</span>
               </div>
               ${html(createElement(Link, { kind: "primary", className: "mx_RoomSearchAuxPanel_scopeButton" }, "Search all rooms"))}
           </div>`
        : "";
    document.body.innerHTML = `
        <div class="cpd-theme-light" dir="${dir}" style="width: ${width}px">
            <div class="mx_RoomSearchAuxPanel">
                <div class="mx_RoomSearchAuxPanel_bar">
                    <div class="mx_RoomSearchAuxPanel_field" style="height: 36px"></div>
                    ${steps}
                    ${html(createElement(Button, { className: "mx_RoomSearchAuxPanel_cancel", kind: "tertiary", size: "md" }, "Cancel"))}
                </div>
                ${details}
            </div>
        </div>
    `;
    return document.querySelector<HTMLElement>(".mx_RoomSearchAuxPanel")!;
}

const boxOf = (panel: HTMLElement, selector: string): DOMRect => panel.querySelector(selector)!.getBoundingClientRect();

/** The box of an element's text, rather than of the element. */
function textBox(element: Element): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect();
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
                ${toBrowserCss(compoundOverrides, lightTheme)}
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

    it("is the 36px field with 12px around it, and a line like the headers' under it, while the field is empty", () => {
        const panel = renderPanel({ searching: false });
        const box = panel.getBoundingClientRect();
        const field = boxOf(panel, ".mx_RoomSearchAuxPanel_field");
        const style = getComputedStyle(panel);

        expect(box.height).toBe(12 + 36 + 12 + 1);
        expect([field.left - box.left, field.top - box.top]).toEqual([12, 12]);
        expect([style.borderBottomWidth, style.borderTopWidth]).toEqual(["1px", "0px"]);
    });

    it.each(["ltr", "rtl"])(
        "cancels with text in the accent, which ends on the bar's 12px edge, in a 36px button centered on the field (%s)",
        (dir) => {
            const panel = renderPanel({ dir });
            const box = panel.getBoundingClientRect();
            const field = boxOf(panel, ".mx_RoomSearchAuxPanel_field");
            const button = panel.querySelector<HTMLElement>(".mx_RoomSearchAuxPanel_cancel")!;
            const cancel = button.getBoundingClientRect();
            const label = textBox(button);

            expect(cancel.height).toBe(36);
            expect(cancel.top).toBe(field.top);
            expect(getComputedStyle(button).color).toBe(tokenColor("--cpd-color-text-action-accent", panel));
            expect(getComputedStyle(button).backgroundColor).toBe("rgba(0, 0, 0, 0)");
            const ends =
                dir === "ltr"
                    ? [box.right - label.right, label.left - field.right]
                    : [label.left - box.left, field.left - label.right];
            expect(ends[0]).toBeCloseTo(12, 0);
            expect(ends[1]).toBeCloseTo(12, 0);
        },
    );

    it("says what it found under the field, 13px secondary text from edge to edge", () => {
        const panel = renderPanel();
        const box = panel.getBoundingClientRect();
        const field = boxOf(panel, ".mx_RoomSearchAuxPanel_field");
        const details = panel.querySelector<HTMLElement>(".mx_RoomSearchAuxPanel_details")!;
        const scope = textBox(panel.querySelector(".mx_RoomSearchAuxPanel_scopeButton")!);

        expect(details.getBoundingClientRect().top - field.bottom).toBe(8);
        expect(textBox(panel.querySelector(".mx_RoomSearchAuxPanel_summary_text")!).left - box.left).toBeCloseTo(12, 0);
        expect(box.right - scope.right).toBeCloseTo(12, 0);
        expect(getComputedStyle(details).fontSize).toBe("13px");
        expect(getComputedStyle(details).color).toBe(tokenColor("--cpd-color-text-secondary", panel));
    });

    it("steps through the results with gray 36px arrows after the result's place, 12px apart as the header's buttons", () => {
        const panel = renderPanel({ stepping: true });
        const position = panel.querySelector<HTMLElement>(".mx_RoomSearchAuxPanel_position")!;
        const place = position.getBoundingClientRect();
        const field = boxOf(panel, ".mx_RoomSearchAuxPanel_field");
        const [older, newer] = ["Older result", "Newer result"].map((label) => boxOf(panel, `[aria-label="${label}"]`));

        expect([older.width, older.height, newer.width, newer.height]).toEqual([36, 36, 36, 36]);
        expect(place.left - field.right).toBe(12);
        expect(older.left - place.right).toBe(12);
        expect(newer.left - older.right).toBe(12);
        expect(getComputedStyle(position).color).toBe(tokenColor("--cpd-color-text-secondary", panel));
        expect(getComputedStyle(position).fontVariantNumeric).toBe("tabular-nums");
        expect(Math.abs(place.top + place.height / 2 - (older.top + 18))).toBeLessThanOrEqual(1);
    });

    it("gives way in the field, rather than letting its buttons out of a narrow timeline", () => {
        const panel = renderPanel({ stepping: true, width: 320 });
        const box = panel.getBoundingClientRect();

        expect(boxOf(panel, ".mx_RoomSearchAuxPanel_field").width).toBeGreaterThan(40);
        expect(boxOf(panel, ".mx_RoomSearchAuxPanel_cancel").right).toBeLessThanOrEqual(box.right);
        expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth);
    });
});
