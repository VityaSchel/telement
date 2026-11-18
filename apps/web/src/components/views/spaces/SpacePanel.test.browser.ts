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
import {
    FavouriteSolidIcon,
    HomeSolidIcon,
    OverflowHorizontalIcon,
    PlusIcon,
    SettingsSolidIcon,
    ThreadsSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import sharedComponentsStyles from "@element-hq/web-shared-components/dist/element-web-shared-components.css?raw";
// The package doesn't export its token stylesheet on its own, and its build can be older than the badge's source
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
// eslint-disable-next-line no-restricted-imports
import notificationBadgeStyles from "../../../../../../packages/shared-components/src/notifications/NotificationBadgeView/NotificationBadgeView.module.css?raw";

import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../../../res/themes/dark/css/_dark.pcss?raw";
import quickSettingsButtonStyles from "../../../../res/css/structures/_QuickSettingsButton.pcss?raw";
import spacePanelStyles from "../../../../res/css/structures/_SpacePanel.pcss?raw";
import threadsActivityCentreStyles from "../../../../res/css/structures/_ThreadsActivityCentre.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../../test/telement/browserCss";
import { settledStyle, tokenColor } from "../../../test/telement/computedStyle";
import { loadInter } from "../../../test/telement/fonts";

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

/**
 * The collapsed space panel with Home showing a notification badge, as SpaceButton and NotificationBadgeView render
 * them (with the badge's unhashed class names), and the "+" button below it.
 */
function renderBadge(badgeType: "dot" | "badge_2char" | "badge_3char", count: string, selected = false): void {
    const badgeClass = { dot: "dot", badge_2char: "badge2Char", badge_3char: "badge3Char" }[badgeType];
    document.body.innerHTML = `
        <nav class="mx_SpacePanel cpd-theme-light collapsed" style="height: 400px">
            <ul class="mx_SpaceTreeLevel">
                <li class="mx_SpaceItem collapsed">
                    <div class="mx_AccessibleButton mx_SpaceButton ${selected ? "mx_SpaceButton_active" : ""} mx_SpaceButton_narrow" aria-label="Home">
                        <div class="mx_SpaceButton_selectionWrapper">
                            <div class="mx_SpaceButton_avatarWrapper">
                                <div class="mx_SpaceButton_avatarPlaceholder"><div class="mx_SpaceButton_icon"></div></div>
                                <div class="mx_SpacePanel_badgeContainer">
                                    <button type="button" data-badge-type="${badgeType}" aria-label="Jump to first unread room"
                                        class="mx_SpacePanel_notificationBadge notificationBadge visible notification ${badgeClass}"
                                    ><span class="count">${count}</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </li>
                <li class="mx_SpaceItem mx_SpaceItem_new collapsed">
                    <div class="mx_AccessibleButton mx_SpaceButton mx_SpaceButton_new mx_SpaceButton_narrow mx_SpaceButton_withIcon"
                        aria-label="Create a space">
                        <div class="mx_SpaceButton_selectionWrapper">
                            <div class="mx_SpaceButton_avatarWrapper">
                                <div class="mx_SpaceButton_avatarPlaceholder">
                                    <div class="mx_SpaceButton_icon">${renderToStaticMarkup(createElement(PlusIcon))}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </li>
            </ul>
        </nav>
    `;
}

describe("SpacePanel badges and create button", () => {
    let removeInter: () => void;

    beforeAll(async () => {
        removeInter = await loadInter();
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundTokens} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} ${notificationBadgeStyles} }
            @layer app-web { ${toBrowserCss(spacePanelStyles, lightTheme)} }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
        removeInter();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    function badge(): HTMLElement {
        return button("Jump to first unread room");
    }

    it("centers the room list's 20px counter 2px inside the space avatar's top right corner, ringed in the panel's color", () => {
        renderBadge("badge_2char", "3");
        const panel = document.querySelector(".mx_SpacePanel")!;
        const avatar = document.querySelector(".mx_SpaceButton_icon")!.getBoundingClientRect();
        const box = badge().getBoundingClientRect();
        const style = getComputedStyle(badge());

        expect(style.borderTopWidth).toBe("2px");
        expect(style.borderTopColor).toBe(getComputedStyle(panel).backgroundColor);
        expect(style.backgroundColor).toBe(tokenColor("--cpd-color-icon-accent-primary", panel));
        expect(box.width).toBeCloseTo(24, 1);
        expect(box.height).toBeCloseTo(24, 1);
        expect(box.left + box.width / 2).toBeCloseTo(avatar.right - 2, 1);
        expect(box.top + box.height / 2).toBeCloseTo(avatar.top + 2, 1);
        expect(box.right).toBeLessThanOrEqual(panel.getBoundingClientRect().right);
    });

    it.each(["badge_2char", "dot"] as const)(
        "inverts the %s badge of the selected space and rings it in the plate's color",
        (badgeType) => {
            renderBadge(badgeType, "3", true);
            const panel = document.querySelector(".mx_SpacePanel")!;
            const style = getComputedStyle(badge());
            const plate = tokenColor("--tl-color-bg-selection", panel);

            expect(getComputedStyle(document.querySelector(".mx_SpaceButton_selectionWrapper")!).backgroundColor).toBe(
                plate,
            );
            expect(style.backgroundColor).toBe(tokenColor("--tl-color-on-selection", panel));
            expect(style.borderTopColor).toBe(plate);
            expect(style.color).toBe(plate);
        },
    );

    it("grows the counter down and to the left with the font, keeping it within the space button's top", () => {
        renderBadge("badge_2char", "3");
        const spaceButton = button("Home").getBoundingClientRect();
        const before = badge().getBoundingClientRect();
        document.documentElement.style.fontSize = "24px";
        const after = badge().getBoundingClientRect();
        document.documentElement.style.fontSize = "";

        expect(after.height).toBeGreaterThan(before.height);
        expect([after.top, after.right]).toEqual([before.top, before.right]);
        // Inside its ring, as the list's scroll area clips what is above the first space's button
        expect(after.top + 2).toBeCloseTo(spaceButton.top, 1);
    });

    it("grows a longer count to the left, keeping the counter's right edge and middle", () => {
        renderBadge("badge_2char", "3");
        const circle = badge().getBoundingClientRect();
        renderBadge("badge_3char", "128");
        const pill = badge().getBoundingClientRect();

        expect(pill.width).toBeGreaterThan(circle.width);
        expect(pill.right).toBeCloseTo(circle.right, 1);
        expect(pill.top + pill.height / 2).toBeCloseTo(circle.top + circle.height / 2, 1);
    });

    it("rings the unread dot in the panel's color", () => {
        renderBadge("dot", "");
        const panel = document.querySelector(".mx_SpacePanel")!;

        expect(getComputedStyle(badge()).borderTopColor).toBe(getComputedStyle(panel).backgroundColor);
        expect(getComputedStyle(badge()).backgroundColor).toBe(tokenColor("--cpd-color-icon-accent-primary", panel));
    });

    it("draws the create button's + in the panel's icon gray, darker on hover", async () => {
        renderBadge("dot", "");
        const panel = document.querySelector(".mx_SpacePanel")!;
        const plus = button("Create a space").querySelector<HTMLElement>("svg")!;

        expect(settledStyle(plus).color).toBe(tokenColor("--cpd-color-icon-secondary", panel));
        await userEvent.hover(button("Create a space"));
        expect(settledStyle(plus).color).toBe(tokenColor("--cpd-color-icon-primary", panel));
    });
});

