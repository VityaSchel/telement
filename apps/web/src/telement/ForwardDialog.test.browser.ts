/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CheckCircleIcon, CloseIcon, SendIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
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

// The package's built bundle needs Node's `process`, so the preview's message is written out below and its stylesheet
// is loaded from source, with its local class names
// eslint-disable-next-line no-restricted-imports
import eventTileViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileView.module.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import searchBoxStyles from "../../res/css/structures/_SearchBox.pcss?raw";
import decoratedRoomAvatarStyles from "../../res/css/views/avatars/_DecoratedRoomAvatar.pcss?raw";
import forwardDialogStyles from "../../res/css/views/dialogs/_ForwardDialog.pcss?raw";
import accessibleButtonStyles from "../../res/css/views/elements/_AccessibleButton.pcss?raw";
import headingStyles from "../../res/css/views/typography/_Heading.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";
import { loadInter } from "../test/telement/fonts";

/** In the order _components.pcss imports them, Heading's last, as BaseDialog's title has to win over it. */
const APP_STYLES = [
    commonStyles,
    searchBoxStyles,
    decoratedRoomAvatarStyles,
    forwardDialogStyles,
    accessibleButtonStyles,
    headingStyles,
];

/** The size of the app window in the screenshots the dialog was measured in. */
const WINDOW = { width: 1280, height: 800 };
/** The browser project's own viewport (vitest.config.ts), restored for the files after this one. */
const TEST_VIEWPORT = { width: 960, height: 720 };

const THEMES = ["cpd-theme-light", "cpd-theme-dark", "cpd-theme-light-hc", "cpd-theme-dark-hc"];

const icon = (Icon: typeof SendIcon): string => renderToStaticMarkup(createElement(Icon));

/** BaseAvatar's circle, at the size the dialog asks for. */
const avatar = (letter: string): string =>
    `<span class="mx_BaseAvatar" role="presentation" style="display: inline-flex; width: 36px; height: 36px; border-radius: 50%; background: gray">${letter}</span>`;

interface EntryOptions {
    /** What RoomContextDetails says about the room, if anything. */
    detail?: string;
    /** Whether the arrow keys have selected the room. */
    active?: boolean;
    state?: "canSend" | "noPermission" | "sent";
}

/** A room as ForwardDialog's Entry renders it: the room's button, then the send button in the given state. */
function entry(name: string, { detail = "", active = false, state = "canSend" }: EntryOptions = {}): string {
    const id = `mx_ForwardDialog_entry_${name.replace(/\W/g, "")}`;
    const sendClasses = {
        canSend: "mx_ForwardList_canSend",
        noPermission: "mx_ForwardList_canSend mx_AccessibleButton_disabled",
        sent: "mx_ForwardList_sent mx_AccessibleButton_disabled",
    }[state];
    const label = { canSend: "Send", noPermission: "You don't have permission to do this", sent: "Sent" }[state];
    return `
        <div class="mx_ForwardList_entry ${active ? "mx_ForwardList_entry_active" : ""}" role="listitem" id="${id}" data-testid="${name}">
            <div tabindex="${active ? 0 : -1}" role="button" aria-label="Open room" class="mx_AccessibleButton mx_ForwardList_roomButton">
                <div class="mx_DecoratedRoomAvatar">${avatar(name[0])}</div>
                <span class="mx_ForwardList_entry_text">
                    <span class="mx_ForwardList_entry_name">${name}</span>
                    <span class="mx_ForwardList_entry_detail">${detail}</span>
                </span>
            </div>
            <div tabindex="${active ? 0 : -1}" role="button" aria-label="${label}" class="mx_AccessibleButton mx_ForwardList_sendButton ${sendClasses}" ${state === "canSend" ? "" : 'aria-disabled="true"'}>
                ${icon(state === "sent" ? CheckCircleIcon : SendIcon)}
            </div>
        </div>
    `;
}

/**
 * ForwardDialog in its Modal and BaseDialog frame: the title, your own message in a bubble as the preview, the search
 * field and the rooms, the first of which the arrow keys select.
 */
