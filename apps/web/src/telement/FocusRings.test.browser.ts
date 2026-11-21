/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import githubMarkdownLight from "github-markdown-css/github-markdown-light.css?raw";

// The package doesn't export its token stylesheet on its own, and its build can be older than the badge's source
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
// eslint-disable-next-line no-restricted-imports
import notificationBadgeStyles from "../../../../packages/shared-components/src/notifications/NotificationBadgeView/NotificationBadgeView.module.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import spacePanelStyles from "../../res/css/structures/_SpacePanel.pcss?raw";
import tabbedViewStyles from "../../res/css/structures/_TabbedView.pcss?raw";
import focusRing from "../../res/css/telement/FocusRing.pcss?raw";
import pillStyles from "../../res/css/views/elements/_Pill.pcss?raw";
import eventTileStyles from "../../res/css/views/rooms/_EventTile.pcss?raw";
import memberTileViewStyles from "../../res/css/views/rooms/_MemberTileView.pcss?raw";
import roomHeaderStyles from "../../res/css/views/rooms/_RoomHeader.pcss?raw";
import avatarSettingStyles from "../../res/css/views/settings/_AvatarSetting.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";

/** In the order _components.pcss imports them, after _common.pcss, and then the theme's markdown stylesheet. */
const APP_STYLES = [
    commonStyles,
    spacePanelStyles,
    tabbedViewStyles,
    pillStyles,
    eventTileStyles,
    memberTileViewStyles,
    roomHeaderStyles,
    avatarSettingStyles,
];

/** Focuses the element as the keyboard does, so that it matches :focus-visible. */
async function keyboardFocus(element: HTMLElement): Promise<CSSStyleDeclaration> {
    await userEvent.keyboard("{Shift}");
    element.focus();
    expect(element.matches(":focus-visible")).toBe(true);
    return getComputedStyle(element);
}

