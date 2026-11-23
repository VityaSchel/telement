/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
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
// eslint-disable-next-line no-restricted-imports
import unreadMentionsButtonViewStyles from "../../../../packages/shared-components/src/telement/room/timeline/UnreadMentionsButtonView/UnreadMentionsButtonView.module.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import eventTileStyles from "../../res/css/views/rooms/_EventTile.pcss?raw";
import focusRingStyles from "../../res/css/telement/FocusRing.pcss?raw";
import unreadMentionsButtonStyles from "../../res/css/telement/_UnreadMentionsButton.pcss?raw";
import jumpToBottomButtonStyles from "../../res/css/views/rooms/_JumpToBottomButton.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import lightHighContrastTheme from "../../res/themes/light-high-contrast/css/_light-high-contrast.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { colorChannels, contrastOver, tokenColor } from "../test/telement/computedStyle";

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

/** A message as EventTileView lays it out, the last of its sender's run, with a link and a reaction to focus. */
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
                <div class="slotFooter"><button type="button" class="reaction">👍 2</button></div>
            </div>
        </li>
    `;
}

/** An informational row ("Alice joined the room"), whose text is drawn on the row's band in the secondary color. */
function infoRow(text: string): string {
    return `
        <li class="root mx_EventTile layoutBubble stateInfo stateLastInSection" data-testid="event-tile">
            <div class="line mx_EventTile_line">
                <div class="slotBody"><div class="info" style="color: var(--cpd-color-text-secondary)">${text}</div></div>
                <div class="slotTimestamp"><a class="mx_MessageTimestamp" href="#">12:48</a></div>
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
            ${focusRingStyles}
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