function renderDialog(theme = "cpd-theme-light", dir = "ltr"): void {
    const stage = document.createElement("div");
    stage.className = theme;
    // The theme defines the emoji font, which the app's font stack refers to; without it, Compound's font tokens fail
    stage.style.cssText = "--emoji-font-family: ''; font-family: Inter";
    stage.innerHTML = `
        <div class="mx_Dialog_wrapper">
            <div class="mx_Dialog_border">
                <div class="mx_Dialog" data-testid="body" dir="${dir}">
                    <div class="mx_ForwardDialog" role="dialog">
                        <div class="mx_Dialog_header">
                            <h1 class="mx_Heading_h3 mx_Dialog_title" id="mx_BaseDialog_title">Forward message</h1>
                        </div>
                        <h3>Message preview</h3>
                        <div class="mx_ForwardDialog_preview" data-layout="bubble">
                            <div class="root mx_EventTile stateOwnEvent stateLastInSection layoutBubble">
                                <div class="line mx_EventTile_line" data-testid="bubble">
                                    <div class="slotTimestamp"><a class="mx_MessageTimestamp">19:24</a></div>
                                    <div class="slotBody">
                                        <div class="mx_MTextBody mx_EventTile_content" data-event-layout="bubble">
                                            <div class="mx_EventTile_body" dir="auto">Can you check the dark theme as well?</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <hr>
                        <div class="mx_ForwardList">
                            <div class="mx_SearchBox mx_textinput">
                                <input class="mx_textinput_icon mx_textinput_search" placeholder="Search for rooms or people" type="text" data-testid="search">
                            </div>
                            <div class="mx_AutoHideScrollbar mx_ForwardList_content" data-testid="list">
                                <div class="mx_ForwardList_results">
                                    <div class="mx_ForwardList_resultsList" role="list">${ROOMS}</div>
                                </div>
                            </div>
                        </div>
                        <div class="mx_AccessibleButton mx_Dialog_cancelButton" role="button" aria-label="Close dialog">${icon(CloseIcon)}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.append(stage);
}

const ROOMS = [
    entry("Media and more", { active: true }),
    entry("Studio chat", { detail: "Studio" }),
    entry("Bob", { detail: "@bob:example.org" }),
    entry("Read only", { state: "noPermission" }),
    entry("Project 10", { state: "sent" }),
].join("");

function get(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`nothing matches ${selector}`);
    return element;
}

function box(selector: string): DOMRect {
    return get(selector).getBoundingClientRect();
}

function middle({ top, height }: DOMRect): number {
    return top + height / 2;
}

function row(name: string): HTMLElement {
    return get(`[data-testid="${name}"]`);
}

function sendButton(name: string): HTMLElement {
    return row(name).querySelector<HTMLElement>(".mx_ForwardList_sendButton")!;
}

function fill(element: Element): string {
    return getComputedStyle(element).backgroundColor;
}

/** What a token resolves to inside the dialog's body, which points the hover and pressed fills at its raised grays. */
function dialogColor(token: string): string {
    return tokenColor(token, get("[data-testid=body]"));
}

function channels(color: string): number[] {
    return color.match(/\d+(\.\d+)?/g)!.map(Number);
}

/** WCAG's contrast ratio between two opaque `rgb()` colors. */
function contrast(first: string, second: string): number {
    const luminance = (color: string): number => {
        const [red, green, blue] = channels(color).map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
}

/** The color `top`, which may be translucent, drawn over the opaque `bottom`, as an opaque `rgb()` color. */
function over(top: string, bottom: string): string {
    const [red, green, blue, alpha = 1] = channels(top);
    const under = channels(bottom);
    const mixed = [red, green, blue].map((channel, i) => Math.round(channel * alpha + under[i] * (1 - alpha)));
    return `rgb(${mixed.join(", ")})`;
}

let stylesheet: HTMLStyleElement;
let unloadInter: () => void;

describe("The Forward dialog", () => {
    beforeAll(async () => {
        await page.viewport(WINDOW.width, WINDOW.height);
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, shared-components, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic}
                ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
                ${compoundLightHcTheme} ${compoundLightHcSemantic} ${compoundDarkHcTheme} ${compoundDarkHcSemantic}
            }
            @layer shared-components {
                ${telementTokens}
                ${eventTileViewStyles.replace(/:global\(([^)]*)\)/g, "$1")}
            }
            @layer app-web {
                body { margin: 0; }
                ${APP_STYLES.map((styles) => toBrowserCss(styles, commonStyles, fontSizes, lightTheme)).join("\n")}
            }
        `;
        document.head.append(stylesheet);
        unloadInter = await loadInter();
    });

    afterAll(async () => {
        stylesheet.remove();
        unloadInter();
        await page.viewport(TEST_VIEWPORT.width, TEST_VIEWPORT.height);
    });

    afterEach(async () => {
        await userEvent.unhover(document.body);
        document.body.innerHTML = "";
    });

    describe("anatomy", () => {
        it("is a 640px list dialog with the 20px title on the close button's line and its content on the 24px edge", () => {
            renderDialog();
            const body = box("[data-testid=body]");
            const title = getComputedStyle(get(".mx_Dialog_title"));

            expect(body.width).toBe(640);
            expect([title.fontSize, title.fontWeight]).toEqual(["20px", "600"]);
            expect(middle(box(".mx_Dialog_title"))).toBe(middle(box(".mx_Dialog_cancelButton")));
            for (const selector of [".mx_Dialog_title", ".mx_ForwardDialog > h3", ".mx_SearchBox", "hr"]) {
                expect(box(selector).left - body.left).toBe(24);
            }
            expect(body.right - box(".mx_SearchBox").right).toBe(24);
            expect(body.right - box("hr").right).toBe(24);
        });

        it("heads the preview as Start chat heads its suggestions, 16px under the title and 8px over the bubble", () => {
            renderDialog();
            const heading = getComputedStyle(get(".mx_ForwardDialog > h3"));

            expect([heading.fontSize, heading.fontWeight]).toEqual(["13px", "600"]);
            expect(heading.color).toBe(dialogColor("--cpd-color-text-secondary"));
            expect(box(".mx_ForwardDialog > h3").top - box(".mx_Dialog_title").bottom).toBe(16);
            expect(box("[data-testid=bubble]").top - box(".mx_ForwardDialog > h3").bottom).toBe(8);
        });

        it("ends your own bubble's tail on the content edge, with no column for read receipts", () => {
            renderDialog();
            const bubble = get("[data-testid=bubble]");
            const tail = getComputedStyle(bubble, "::after");
            const tailEnd = bubble.getBoundingClientRect().right - parseFloat(tail.right);

            expect(tail.width).toBe("6px");
            expect(box("[data-testid=body]").right - tailEnd).toBe(24);
        });

        it("divides the preview from the rooms in the one divider color, 16px from each, and the list 16px under the search", () => {
            renderDialog();
            const divider = box("hr");

            expect(getComputedStyle(get("hr")).borderTopColor).toBe(dialogColor("--cpd-color-separator-primary"));
            expect(divider.height).toBe(1);
            expect(divider.top - box("[data-testid=bubble]").bottom).toBe(16);
            expect(box(".mx_SearchBox").top - divider.bottom).toBe(16);
            expect(row("Media and more").getBoundingClientRect().top - box(".mx_SearchBox").bottom).toBe(16);
        });
    });

    describe("rooms", () => {
        it("are 52px rows highlighted 8px outside the content edge, the 36px avatar on it 8px from the row's start, top and bottom", () => {
            renderDialog();
            const body = box("[data-testid=body]");

            for (const name of ["Media and more", "Studio chat", "Bob"]) {
                const entry = row(name).getBoundingClientRect();
                const roomAvatar = row(name).querySelector(".mx_BaseAvatar")!.getBoundingClientRect();

                expect(entry.height).toBe(52);
                expect([entry.left - body.left, body.right - entry.right]).toEqual([16, 16]);
                expect([
                    roomAvatar.left - entry.left,
                    roomAvatar.top - entry.top,
                    entry.bottom - roomAvatar.bottom,
                ]).toEqual([8, 8, 8]);
                expect(roomAvatar.left - body.left).toBe(24);
            }
            expect(getComputedStyle(row("Bob")).borderTopLeftRadius).toBe("8px");

            // With no rooms to show, the list's message is back on the content edge
            document.body.innerHTML = "";
            renderDialog();
            get(".mx_ForwardList_results").outerHTML = `<span class="mx_ForwardList_noResults">No results</span>`;
            expect(box(".mx_ForwardList_noResults").left - box("[data-testid=body]").left).toBe(24);
        });

        it("write the name in 15px over the room's details in 13px secondary, centered beside the avatar, and a name alone on its middle", () => {
            renderDialog();
            const name = getComputedStyle(get("[data-testid=Bob] .mx_ForwardList_entry_name"));
            const detail = getComputedStyle(get("[data-testid=Bob] .mx_ForwardList_entry_detail"));
            const twoLines = box("[data-testid=Bob] .mx_ForwardList_entry_text");
            const nameAlone = box('[data-testid="Media and more"] .mx_ForwardList_entry_name');

            expect([name.fontSize, name.fontWeight, name.color]).toEqual([
                "15px",
                "400",
                dialogColor("--cpd-color-text-primary"),
            ]);
            expect([detail.fontSize, detail.color]).toEqual(["13px", dialogColor("--cpd-color-text-secondary")]);
            expect(box("[data-testid=Bob] .mx_ForwardList_entry_detail").top).toBe(
                box("[data-testid=Bob] .mx_ForwardList_entry_name").bottom,
            );
            expect(Math.abs(middle(twoLines) - middle(box("[data-testid=Bob] .mx_BaseAvatar")))).toBeLessThanOrEqual(
                0.5,
            );
            expect(
                Math.abs(middle(nameAlone) - middle(box('[data-testid="Media and more"] .mx_BaseAvatar'))),
            ).toBeLessThanOrEqual(0.5);
        });

        it("end in a 36px circle around a 24px accent paper plane, as far from the row's end as from its top and bottom", () => {
            renderDialog();
            const entry = row("Bob").getBoundingClientRect();
            const button = sendButton("Bob").getBoundingClientRect();
            const plane = sendButton("Bob").querySelector("svg")!.getBoundingClientRect();

            expect([button.width, button.height]).toEqual([36, 36]);
            expect([plane.width, plane.height, plane.left - button.left, plane.top - button.top]).toEqual([
                24, 24, 6, 6,
            ]);
            expect([entry.right - button.right, button.top - entry.top, entry.bottom - button.bottom]).toEqual([
                8, 8, 8,
            ]);
            expect(box("[data-testid=body]").right - button.right).toBe(24);
            expect(getComputedStyle(sendButton("Bob")).color).toBe(dialogColor("--cpd-color-icon-accent-primary"));
            expect(fill(sendButton("Bob"))).toBe("rgba(0, 0, 0, 0)");
            expect(getComputedStyle(sendButton("Bob")).borderTopStyle).toBe("none");
        });

        it("hide the paper plane until the row is hovered, and fill the plane's circle when it is hovered itself", async () => {
            renderDialog();

            expect(getComputedStyle(sendButton("Bob")).opacity).toBe("0");
            await userEvent.hover(row("Bob").querySelector(".mx_ForwardList_entry_name")!);
            expect(getComputedStyle(sendButton("Bob")).opacity).toBe("1");
            expect(fill(row("Bob"))).toBe(dialogColor("--cpd-color-bg-action-secondary-hovered"));
            expect(fill(sendButton("Bob"))).toBe("rgba(0, 0, 0, 0)");

            await userEvent.hover(sendButton("Bob"));
            expect(fill(sendButton("Bob"))).toBe(dialogColor("--cpd-color-alpha-gray-200"));
        });

        it("hide the plane only where a pointer can hover, as nothing would ever show it on a touch screen", () => {
            const hiding: CSSStyleRule[] = [];
            const collect = (rules: CSSRuleList): void => {
                for (const rule of rules) {
                    if (rule instanceof CSSStyleRule && /mx_ForwardList_sendButton/.test(rule.selectorText)) {
                        if (rule.style.opacity === "0") hiding.push(rule);
                    }
                    if ("cssRules" in rule) collect((rule as CSSGroupingRule).cssRules);
                }
            };
            collect(stylesheet.sheet!.cssRules);

            expect(hiding).not.toHaveLength(0);
            for (const rule of hiding) {
                expect(rule.parentRule).toBeInstanceOf(CSSMediaRule);
                expect((rule.parentRule as CSSMediaRule).conditionText).toBe("(hover)");
            }
        });

        it("show the selected row's plane, in the pressed fill, while the search field has the focus", async () => {
            renderDialog();
            const selected = row("Media and more");

            expect(getComputedStyle(sendButton("Media and more")).opacity).toBe("0");
            expect(fill(selected)).toBe("rgba(0, 0, 0, 0)");

            get("[data-testid=search]").focus();
            expect(getComputedStyle(sendButton("Media and more")).opacity).toBe("1");
            expect(fill(selected)).toBe(dialogColor("--cpd-color-bg-action-secondary-pressed"));

            await userEvent.hover(row("Bob").querySelector(".mx_ForwardList_entry_name")!);
            expect(fill(row("Bob"))).toBe(dialogColor("--cpd-color-bg-action-secondary-hovered"));
            expect(fill(row("Bob"))).not.toBe(fill(selected));
        });

        it("show the plane, and the hover fill, while the keyboard has its focus", async () => {
            renderDialog();
            get("[data-testid=search]").focus();
            await userEvent.tab();
            await userEvent.tab();

            expect(document.activeElement).toBe(sendButton("Media and more"));
            get("[data-testid=search]").blur();
            expect(getComputedStyle(sendButton("Media and more")).opacity).toBe("1");
            expect(fill(row("Media and more"))).toBe(dialogColor("--cpd-color-bg-action-secondary-hovered"));
        });

        it("keep the accent check of a sent forward showing, and gray the plane where you may not send", () => {
            renderDialog();
            const sent = getComputedStyle(sendButton("Project 10"));
            const check = sendButton("Project 10").querySelector("svg")!.getBoundingClientRect();

            expect(sent.opacity).toBe("1");
            expect(sent.color).toBe(dialogColor("--cpd-color-icon-accent-primary"));
            expect([check.width, check.height]).toEqual([24, 24]);
            expect(getComputedStyle(sendButton("Read only")).color).toBe(dialogColor("--cpd-color-icon-disabled"));
        });

        it("mirror in right-to-left text, the plane pointing the way the text runs", () => {
            renderDialog("cpd-theme-light", "rtl");
            const body = box("[data-testid=body]");
            const entry = row("Bob").getBoundingClientRect();
            const roomAvatar = box("[data-testid=Bob] .mx_BaseAvatar");
            const button = sendButton("Bob").getBoundingClientRect();

            expect(body.right - roomAvatar.right).toBe(24);
            expect(entry.right - roomAvatar.right).toBe(8);
            expect(button.left - entry.left).toBe(8);
            expect(getComputedStyle(sendButton("Bob").querySelector("svg")!).transform).toBe(
                "matrix(-1, 0, 0, 1, 0, 0)",
            );
        });
    });

    describe.each(THEMES)("in %s", (theme) => {
        it("fills hovered and selected rows with the dialog's raised hover and pressed grays, apart from its body", async () => {
            renderDialog(theme);
            get("[data-testid=search]").focus();
            await userEvent.hover(row("Bob").querySelector(".mx_ForwardList_entry_name")!);
            const surface = fill(get("[data-testid=body]"));

            expect(fill(row("Bob"))).toBe(tokenColor("--tl-color-bg-floating-hovered", get(`.${theme}`)));
            expect(fill(row("Media and more"))).toBe(tokenColor("--tl-color-bg-floating-pressed", get(`.${theme}`)));
            expect(fill(row("Bob"))).not.toBe(surface);
            expect(fill(row("Media and more"))).not.toBe(fill(row("Bob")));
        });

        it("fills the hovered plane's circle a step over its row, hovered or selected, with the plane 3:1 on it", async () => {
            renderDialog(theme);
            const surface = fill(get("[data-testid=body]"));
            get("[data-testid=search]").focus();

            for (const name of ["Bob", "Media and more"]) {
                await userEvent.hover(sendButton(name));
                const behind = over(fill(row(name)), surface);
                const circle = over(fill(sendButton(name)), behind);

                expect(circle).not.toBe(behind);
                expect(contrast(getComputedStyle(sendButton(name)).color, circle)).toBeGreaterThanOrEqual(3);
            }
        });

        it("draws the paper plane and the sent check in the accent, which stands out from the dialog's body", () => {
            renderDialog(theme);
            const accent = tokenColor("--cpd-color-icon-accent-primary", get(`.${theme}`));

            expect(getComputedStyle(sendButton("Bob")).color).toBe(accent);
            expect(getComputedStyle(sendButton("Project 10")).color).toBe(accent);
            expect(contrast(accent, fill(get("[data-testid=body]")))).toBeGreaterThanOrEqual(3);
        });

        it("divides the preview from the rooms in the raised dialog's divider color", () => {
            renderDialog(theme);

            expect(getComputedStyle(get("hr")).borderTopColor).toBe(
                tokenColor("--tl-color-separator-floating", get(`.${theme}`)),
            );
        });
    });
});
