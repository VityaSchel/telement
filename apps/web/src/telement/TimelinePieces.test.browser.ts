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

// The package's built bundle needs Node's `process`, so the views' DOM is written out below and their stylesheets are
// loaded from source
// eslint-disable-next-line no-restricted-imports
import eventTileViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileView.module.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import pollOptionStyles from "../../res/css/components/views/polls/_PollOption.pcss?raw";
import styledRadioButtonStyles from "../../res/css/views/elements/_StyledRadioButton.pcss?raw";
import pollBodyStyles from "../../res/css/views/messages/_MPollBody.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { loadInter } from "../test/telement/fonts";

type Layout = "group" | "irc" | "bubble";

const LAYOUT_CLASS: Record<Layout, string> = { group: "layoutGroup", irc: "layoutIrc", bubble: "layoutBubble" };

/** A poll's option after the reader voted, as PollOption renders it. */
function option(text: string, votes: string, percent: number): string {
    return `
        <div class="mx_PollOption">
            <label class="mx_StyledRadioButton mx_PollOption_live-option mx_StyledRadioButton_enabled">
                <input type="radio" name="poll" value="${text}" aria-label="${text}, ${votes}">
                <div><div></div></div>
                <div class="mx_StyledRadioButton_content">
                    <div aria-hidden="true">
                        <div class="mx_PollOption_content">
                            <div class="mx_PollOption_optionText">${text}</div>
                            <div class="mx_PollOption_optionVoteCount">${votes}</div>
                        </div>
                    </div>
                </div>
                <div class="mx_StyledRadioButton_spacer"></div>
            </label>
            <div class="mx_PollOption_popularityBackground">
                <div class="mx_PollOption_popularityAmount" style="width: ${percent}%"></div>
            </div>
        </div>
    `;
}

/** A poll in the timeline, as EventTileView renders MPollBody in the line's body slot. */
function render(
    layout: Layout,
    {
        own = false,
        dir = "ltr",
        width = 880,
        question = "Where should we have the team lunch?",
        summary = "Based on 4 votes",
    }: { own?: boolean; dir?: "ltr" | "rtl"; width?: number; question?: string; summary?: string } = {},
): void {
    const bubbleClass = layout === "bubble" ? " mx_MPollBody_bubble" : "";
    document.body.innerHTML = `
        <ol class="cpd-theme-light${layout === "irc" ? " mx_IRCLayout" : ""}" dir="${dir}"
            style="width: ${width}px; margin: 0; padding: 0; list-style: none; font-family: Inter">
            <li class="root mx_EventTile ${LAYOUT_CLASS[layout]} stateLastInSection${own ? " stateOwnEvent" : ""}">
                <div class="line mx_EventTile_line">
                    <div class="slotTimestamp"><a class="mx_MessageTimestamp">12:41</a></div>
                    <div class="slotBody">
                        <fieldset class="mx_MPollBody${bubbleClass}">
                            <legend><svg width="20" height="20" viewBox="0 0 24 24"></svg>${question}</legend>
                            <div class="mx_MPollBody_allOptions">
                                ${option("Pizza place", "1 vote", 20)}
                                ${option("Ramen bar", "3 votes", 60)}
                            </div>
                            <div class="mx_MPollBody_totalVotes">${summary}</div>
                        </fieldset>
                    </div>
                </div>
            </li>
        </ol>
    `;
}

const box = (selector: string): DOMRect => document.querySelector(selector)!.getBoundingClientRect();
const boxes = (selector: string): DOMRect[] =>
    [...document.querySelectorAll(selector)].map((element) => element.getBoundingClientRect());
const style = (selector: string): CSSStyleDeclaration => getComputedStyle(document.querySelector(selector)!);

/** What a color token resolves to, as a computed background color. */
function tokenColor(token: string): string {
    const probe = document.createElement("div");
    probe.style.backgroundColor = `var(${token})`;
    document.querySelector("ol")!.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
}

