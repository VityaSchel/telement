/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundLightHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-base.css?raw";
import compoundLightHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-semantic.css?raw";
import compoundDarkHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-hc-base.css?raw";
import compoundDarkHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-hc-semantic.css?raw";

// The package's built bundle needs Node's `process`, so the views' DOM is written out below and their stylesheets are
// loaded from source
// eslint-disable-next-line no-restricted-imports
import eventTileViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileView.module.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import eventTileStyles from "../../res/css/views/rooms/_EventTile.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import lightHighContrastTheme from "../../res/themes/light-high-contrast/css/_light-high-contrast.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { colorChannels, tokenColor } from "../test/telement/computedStyle";

interface Theme {
    name: string;
    /** The theme stylesheets it is built from, in the order its entry point imports them. */
    sources: string[];
}

/** Dark high contrast is the dark theme on a system that asks for more contrast. */
const THEMES: Theme[] = [
    { name: "cpd-theme-light", sources: [lightTheme] },
    { name: "cpd-theme-dark", sources: [lightTheme, darkTheme] },
    { name: "cpd-theme-light-hc", sources: [lightTheme, lightHighContrastTheme] },
    { name: "cpd-theme-dark-hc", sources: [lightTheme, darkTheme] },
];

type Layout = "Bubble" | "Group" | "Irc";

interface RowOptions {
    own?: boolean;
    layout?: Layout;
    states?: string[];
}

/** A message as EventTileView lays it out, the last of its sender's run. */
function row(text: string, { own = false, layout = "Bubble", states = [] }: RowOptions = {}): string {
    const classes = [
        "root",
        "mx_EventTile",
        `layout${layout}`,
        own && "stateOwnEvent",
        "stateLastInSection",
        ...states,
    ];
    return `
        <li class="${classes.filter(Boolean).join(" ")}" data-testid="event-tile">
            <div class="line mx_EventTile_line">
                <div class="slotTimestamp"><a class="mx_MessageTimestamp" href="#">12:48</a></div>
                <div class="slotBody"><div class="mx_EventTile_content"><div class="mx_EventTile_body" dir="auto">${text} <a href="#">link</a></div></div></div>
            </div>
        </li>
    `;
}

let stylesheet: HTMLStyleElement;

/**
 * Loads the stylesheets. The test browser asks for reduced motion, so the motion variant drops the rules made for it,
 * as a browser that doesn't ask for it would.
 */
function loadStyles({ reducedMotion }: { reducedMotion: boolean }): void {
    const shared = reducedMotion
        ? eventTileViewStyles
        : eventTileViewStyles.replaceAll("(prefers-reduced-motion: reduce)", "not all");
    const themed = THEMES.map(
        ({ name, sources }) => `.${name} { ${toBrowserCss(eventTileStyles, commonStyles, fontSizes, ...sources)} }`,
    ).join("\n");
    stylesheet.textContent = `
        @layer compound-tokens, compound-web, shared-components, app-web;
        @layer compound-tokens {
            ${compoundBase} ${compoundSemantic}
            ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
            ${compoundLightHcTheme} ${compoundLightHcSemantic} ${compoundDarkHcTheme} ${compoundDarkHcSemantic}
        }
        @layer shared-components {
            ${telementTokens}
            ${shared.replace(/:global\(([^)]*)\)/g, "$1")}
        }
        @layer app-web { ${themed} }
    `;
}

/** Shows the rows in a room timeline of the theme. */
function render(theme: string, ...rows: string[]): HTMLElement {
    document.body.innerHTML = `
        <div class="${theme} mx_RoomView_body" style="width: 720px; background: var(--cpd-color-bg-canvas-default)">
            <div class="mx_RoomView_messagePanel"><ol class="mx_RoomView_MessageList">${rows.join("")}</ol></div>
        </div>
    `;
    return document.querySelector<HTMLElement>(`.${theme}`)!;
}

/** The tile's jump animation, paused at `time` milliseconds, or finished when `time` is past its end. */
function seekJump(tile: Element, time: number): void {
    const animation = tile.getAnimations().find((anim) => (anim as CSSAnimation).animationName === "jumpFlash");
    expect(animation).toBeDefined();
    animation!.pause();
    if (time >= Number(animation!.effect!.getComputedTiming().endTime)) animation!.finish();
    else animation!.currentTime = time;
}

/** The color a single-color `linear-gradient()`, as the jump band is drawn, paints. */
function gradientColor(image: string): string {
    if (image === "none") return "none";
    const match = image.match(/^linear-gradient\((.+), \1\)$/);
    expect(match).not.toBeNull();
    return match![1];
}

/** How far apart two computed colors are: their largest difference in a channel, the alpha's counted out of 255. */
function colorDistance(actual: string, expected: string): number {
    const [red, green, blue, alpha] = colorChannels(actual);
    const [eRed, eGreen, eBlue, eAlpha] = colorChannels(expected);
    return Math.max(
        Math.abs(red - eRed),
        Math.abs(green - eGreen),
        Math.abs(blue - eBlue),
        Math.abs(alpha - eAlpha) * 255,
    );
}