function ring(style: CSSStyleDeclaration): string {
    return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor} ${style.outlineOffset}`;
}

function get(selector: string): HTMLElement {
    return document.querySelector<HTMLElement>(selector)!;
}

function themed(theme: string, html: string): void {
    document.body.innerHTML = `<div class="${theme}" id="page" style="padding: 48px; background: var(--cpd-color-bg-canvas-default)">${html}</div>`;
}

function color(token: string, scope: Element = get("#page")): string {
    return tokenColor(token, scope);
}

let stylesheet: HTMLStyleElement;

describe("Focus rings", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic}
                ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
                ${focusRing}
            }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components {
                ${telementTokens}
                ${notificationBadgeStyles}
                .sharedNoRing:focus-visible { outline: none; }
            }
            @layer app-web {
                body { margin: 0; font: var(--cpd-font-body-md-regular); }
                ${APP_STYLES.map((styles) => toBrowserCss(styles, commonStyles, fontSizes, lightTheme)).join("\n")}
                ${githubMarkdownLight}
            }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(async () => {
        document.body.innerHTML = "";
        await cdp().send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
    });

    it("rings what has no ring of its own in Compound's ring, 2px in the focus color and 1px outside", async () => {
        themed(
            "cpd-theme-light",
            `<button type="button" id="plain">Explore</button>
            <div class="mx_AccessibleButton" role="button" tabindex="0" id="accessible">Room options</div>`,
        );
        const expected = `solid 2px ${color("--cpd-color-border-focused")} 1px`;

        expect(ring(await keyboardFocus(get("#plain")))).toBe(expected);
        expect(ring(await keyboardFocus(get("#accessible")))).toBe(expected);
    });

    it("leaves a ring, or no ring, that a stylesheet over it draws, the shared components' included", async () => {
        themed(
            "cpd-theme-light",
            `<button type="button" class="sharedNoRing" id="none">Row</button>
            <div class="mx_MemberTileView" role="button" tabindex="0" id="inset">Alice</div>`,
        );

        expect((await keyboardFocus(get("#none"))).outlineStyle).toBe("none");
        expect((await keyboardFocus(get("#inset"))).outlineOffset).toBe("-2px");
    });

    it("rings a legacy dialog button focused from the keyboard rather than brightening it", async () => {
        themed(
            "cpd-theme-light",
            `<div class="mx_Dialog"><div class="mx_Dialog_buttons">
                <button type="button" class="mx_LegacyDialogButton mx_Dialog_primary" id="ok">OK</button>
            </div></div>`,
        );
        const style = await keyboardFocus(get("#ok"));

        expect(style.filter).toBe("none");
        expect(ring(style)).toBe(`solid 2px ${color("--cpd-color-border-focused", get(".mx_Dialog"))} 1px`);
    });

    it("rings a link in a formatted message, which github-markdown-css rings in an undefined color", async () => {
        themed(
            "cpd-theme-light",
            `<div class="mx_EventTile_content"><div class="markdown-body">
                <p>See <a href="https://element.io" id="link">https://element.io</a></p>
            </div></div>`,
        );
        const style = await keyboardFocus(get("#link"));

        expect(style.outlineStyle).toBe("solid");
        expect(style.outlineWidth).toBe("2px");
        expect(style.outlineColor).toBe(color("--cpd-color-border-focused"));
    });

    describe("where forced colors drew a transparent outline", () => {
        function renderControls(): void {
            themed(
                "cpd-theme-light",
                `<a class="mx_Pill mx_UserPill" href="#" id="pill">BotBob</a>
                <button type="button" class="notificationBadge visible notification" id="badge">3</button>
                <nav class="mx_SpacePanel"><div class="mx_AccessibleButton mx_SpacePanel_toggleCollapse"
                    role="button" tabindex="0" id="toggle"></div></nav>
                <header class="mx_RoomHeader">
                    <button type="button" id="toggled"><svg class="mx_RoomHeader_toggled"></svg></button>
                </header>
                <div class="mx_TabbedView mx_TabbedView_tabsOnLeft" style="position: relative">
                    <ul class="mx_TabbedView_tabLabels">
                        <li class="mx_AccessibleButton mx_TabbedView_tabLabel mx_TabbedView_tabLabel_active"
                            role="tab" tabindex="0" id="tab">Preferences</li>
                    </ul>
                </div>`,
            );
        }

        it("rings them when focused from the keyboard", async () => {
            renderControls();
            const focusColor = color("--cpd-color-border-focused");

            for (const id of ["#pill", "#badge", "#toggle", "#toggled"]) {
                const style = await keyboardFocus(get(id));
                expect(`${id} ${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`).toBe(
                    `${id} solid 2px ${focusColor}`,
                );
            }
        });

        it("rings the selected settings tab in white, a ring's width inside its plate", async () => {
            renderControls();

            expect(ring(await keyboardFocus(get("#tab")))).toBe(`solid 2px ${color("--tl-color-on-selection")} -4px`);
        });

        describe("in forced colors", () => {
            beforeAll(async () => {
                await cdp().send("Emulation.setEmulatedMedia", {
                    features: [{ name: "forced-colors", value: "active" }],
                });
            });

            afterAll(async () => {
                await cdp().send("Emulation.setEmulatedMedia", { features: [] });
            });

            it("keeps the outline at rest, and the focus ring when focused", async () => {
                renderControls();

                for (const id of ["#pill", "#badge", "#tab"]) {
                    expect(`${id} ${getComputedStyle(get(id)).outlineWidth}`).toBe(`${id} 1px`);
                    expect(`${id} ${(await keyboardFocus(get(id))).outlineWidth}`).toBe(`${id} 2px`);
                }
            });
        });
    });

    it("rings the room settings avatar round its circle, outside it, rather than its square box", async () => {
        themed(
            "cpd-theme-light",
            `<div class="mx_AvatarSetting_avatar" role="group">
                <div class="mx_AccessibleButton mx_AvatarSetting_avatarDisplay" role="button" tabindex="0" id="display">
                    <span class="mx_BaseAvatar" style="display: block; width: 120px; height: 120px; border-radius: 50%"
                        id="avatar"></span>
                </div>
            </div>`,
        );

        expect((await keyboardFocus(get("#display"))).outlineStyle).toBe("none");
        expect(ring(getComputedStyle(get("#avatar")))).toBe(`solid 2px ${color("--cpd-color-border-focused")} 2px`);
    });

    it("rings the room header's name as a row, inside the header, rather than the header-high button", async () => {
        themed(
            "cpd-theme-light",
            `<header class="mx_RoomHeader" style="display: flex; align-items: center; gap: 12px">
                <span style="display: block; width: 40px; height: 40px"></span>
                <button class="mx_RoomHeader_infoWrapper" type="button" id="info">
                    <div class="mx_RoomHeader_info">Design team</div>
                </button>
            </header>`,
        );
        const button = get("#info");
        const style = await keyboardFocus(button);
        const after = getComputedStyle(button, "::after");
        const box = button.getBoundingClientRect();

        expect(style.outlineStyle).toBe("none");
        expect(box.height).toBe(63);
        expect(after.outlineStyle).toBe("solid");
        expect(after.outlineWidth).toBe("2px");
        expect([after.top, after.bottom, after.left, after.right]).toEqual(["8px", "8px", "-8px", "-8px"]);
        expect(after.borderRadius).toBe("8px");
    });
});