/**
 * Where the baseline of an element's last line of text is: an empty inline-block at the end of its text sits on it.
 * The element's children move into a span that holds it, so it is read last.
 */
function baselineOf(selector: string): number {
    const element = document.querySelector(selector)!;
    const text = document.createElement("span");
    text.append(...element.childNodes);
    const probe = document.createElement("span");
    probe.style.cssText = "display: inline-block; width: 0; height: 0";
    text.append(probe);
    element.append(text);
    return probe.getBoundingClientRect().bottom;
}

let stylesheet: HTMLStyleElement;
let unloadInter: () => void;

describe("A poll in the bubble layout", () => {
    beforeAll(async () => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, shared-components, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic}
            }
            @layer shared-components {
                ${telementTokens}
                ${eventTileViewStyles.replace(/:global\(([^)]*)\)/g, "$1")}
            }
            @layer app-web {
                /* The theme's own variable, which the app's font stack reads: without it the timestamp has no font */
                :root { --emoji-font-family: ""; }
                ${toBrowserCss(commonStyles, commonStyles, fontSizes, lightTheme)}
                ${toBrowserCss(pollBodyStyles, fontSizes, lightTheme)}
                ${toBrowserCss(pollOptionStyles, fontSizes, lightTheme)}
                ${toBrowserCss(styledRadioButtonStyles, commonStyles, fontSizes, lightTheme)}
            }
        `;
        document.head.append(stylesheet);
        unloadInter = await loadInter();
    });

    afterAll(() => {
        stylesheet.remove();
        unloadInter();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it.each([false, true])("is drawn in a bubble, which is its options' card (own: %s)", (own) => {
        render("bubble", { own });

        expect(style(".line").backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
        for (const option of document.querySelectorAll(".mx_PollOption")) {
            expect(getComputedStyle(option).borderTopWidth).toBe("0px");
            expect(getComputedStyle(option).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        }
    });

    it("starts the question at the bubble's padding, as a text bubble starts its text", () => {
        render("bubble");

        expect(box("legend").top - box(".line").top).toBe(8);
        expect(box("legend").left - box(".line").left).toBe(12);
    });

    it.each<"ltr" | "rtl">(["ltr", "rtl"])(
        "starts what the question's icon draws and the radios' rings on the bubble's text edge, with the bars (%s)",
        (dir) => {
            render("bubble", { dir });
            const contentStart = box(".mx_PollOption_popularityBackground")[dir === "ltr" ? "left" : "right"];
            const icon = box("legend svg");

            // The poll icon draws 2px inside its 20px box
            expect(dir === "ltr" ? icon.left + 2 : icon.right - 2).toBe(contentStart);
            for (const ring of boxes(".mx_PollOption input + div")) {
                expect(dir === "ltr" ? ring.left : ring.right).toBe(contentStart);
            }
        },
    );

    it("centers each option's radio on its label's line", () => {
        render("bubble");

        for (const option of document.querySelectorAll(".mx_PollOption")) {
            const radio = option.querySelector("input + div")!.getBoundingClientRect();
            const label = option.querySelector(".mx_PollOption_optionText")!.getBoundingClientRect();
            expect(radio.top + radio.height / 2).toBe(label.top + label.height / 2);
        }
    });

    it.each<Layout>(["bubble", "group"])(
        "keeps the question's icon on its first line when the question wraps (%s)",
        (layout) => {
            render(layout, {
                width: 320,
                question: "Which day works best for the offsite planning session with the design team next month?",
            });
            const legend = box("legend");
            const lineHeight = parseFloat(style("legend").lineHeight);
            const icon = box("legend svg");

            expect(legend.height).toBeGreaterThan(2 * lineHeight);
            expect(icon.top + icon.height / 2).toBe(legend.top + lineHeight / 2);
        },
    );

    it.each<"ltr" | "rtl">(["ltr", "rtl"])(
        "lines the options' bars and vote counts up with the bubble's text, 12px from both of its ends (%s)",
        (dir) => {
            render("bubble", { dir });
            const line = box(".line");
            const lineStyle = style(".line");
            const [startPadding, endPadding] = [lineStyle.paddingInlineStart, lineStyle.paddingInlineEnd].map(
                parseFloat,
            );
            const [contentStart, contentEnd] =
                dir === "ltr"
                    ? [line.left + startPadding, line.right - endPadding]
                    : [line.right - startPadding, line.left + endPadding];

            expect(startPadding).toBe(12);
            expect(endPadding).toBe(12);
            for (const bar of boxes(".mx_PollOption_popularityBackground")) {
                expect(dir === "ltr" ? bar.left : bar.right).toBe(contentStart);
                expect(dir === "ltr" ? bar.right : bar.left).toBe(contentEnd);
            }
            for (const count of boxes(".mx_PollOption_optionVoteCount")) {
                expect(dir === "ltr" ? count.right : count.left).toBe(contentEnd);
            }
        },
    );

    it("ends on its vote summary, the bubble's last line, level with the timestamp", () => {
        render("bubble");
        const summary = box(".mx_MPollBody_totalVotes");

        expect(box(".line").bottom - summary.bottom).toBe(8);
        expect(box(".slotTimestamp").bottom).toBe(summary.bottom);
        // One line of the bubble's text
        expect(summary.height).toBe(20);
    });

    it.each([false, true])(
        "keeps the end of its vote summary's last line free for the timestamp when the summary wraps (own: %s)",
        (own) => {
            render("bubble", { own, width: 380, summary: "512 votes cast. Vote to see the results" });
            const range = document.createRange();
            range.selectNodeContents(document.querySelector(".mx_MPollBody_totalVotes")!);
            const lines = [...range.getClientRects()].filter((rect) => rect.width > 0);
            const lastLine = lines.filter((rect) => rect.bottom === lines.at(-1)!.bottom);
            const summary = box(".mx_MPollBody_totalVotes");
            const textEnd = summary.right - parseFloat(style(".mx_MPollBody_totalVotes").paddingInlineEnd);
            const time = box(".mx_MessageTimestamp");

            expect(new Set(lines.map((rect) => rect.bottom)).size).toBeGreaterThan(1);
            expect(box(".slotTimestamp").bottom).toBe(summary.bottom);
            // The timestamp's 8px gap from the text before it, however the summary's words wrap
            expect(time.left - textEnd).toBeGreaterThanOrEqual(8);
            expect(time.left - Math.max(...lastLine.map((rect) => rect.right))).toBeGreaterThanOrEqual(8);
            expect(
                Math.abs(baselineOf(".mx_MessageTimestamp") - baselineOf(".mx_MPollBody_totalVotes")),
            ).toBeLessThanOrEqual(0.5);
        },
    );

    it.each(["", "20px"])("puts the timestamp on its vote summary's baseline at the root font size %s", (fontSize) => {
        document.documentElement.style.fontSize = fontSize;
        try {
            render("bubble");

            expect(
                Math.abs(baselineOf(".mx_MessageTimestamp") - baselineOf(".mx_MPollBody_totalVotes")),
            ).toBeLessThanOrEqual(0.5);
        } finally {
            document.documentElement.style.fontSize = "";
        }
    });

    it("shows its bars' track in a translucent gray, which reads on the other's and the own bubble's color", () => {
        render("bubble");

        expect(style(".mx_PollOption_popularityBackground").backgroundColor).toBe(
            tokenColor("--cpd-color-alpha-gray-400"),
        );
    });

    it.each<Layout>(["group", "irc"])("keeps its options' 8px cards in the %s layout", (layout) => {
        render(layout);
        const option = style(".mx_PollOption");

        expect(option.borderTopWidth).toBe("1px");
        expect(option.borderTopLeftRadius).toBe("8px");
        expect(option.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
        expect(style(".mx_PollOption_popularityBackground").backgroundColor).not.toBe(
            tokenColor("--cpd-color-alpha-gray-400"),
        );
    });
});
