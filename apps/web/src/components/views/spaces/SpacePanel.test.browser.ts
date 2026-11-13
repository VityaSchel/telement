/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IconButton } from "@vector-im/compound-web";
import { SettingsSolidIcon, ThreadsSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import sharedComponentsStyles from "@element-hq/web-shared-components/dist/element-web-shared-components.css?raw";

import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import quickSettingsButtonStyles from "../../../../res/css/structures/_QuickSettingsButton.pcss?raw";
import spacePanelStyles from "../../../../res/css/structures/_SpacePanel.pcss?raw";
import threadsActivityCentreStyles from "../../../../res/css/structures/_ThreadsActivityCentre.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../../test/telement/browserCss";

/**
 * The space panel with a space button above its Threads and Settings buttons, as SpaceButton,
 * ThreadsActivityCentreButton and QuickSettingsButton render them.
 */
function renderButtons(expanded: boolean): void {
    const renderButton = (
        label: string,
        className: string,
        icon: typeof SettingsSolidIcon,
        labelClassName: string,
    ): string =>
        renderToStaticMarkup(
            createElement(
                IconButton,
                {
                    "aria-label": label,
                    "className": expanded ? `${className} expanded` : className,
                    "indicator": "default",
                },
                createElement(
                    Fragment,
                    null,
                    createElement(icon, { className: `${className}_Icon` }),
                    expanded && createElement("span", { className: labelClassName }, label),
                ),
            ),
        );
    const narrow = expanded ? "" : "mx_SpaceButton_narrow";
    document.body.innerHTML = `
        <nav class="mx_SpacePanel cpd-theme-light ${expanded ? "" : "collapsed"}"
            style="height: 400px; ${expanded ? "width: 240px" : ""}">
            <ul class="mx_SpaceTreeLevel" style="flex: 1">
                <li class="mx_SpaceItem ${expanded ? "" : "collapsed"}">
                    <div class="mx_AccessibleButton mx_SpaceButton mx_SpaceButton_active ${narrow}" aria-label="Home">
                        <div class="mx_SpaceButton_selectionWrapper">
                            <div class="mx_SpaceButton_avatarWrapper">
                                <div class="mx_SpaceButton_avatarPlaceholder"><div class="mx_SpaceButton_icon"></div></div>
                            </div>
                            ${expanded ? '<span class="mx_SpaceButton_name">Home</span>' : ""}
                        </div>
                    </div>
                </li>
            </ul>
            <div class="mx_ThreadsActivityCentre_container">
                ${renderButton("Threads", "mx_ThreadsActivityCentreButton", ThreadsSolidIcon, "mx_ThreadsActivityCentreButton_Text")}
            </div>
            ${renderButton("Settings", "mx_QuickSettingsButton", SettingsSolidIcon, "mx_QuickSettingsButton_label")}
        </nav>
    `;
}

function button(label: string): HTMLElement {
    return document.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
}

let stylesheet: HTMLStyleElement;

describe("SpacePanel button styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundTokens} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} }
            @layer compound-web { ${compoundStyles} }
            ${sharedComponentsStyles}
            @layer app-web {
                ${toBrowserCss(spacePanelStyles, lightTheme)}
                ${toBrowserCss(quickSettingsButtonStyles, lightTheme)}
                ${toBrowserCss(threadsActivityCentreStyles, lightTheme)}
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

    it("draws the Threads and Settings buttons as circles when the panel is collapsed", () => {
        renderButtons(false);

        expect(cornerRadii(button("Threads"))).toEqual({ x: 20, y: 20 });
        expect(cornerRadii(button("Settings"))).toEqual({ x: 20, y: 20 });
    });

    it("sizes the collapsed Threads and Settings buttons like the space buttons, with 8px around their icons", () => {
        renderButtons(false);
        const ring = document.querySelector(".mx_SpaceButton_selectionWrapper")!.getBoundingClientRect();

        for (const label of ["Threads", "Settings"]) {
            const box = button(label).getBoundingClientRect();
            const icon = button(label).querySelector("svg")!.getBoundingClientRect();
            expect([box.width, box.height]).toEqual([ring.width, ring.height]);
            expect(box.left + box.width / 2).toBe(ring.left + ring.width / 2);
            expect([icon.width, icon.height]).toEqual([24, 24]);
            expect([
                icon.left - box.left,
                icon.top - box.top,
                box.right - icon.right,
                box.bottom - icon.bottom,
            ]).toEqual([8, 8, 8, 8]);
        }
    });

    it("spaces the collapsed Threads and Settings buttons 8px apart, as the space buttons are", () => {
        renderButtons(false);

        const spaceButton = document.querySelector(".mx_SpaceButton")!;
        const spaceGap = 2 * parseFloat(getComputedStyle(spaceButton).paddingTop);
        const threads = button("Threads").getBoundingClientRect();
        const settings = button("Settings").getBoundingClientRect();
        expect(settings.top - threads.bottom).toBe(spaceGap);
        expect(spaceGap).toBe(8);
    });

    it("keeps the Threads unread dot on the corner of the icon when the button is collapsed", () => {
        renderButtons(false);

        // Compound draws the dot on the box around the icon, so it moves with that box rather than the button
        const threads = button("Threads");
        const iconBox = threads.querySelector("svg")!.parentElement!;
        expect(iconBox.getBoundingClientRect()).toEqual(threads.querySelector("svg")!.getBoundingClientRect());
        const dot = getComputedStyle(iconBox, "::before");
        for (const [value, expected] of [
            [dot.width, 8],
            [dot.height, 8],
            [dot.top, -2],
            [dot.right, -2],
        ] as const) {
            expect(parseFloat(value)).toBeCloseTo(expected, 1);
        }
    });

    it("lays the expanded Threads and Settings rows out like the space buttons' highlight, 8px apart", () => {
        renderButtons(true);
        const highlight = document.querySelector(".mx_SpaceButton_selectionWrapper")!.getBoundingClientRect();
        const spaceButton = document.querySelector(".mx_SpaceButton")!;
        const spaceGap = 2 * parseFloat(getComputedStyle(spaceButton).paddingTop);

        for (const label of ["Threads", "Settings"]) {
            const box = button(label).getBoundingClientRect();
            expect([box.left, box.right, box.height]).toEqual([highlight.left, highlight.right, highlight.height]);
        }
        expect(highlight.height).toBe(40);
        const threads = button("Threads").getBoundingClientRect();
        const settings = button("Settings").getBoundingClientRect();
        expect(settings.top - threads.bottom).toBe(spaceGap);
        expect(spaceGap).toBe(8);
    });

    it("centers the expanded rows' icons on the space avatars, 8px inside the row, with the labels on the names' edge", () => {
        renderButtons(true);
        const avatar = document.querySelector(".mx_SpaceButton_icon")!.getBoundingClientRect();
        const name = document.querySelector(".mx_SpaceButton_name")!.getBoundingClientRect();

        for (const [label, labelClass] of [
            ["Threads", "mx_ThreadsActivityCentreButton_Text"],
            ["Settings", "mx_QuickSettingsButton_label"],
        ]) {
            const box = button(label).getBoundingClientRect();
            const icon = button(label).querySelector("svg")!.getBoundingClientRect();
            expect([icon.width, icon.height]).toEqual([24, 24]);
            expect(icon.left + icon.width / 2).toBe(avatar.left + avatar.width / 2);
            expect([icon.left - box.left, icon.top - box.top, box.bottom - icon.bottom]).toEqual([8, 8, 8]);
            expect(button(label).querySelector(`.${labelClass}`)!.getBoundingClientRect().left).toBe(name.left);
        }
    });

    it("keeps the expanded rows' focus ring inside them, so within the panel", async () => {
        renderButtons(true);
        const panel = document.querySelector(".mx_SpacePanel")!.getBoundingClientRect();

        for (const label of ["Threads", "Settings"]) {
            await userEvent.keyboard("{Shift}");
            button(label).focus();
            expect(button(label).matches(":focus-visible")).toBe(true);
            const style = getComputedStyle(button(label));
            expect(`${style.outlineStyle} ${style.outlineWidth} ${style.outlineOffset}`).toBe("solid 2px -2px");
            expect(button(label).getBoundingClientRect().right).toBeLessThanOrEqual(panel.right);
        }
    });

    it("rounds the Threads and Settings buttons as rows when the panel is expanded", () => {
        renderButtons(true);

        expect(cornerRadii(button("Threads"))).toEqual({ x: 8, y: 8 });
        expect(cornerRadii(button("Settings"))).toEqual({ x: 8, y: 8 });
    });

    it("paints the hovered Threads button's background on the round button only, not the square icon", async () => {
        renderButtons(false);
        const threads = button("Threads");
        const icon = threads.querySelector(".mx_ThreadsActivityCentreButton_Icon")!;
        const restingFill = getComputedStyle(icon).fill;

        await userEvent.hover(threads);

        expect(getComputedStyle(threads).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
        expect(getComputedStyle(icon).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(getComputedStyle(icon).fill).not.toBe(restingFill);
    });
});