const alphaOf = (color: string): number => colorChannels(color)[3];

describe("Timeline navigation", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        document.head.append(stylesheet);
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    afterAll(() => {
        stylesheet.remove();
    });

    describe.each([false, true])("a message jumped to (reduced motion: %s)", (reducedMotion) => {
        beforeAll(() => loadStyles({ reducedMotion }));

        // Fades over 1.5s, or holds for 2s without motion
        const end = reducedMotion ? 2000 : 1500;

        it.each(THEMES)(
            "lights the bubble layout's band up with the selected band, then lets it go ($name)",
            ({ name }) => {
                const scope = render(name, row("Here it is", { states: ["stateJumpedTo"] }));
                const tile = scope.querySelector(".root")!;
                const band = tokenColor("--cpd-color-bg-subtle-primary", scope);

                seekJump(tile, 0);
                expect(
                    colorDistance(gradientColor(getComputedStyle(tile, "::before").backgroundImage), band),
                ).toBeLessThanOrEqual(1);

                seekJump(tile, end * 0.6);
                const midway = alphaOf(gradientColor(getComputedStyle(tile, "::before").backgroundImage));
                expect(midway).toBeGreaterThanOrEqual(reducedMotion ? 1 : 0.05);
                expect(midway).toBeLessThanOrEqual(reducedMotion ? 1 : 0.95);

                seekJump(tile, end);
                expect(alphaOf(gradientColor(getComputedStyle(tile, "::before").backgroundImage))).toBe(0);
            },
        );

        it.each(THEMES)(
            "fills your own bubble and its tail with the highlighted blue, then its own ($name)",
            ({ name }) => {
                const scope = render(name, row("Here it is", { own: true, states: ["stateJumpedTo"] }));
                const tile = scope.querySelector(".root")!;
                const line = tile.querySelector(".line")!;
                const highlighted = tokenColor("--tl-color-bg-bubble-own-highlighted", scope);
                const rest = tokenColor("--tl-color-bg-bubble-own", scope);

                seekJump(tile, 0);
                expect(colorDistance(getComputedStyle(line).backgroundColor, highlighted)).toBeLessThanOrEqual(1);
                expect(
                    colorDistance(getComputedStyle(line, "::after").backgroundColor, highlighted),
                ).toBeLessThanOrEqual(1);

                seekJump(tile, end);
                expect(colorDistance(getComputedStyle(line).backgroundColor, rest)).toBeLessThanOrEqual(1);
                expect(colorDistance(getComputedStyle(line, "::after").backgroundColor, rest)).toBeLessThanOrEqual(1);
            },
        );

        it.each<Layout>(["Group", "Irc"])("fades the %s layout's band and marker together", (layout) => {
            const scope = render("cpd-theme-light", row("Here it is", { layout, states: ["stateJumpedTo"] }));
            const tile = scope.querySelector(".root")!;
            const line = tile.querySelector(".line")!;

            seekJump(tile, 0);
            expect(
                colorDistance(
                    gradientColor(getComputedStyle(line).backgroundImage),
                    tokenColor("--event-tile-state-selected-background", tile),
                ),
            ).toBeLessThanOrEqual(1);
            expect(
                colorDistance(
                    getComputedStyle(line).boxShadow.replace(/\s+-?[\d.]+px.*$/, ""),
                    tokenColor("--event-tile-state-marker-color", tile),
                ),
            ).toBeLessThanOrEqual(1);

            seekJump(tile, end);
            expect(alphaOf(gradientColor(getComputedStyle(line).backgroundImage))).toBe(0);
        });

        it("keeps the selected band and fill of a message right-clicked while it fades", () => {
            const scope = render(
                "cpd-theme-light",
                row("Here it is", { own: true, states: ["stateJumpedTo", "stateSelected"] }),
            );
            const tile = scope.querySelector(".root")!;

            seekJump(tile, end);
            expect(
                colorDistance(
                    getComputedStyle(tile, "::before").backgroundColor,
                    tokenColor("--cpd-color-bg-subtle-primary", scope),
                ),
            ).toBeLessThanOrEqual(1);
            expect(
                colorDistance(
                    getComputedStyle(tile.querySelector(".line")!).backgroundColor,
                    tokenColor("--tl-color-bg-bubble-own-highlighted", scope),
                ),
            ).toBeLessThanOrEqual(1);
        });

        it("leaves a message that wasn't jumped to alone", () => {
            const scope = render("cpd-theme-light", row("Elsewhere"));
            const tile = scope.querySelector(".root")!;

            expect(tile.getAnimations()).toHaveLength(0);
            expect(getComputedStyle(tile, "::before").backgroundImage).toBe("none");
        });
    });
});
