/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cdp } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IconButton } from "@vector-im/compound-web";
import { SettingsSolidIcon, ShareIcon, ThreadsSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import contextualMenuStyles from "../../res/css/structures/_ContextualMenu.pcss?raw";
import quickSettingsButtonStyles from "../../res/css/structures/_QuickSettingsButton.pcss?raw";
import spacePanelStyles from "../../res/css/structures/_SpacePanel.pcss?raw";
import tabbedViewStyles from "../../res/css/structures/_TabbedView.pcss?raw";
import threadsActivityCentreStyles from "../../res/css/structures/_ThreadsActivityCentre.pcss?raw";
import compoundOverrides from "../../res/css/telement/_CompoundOverrides.pcss?raw";
import seenByMenuStyles from "../../res/css/telement/_SeenByMenu.pcss?raw";
import iconizedContextMenuStyles from "../../res/css/views/context_menus/_IconizedContextMenu.pcss?raw";
import jumpToBottomStyles from "../../res/css/views/rooms/_JumpToBottomButton.pcss?raw";
import memberTileViewStyles from "../../res/css/views/rooms/_MemberTileView.pcss?raw";
import messageComposerStyles from "../../res/css/views/rooms/_MessageComposer.pcss?raw";
import pinnedBannerStyles from "../../res/css/views/rooms/_PinnedMessageBanner.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { composite, contrastOver, hoveredFill, pressedFill, tokenColor } from "../test/telement/computedStyle";

/** In the order _components.pcss imports them, after _common.pcss. */
const APP_STYLES = [
    commonStyles,
    contextualMenuStyles,
    quickSettingsButtonStyles,
    spacePanelStyles,
    tabbedViewStyles,
    threadsActivityCentreStyles,
    compoundOverrides,
    seenByMenuStyles,
    iconizedContextMenuStyles,
    jumpToBottomStyles,
    memberTileViewStyles,
    messageComposerStyles,
    pinnedBannerStyles,
];

function get(selector: string): HTMLElement {
    return document.querySelector<HTMLElement>(selector)!;
}

function themed(theme: string, html: string): void {
    document.body.innerHTML = `<div class="${theme}" id="page" style="padding: 48px; background: var(--cpd-color-bg-canvas-default)">${html}</div>`;
}

function color(token: string, scope: Element = get("#page")): string {
    return tokenColor(token, scope);
}

/** The message menu, as IconizedContextMenu renders it inside ContextMenu, with a destructive item last. */
function messageMenu(): string {
    return `
        <div class="mx_ContextualMenu" role="menu" id="menu" style="position: static">
            <ul class="mx_IconizedContextMenu mx_IconizedContextMenu_compact">
                <div class="mx_IconizedContextMenu_optionList">
                    <li class="mx_AccessibleButton mx_IconizedContextMenu_item" role="menuitem" tabindex="-1" id="forward">
                        <span class="mx_IconizedContextMenu_label">Forward</span>
                    </li>
                    <li class="mx_AccessibleButton mx_IconizedContextMenu_item mx_SeenByMenuItem" role="menuitem"
                        tabindex="-1" id="seenBy" aria-haspopup="menu" aria-expanded="true">
                        <span class="mx_IconizedContextMenu_label">Seen by 1 person</span>
                    </li>
                </div>
                <div class="mx_IconizedContextMenu_optionList mx_IconizedContextMenu_optionList_red">
                    <li class="mx_AccessibleButton mx_IconizedContextMenu_item" role="menuitem" tabindex="-1" id="remove">
                        <span class="mx_IconizedContextMenu_label">Remove</span>
                    </li>
                </div>
            </ul>
        </div>
    `;
}

let stylesheet: HTMLStyleElement;

describe("Hover and pressed fills", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic}
                ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
            }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} }
            @layer app-web {
                body { margin: 0; font: var(--cpd-font-body-md-regular); }
                ${APP_STYLES.map((styles) => toBrowserCss(styles, commonStyles, fontSizes, lightTheme)).join("\n")}
            }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(async () => {
        document.body.innerHTML = "";
        // Out of the test's frame, so that nothing the next test draws starts hovered
        await cdp().send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
    });

    it.each(["cpd-theme-light", "cpd-theme-dark"])(
        "fills a hovered right panel row as strongly as a hovered room, a step further when pressed, in %s",
        async (theme) => {
            themed(theme, `<div class="mx_MemberTileView" role="button" tabindex="0" id="row">Alice</div>`);
            const page = getComputedStyle(get("#page")).backgroundColor;
            const roomListHover = contrastOver(color("--cpd-color-bg-action-tertiary-hovered"), page);

            const hovered = contrastOver(await hoveredFill(get("#row")), page);
            const pressed = contrastOver(await pressedFill(get("#row")), page);

            expect(hovered).toBeGreaterThanOrEqual(1.1);
            expect(Math.abs(hovered - roomListHover)).toBeLessThan(0.02);
            expect(pressed).toBeGreaterThanOrEqual(1.2);
        },
    );

    it("fills a hovered item of a light menu as strongly as a hovered room, a step further when pressed", async () => {
        themed("cpd-theme-light", messageMenu());
        const menu = getComputedStyle(get("#menu")).backgroundColor;

        const hovered = contrastOver(await hoveredFill(get("#forward")), menu);
        const pressed = contrastOver(await pressedFill(get("#forward")), menu);

        expect(hovered).toBeGreaterThanOrEqual(1.1);
        expect(pressed).toBeGreaterThanOrEqual(1.2);
    });

    it.each(["cpd-theme-light", "cpd-theme-dark"])(
        "fills a hovered destructive menu item in a red as strong as the gray hover, deeper when pressed, in %s",
        async (theme) => {
            themed(theme, messageMenu());
            const menu = getComputedStyle(get("#menu")).backgroundColor;

            const hoveredColor = await hoveredFill(get("#remove"));
            const hovered = contrastOver(hoveredColor, menu);
            const pressed = contrastOver(await pressedFill(get("#remove")), menu);
            const [red, green, blue] = composite(hoveredColor, menu);

            expect(hovered).toBeGreaterThanOrEqual(1.09);
            expect(hovered).toBeLessThanOrEqual(1.16);
            expect(pressed).toBeGreaterThanOrEqual(1.2);
            // A red, rather than the menu's gray or a maroon as dark as it
            expect(red - Math.max(green, blue)).toBeGreaterThan(theme === "cpd-theme-light" ? 10 : 15);
        },
    );

    it("keeps the Seen by item highlighted while its submenu is open", () => {
        themed("cpd-theme-light", messageMenu());

        expect(getComputedStyle(get("#seenBy")).backgroundColor).toBe(
            color("--cpd-color-bg-action-secondary-hovered", get("#menu")),
        );
    });

    it("presses Compound's icon buttons a step deeper than their hover", async () => {
        themed(
            "cpd-theme-light",
            renderToStaticMarkup(
                createElement(IconButton, { "aria-label": "New", "id": "new" }, createElement(ShareIcon)),
            ),
        );

        expect(await hoveredFill(get("#new"))).toBe(color("--cpd-color-gray-400"));
        expect(await pressedFill(get("#new"))).toBe(color("--cpd-color-gray-500"));
    });

    it("presses the composer's buttons a step deeper than their hover", async () => {
        themed(
            "cpd-theme-light",
            `<div class="mx_AccessibleButton mx_MessageComposer_button mx_MessageComposer_sendMessage" role="button"
                tabindex="0" id="send" style="display: block"></div>`,
        );

        expect(await hoveredFill(get("#send"))).toBe(color("--cpd-color-bg-subtle-primary"));
        expect(await pressedFill(get("#send"))).toBe(color("--cpd-color-gray-500"));
    });

    describe("in the space bar", () => {
        function renderSpaceBar(expanded: boolean): void {
            const button = (label: string, className: string, icon: typeof SettingsSolidIcon): string =>
                renderToStaticMarkup(
                    createElement(
                        IconButton,
                        { "aria-label": label, "className": expanded ? `${className} expanded` : className },
                        createElement(icon),
                    ),
                );
            const space = (label: string, active: boolean): string => `
                <li class="mx_SpaceItem collapsed">
                    <div class="mx_AccessibleButton mx_SpaceButton ${active ? "mx_SpaceButton_active" : ""}
                        mx_SpaceButton_narrow" role="button" tabindex="0" aria-label="${label}">
                        <div class="mx_SpaceButton_selectionWrapper">
                            <div class="mx_SpaceButton_avatarWrapper">
                                <div class="mx_SpaceButton_avatarPlaceholder"><div class="mx_SpaceButton_icon"></div></div>
                            </div>
                        </div>
                    </div>
                </li>`;
            document.body.innerHTML = `
                <nav class="mx_SpacePanel cpd-theme-light ${expanded ? "" : "collapsed"}" id="page"
                    style="height: 400px; ${expanded ? "width: 240px" : ""}">
                    <ul class="mx_SpaceTreeLevel">${space("Home", true)}${space("Studio", false)}</ul>
                    <div class="mx_ThreadsActivityCentre_container">
                        ${button("Threads", "mx_ThreadsActivityCentreButton", ThreadsSolidIcon)}
                    </div>
                    ${button("Settings", "mx_QuickSettingsButton", SettingsSolidIcon)}
                </nav>
            `;
        }

        const plate = (label: string): HTMLElement => get(`[aria-label="${label}"] .mx_SpaceButton_selectionWrapper`);

        it("presses a space a step deeper than its hover, and the selected space a step deeper than its plate", async () => {
            renderSpaceBar(false);
            const studio = get('[aria-label="Studio"]');
            const home = get('[aria-label="Home"]');

            expect(await hoveredFill(studio, plate("Studio"))).toBe(color("--cpd-color-bg-action-tertiary-hovered"));
            expect(await pressedFill(studio, plate("Studio"))).toBe(color("--cpd-color-bg-action-secondary-pressed"));
            expect(await hoveredFill(home, plate("Home"))).toBe(color("--tl-color-bg-selection-hovered"));
            expect(await pressedFill(home, plate("Home"))).toBe(color("--tl-color-bg-selection-pressed"));
        });

        it.each([false, true])(
            "hovers Threads and Settings in the spaces' gray and presses them a step deeper, expanded: %s",
            async (expanded) => {
                renderSpaceBar(expanded);

                for (const label of ["Threads", "Settings"]) {
                    const control = get(`[aria-label="${label}"]`);
                    expect(await hoveredFill(control)).toBe(color("--cpd-color-bg-action-tertiary-hovered"));
                    expect(await pressedFill(control)).toBe(color("--cpd-color-bg-action-secondary-pressed"));
                }
            },
        );
    });

    it("presses a settings tab a step deeper than its hover, and the selected tab a step deeper than its plate", async () => {
        themed(
            "cpd-theme-light",
            `<div class="mx_TabbedView mx_TabbedView_tabsOnLeft" style="position: relative">
                <ul class="mx_TabbedView_tabLabels" role="tablist">
                    <li class="mx_AccessibleButton mx_TabbedView_tabLabel mx_TabbedView_tabLabel_active" role="tab"
                        tabindex="0" id="selected"><span class="mx_TabbedView_tabLabel_text">Account</span></li>
                    <li class="mx_AccessibleButton mx_TabbedView_tabLabel" role="tab" tabindex="-1" id="other">
                        <span class="mx_TabbedView_tabLabel_text">Sessions</span></li>
                </ul>
            </div>`,
        );

        expect(await hoveredFill(get("#other"))).toBe(color("--cpd-color-bg-action-tertiary-hovered"));
        expect(await pressedFill(get("#other"))).toBe(color("--cpd-color-bg-action-secondary-pressed"));
        expect(await hoveredFill(get("#selected"))).toBe(color("--tl-color-bg-selection-hovered"));
        expect(await pressedFill(get("#selected"))).toBe(color("--tl-color-bg-selection-pressed"));
    });

    it("fills the jump to bottom button inside its border when hovered, a step further when pressed", async () => {
        themed(
            "cpd-theme-light",
            `<div class="mx_JumpToBottomButton" style="position: static">
                <div class="mx_AccessibleButton mx_JumpToBottomButton_scrollDown" role="button" tabindex="0"
                    id="jump"></div>
            </div>`,
        );

        expect(await hoveredFill(get("#jump"))).toBe(color("--cpd-color-bg-subtle-secondary"));
        expect(await pressedFill(get("#jump"))).toBe(color("--cpd-color-bg-subtle-primary"));
    });

    it("fills the pinned message banner in the rows' hover gray while its message is hovered", async () => {
        themed(
            "cpd-theme-light",
            `<div class="mx_PinnedMessageBanner" id="banner">
                <button class="mx_PinnedMessageBanner_main" type="button" id="main">A pinned message</button>
                <button type="button" id="viewAll">View all</button>
            </div>`,
        );

        expect(getComputedStyle(get("#banner")).backgroundColor).toBe(color("--cpd-color-bg-canvas-default"));
        expect(await hoveredFill(get("#main"), get("#banner"))).toBe(color("--cpd-color-bg-action-tertiary-hovered"));
        expect(await pressedFill(get("#main"), get("#banner"))).toBe(color("--cpd-color-bg-action-tertiary-selected"));
        expect(await hoveredFill(get("#viewAll"), get("#banner"))).toBe(color("--cpd-color-bg-canvas-default"));
    });
});
