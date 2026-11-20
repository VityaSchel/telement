/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChevronDownIcon, CopyIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../../res/css/_common.pcss?raw";
import contextualMenuStyles from "../../../res/css/structures/_ContextualMenu.pcss?raw";
import iconizedContextMenuStyles from "../../../res/css/views/context_menus/_IconizedContextMenu.pcss?raw";
import quickReactionsStyles from "../../../res/css/telement/_MessageQuickReactions.pcss?raw";
import lightTheme from "../../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../../res/themes/dark/css/_dark.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../test/telement/browserCss";
import { tokenColor } from "../../test/telement/computedStyle";

/** Each theme's class with the theme stylesheets it is built from, in the order its entry point imports them. */
const THEMES: [string, string[]][] = [
    ["cpd-theme-light", [lightTheme]],
    ["cpd-theme-dark", [lightTheme, darkTheme]],
];

const APP_STYLES = contextualMenuStyles + iconizedContextMenuStyles + quickReactionsStyles;

const KEYS = ["👍", "❤️", "🔥", "🥰", "👏", "😁"];

const icon = (Icon: typeof CopyIcon): string => renderToStaticMarkup(createElement(Icon));

/**
 * The message menu, as MessageContextMenu renders it on right-clicking a message: the quick reactions, with the user's
 * own thumbs up, above the menu's list of one item. Without the reactions it is the menu as any other message menu.
 */
function menuHtml({ withReactions = true, hidden = false, label = "Copy text" } = {}): string {
    const reactions = KEYS.map(
        (key, i) =>
            `<div class="mx_AccessibleButton mx_MessageQuickReactions_reaction" role="menuitemcheckbox" ` +
            `aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${key}</div>`,
    ).join("");
    const classes = withReactions
        ? `mx_MessageQuickReactions_menu${hidden ? " mx_MessageQuickReactions_menu_hidden" : ""}`
        : "";
    return `
        <div class="mx_ContextualMenu_wrapper" style="top: 100px; left: 40px">
            <div class="mx_ContextualMenu mx_ContextualMenu_left mx_ContextualMenu_top ${classes}" role="menu" data-box>
                ${
                    withReactions
                        ? `<div class="mx_MessageQuickReactions" role="group" aria-label="Quick reactions" data-pill>
                            ${reactions}
                            <div class="mx_AccessibleButton mx_MessageQuickReactions_more" role="menuitem"
                                tabindex="-1" aria-label="React">${icon(ChevronDownIcon)}</div>
                        </div>`
                        : ""
                }
                <ul role="none" class="mx_IconizedContextMenu mx_MessageContextMenu mx_IconizedContextMenu_compact"
                    data-list>
                    <div class="mx_IconizedContextMenu_optionList">
                        <li class="mx_AccessibleButton mx_IconizedContextMenu_item" role="menuitem" tabindex="-1">
                            ${icon(CopyIcon)}<span class="mx_IconizedContextMenu_label">${label}</span>
                        </li>
                    </div>
                </ul>
            </div>
        </div>
    `;
}

function render(theme: string, html: string, dir = "ltr"): HTMLElement {
    const container = document.createElement("div");
    container.className = theme;
    container.dir = dir;
    container.innerHTML = html;
    document.body.append(container);
    return container;
}

const part = (container: HTMLElement, name: string): HTMLElement => container.querySelector(`[data-${name}]`)!;
const rectOf = (element: Element): DOMRect => element.getBoundingClientRect();

