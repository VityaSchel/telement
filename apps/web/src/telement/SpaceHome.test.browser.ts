/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar, CheckboxInput, InlineField, Root } from "@vector-im/compound-web";
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
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import homePageStyles from "../../res/css/structures/_HomePage.pcss?raw";
import spaceHierarchyStyles from "../../res/css/structures/_SpaceHierarchy.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import { cornerRadii, toBrowserCss } from "../test/telement/browserCss";
import { settledStyle, tokenColor } from "../test/telement/computedStyle";

/** A SpaceHierarchy tile as Tile renders it: the room's avatar, name and member count, and its actions. */
function tile(name: string, { subspace = false }: { subspace?: boolean } = {}): string {
    const avatar = renderToStaticMarkup(createElement(Avatar, { id: `!${name}:example.org`, name, size: "20px" }));
    // StyledCheckbox without a label: a form around Compound's field, whose body stays empty
    const checkbox = renderToStaticMarkup(
        createElement(
            Root,
            null,
            createElement(InlineField, { name: "selected", control: createElement(CheckboxInput, { tabIndex: -1 }) }),
        ),
    );
    return `
        <li class="mx_SpaceHierarchy_roomTileWrapper" role="treeitem">
            <div class="mx_AccessibleButton mx_SpaceHierarchy_roomTile ${subspace ? "mx_SpaceHierarchy_subspace" : ""}"
                role="button" tabindex="0" data-name="${name}">
                <div class="mx_SpaceHierarchy_roomTile_item">
                    <div class="mx_SpaceHierarchy_roomTile_avatar">${avatar}</div>
                    <div class="mx_SpaceHierarchy_roomTile_name"><span>${name}</span></div>
                    <div class="mx_SpaceHierarchy_roomTile_info">3 members</div>
                </div>
                <div class="mx_SpaceHierarchy_actions">
                    <div class="mx_AccessibleButton" role="button" tabindex="0" style="block-size: 36px">Join</div>
                    ${checkbox}
                </div>
                ${
                    subspace
                        ? `<div class="mx_SpaceHierarchy_subspace_toggle mx_SpaceHierarchy_subspace_toggle_shown">
                               <svg width="16" height="16"></svg>
                           </div>`
                        : ""
                }
            </div>
            ${subspace ? `<div class="mx_SpaceHierarchy_subspace_children"><ul class="mx_SpaceHierarchy_list">${tile("Nested room")}</ul></div>` : ""}
        </li>
    `;
}

function renderSpaceHierarchy(): void {
    document.body.innerHTML = `
        <div class="mx_SpaceRoomView_landing" style="width: 800px">
            <ul class="mx_SpaceHierarchy_list" role="tree">${tile("Design")}${tile("Nested space", { subspace: true })}</ul>
        </div>
    `;
}

function tileNamed(name: string): HTMLElement {
    return document.querySelector<HTMLElement>(`[data-name="${name}"]`)!;
}

let stylesheet: HTMLStyleElement;

