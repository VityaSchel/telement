/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// The Playwright provider's types give the CDP session its `send` method
/// <reference types="@vitest/browser-playwright" />

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cdp } from "vitest/browser";
import compoundTokens from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import sharedComponentsStyles from "@element-hq/web-shared-components/dist/element-web-shared-components.css?raw";

import fontSizes from "../../../../../res/css/_font-sizes.pcss?raw";
import spotlightStyles from "../../../../../res/css/views/dialogs/_SpotlightDialog.pcss?raw";
import lightTheme from "../../../../../res/themes/light/css/_light.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../../../test/telement/browserCss";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
    ArrowDownIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowUpIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";

/** The icons SpotlightDialog draws in the scroll hint's keys. */
const ARROW_ICONS = Object.fromEntries(
    Object.entries({ "↓": ArrowDownIcon, "↑": ArrowUpIcon, "←": ArrowLeftIcon, "→": ArrowRightIcon }).map(
        ([arrow, Icon]) => [arrow, renderToStaticMarkup(createElement(Icon, { "aria-hidden": true }))],
    ),
);

/**
 * The DOM SpotlightDialog renders inside its modal, with a filter and the given options, the first one selected, in a
 * Compound theme.
 */
function spotlightDialog(arrows: string[], options = ["Home"], theme = "cpd-theme-light"): string {
    const keys = arrows.map((arrow) => `<kbd>${ARROW_ICONS[arrow]}<span>${arrow}</span></kbd>`).join("");
    const items = options
        .map(
            (name, index) =>
                `<li class="mx_AccessibleButton mx_SpotlightDialog_option" role="option" aria-selected="${index === 0}">` +
                `<span class="mx_BaseAvatar" style="display: block; width: 24px; height: 24px"></span>` +
                `<span class="mx_SpotlightDialog_result_name">${name}</span>` +
                `<div class="mx_SpotlightDialog_option--endAdornment">` +
                `<kbd class="mx_SpotlightDialog_enterPrompt" aria-hidden="true">↵</kbd>` +
                (index === 0 ? ROOM_RESULT_BUTTONS : "") +
                `</div></li>`,
        )
        .join("");
    return `
        <div class="mx_Dialog_wrapper mx_SpotlightDialog_wrapper ${theme}" style="height: 480px; padding-top: 80px">
            <div class="mx_Dialog_border">
                <div class="mx_Dialog">
                    <div id="mx_SpotlightDialog_keyboardPrompt"><span>Use ${keys} to scroll</span></div>
                    <div class="mx_SpotlightDialog" role="dialog" style="width: 540px">
                        <div class="mx_Dialog_header"></div>
                        <div class="mx_SpotlightDialog_searchBox mx_textinput">
                            <div class="mx_SpotlightDialog_filter">
                                <svg viewBox="0 0 24 24"><rect width="24" height="24" /></svg>
                                <span>People</span>
                                <div class="mx_AccessibleButton mx_SpotlightDialog_filter--close" role="button"></div>
                            </div>
                            <input type="text" value="home" />
                        </div>
                        <div id="mx_SpotlightDialog_content" role="listbox">
                            <div class="mx_SpotlightDialog_section mx_SpotlightDialog_results" role="group">
                                <h4>Spaces you're in</h4>
                                <div>${items}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/** The "…" and bell buttons of a room's result, 16px icons padded by 2px. */
const ROOM_RESULT_BUTTONS = ["menu", "notifications"]
    .map(
        (kind) =>
            `<div class="mx_AccessibleButton mx_SpotlightDialog_option--${kind}" role="button">` +
            `<svg viewBox="0 0 24 24"><rect width="24" height="24" /></svg></div>`,
    )
    .join("");

function element(selector: string): Element {
    return document.querySelector(selector)!;
}

function radii(selector: string): Record<string, number> {
    const style = getComputedStyle(element(selector));
    return {
        topLeft: parseFloat(style.borderTopLeftRadius),
        topRight: parseFloat(style.borderTopRightRadius),
        bottomRight: parseFloat(style.borderBottomRightRadius),
        bottomLeft: parseFloat(style.borderBottomLeftRadius),
    };
}

function centre(rect: DOMRect): number {
    return rect.top + rect.height / 2;
}

/** Renders the page at the given device pixel ratio, as a 2x screen does. */
async function setPixelRatio(deviceScaleFactor: number): Promise<void> {
    await cdp().send("Emulation.setDeviceMetricsOverride", {
        width: innerWidth,
        height: innerHeight,
        deviceScaleFactor,
        mobile: false,
    });
}

/** The pixels the screen shows in the given area of the page, at the current device pixel ratio. */
async function screenPixels(area: { x: number; y: number; width: number; height: number }): Promise<ImageData> {
    const frame = window.frameElement?.getBoundingClientRect() ?? { x: 0, y: 0 };
    const { data } = await cdp().send("Page.captureScreenshot", {
        format: "png",
        clip: { ...area, x: frame.x + area.x, y: frame.y + area.y, scale: 1 },
    });
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * How far each arrow of the scroll hint is drawn from the middle of its key, in screen pixels, measured on what the
 * screen shows: the middle of the arrow's painted pixels against the middle of the key's painted background.
 */
async function paintedArrowOffsets(): Promise<{ arrow: string; x: number; y: number }[]> {
    const prompt = element("#mx_SpotlightDialog_keyboardPrompt");
    const box = prompt.getBoundingClientRect();
    const [left, top] = [Math.floor(box.left), Math.floor(box.top)];
    const area = { x: left, y: top, width: Math.ceil(box.right) - left, height: Math.ceil(box.bottom) - top };
    const pixels = await screenPixels(area);
    const scale = pixels.width / area.width;
    const rgb = (color: string): number[] =>
        color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number);
    const at = (x: number, y: number): number[] => {
        const index = (y * pixels.width + x) * 4;
        return [pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]];
    };
    // How much of a pixel is covered by the color `to` over `from`, so that edges count by how much they cover
    const coverage = (pixel: number[], from: number[], to: number[]): number => {
        const direction = to.map((value, i) => value - from[i]);
        const length = direction.reduce((sum, value) => sum + value * value, 0);
        const along = pixel.reduce((sum, value, i) => sum + (value - from[i]) * direction[i], 0) / length;
        return Math.max(0, Math.min(1, along));
    };
    const background = rgb(getComputedStyle(prompt).backgroundColor);

    return [...prompt.querySelectorAll("kbd")].map((kbd) => {
        const keyColor = rgb(getComputedStyle(kbd).backgroundColor);
        const inkColor = rgb(getComputedStyle(kbd).color);
        const rect = kbd.getBoundingClientRect();
        const toX = (x: number): number => (x - area.x) * scale;
        const toY = (y: number): number => (y - area.y) * scale;

        // From just inside the key, steps outwards on its middle row or column to the first pixel it doesn't fill
        const edge = (start: number, step: 1 | -1, sample: (i: number) => number[]): number => {
            for (let i = Math.floor(start); Math.abs(i - start) < 4 * scale; i += step) {
                const covered = coverage(sample(i), background, keyColor);
                if (covered < 0.95) return step < 0 ? i + 1 - covered : i + covered;
            }
            throw new Error(`No edge found for the key ${kbd.textContent}`);
        };
        const row = Math.floor(toY(rect.top + rect.height / 2));
        const column = Math.floor(toX(rect.left + rect.width / 2));
        const key = {
            left: edge(toX(rect.left + 1.5), -1, (x) => at(x, row)),
            right: edge(toX(rect.right - 1.5), 1, (x) => at(x, row)),
            top: edge(toY(rect.top + 1.5), -1, (y) => at(column, y)),
            bottom: edge(toY(rect.bottom - 1.5), 1, (y) => at(column, y)),
        };

        // The most each column and row of the key is covered by the arrow
        const columns = new Map<number, number>();
        const rows = new Map<number, number>();
        for (let y = Math.ceil(key.top) + 1; y < Math.floor(key.bottom) - 1; y++) {
            for (let x = Math.ceil(key.left) + 1; x < Math.floor(key.right) - 1; x++) {
                const covered = coverage(at(x, y), keyColor, inkColor);
                columns.set(x, Math.max(columns.get(x) ?? 0, covered));
                rows.set(y, Math.max(rows.get(y) ?? 0, covered));
            }
        }
        const extent = (covers: Map<number, number>): [number, number] => {
            const inked = [...covers].filter(([, covered]) => covered > 0.05).map(([i]) => i);
            const [first, last] = [Math.min(...inked), Math.max(...inked)];
            return [first + 1 - covers.get(first)!, last + covers.get(last)!];
        };
        const [inkLeft, inkRight] = extent(columns);
        const [inkTop, inkBottom] = extent(rows);
        return {
            arrow: kbd.textContent,
            x: (inkLeft + inkRight) / 2 - (key.left + key.right) / 2,
            y: (inkTop + inkBottom) / 2 - (key.top + key.bottom) / 2,
        };
    });
}

let stylesheet: HTMLStyleElement;

describe("SpotlightDialog styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens {
                ${compoundTokens}
                ${compoundSemantic}
                ${compoundLightTheme}
                ${compoundLightSemantic}
                ${compoundDarkTheme}
                ${compoundDarkSemantic}
            }
            /* Compound's stylesheet defines the pill radius that --tl-radius-control stands for */
            @layer compound-web { ${compoundStyles} }
            ${sharedComponentsStyles}
            @layer app-web {
                /* What _common.pcss sets: the body font, and the search box's row of filter and input */
                body { font: var(--cpd-font-body-md-regular); }
                .mx_Dialog .mx_textinput { display: flex; align-items: center; }
                .mx_Dialog .mx_textinput > input[type="text"] { border: none; flex: 1; }
                ${toBrowserCss(spotlightStyles, fontSizes, lightTheme)}
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

    it("rounds the dialog's corners by its options' radius plus the padding around them", () => {
        document.body.innerHTML = spotlightDialog(["↓", "↑"]);
        const dialog = element(".mx_Dialog").getBoundingClientRect();
        const option = element(".mx_SpotlightDialog_option").getBoundingClientRect();
        const optionRadius = radii(".mx_SpotlightDialog_option").topLeft;

        const dialogRadius = optionRadius + (option.left - dialog.left);
        expect(dialog.right - option.right).toBe(option.left - dialog.left);
        expect(radii(".mx_Dialog")).toEqual({
            topLeft: dialogRadius,
            topRight: dialogRadius,
            bottomRight: dialogRadius,
            bottomLeft: dialogRadius,
        });
        // The search box fills the top of the dialog and the scrolling options its bottom
        expect(radii(".mx_SpotlightDialog_searchBox")).toEqual({
            topLeft: dialogRadius,
            topRight: dialogRadius,
            bottomRight: 0,
            bottomLeft: 0,
        });
        expect(radii("#mx_SpotlightDialog_content")).toEqual({
            topLeft: 0,
            topRight: 0,
            bottomRight: dialogRadius,
            bottomLeft: dialogRadius,
        });

        // The filter sits in the dialog's corner as far from its top edge as from its side, a pill as chips are
        const filter = element(".mx_SpotlightDialog_filter").getBoundingClientRect();
        expect(filter.top - dialog.top).toBe(filter.left - dialog.left);
        expect(cornerRadii(element(".mx_SpotlightDialog_filter"))).toEqual({
            x: filter.height / 2,
            y: filter.height / 2,
        });
    });

    it("rounds the dialog by 24px, as a row's 8px plus the 16px padding around the options", () => {
        document.body.innerHTML = spotlightDialog(["↓", "↑"]);

        expect(radii(".mx_Dialog").topLeft).toBe(24);
        expect(radii(".mx_SpotlightDialog_option").topLeft).toBe(8);
    });

    it("gives the options 8px above and below their 24px line", () => {
        document.body.innerHTML = spotlightDialog(["↓", "↑"]);
        const option = getComputedStyle(element(".mx_SpotlightDialog_option"));

        expect(option.paddingTop).toBe("8px");
        expect(option.paddingBottom).toBe("8px");
        expect(element(".mx_SpotlightDialog_option").getBoundingClientRect().height).toBe(40);
    });

    it("keeps the avatar and the last key or button 8px from the option's sides, as from its top and bottom", () => {
        document.body.innerHTML = spotlightDialog(["↓", "↑"], ["Design", "Developers"]);
        const [room, person] = [...document.querySelectorAll(".mx_SpotlightDialog_option")];
        const avatar = room.querySelector(".mx_BaseAvatar")!.getBoundingClientRect();
        const option = room.getBoundingClientRect();

        expect(avatar.top - option.top).toBe(8);
        expect(option.bottom - avatar.bottom).toBe(8);
        expect(avatar.left - option.left).toBe(8);
        // The bell of the selected room's result, and the enter key of a result without buttons once selected
        const bell = room.querySelector(".mx_SpotlightDialog_option--notifications")!.getBoundingClientRect();
        expect(option.right - bell.right).toBe(8);
        person.setAttribute("aria-selected", "true");
        const enter = person.querySelector(".mx_SpotlightDialog_enterPrompt")!.getBoundingClientRect();
        expect(person.getBoundingClientRect().right - enter.right).toBe(8);
    });

    it("lines the search text, the filter's icon, the section headers and the avatars up 24px from the dialog's edge", () => {
        document.body.innerHTML = spotlightDialog(["↓", "↑"]);
        const dialog = element(".mx_Dialog").getBoundingClientRect();
        const header = document.createRange();
        header.selectNodeContents(element(".mx_SpotlightDialog_section > h4"));
        const avatar = element(".mx_SpotlightDialog_option .mx_BaseAvatar").getBoundingClientRect();
        const filter = element(".mx_SpotlightDialog_filter");

        expect(header.getBoundingClientRect().left - dialog.left).toBe(24);
        expect(avatar.left - dialog.left).toBe(24);
        // The filter's box sits with the options' highlights, 16px in, and its icon with the avatars
        expect(filter.getBoundingClientRect().left - dialog.left).toBe(16);
        expect(filter.querySelector("svg")!.getBoundingClientRect().left - dialog.left).toBe(24);

        // Without the filter, the search text starts where the avatars do; after it, 8px after its end
        const input = element(".mx_SpotlightDialog_searchBox input");
        expect(input.getBoundingClientRect().left + parseFloat(getComputedStyle(input).paddingLeft)).toBe(
            filter.getBoundingClientRect().right + 8,
        );
        filter.remove();
        expect(input.getBoundingClientRect().left + parseFloat(getComputedStyle(input).paddingLeft) - dialog.left).toBe(
            24,
        );
    });

    it("keeps the dialog's height and scrolls the options inside its rounded bottom", () => {
        const wrapper = (count: number): string =>
            spotlightDialog(
                ["↓", "↑"],
                Array.from({ length: count }, (_, index) => `Room ${index}`),
            );
        document.body.innerHTML = wrapper(1);
        const height = element(".mx_Dialog").getBoundingClientRect().height;

        document.body.innerHTML = wrapper(20);
        const dialog = element(".mx_Dialog").getBoundingClientRect();
        const content = element("#mx_SpotlightDialog_content");
        expect(dialog.height).toBe(height);
        expect(content.scrollHeight).toBeGreaterThan(content.clientHeight);
        expect(content.getBoundingClientRect().bottom).toBe(dialog.bottom);
        expect(getComputedStyle(content).overflowY).toBe("auto");
    });

    it("rounds the keys of the scroll hint and the enter prompt by 4px, in a pill-shaped hint box", () => {
        document.body.innerHTML = spotlightDialog(["↓", "↑"]);

        for (const key of document.querySelectorAll("#mx_SpotlightDialog_keyboardPrompt kbd")) {
            expect(getComputedStyle(key).borderRadius).toBe("4px");
        }
        expect(radii(".mx_SpotlightDialog_enterPrompt").topLeft).toBe(4);
        const prompt = element("#mx_SpotlightDialog_keyboardPrompt");
        const height = prompt.getBoundingClientRect().height;
        expect(height).toBe(31);
        expect(cornerRadii(prompt)).toEqual({ x: height / 2, y: height / 2 });
    });

    it("keeps the hint box's corners those of one line when its words wrap", () => {
        document.body.innerHTML = spotlightDialog(["↓", "↑"]);
        const prompt = element("#mx_SpotlightDialog_keyboardPrompt") as HTMLElement;
        const oneLine = prompt.getBoundingClientRect().height;

        prompt.style.width = "80px";

        expect(prompt.getBoundingClientRect().height).toBeGreaterThan(oneLine);
        expect(cornerRadii(prompt)).toEqual({ x: oneLine / 2, y: oneLine / 2 });
    });

    it.each([[["↓", "↑"]], [["↓", "↑", "←", "→"]]])(
        "puts a small gap between the keys %j of the scroll hint, on one line with its words",
        (arrows) => {
            document.body.innerHTML = spotlightDialog(arrows);
            const keys = [...document.querySelectorAll("#mx_SpotlightDialog_keyboardPrompt kbd")].map((key) =>
                key.getBoundingClientRect(),
            );
            const words = document.createRange();
            words.selectNodeContents(element("#mx_SpotlightDialog_keyboardPrompt > span").firstChild!);

            expect(keys).toHaveLength(arrows.length);
            for (let i = 1; i < keys.length; i++) {
                expect(keys[i].left - keys[i - 1].right).toBe(2);
            }
            for (const key of keys) expect(centre(key)).toBe(centre(words.getBoundingClientRect()));
            // The words' line is centered in the box
            expect(centre(words.getBoundingClientRect())).toBe(
                centre(element("#mx_SpotlightDialog_keyboardPrompt").getBoundingClientRect()),
            );
        },
    );

    it("makes every key of the scroll hint a square of the line and 2px around it, its arrow drawn in the middle", () => {
        document.body.innerHTML = spotlightDialog(["↓", "↑", "←", "→"]);

        for (const key of document.querySelectorAll("#mx_SpotlightDialog_keyboardPrompt kbd")) {
            const box = key.getBoundingClientRect();
            expect(box.width).toBe(19);
            expect(box.height).toBe(19);
            const path = key.querySelector("path")!;
            const bounds = path.getBBox();
            const matrix = path.getScreenCTM()!;
            const start = new DOMPoint(bounds.x, bounds.y).matrixTransform(matrix);
            const end = new DOMPoint(bounds.x + bounds.width, bounds.y + bounds.height).matrixTransform(matrix);
            expect((start.x + end.x) / 2).toBeCloseTo(box.left + box.width / 2, 1);
            expect((start.y + end.y) / 2).toBeCloseTo(box.top + box.height / 2, 1);
            // The arrow's text stays for the search field's description, but takes no room
            expect(key.querySelector("span")!.getBoundingClientRect().width).toBeLessThanOrEqual(1);
        }
        expect(element("#mx_SpotlightDialog_keyboardPrompt").textContent).toBe("Use ↓↑←→ to scroll");
    });

    it.each([16, 17, 20])(
        "draws the arrows as tall as the hint's line, a whole 2px inside their keys, with a %ipx root font size",
        (rootSize) => {
            document.documentElement.style.fontSize = `${rootSize}px`;
            try {
                document.body.innerHTML = spotlightDialog(["↓", "↑", "←", "→"]);
                const lineHeight = parseFloat(
                    getComputedStyle(element("#mx_SpotlightDialog_keyboardPrompt")).lineHeight,
                );

                expect(lineHeight).toBe(Math.round((rootSize * 15) / 16));
                for (const key of document.querySelectorAll("#mx_SpotlightDialog_keyboardPrompt kbd")) {
                    const box = key.getBoundingClientRect();
                    const icon = key.querySelector("svg")!.getBoundingClientRect();
                    expect(icon.width).toBe(lineHeight);
                    expect(icon.height).toBe(lineHeight);
                    expect(icon.left - box.left).toBe(2);
                    expect(box.right - icon.right).toBe(2);
                    expect(icon.top - box.top).toBe(2);
                    expect(box.bottom - icon.bottom).toBe(2);
                }
            } finally {
                document.documentElement.style.fontSize = "";
            }
        },
    );

    // Browsers move an icon that starts half a pixel into its key to a whole pixel, which drew the arrows half a pixel
    // right of and below the middle; measured on the screen's pixels, as the box model can't show it. The hint lands
    // between pixels when the dialog is centered in an odd width (a layout offset) or the pill's width is odd (its
    // transform), so it is moved both ways
    it.each([
        ["light", 16],
        ["light", 17],
        ["light", 20],
        ["dark", 16],
    ])(
        "paints each arrow in the middle of its key at 1x and 2x, wherever the hint lands (%s, %ipx root)",
        async (theme, rootSize) => {
            document.documentElement.style.fontSize = `${rootSize}px`;
            document.body.innerHTML = spotlightDialog(["↓", "↑", "←", "→"], ["Home"], `cpd-theme-${theme}`);
            const prompt = element("#mx_SpotlightDialog_keyboardPrompt") as HTMLElement;
            try {
                for (const pixelRatio of [1, 2]) {
                    await setPixelRatio(pixelRatio);
                    for (const shift of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) {
                        for (const by of ["layout", "transform"]) {
                            prompt.style.margin = by === "layout" ? `${shift}px 0 0 ${shift}px` : "";
                            prompt.style.translate = by === "transform" ? `${shift}px ${shift}px` : "";
                            for (const { arrow, x, y } of await paintedArrowOffsets()) {
                                const where = `${arrow} at ${pixelRatio}x, moved by ${shift}px (${by})`;
                                expect(Math.abs(x), `${where}, across`).toBeLessThan(0.3);
                                expect(Math.abs(y), `${where}, down`).toBeLessThan(0.3);
                            }
                        }
                    }
                }
            } finally {
                await setPixelRatio(1);
                document.documentElement.style.fontSize = "";
            }
        },
        // 32 screen captures, which a busy machine slows down
        60_000,
    );

    it("keeps the recently viewed tiles 58px wide, their avatars in the middle 8px from the top", () => {
        document.body.innerHTML = spotlightDialog(["↓", "↑"]);
        element("#mx_SpotlightDialog_content").innerHTML = `
            <div class="mx_SpotlightDialog_section mx_SpotlightDialog_recentlyViewed" role="group">
                <h4>Recently viewed</h4>
                <div>${["Design", "Random"]
                    .map(
                        (name, index) =>
                            `<div class="mx_AccessibleButton mx_SpotlightDialog_option" role="option" ` +
                            `aria-selected="${index === 0}"><div class="mx_DecoratedRoomAvatar">` +
                            `<span class="mx_BaseAvatar" style="display: block; width: 32px; height: 32px"></span>` +
                            `</div>${name}</div>`,
                    )
                    .join("")}</div>
            </div>`;
        const dialog = element(".mx_Dialog").getBoundingClientRect();
        const tiles = [...document.querySelectorAll(".mx_SpotlightDialog_recentlyViewed .mx_SpotlightDialog_option")];

        for (const tile of tiles) {
            const box = tile.getBoundingClientRect();
            const avatar = tile.querySelector(".mx_BaseAvatar")!.getBoundingClientRect();
            expect(box.width).toBe(58);
            expect(avatar.top - box.top).toBe(8);
            expect(avatar.left - box.left).toBe(13);
            expect(box.right - avatar.right).toBe(13);
            // The name's line below it, 8px from the bottom
            expect(getComputedStyle(tile).paddingBottom).toBe("8px");
        }
        expect(tiles[1].getBoundingClientRect().left - tiles[0].getBoundingClientRect().right).toBe(16);
        // The first tile's highlight is inset as the options' are
        expect(tiles[0].getBoundingClientRect().left - dialog.left).toBe(16);
    });
});