/** Each theme's class with the theme stylesheets it is built from, in the order its entry point imports them. */
const THEMES: [string, string[]][] = [
    ["cpd-theme-light", [lightTheme]],
    ["cpd-theme-dark", [lightTheme, darkTheme]],
];

/**
 * The space panel in a theme with Home above Favourites, as MetaSpaceButton renders them. Only Home has an options
 * menu, so only it has the "…" button, which the collapsed panel keeps hidden.
 *
 * @param selected - The selected space.
 * @param rightClicked - The right-clicked spaces. SpaceButton marks each as having its menu open, even Favourites,
 *     which has no menu to open.
 */
function renderSpaces(
    theme: string,
    {
        expanded,
        dir = "ltr",
        selected = "Home",
        rightClicked = [],
    }: { expanded: boolean; dir?: string; selected?: string; rightClicked?: string[] },
): HTMLElement {
    const icon = (Icon: typeof HomeSolidIcon): string => renderToStaticMarkup(createElement(Icon));
    const spaceButton = (label: string, Icon: typeof HomeSolidIcon, hasMenu: boolean): string => `
        <li class="mx_SpaceItem ${expanded ? "" : "collapsed"}" role="treeitem" aria-selected="${label === selected}">
            <div class="mx_AccessibleButton mx_SpaceButton mx_SpaceButton_withIcon
                ${label === selected ? "mx_SpaceButton_active" : ""}
                ${rightClicked.includes(label) ? "mx_SpaceButton_hasMenuOpen" : ""}
                ${expanded ? "" : "mx_SpaceButton_narrow"}"
                role="button" aria-label="${label}">
                <div class="mx_SpaceButton_selectionWrapper">
                    <div class="mx_SpaceButton_avatarWrapper">
                        <div class="mx_SpaceButton_avatarPlaceholder"><div class="mx_SpaceButton_icon">${icon(Icon)}</div></div>
                    </div>
                    ${expanded ? `<span class="mx_SpaceButton_name">${label}</span>` : ""}
                    ${
                        hasMenu
                            ? `<div class="mx_AccessibleButton mx_SpaceButton_menuButton" role="button"
                                aria-label="${label} options" aria-haspopup="true"
                                aria-expanded="${rightClicked.includes(label)}">${icon(OverflowHorizontalIcon)}</div>`
                            : ""
                    }
                </div>
            </div>
        </li>
    `;
    const container = document.createElement("div");
    container.className = theme;
    container.dir = dir;
    container.innerHTML = `
        <nav class="mx_SpacePanel ${expanded ? "" : "collapsed"}" style="height: 400px; ${expanded ? "width: 240px" : ""}">
            <ul class="mx_SpaceTreeLevel" role="tree">
                ${spaceButton("Home", HomeSolidIcon, true)}
                ${spaceButton("Favourites", FavouriteSolidIcon, false)}
            </ul>
        </nav>
    `;
    document.body.append(container);
    return container;
}