/** The page as drawn, to read the color of a pixel at a point in CSS pixels as "r g b". */
async function screenshot(): Promise<(x: number, y: number) => string> {
    const image = new Image();
    image.src = `data:image/png;base64,${await page.screenshot({ base64: true, save: false })}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const scale = image.width / document.documentElement.clientWidth;
    return (x, y) =>
        context
            .getImageData(x * scale, y * scale, 1, 1)
            .data.slice(0, 3)
            .join(" ");
}

let stylesheet: HTMLStyleElement;

describe("The message menu's quick reactions", () => {
    beforeAll(() => {
        // Each theme's variables apply within its own class, as each theme is a separate stylesheet in the app
        const themed = THEMES.map(
            ([theme, sources]) => `.${theme} { ${toBrowserCss(APP_STYLES, commonStyles, ...sources)} }`,
        ).join("\n");
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            ${compoundBase} ${compoundSemantic}
            ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
            ${compoundStyles} ${telementTokens}
            body { font: var(--cpd-font-body-md-regular); }
            ${themed}
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

    it.each(["ltr", "rtl"])("sit 8px above the menu's list, as wide, at its start, in its box (%s)", (dir) => {
        const container = render("cpd-theme-light", menuHtml(), dir);
        const box = rectOf(part(container, "box"));
        const pill = rectOf(part(container, "pill"));
        const list = rectOf(part(container, "list"));

        // Telegram's sit about 7px above its menu
        expect(list.top - pill.bottom).toBe(8);
        // The box is what the menu keeps inside the window, so it holds both
        expect(pill.top).toBe(box.top);
        expect(list.bottom).toBe(box.bottom);
        expect(Math.max(pill.right, list.right) - Math.min(pill.left, list.left)).toBe(box.width);
        const start = (rect: DOMRect): number => (dir === "ltr" ? rect.left : rect.right);
        expect(start(pill)).toBe(start(list));
        // The list is narrower than the pill on its own, and takes the pill's width, as Telegram's pill never reaches
        // past its menu
        expect(list.width).toBe(pill.width);
    });

    it.each(["ltr", "rtl"])("keep their own width at the start of a list wider than them (%s)", (dir) => {
        const narrow = rectOf(part(render("cpd-theme-light", menuHtml(), dir), "pill"));
        const container = render(
            "cpd-theme-light",
            menuHtml({ label: "Resend 12 unsent reactions to this message" }),
            dir,
        );
        const pill = rectOf(part(container, "pill"));
        const list = rectOf(part(container, "list"));

        expect(list.width).toBeGreaterThan(narrow.width);
        expect(pill.width).toBe(narrow.width);
        expect(dir === "ltr" ? pill.left : pill.right).toBe(dir === "ltr" ? list.left : list.right);
    });

    it.each(["ltr", "rtl"])("lay the reactions out in reading order, the button to all reactions last (%s)", (dir) => {
        const container = render("cpd-theme-light", menuHtml(), dir);
        const items = [...part(container, "pill").children].map(rectOf);
        // How far each item starts after the previous one ends, in reading order
        const gaps = items
            .slice(1)
            .map((item, i) => (dir === "ltr" ? item.left - items[i].right : items[i].left - item.right));

        expect(gaps).toEqual([0, 0, 0, 0, 0, 0]);
    });

    it.each(["ltr", "rtl"])("are a 40px capsule of round 32px buttons, 4px from every edge (%s)", (dir) => {
        const container = render("cpd-theme-light", menuHtml(), dir);
        const pill = part(container, "pill");
        const buttons = [...pill.children] as HTMLElement[];
        const pillRect = rectOf(pill);
        const [first, last] = dir === "ltr" ? [buttons[0], buttons.at(-1)!] : [buttons.at(-1)!, buttons[0]];

        expect(buttons).toHaveLength(7);
        expect(pillRect.height).toBe(40);
        expect(cornerRadii(pill)).toEqual({ x: 20, y: 20 });
        expect(rectOf(first).left - pillRect.left).toBe(4);
        expect(pillRect.right - rectOf(last).right).toBe(4);
        // The button to all reactions is a reaction's cell too, so every button is 32px after the previous one
        for (const button of buttons) {
            const rect = rectOf(button);
            expect([rect.width, rect.height]).toEqual([32, 32]);
            expect(rect.top - pillRect.top).toBe(4);
            expect(cornerRadii(button)).toEqual({ x: 16, y: 16 });
        }
    });

    it.each(["ltr", "rtl"])(
        "center the first emoji and the chevron in the capsule's round ends, the emoji as far from the start as from the top (%s)",
        (dir) => {
            const container = render("cpd-theme-light", menuHtml(), dir);
            const pill = rectOf(part(container, "pill"));
            const first = rectOf(part(container, "pill").querySelector(".mx_MessageQuickReactions_reaction")!);
            const chevron = rectOf(part(container, "pill").querySelector(".mx_MessageQuickReactions_more path")!);
            const fromStart = (rect: DOMRect): number =>
                dir === "ltr" ? rect.left - pill.left : pill.right - rect.right;
            const fromEnd = (rect: DOMRect): number =>
                dir === "ltr" ? pill.right - rect.right : rect.left - pill.left;
            // The emoji is as tall and as wide as its font size, centered in its button
            const emojiStart = fromStart(first) + (first.width - 20) / 2;
            const emojiTop = first.top + (first.height - 20) / 2 - pill.top;
            const radius = pill.height / 2;

            expect(emojiStart).toBe(emojiTop);
            expect(fromStart(first) + first.width / 2).toBe(radius);
            expect(Math.abs(fromEnd(chevron) + chevron.width / 2 - radius)).toBeLessThanOrEqual(0.5);
            expect(Math.abs(chevron.top + chevron.height / 2 - (pill.top + radius))).toBeLessThanOrEqual(1);
        },
    );

    it("draw each emoji at the emoji picker's size, centered in its button", () => {
        const container = render("cpd-theme-light", menuHtml());
        for (const button of part(container, "pill").querySelectorAll(".mx_MessageQuickReactions_reaction")) {
            const range = document.createRange();
            range.selectNodeContents(button);
            const emoji = range.getBoundingClientRect();
            const rect = rectOf(button);

            expect(getComputedStyle(button).fontSize).toBe("20px");
            expect(Math.abs(emoji.top + emoji.height / 2 - (rect.top + rect.height / 2))).toBeLessThanOrEqual(1);
            expect(Math.abs(emoji.left + emoji.width / 2 - (rect.left + rect.width / 2))).toBeLessThanOrEqual(1);
        }
    });

    it("draw the button to all reactions as a 20px chevron in the secondary icon color", () => {
        const container = render("cpd-theme-light", menuHtml());
        const chevron = part(container, "pill").querySelector(".mx_MessageQuickReactions_more svg")!;

        expect([rectOf(chevron).width, rectOf(chevron).height]).toEqual([20, 20]);
        expect(getComputedStyle(chevron).color).toBe(tokenColor("--cpd-color-icon-secondary", container));
    });

    describe.each(THEMES.map(([theme]) => theme))("in %s", (theme) => {
        it("draw the pill and the list each as a menu's surface, with one shadow around both", () => {
            const plain = render(theme, menuHtml({ withReactions: false }));
            const plainMenu = getComputedStyle(part(plain, "box"));
            const container = render(theme, menuHtml());
            const box = getComputedStyle(part(container, "box"));

            expect(box.backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect(box.borderTopWidth).toBe("0px");
            expect(box.boxShadow).toBe("none");
            for (const surface of [part(container, "pill"), part(container, "list")]) {
                const style = getComputedStyle(surface);
                expect(style.backgroundColor).toBe(plainMenu.backgroundColor);
                expect(style.boxShadow).toBe("none");
                expect(`${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`).toBe(
                    `${plainMenu.borderTopWidth} ${plainMenu.borderTopStyle} ${plainMenu.borderTopColor}`,
                );
            }
            expect(getComputedStyle(part(container, "list")).borderRadius).toBe(plainMenu.borderRadius);
            // The box casts the menu's shadow as a drop shadow, whose blur is a standard deviation: half of
            // box-shadow's blur radius
            const [color, x, y, blur] = plainMenu.boxShadow.match(/^(rgba?\([^)]*\)) (\S+) (\S+) (\S+)/)!.slice(1);
            expect(box.filter).toBe(`drop-shadow(${color} ${x} ${y} ${parseFloat(blur) / 2}px)`);
        });

        it("keep the list's shadow off the pill", async () => {
            const container = render(theme, menuHtml());
            const pill = rectOf(part(container, "pill"));
            const surface = getComputedStyle(part(container, "pill")).backgroundColor.match(/\d+/g)!.join(" ");
            // Between two reactions that are not the user's own, inside the pill's padding at its top and bottom
            const x = rectOf(part(container, "pill").children[3]).left;
            const pixel = await screenshot();

            expect(pixel(x, pill.top + 2)).toBe(surface);
            expect(pixel(x, pill.bottom - 2)).toBe(surface);
        });

        it("fill the user's own reactions as their reactions under a message, and highlight others as menu items", async () => {
            const container = render(theme, menuHtml());
            const [own, other] = part(container, "pill").querySelectorAll<HTMLElement>(
                ".mx_MessageQuickReactions_reaction",
            );
            const item = container.querySelector<HTMLElement>(".mx_IconizedContextMenu_item")!;

            expect(getComputedStyle(own).backgroundColor).toBe(tokenColor("--tl-accent-300", container));
            expect(getComputedStyle(other).backgroundColor).toBe("rgba(0, 0, 0, 0)");

            await userEvent.hover(item);
            const itemHover = getComputedStyle(item).backgroundColor;
            await userEvent.hover(other);
            expect(getComputedStyle(other).backgroundColor).toBe(itemHover);
            await userEvent.hover(own);
            expect(getComputedStyle(own).backgroundColor).toBe(tokenColor("--tl-accent-400", container));
        });
    });

    it("hide with the menu while the full reaction picker is open in their place", () => {
        const container = render("cpd-theme-light", menuHtml({ hidden: true }));

        for (const name of ["box", "pill", "list"]) {
            expect(getComputedStyle(part(container, name)).visibility).toBe("hidden");
        }
    });
});