/** A CSS module's stylesheet with its local class names prefixed by the module's name, as the library build does. */
function moduleCss(source: string, name: string): string {
    return source.replace(/\.(-?[_a-zA-Z][\w-]*)/g, `.${name}_$1`);
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

/** How far apart two opaque colors look: their distance in OKLab, in hundredths, where about 2 is just noticeable. */
function perceivedDistance(first: string, second: string): number {
    const oklab = (color: string): number[] => {
        const [red, green, blue] = colorChannels(color)
            .slice(0, 3)
            .map((channel) => {
                const value = channel / 255;
                return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
            });
        const [l, m, s] = [
            0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue,
            0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
            0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue,
        ].map(Math.cbrt);
        return [
            0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
        ];
    };
    const [a, b] = [oklab(first), oklab(second)];
    return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Moves the focus from the page to the element with the Tab key, as a keyboard user does. */
async function tabTo(element: HTMLElement): Promise<void> {
    for (let i = 0; i < 10 && document.activeElement !== element; i++) await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(element);
    expect(element.matches(":focus-visible")).toBe(true);
}

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

    describe("the message the keyboard is on", () => {
        beforeAll(() => loadStyles({ reducedMotion: true }));

        it.each(THEMES)(
            "takes the accent's tint, which stands apart from the page and every bubble ($name)",
            async ({ name }) => {
                const scope = render(
                    name,
                    row("Mine", { own: true }),
                    row("Focused"),
                    row("Selected", { states: ["stateSelected"] }),
                );
                const [own, focused, selected] = scope.querySelectorAll<HTMLElement>(".root");
                await tabTo(focused.querySelector<HTMLElement>(".mx_MessageTimestamp")!);

                const page = getComputedStyle(scope).backgroundColor;
                const band = getComputedStyle(focused, "::before").backgroundColor;
                const grayBand = getComputedStyle(selected, "::before").backgroundColor;
                const bubble = getComputedStyle(focused.querySelector(".line")!).backgroundColor;
                const ownBubble = getComputedStyle(own.querySelector(".line")!).backgroundColor;
                const hoverBand = tokenColor("--event-tile-state-hover-background", focused);

                expect(colorDistance(band, tokenColor("--tl-color-bg-message-focused", scope))).toBeLessThanOrEqual(1);
                // At least the room list's hover (about 1.12:1) on the page
                expect(contrastOver(band, page)).toBeGreaterThanOrEqual(1.2);
                // Other people's bubbles stand out on it clearly more than on the gray band, which is a step from them
                expect(perceivedDistance(band, bubble)).toBeGreaterThanOrEqual(
                    Math.max(6, 1.5 * perceivedDistance(grayBand, bubble)),
                );
                expect(perceivedDistance(band, grayBand)).toBeGreaterThanOrEqual(3);
                expect(perceivedDistance(band, hoverBand)).toBeGreaterThanOrEqual(6);
                // Your own bubble keeps 3:1 on it, or as much as it has on the gray band where that is less
                expect(contrastOver(ownBubble, band)).toBeGreaterThanOrEqual(
                    Math.min(3, contrastOver(ownBubble, grayBand)) - 0.05,
                );
            },
        );

        it.each(THEMES)("keeps the secondary text drawn on it at 4.5:1 ($name)", async ({ name }) => {
            const scope = render(name, infoRow("Alice joined the room"));
            const tile = scope.querySelector<HTMLElement>(".root")!;
            await tabTo(tile.querySelector<HTMLElement>(".mx_MessageTimestamp")!);

            const band = getComputedStyle(tile, "::before").backgroundColor;
            expect(colorDistance(band, tokenColor("--tl-color-bg-message-focused", scope))).toBeLessThanOrEqual(1);
            expect(contrastOver(getComputedStyle(tile.querySelector(".info")!).color, band)).toBeGreaterThanOrEqual(
                4.5,
            );
        });

        it("keeps the ring on the focused link", async () => {
            const scope = render("cpd-theme-light", row("Focused"));
            const link = scope.querySelector<HTMLElement>(".mx_EventTile_body a")!;
            await tabTo(link);

            expect(getComputedStyle(link).outlineStyle).toBe("solid");
            expect(getComputedStyle(link).outlineWidth).toBe("2px");
        });

        it.each<Layout>(["Group", "Irc"])("fills the %s layout's line with it", async (layout) => {
            const scope = render("cpd-theme-light", row("Focused", { layout }));
            const tile = scope.querySelector<HTMLElement>(".root")!;
            await tabTo(tile.querySelector<HTMLElement>(".mx_MessageTimestamp")!);

            const band = getComputedStyle(tile.querySelector(".line")!).backgroundColor;
            expect(colorDistance(band, tokenColor("--tl-color-bg-message-focused", scope))).toBeLessThanOrEqual(1);
            expect(contrastOver(tokenColor("--cpd-color-text-secondary", tile), band)).toBeGreaterThanOrEqual(4.5);
        });

        it("leaves a message focused with the mouse, or being edited, without the band", async () => {
            const scope = render("cpd-theme-light", row("Clicked"), row("Edited", { states: ["stateEditing"] }));
            const [clicked, edited] = scope.querySelectorAll<HTMLElement>(".root");

            await userEvent.click(clicked.querySelector(".reaction")!);
            expect(document.activeElement).toBe(clicked.querySelector(".reaction"));
            expect(getComputedStyle(clicked, "::before").backgroundColor).toBe("rgba(0, 0, 0, 0)");

            // Its time is hidden while it is edited
            await tabTo(edited.querySelector<HTMLElement>(".mx_EventTile_body a")!);
            expect(getComputedStyle(edited, "::before").backgroundColor).toBe("rgba(0, 0, 0, 0)");
        });
    });

    describe("the unread mentions button", () => {
        beforeAll(() => {
            stylesheet.textContent = `
                @layer compound-tokens, compound-web, shared-components, app-web;
                @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} }
                @layer shared-components {
                    ${telementTokens}
                    ${moduleCss(unreadMentionsButtonViewStyles, "UnreadMentionsButtonView")}
                }
                @layer app-web {
                    ${toBrowserCss(jumpToBottomButtonStyles, commonStyles, lightTheme)}
                    ${toBrowserCss(unreadMentionsButtonStyles)}
                }
            `;
        });

        /** The timeline with the jump to bottom button, if shown, and the mentions button, as RoomView draws them. */
        function renderButtons(jumpToBottom: boolean): { timeline: DOMRect; mentions: DOMRect; jump?: DOMRect } {
            document.body.innerHTML = `
                <main class="cpd-theme-light" style="position: relative; width: 600px; height: 400px">
                    ${
                        jumpToBottom
                            ? `<div class="mx_JumpToBottomButton"><div class="mx_JumpToBottomButton_scrollDown" role="button"></div></div>`
                            : ""
                    }
                    <div class="UnreadMentionsButtonView_unreadMentions mx_UnreadMentionsButton${jumpToBottom ? " mx_UnreadMentionsButton_stacked" : ""}">
                        <button type="button" class="UnreadMentionsButtonView_button">@</button>
                        <span class="UnreadMentionsButtonView_counter">2</span>
                    </div>
                </main>
            `;
            const box = (selector: string): DOMRect => document.querySelector(selector)!.getBoundingClientRect();
            return {
                timeline: box("main"),
                mentions: box(".UnreadMentionsButtonView_button"),
                jump: jumpToBottom ? box(".mx_JumpToBottomButton_scrollDown") : undefined,
            };
        }

        it("stands 8px above the jump to bottom button, on its end", () => {
            const { mentions, jump } = renderButtons(true);

            expect(mentions.width).toBe(36);
            expect(jump!.top - mentions.bottom).toBe(8);
            expect(mentions.right).toBe(jump!.right);
        });

        it("takes the jump to bottom button's place while that is hidden", () => {
            const { timeline, mentions } = renderButtons(false);

            // Where the jump to bottom button's circle is: 24px from the timeline's bottom and end
            expect(timeline.bottom - mentions.bottom).toBe(24);
            expect(timeline.right - mentions.right).toBe(24);
        });
    });
});