function selectionPlate(label: string): HTMLElement {
    return button(label).querySelector<HTMLElement>(".mx_SpaceButton_selectionWrapper")!;
}

describe("SpacePanel selection", () => {
    beforeAll(() => {
        // Each theme's variables apply within its own class, as each theme is a separate stylesheet in the app
        const themed = THEMES.map(
            ([theme, sources]) => `.${theme} { ${toBrowserCss(spacePanelStyles, ...sources)} }`,
        ).join("\n");
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, shared-components, app-web;
            @layer compound-tokens {
                ${compoundTokens} ${compoundSemantic}
                ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
            }
            @layer shared-components { ${telementTokens} }
            @layer app-web { ${themed} }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(async () => {
        await userEvent.unhover(document.body);
        document.body.innerHTML = "";
    });

    describe.each(THEMES.map(([theme]) => theme))("in %s", (theme) => {
        it.each(["ltr", "rtl"])(
            "marks the selected space in the collapsed panel with the room list's selection plate (%s)",
            (dir) => {
                const container = renderSpaces(theme, { expanded: false, dir });
                const plate = selectionPlate("Home");
                const style = getComputedStyle(plate);

                expect(style.backgroundColor).toBe(tokenColor("--tl-color-bg-selection", container));
                expect(style.borderTopWidth).toBe("0px");
                const tile = plate.querySelector<HTMLElement>(".mx_SpaceButton_icon")!;
                expect(getComputedStyle(tile).backgroundColor).toBe("rgba(0, 0, 0, 0)");
                expect(getComputedStyle(tile.querySelector("svg")!).color).toBe(
                    tokenColor("--tl-color-on-selection", container),
                );
                expect(getComputedStyle(selectionPlate("Favourites")).backgroundColor).toBe("rgba(0, 0, 0, 0)");

                // A 40px plate rounded concentrically around the 32px tile
                const box = plate.getBoundingClientRect();
                const tileBox = tile.getBoundingClientRect();
                expect([box.width, box.height]).toEqual([40, 40]);
                expect([
                    tileBox.left - box.left,
                    tileBox.top - box.top,
                    box.right - tileBox.right,
                    box.bottom - tileBox.bottom,
                ]).toEqual([4, 4, 4, 4]);
                expect(cornerRadii(plate)).toEqual({ x: 12, y: 12 });
            },
        );

        it("marks the selected space in the expanded panel with the plate, its name and icons in white", async () => {
            const container = renderSpaces(theme, { expanded: true });
            const plate = selectionPlate("Home");
            const onSelection = tokenColor("--tl-color-on-selection", container);

            expect(getComputedStyle(plate).backgroundColor).toBe(tokenColor("--tl-color-bg-selection", container));
            expect(getComputedStyle(plate.querySelector(".mx_SpaceButton_name")!).color).toBe(onSelection);
            expect(getComputedStyle(plate.querySelector(".mx_SpaceButton_icon svg")!).color).toBe(onSelection);
            await userEvent.hover(button("Home"));
            expect(getComputedStyle(plate.querySelector(".mx_SpaceButton_menuButton svg")!).color).toBe(onSelection);
        });

        it.each([
            ["collapsed", false],
            ["expanded", true],
        ])(
            "fills a hovered space in the room list's hover gray in the %s panel, and darkens the selected plate",
            async (_, expanded) => {
                const container = renderSpaces(theme, { expanded });

                await userEvent.hover(button("Favourites"));
                expect(getComputedStyle(selectionPlate("Favourites")).backgroundColor).toBe(
                    tokenColor("--cpd-color-bg-action-tertiary-hovered", container),
                );
                await userEvent.hover(button("Home"));
                expect(getComputedStyle(selectionPlate("Home")).backgroundColor).toBe(
                    tokenColor("--tl-color-bg-selection-hovered", container),
                );
                expect(getComputedStyle(selectionPlate("Favourites")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
            },
        );

        it.each([
            ["collapsed", false],
            ["expanded", true],
        ])(
            "fills a space while its options menu is open in the %s panel, but not a right-clicked space without one",
            (_, expanded) => {
                const plateColor = (label: string): string => getComputedStyle(selectionPlate(label)).backgroundColor;
                let container = renderSpaces(theme, { expanded, rightClicked: ["Home", "Favourites"] });

                expect(plateColor("Home")).toBe(tokenColor("--tl-color-bg-selection-hovered", container));
                expect(plateColor("Favourites")).toBe("rgba(0, 0, 0, 0)");

                document.body.innerHTML = "";
                container = renderSpaces(theme, {
                    expanded,
                    selected: "Favourites",
                    rightClicked: ["Home", "Favourites"],
                });

                expect(plateColor("Home")).toBe(tokenColor("--cpd-color-bg-action-tertiary-hovered", container));
                expect(plateColor("Favourites")).toBe(tokenColor("--tl-color-bg-selection", container));
            },
        );
    });
});