describe("Home and space home", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} ${telementTokens}
            }
            @layer compound-web { ${compoundStyles} }
            @layer app-web {
                body { margin: 0; background: var(--cpd-color-bg-canvas-default); }
                ${toBrowserCss(homePageStyles, lightTheme, fontSizes)}
                ${toBrowserCss(spaceHierarchyStyles, lightTheme, fontSizes)}
            }
        `;
        document.head.append(stylesheet);
        document.documentElement.classList.add("cpd-theme-light");
    });

    afterAll(() => {
        stylesheet.remove();
        document.documentElement.classList.remove("cpd-theme-light");
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("rounds the home page's action tiles as cards, with their padding and gap on the 4px grid", () => {
        document.body.innerHTML = `
            <main class="mx_HomePage mx_HomePage_default">
                <div class="mx_HomePage_default_wrapper">
                    <div class="mx_HomePage_default_buttons">
                        <div class="mx_AccessibleButton mx_HomePage_button_sendDm" role="button" tabindex="0">
                            <svg viewBox="0 0 24 24"></svg>Send a Direct Message
                        </div>
                    </div>
                </div>
            </main>
        `;
        const button = document.querySelector<HTMLElement>(".mx_HomePage_button_sendDm")!;
        const style = getComputedStyle(button);

        expect(cornerRadii(button)).toEqual({ x: 12, y: 12 });
        expect([style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]).toEqual([
            "8px",
            "16px",
            "8px",
            "16px",
        ]);
        const icon = button.querySelector("svg")!.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(button.lastChild!);
        expect(range.getBoundingClientRect().top - icon.bottom).toBe(12);
    });

    describe("space hierarchy", () => {
        it("puts the avatar as far from the tile's top as from its start, centered on the room's name", () => {
            renderSpaceHierarchy();

            for (const name of ["Design", "Nested space", "Nested room"]) {
                const rect = tileNamed(name).getBoundingClientRect();
                const avatar = tileNamed(name).querySelector(".mx_SpaceHierarchy_roomTile_avatar > *")!;
                const avatarRect = avatar.getBoundingClientRect();
                expect([avatarRect.left - rect.left, avatarRect.top - rect.top]).toEqual([16, 16]);
                const nameRect = tileNamed(name)
                    .querySelector(".mx_SpaceHierarchy_roomTile_name")!
                    .getBoundingClientRect();
                expect(avatarRect.top + avatarRect.height / 2).toBe(nameRect.top + nameRect.height / 2);
            }
        });

        it("ends the tile's checkbox as far from its end as the avatar starts from its start", () => {
            renderSpaceHierarchy();

            for (const name of ["Design", "Nested space", "Nested room"]) {
                const rect = tileNamed(name).getBoundingClientRect();
                const checkbox = tileNamed(name).querySelector("input[type=checkbox]")!.getBoundingClientRect();
                expect(checkbox.width).toBe(20);
                expect(rect.right - checkbox.right).toBe(16);
            }
        });

        it("keeps the subspace toggle inside the tile, centered on the avatar, over the tree line", () => {
            renderSpaceHierarchy();
            const subspace = tileNamed("Nested space");
            const rect = subspace.getBoundingClientRect();
            const toggle = subspace.querySelector(".mx_SpaceHierarchy_subspace_toggle")!.getBoundingClientRect();
            const avatar = subspace.querySelector(".mx_SpaceHierarchy_roomTile_avatar > *")!.getBoundingClientRect();

            expect(toggle.left).toBe(rect.left);
            expect(toggle.right).toBeLessThanOrEqual(avatar.left);
            expect(toggle.top + toggle.height / 2).toBe(avatar.top + avatar.height / 2);
            const line = getComputedStyle(subspace, "::before");
            const lineMiddle = rect.left + parseFloat(line.left) + parseFloat(line.width) / 2;
            expect(Math.abs(lineMiddle - (toggle.left + toggle.width / 2))).toBe(0.5);
        });

        it("draws the hovered subspace tile's toggle on the tile's background", async () => {
            renderSpaceHierarchy();
            const subspace = tileNamed("Nested space");
            const toggle = subspace.querySelector<HTMLElement>(".mx_SpaceHierarchy_subspace_toggle")!;
            expect(getComputedStyle(toggle).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

            await userEvent.hover(subspace);

            expect(getComputedStyle(subspace).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
            expect(getComputedStyle(toggle).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        });
    });
});

/** Each theme's class with the theme stylesheets it is built from, in the order its entry point imports them. */
const THEMES: [string, string[]][] = [
    ["cpd-theme-light", [lightTheme]],
    ["cpd-theme-dark", [lightTheme, darkTheme]],
];

/** The accent step each theme fills with where white sits on it: the accent itself, or a deeper step in dark themes. */
const ACCENT_FILL_STEP: Record<string, string> = {
    "cpd-theme-light": "--tl-accent-900",
    "cpd-theme-dark": "--tl-accent-800",
};

/** HomePage's default page in a theme: the title and subtitle over its three action tiles. */
function renderHomePage(theme: string): HTMLElement {
    const container = document.createElement("div");
    container.className = theme;
    container.innerHTML = `
        <main class="mx_HomePage mx_HomePage_default">
            <div class="mx_HomePage_default_wrapper">
                <h1>Welcome Alice</h1>
                <h2>Now, let's help you get started</h2>
                <div class="mx_HomePage_default_buttons">
                    <div class="mx_AccessibleButton mx_HomePage_button_sendDm" role="button" tabindex="0">
                        <svg viewBox="0 0 24 24"></svg>Send a Direct Message
                    </div>
                </div>
            </div>
        </main>
    `;
    document.body.append(container);
    return container;
}

describe("Home page colors", () => {
    beforeAll(() => {
        // Each theme's variables apply within its own class, as each theme is a separate stylesheet in the app
        const themed = THEMES.map(
            ([theme, sources]) => `.${theme} { ${toBrowserCss(homePageStyles, ...sources, fontSizes)} }`,
        ).join("\n");
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, shared-components, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic}
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
        it("fills the action tiles with the accent fill white sits on, a step deeper in dark themes", async () => {
            const container = renderHomePage(theme);
            const tile = container.querySelector<HTMLElement>(".mx_HomePage_button_sendDm")!;
            const onAccent = tokenColor("--tl-color-on-accent", container);

            expect(settledStyle(tile).backgroundColor).toBe(tokenColor("--cpd-color-bg-accent-rest", container));
            expect(getComputedStyle(tile).backgroundColor).toBe(tokenColor(ACCENT_FILL_STEP[theme], container));
            expect(getComputedStyle(tile).color).toBe(onAccent);
            expect(getComputedStyle(tile.querySelector("svg")!).color).toBe(onAccent);

            await userEvent.hover(tile);
            expect(settledStyle(tile).backgroundColor).toBe(tokenColor("--cpd-color-bg-accent-hovered", container));
        });

        it("sets the subtitle in Compound's heading-sm, in the secondary text color", () => {
            const container = renderHomePage(theme);
            const subtitle = getComputedStyle(container.querySelector("h2")!);
            const probe = document.createElement("div");
            probe.style.font = "var(--cpd-font-heading-sm-semibold)";
            container.append(probe);
            const headingSm = getComputedStyle(probe);

            expect(subtitle.color).toBe(tokenColor("--cpd-color-text-secondary", container));
            expect([subtitle.fontSize, subtitle.lineHeight, subtitle.fontWeight]).toEqual([
                headingSm.fontSize,
                headingSm.lineHeight,
                headingSm.fontWeight,
            ]);
            expect(subtitle.fontSize).toBe("20px");
        });
    });
});
