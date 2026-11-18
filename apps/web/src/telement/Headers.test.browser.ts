/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar, AvatarStack, IconButton, Text } from "@vector-im/compound-web";
import {
    ChevronDownIcon,
    ChevronLeftIcon,
    CloseIcon,
    DownloadIcon,
    ExpandIcon,
    MarkThreadsAsReadIcon,
    OverflowHorizontalIcon,
    PinSolidIcon,
    PopOutIcon,
    ThreadsIcon,
    VideoCallIcon,
    VoiceCallIcon,
    ZoomInIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
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
import roomHeaderStyles from "../../res/css/views/rooms/_RoomHeader.pcss?raw";
import baseCardStyles from "../../res/css/views/right_panel/_BaseCard.pcss?raw";
import threadPanelStyles from "../../res/css/views/right_panel/_ThreadPanel.pcss?raw";
import imageViewStyles from "../../res/css/views/elements/_ImageView.pcss?raw";
import legacyCallHeaderStyles from "../../res/css/views/voip/_LegacyCallViewHeader.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { cornerRadii, toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";
import { loadInter } from "../test/telement/fonts";

let stylesheet: HTMLStyleElement;
let removeInter: () => void;
let root: Root | undefined;

/** Renders real Compound components, so the hashed class names the stylesheets match are the installed ones. */
function render(node: ReactNode, theme = "cpd-theme-light"): void {
    const container = document.createElement("div");
    container.className = theme;
    container.style.font = "var(--cpd-font-body-md-regular)";
    document.body.append(container);
    root = createRoot(container);
    flushSync(() => root!.render(node));
}

const h = createElement;
const markup = (node: ReactNode): string => renderToStaticMarkup(node);

function box(selector: string): DOMRect {
    return document.querySelector(selector)!.getBoundingClientRect();
}

function button(label: string): HTMLElement {
    return document.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
}

/** The button's size, its icon's size, and the icon's inset from the button's top and start. */
function iconGeometry(element: HTMLElement): number[] {
    const outer = element.getBoundingClientRect();
    const icon = element.querySelector("svg")!.getBoundingClientRect();
    return [outer.width, outer.height, icon.width, icon.height, icon.left - outer.left, icon.top - outer.top];
}

/** The room header as RoomHeader renders it: avatar, name, Compound icon buttons, and the face pile in rooms. */
function roomHeader(facePile: boolean): ReactNode {
    return h(
        "header",
        {
            className: "mx_RoomHeader light-panel",
            // What shared-components' Flex sets
            style: { display: "flex", alignItems: "center", gap: "var(--cpd-space-3x)" },
        },
        h(Avatar, { id: "!room:example.org", name: "Room", size: "40px", type: "round" }),
        h(
            "button",
            { className: "mx_RoomHeader_infoWrapper", type: "button" },
            h("div", { className: "mx_RoomHeader_info", style: { flex: 1 } }, "Room"),
        ),
        h(IconButton, { "aria-label": "Video call" }, h(VideoCallIcon)),
        h(IconButton, { "aria-label": "Voice call" }, h(VoiceCallIcon)),
        h(IconButton, { "aria-label": "Threads", "indicator": "default" }, h(ThreadsIcon)),
        facePile &&
            h(
                Text,
                { as: "div", size: "sm", weight: "medium" },
                h(
                    "div",
                    { "className": "mx_AccessibleButton mx_FacePile", "role": "button", "aria-label": "3 members" },
                    h(
                        AvatarStack,
                        null,
                        ["a", "b", "c"].map((name) => h(Avatar, { key: name, id: name, name, size: "20px" })),
                    ),
                    "3",
                ),
            ),
    );
}

/** BaseCard's header: back, the title and close, as BaseCard sizes and fills its icon buttons. */
function cardHeader(
    title: ReactNode = h("p", { className: "mx_BaseCard_header_title_heading" }, "Threads"),
): ReactNode {
    const headerButton = (label: string, icon: ReactNode): ReactNode =>
        h(IconButton, { "aria-label": label, "kind": "secondary", "size": "var(--BaseCard_header-button-size)" }, icon);
    return h(
        "div",
        { className: "mx_BaseCard_header" },
        headerButton("Back", h(ChevronLeftIcon)),
        h("div", { className: "mx_BaseCard_header_title" }, title),
        headerButton("Close", h(CloseIcon)),
    );
}

/** ThreadView's and WidgetCard's title: the heading and the options button with its overflow icon. */
function optionsTitle(title = "Thread", label = "Thread options"): ReactNode[] {
    return [
        h("h4", { key: "title", className: "mx_BaseCard_header_title_heading" }, title),
        h(
            "div",
            {
                "key": "options",
                "className": "mx_AccessibleButton mx_BaseCard_header_title_button--option",
                "role": "button",
                "aria-label": label,
            },
            h(OverflowHorizontalIcon),
        ),
    ];
}

function rightPanel(...children: ReactNode[]): ReactNode {
    return h(
        "aside",
        { style: { width: "352px", height: "300px", display: "flex", flexDirection: "column" } },
        ...children,
    );
}

const imageButton = (label: string, icon: ReactNode, extraClass = "", disabled = false): string =>
    `<div class="mx_AccessibleButton mx_ImageView_button${extraClass}" role="button" tabindex="0" aria-label="${label}"${disabled ? ' aria-disabled="true"' : ""}>${markup(icon)}</div>`;

/** ImageView over the lightbox for a message: the sender, the file name and the toolbar, then the image. */
function imageView(theme: string, dir = "ltr"): ReactNode {
    const avatar = markup(h(Avatar, { id: "@alice:example.org", name: "Alice", size: "32px", type: "round" }));
    const html = `
        <div class="cpd-theme-dark mx_ImageView" role="dialog" aria-label="Image view">
            <div class="mx_ImageView_panel">
                <div class="mx_ImageView_info_wrapper">
                    ${avatar}
                    <div class="mx_ImageView_info"><div class="mx_ImageView_info_sender">Alice</div></div>
                </div>
                <div class="mx_ImageView_title">holiday.jpg</div>
                <div class="mx_ImageView_toolbar">
                    ${imageButton("Zoom in", h(ZoomInIcon))}
                    ${imageButton("Save as…", h(DownloadIcon))}
                    ${imageButton("Saving", h(DownloadIcon), " mx_AccessibleButton_disabled", true)}
                    ${imageButton("Options", h(OverflowHorizontalIcon), " mx_ImageView_button_more")}
                    ${imageButton("Close", h(CloseIcon))}
                </div>
            </div>
            <div class="mx_ImageView_image_wrapper"><img alt="holiday.jpg" class="mx_ImageView_image" /></div>
        </div>
    `;
    return h("div", {
        id: "lightbox",
        dir,
        className: theme,
        style: { width: "960px", height: "560px", display: "flex", background: "#000" },
        dangerouslySetInnerHTML: { __html: html },
    });
}

describe("Telement's headers", () => {
    beforeAll(async () => {
        removeInter = await loadInter();
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
                ${toBrowserCss(roomHeaderStyles, lightTheme)}
                ${toBrowserCss(baseCardStyles, lightTheme)}
                ${toBrowserCss(threadPanelStyles, lightTheme)}
                ${toBrowserCss(imageViewStyles, fontSizes, lightTheme)}
                ${toBrowserCss(legacyCallHeaderStyles, lightTheme)}
            }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
        removeInter();
    });

    afterEach(async () => {
        await userEvent.unhover(document.body);
        root?.unmount();
        root = undefined;
        document.body.innerHTML = "";
    });

    describe("room header", () => {
        it("keeps the avatar 12px from the start, as from the top and the separator", () => {
            render(h("div", { style: { width: "900px" } }, roomHeader(false)));

            const header = box(".mx_RoomHeader");
            const avatar = document.querySelector(".mx_RoomHeader > :first-child")!.getBoundingClientRect();
            expect(header.height).toBe(64);
            expect(avatar.left - header.left).toBe(12);
            // Centered on the 63px above the 1px separator: half a pixel off the grid either way
            expect(avatar.top - header.top).toBe(11.5);
            expect(header.bottom - 1 - avatar.bottom).toBe(11.5);
        });

        it("draws 36px icon buttons around 24px icons, the last one ending 12px from the end", () => {
            render(h("div", { style: { width: "900px" } }, roomHeader(false)));

            const header = box(".mx_RoomHeader");
            for (const label of ["Video call", "Voice call", "Threads"]) {
                expect(iconGeometry(button(label))).toEqual([36, 36, 24, 24, 6, 6]);
                expect(button(label).getBoundingClientRect().top - header.top).toBe(13.5);
            }
            expect(header.right - button("Threads").getBoundingClientRect().right).toBe(12);
        });

        it("keeps its background under the pointer, over its buttons as over the room's name", async () => {
            render(h("div", { style: { width: "900px" } }, roomHeader(true)));
            const header = document.querySelector<HTMLElement>(".mx_RoomHeader")!;
            const canvas = tokenColor("--cpd-color-bg-canvas-default", header);

            expect(getComputedStyle(header).backgroundColor).toBe(canvas);
            for (const target of [button("Voice call"), document.querySelector(".mx_RoomHeader_infoWrapper")!]) {
                await userEvent.hover(target);
                expect(getComputedStyle(header).backgroundColor).toBe(canvas);
            }
            expect(getComputedStyle(header).transitionDuration).toBe("0s");
        });

        it("makes the face pile a 36px pill with its avatars 8px from its top, bottom and start", () => {
            render(h("div", { style: { width: "900px" } }, roomHeader(true)));

            const header = box(".mx_RoomHeader");
            const pile = box(".mx_FacePile");
            const stack = document.querySelector(".mx_FacePile > div")!.getBoundingClientRect();
            expect(pile.height).toBe(36);
            expect([stack.left - pile.left, stack.top - pile.top, pile.bottom - stack.bottom]).toEqual([8, 8, 8]);
            expect(parseFloat(getComputedStyle(document.querySelector(".mx_FacePile")!).borderRadius)).toBeGreaterThan(
                18,
            );
            expect(header.right - pile.right).toBe(12);
        });

        it.each(["cpd-theme-light", "cpd-theme-dark"])(
            "fills the toggled face pile with the accent, apart from its gray hover (%s)",
            async (theme) => {
                render(h("div", { style: { width: "900px" } }, roomHeader(true)), theme);
                const pile = document.querySelector<HTMLElement>(".mx_FacePile")!;
                await userEvent.hover(pile);
                const hover = getComputedStyle(pile).backgroundColor;

                pile.classList.add("mx_FacePile_toggled");
                const toggled = getComputedStyle(pile);
                expect(toggled.backgroundColor).toBe(tokenColor("--tl-accent-400", pile));
                expect(toggled.backgroundColor).not.toBe(hover);
                expect(toggled.color).toBe(tokenColor("--cpd-color-text-action-accent", pile));
            },
        );
    });

    describe("right panel card header", () => {
        it("draws back and close as 36px buttons around 24px icons, 12px from the panel's edges", () => {
            render(rightPanel(h("div", { className: "mx_BaseCard" }, cardHeader())));

            const header = box(".mx_BaseCard_header");
            expect(header.height).toBe(64);
            for (const label of ["Back", "Close"]) {
                expect(iconGeometry(button(label))).toEqual([36, 36, 24, 24, 6, 6]);
                expect(button(label).getBoundingClientRect().top - header.top).toBe(13.5);
            }
            expect(button("Back").getBoundingClientRect().left - header.left).toBe(12);
            expect(header.right - button("Close").getBoundingClientRect().right).toBe(12);
        });

        it("sizes the thread and widget options button like the other header buttons", () => {
            render(rightPanel(h("div", { className: "mx_BaseCard" }, cardHeader(optionsTitle()))));

            expect(iconGeometry(button("Thread options"))).toEqual([36, 36, 24, 24, 6, 6]);
            expect(button("Thread options").getBoundingClientRect().top - box(".mx_BaseCard_header").top).toBe(13.5);
        });

        it("draws the options button as the filled circle of Compound's secondary icon buttons, with their hover disc", async () => {
            render(
                h(
                    "div",
                    null,
                    rightPanel(h("div", { className: "mx_BaseCard" }, cardHeader(optionsTitle()))),
                    h(IconButton, { "aria-label": "Compound", "kind": "secondary", "size": "36px" }, h(CloseIcon)),
                ),
            );
            const options = button("Thread options");

            expect(cornerRadii(options)).toEqual({ x: 18, y: 18 });
            expect(getComputedStyle(options).backgroundColor).toBe(
                getComputedStyle(button("Compound")).backgroundColor,
            );
            await userEvent.hover(button("Compound"));
            const compoundHover = getComputedStyle(button("Compound")).backgroundColor;
            await userEvent.hover(options);
            expect(getComputedStyle(options).backgroundColor).toBe(compoundHover);
            expect(compoundHover).toBe(tokenColor("--cpd-color-bg-subtle-primary", options));
        });

        it.each(["cpd-theme-light", "cpd-theme-dark"])(
            "fills back, the thread's options and close alike before they are hovered (%s)",
            async (theme) => {
                render(rightPanel(h("div", { className: "mx_BaseCard" }, cardHeader(optionsTitle()))), theme);
                const panel = document.querySelector("aside")!;
                const [filled, hovered] = ["--cpd-color-bg-subtle-secondary", "--cpd-color-bg-subtle-primary"].map(
                    (token) => tokenColor(token, panel),
                );
                const buttons = ["Back", "Thread options", "Close"].map(button);

                expect(filled).not.toBe("rgba(0, 0, 0, 0)");
                expect(buttons.map((element) => getComputedStyle(element).backgroundColor)).toEqual([
                    filled,
                    filled,
                    filled,
                ]);
                for (const element of buttons) {
                    await userEvent.hover(element);
                    expect(getComputedStyle(element).backgroundColor).toBe(hovered);
                }
            },
        );

        it("draws WidgetCard's options button like ThreadView's: its icon, and the disc on hover", async () => {
            render(
                rightPanel(
                    h(
                        "div",
                        { className: "mx_BaseCard mx_WidgetCard" },
                        cardHeader(optionsTitle("Etherpad", "Options")),
                    ),
                ),
            );
            const options = button("Options");

            expect(iconGeometry(options)).toEqual([36, 36, 24, 24, 6, 6]);
            expect(cornerRadii(options)).toEqual({ x: 18, y: 18 });
            await userEvent.hover(options);
            expect(getComputedStyle(options).backgroundColor).toBe(
                tokenColor("--cpd-color-bg-subtle-primary", options),
            );
            expect(box(".mx_BaseCard_header").right - options.getBoundingClientRect().right).toBe(12 + 36 + 12);
        });

        it("gives the options button its hover disc whatever it holds", async () => {
            // A trigger whose icon is not an inline SVG still gets the disc
            const title = [
                h("h4", { key: "title", className: "mx_BaseCard_header_title_heading" }, "Thread"),
                h(
                    "div",
                    {
                        "key": "options",
                        "className": "mx_AccessibleButton mx_BaseCard_header_title_button--option",
                        "role": "button",
                        "aria-label": "Thread options",
                    },
                    h("img", { alt: "", width: 24, height: 24 }),
                ),
            ];
            render(rightPanel(h("div", { className: "mx_BaseCard" }, cardHeader(title))));
            const trigger = button("Thread options");

            await userEvent.hover(trigger);
            expect(getComputedStyle(trigger).backgroundColor).toBe(
                tokenColor("--cpd-color-bg-subtle-primary", trigger),
            );
        });

        it("ends its buttons as the room header beside it does", () => {
            render(
                h(
                    "div",
                    { style: { display: "flex" } },
                    h("div", { style: { width: "600px" } }, roomHeader(false)),
                    rightPanel(h("div", { className: "mx_BaseCard" }, cardHeader())),
                ),
            );

            const roomHeaderBox = box(".mx_RoomHeader");
            const cardHeaderBox = box(".mx_BaseCard_header");
            const last = button("Threads").getBoundingClientRect();
            const close = button("Close").getBoundingClientRect();
            expect([cardHeaderBox.top, cardHeaderBox.height]).toEqual([roomHeaderBox.top, roomHeaderBox.height]);
            expect(cardHeaderBox.right - close.right).toBe(roomHeaderBox.right - last.right);
            expect([close.top, close.height]).toEqual([last.top, last.height]);
        });
    });

    describe("thread panel header", () => {
        function threadPanelHeader(): ReactNode {
            return rightPanel(
                h(
                    "div",
                    { className: "mx_BaseCard mx_ThreadPanel" },
                    cardHeader(),
                    h(
                        "div",
                        { className: "mx_ThreadPanelHeader" },
                        h(
                            IconButton,
                            { "aria-label": "Mark all as read", "size": "var(--BaseCard_header-button-size)" },
                            h(MarkThreadsAsReadIcon),
                        ),
                        h("div", { className: "mx_ThreadPanel_vertical_separator" }),
                        h(
                            "div",
                            {
                                "className": "mx_AccessibleButton mx_ThreadPanel_dropdown",
                                "role": "button",
                                "aria-label": "Show",
                            },
                            "Show: All threads",
                            h(ChevronDownIcon),
                        ),
                    ),
                ),
            );
        }

        it("puts mark all as read where the card header puts back: a 36px button 12px from the start, its icon 24px", () => {
            render(threadPanelHeader());

            const header = box(".mx_ThreadPanelHeader");
            const markRead = button("Mark all as read").getBoundingClientRect();
            expect(iconGeometry(button("Mark all as read"))).toEqual([36, 36, 24, 24, 6, 6]);
            expect([markRead.left - header.left, markRead.top - header.top]).toEqual([12, 13.5]);
            expect(markRead.left).toBe(button("Back").getBoundingClientRect().left);
        });

        it.each(["cpd-theme-light", "cpd-theme-dark"])(
            "draws mark all as read in the color of the header's other icons, also on hover (%s)",
            async (theme) => {
                render(threadPanelHeader(), theme);
                const markRead = button("Mark all as read");
                const fills = (): Set<string> =>
                    new Set([...markRead.querySelectorAll("path")].map((path) => getComputedStyle(path).fill));

                expect(fills()).toEqual(new Set([tokenColor("--cpd-color-icon-secondary", markRead)]));
                await userEvent.hover(markRead);
                expect(fills()).toEqual(new Set([tokenColor("--cpd-color-icon-primary", markRead)]));
            },
        );

        it("makes the filter a 36px pill with the chevron 8px from its end, top and bottom", () => {
            render(threadPanelHeader());

            const dropdown = button("Show");
            const outer = dropdown.getBoundingClientRect();
            const chevron = dropdown.querySelector("svg")!.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(dropdown.firstChild!);
            const label = range.getBoundingClientRect();
            expect(outer.height).toBe(36);
            expect(parseFloat(getComputedStyle(dropdown).borderRadius)).toBeGreaterThanOrEqual(18);
            expect([outer.right - chevron.right, chevron.top - outer.top, outer.bottom - chevron.bottom]).toEqual([
                8, 8, 8,
            ]);
            expect(label.left - outer.left).toBe(12);
            expect(label.top + label.height / 2).toBe(outer.top + outer.height / 2);
        });

        it("mirrors the filter in a right-to-left layout", () => {
            render(h("div", { dir: "rtl" }, threadPanelHeader()));

            const dropdown = button("Show");
            const outer = dropdown.getBoundingClientRect();
            const chevron = dropdown.querySelector("svg")!.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(dropdown.firstChild!);
            const label = range.getBoundingClientRect();
            expect([chevron.left - outer.left, chevron.top - outer.top, outer.bottom - chevron.bottom]).toEqual([
                8, 8, 8,
            ]);
            expect(outer.right - label.right).toBe(12);
            expect(label.left - chevron.right).toBe(2);
        });
    });

    describe("legacy call header", () => {
        function legacyCallHeader(): ReactNode {
            const headerButton = (label: string, icon: ReactNode): ReactNode =>
                h(
                    "div",
                    {
                        "key": label,
                        "className": "mx_AccessibleButton mx_LegacyCallViewHeader_button",
                        "role": "button",
                        "aria-label": label,
                    },
                    icon,
                );
            return h(
                "div",
                { style: { width: "320px" } },
                h(
                    "div",
                    { className: "mx_LegacyCallViewHeader mx_LegacyCallViewHeader_pip" },
                    h(Avatar, { id: "!room:example.org", name: "Alice", size: "32px", type: "round" }),
                    h(
                        "div",
                        { className: "mx_LegacyCallViewHeader_callInfo" },
                        h("div", { className: "mx_LegacyCallViewHeader_roomName" }, "Alice"),
                    ),
                    h(
                        "div",
                        { className: "mx_LegacyCallViewHeader_controls" },
                        headerButton("Fill screen", h(ExpandIcon)),
                        headerButton("Pin", h(PinSolidIcon)),
                        headerButton("Expand", h(PopOutIcon)),
                    ),
                ),
            );
        }

        it("draws its buttons as round 36px boxes around their 20px icons, ending on the header's edge", () => {
            render(legacyCallHeader());

            const header = box(".mx_LegacyCallViewHeader");
            const labels = ["Fill screen", "Pin", "Expand"];
            for (const label of labels) {
                expect(iconGeometry(button(label))).toEqual([36, 36, 20, 20, 8, 8]);
                expect(cornerRadii(button(label))).toEqual({ x: 18, y: 18 });
                expect(button(label).getBoundingClientRect().top - header.top).toBe(4);
            }
            const lefts = labels.map((label) => button(label).getBoundingClientRect().left);
            expect([lefts[1] - lefts[0], lefts[2] - lefts[1]]).toEqual([36, 36]);
            expect(header.right - button("Expand").getBoundingClientRect().right).toBe(0);
        });
    });

    describe("image viewer's top bar", () => {
        it("is 68px tall with its 36px buttons 16px from the top and the end, the sender 16px from the start", () => {
            render(imageView("cpd-theme-light"));

            const view = box(".mx_ImageView");
            // The image's wrapper is as tall as the viewer, but the bar keeps its height
            expect(box(".mx_ImageView_panel").height).toBe(68);
            for (const label of ["Zoom in", "Save as…", "Close"]) {
                expect(iconGeometry(button(label))).toEqual([36, 36, 24, 24, 6, 6]);
            }
            // Upstream's thinner overflow glyph keeps its larger box
            expect(iconGeometry(button("Options"))).toEqual([36, 36, 28, 28, 4, 4]);
            const close = button("Close").getBoundingClientRect();
            expect([view.right - close.right, close.top - view.top]).toEqual([16, 16]);
            expect(document.querySelector(".mx_ImageView_info_wrapper > span")!.getBoundingClientRect().left).toBe(
                view.left + 16,
            );
        });

        it("draws close like the video viewer's icon buttons: no disc until hovered, then Compound's", async () => {
            render(
                h(
                    "div",
                    null,
                    imageView("cpd-theme-light"),
                    // The video viewer's close, as VideoLightboxView renders it
                    h(
                        "div",
                        { className: "cpd-theme-dark", id: "video" },
                        h(IconButton, { "aria-label": "Video close", "size": "36px" }, h(CloseIcon)),
                    ),
                ),
            );
            const close = button("Close");
            const videoClose = button("Video close");
            const dark = document.querySelector(".mx_ImageView")!;

            expect(getComputedStyle(close).backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect(getComputedStyle(close.querySelector("svg")!).color).toBe(
                tokenColor("--cpd-color-icon-primary", dark),
            );
            expect(cornerRadii(close)).toEqual(cornerRadii(videoClose));

            await userEvent.hover(videoClose);
            const videoHover = getComputedStyle(videoClose).backgroundColor;
            await userEvent.hover(close);
            expect(getComputedStyle(close).backgroundColor).toBe(videoHover);
            expect(videoHover).toBe(tokenColor("--cpd-color-bg-subtle-primary", dark));
        });

        it("draws no disc around a disabled button, as Compound doesn't", async () => {
            render(imageView("cpd-theme-light"));

            await userEvent.hover(button("Saving"));
            expect(getComputedStyle(button("Saving")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        });

        it("mirrors its insets in a right-to-left layout", () => {
            render(imageView("cpd-theme-light", "rtl"));

            const view = box(".mx_ImageView");
            const avatar = document.querySelector(".mx_ImageView_info_wrapper > span")!.getBoundingClientRect();
            const sender = box(".mx_ImageView_info_sender");
            expect(button("Close").getBoundingClientRect().left - view.left).toBe(16);
            expect(view.right - avatar.right).toBe(16);
            expect(avatar.left - sender.right).toBe(12);
        });
    });
});
