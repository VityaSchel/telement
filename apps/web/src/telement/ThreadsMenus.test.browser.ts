/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement } from "react";
import { flushSync } from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot, type Root } from "react-dom/client";
import { Avatar, Menu, MenuItem, NavBar, NavItem, Text, TooltipProvider } from "@vector-im/compound-web";
import { ThreadsIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
// The package's built bundle needs Node's `process`, so the tiles' DOM is written out below and their stylesheet is
// loaded from source
// eslint-disable-next-line no-restricted-imports
import eventTileViewStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/EventTileView.module.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import autoHideScrollbarStyles from "../../res/css/structures/_AutoHideScrollbar.pcss?raw";
import roomViewStyles from "../../res/css/structures/_RoomView.pcss?raw";
import baseCardStyles from "../../res/css/views/right_panel/_BaseCard.pcss?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import filterTabGroupStyles from "../../res/css/components/views/elements/_FilterTabGroup.pcss?raw";
import threadsActivityCentreStyles from "../../res/css/structures/_ThreadsActivityCentre.pcss?raw";
import threadPanelStyles from "../../res/css/views/right_panel/_ThreadPanel.pcss?raw";
import decoratedRoomAvatarStyles from "../../res/css/views/avatars/_DecoratedRoomAvatar.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { cornerRadii, toBrowserCss } from "../test/telement/browserCss";
import { settledStyle, tokenColor } from "../test/telement/computedStyle";
import { EMPTY_STATE_VIEW_STYLES, emptyStateView } from "../test/telement/emptyStateView";

let stylesheet: HTMLStyleElement;
let root: Root | undefined;

/**
 * What ThreadsActivityCentre shows without threads: the compact size of the shared empty state, Compound's threads icon
 * over the caption. The wrapper leaves no box of its own.
 */
const emptyState = (caption: string): ReturnType<typeof createElement> =>
    createElement("div", {
        style: { display: "contents" },
        dangerouslySetInnerHTML: {
            __html: emptyStateView({
                size: "compact",
                className: "mx_ThreadsActivityCentre_emptyState",
                Icon: ThreadsIcon,
                description: caption,
            }),
        },
    });

/**
 * ThreadsActivityCentre's open menu: the tabs, then a row per thread as ThreadsActivityCentreThreadRow renders it, or
 * the empty state when there are none.
 */
async function renderActivityCentre(rooms: string[]): Promise<HTMLElement> {
    const row = (room: string): ReturnType<typeof createElement> =>
        createElement(
            MenuItem,
            {
                "key": room,
                "className": "mx_ThreadsActivityCentreThreadRow",
                "label": null,
                "hideChevron": true,
                "aria-label": room,
                "Icon": createElement(
                    "div",
                    { className: "mx_DecoratedRoomAvatar" },
                    createElement(Avatar, { id: `!${room}:example.org`, name: room, size: "40px" }),
                ),
                "onSelect": () => {},
            },
            createElement(
                "div",
                { className: "mx_ThreadsActivityCentreThreadRow_content" },
                createElement(
                    "div",
                    { className: "mx_ThreadsActivityCentreThreadRow_header" },
                    createElement(Text, { as: "span", size: "md", weight: "semibold" }, room),
                ),
            ),
        );
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    flushSync(() =>
        root!.render(
            createElement(
                TooltipProvider,
                null,
                createElement(Menu, {
                    className: "mx_ThreadsActivityCentre_menu",
                    open: true,
                    onOpenChange: () => {},
                    title: "Threads",
                    showTitle: false,
                    align: "start",
                    side: "top",
                    trigger: createElement("button", { type: "button" }, "Threads"),
                    children: [
                        createElement(
                            NavBar,
                            {
                                "key": "tabs",
                                "className": "mx_ThreadsActivityCentre_tabs",
                                "role": "tablist",
                                "aria-label": "Threads",
                            },
                            createElement(
                                NavItem,
                                { "active": true, "aria-controls": "panel", "onClick": () => {} },
                                "My threads",
                            ),
                            createElement(
                                NavItem,
                                { "active": false, "aria-controls": "panel", "onClick": () => {} },
                                "Other threads",
                            ),
                        ),
                        createElement(
                            "div",
                            { key: "rows", role: "tabpanel", className: "mx_ThreadsActivityCentre_rows" },
                            rooms.length
                                ? rooms.map(row)
                                : emptyState("You don't have unread threads you've participated in."),
                        ),
                    ],
                }),
            ),
        ),
    );
    for (let i = 0; i < 50 && !document.querySelector('[role="menu"]'); i++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    await Promise.all(menu.getAnimations().map((animation) => animation.finished));
    return menu;
}

function threadRows(menu: HTMLElement): HTMLElement[] {
    return [...menu.querySelectorAll<HTMLElement>(".mx_ThreadsActivityCentreThreadRow")];
}

type ListCard = "threads" | "notifications";

/** The width of Chromium's thin scrollbar on Windows and Linux. */
const CLASSIC_SCROLLBAR = 11;

/** A row of the threads list (ThreadsList shape) or of the notifications card (Notification shape). */
function listTile(card: ListCard, sender: string, text: string): string {
    const shape = card === "threads" ? "shapeThreadsList" : "shapeNotification";
    const avatar = renderToStaticMarkup(
        createElement(Avatar, { id: `@${sender.toLowerCase()}:example.org`, name: sender, size: "30px" }),
    );
    return `
        <li class="root mx_EventTile layoutGroup ${shape} statePreviewClamped" tabindex="-1">
            <div class="details">
                <div class="slotSender"><span class="mx_DisambiguatedProfile">${sender}</span></div>
                <div class="slotNotificationRoomLabel">Design</div>
                <div class="slotTimestamp"><a class="mx_MessageTimestamp">12:04</a></div>
            </div>
            <div class="slotAvatar">${avatar}</div>
            <div class="line"><div class="slotBody"><div class="mx_EventTile_body">${text}</div></div></div>
        </li>
    `;
}

/**
 * ThreadPanel's or NotificationPanel's BaseCard, its TimelinePanel's scroller around the rows. The test browser's
 * scrollbars overlay the content, as on macOS; a transparent end border stands in for a scrollbar that takes room, as
 * on Windows and Linux: the scroller clips its content there too.
 */
function renderListCard(card: ListCard, scrollbar: "overlay" | "classic", rows = 2, cardClass = ""): HTMLElement {
    const tiles = Array.from({ length: rows }, (_, index) =>
        listTile(card, index % 2 ? "Bob" : "Alice", "Can you look at the draft before the meeting?"),
    );
    document.body.innerHTML = `
        <aside style="width: 352px; height: 400px; display: flex">
            <div class="mx_BaseCard mx_ThreadPanel ${cardClass}">
                <div class="mx_RoomView_messagePanel mx_AutoHideScrollbar" style="flex: 1${scrollbar === "classic" ? `; border-inline-end: ${CLASSIC_SCROLLBAR}px solid transparent` : ""}">
                    <div class="mx_RoomView_messageListWrapper">
                        <ol class="mx_RoomView_MessageList" aria-live="polite">${tiles.join("")}</ol>
                    </div>
                </div>
            </div>
        </aside>
    `;
    return document.querySelector<HTMLElement>(".mx_RoomView_messagePanel")!;
}

describe("Thread menus", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} ${telementTokens}
            }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components {
                ${eventTileViewStyles.replace(/:global\(([^)]*)\)/g, "$1")}
                ${EMPTY_STATE_VIEW_STYLES}
            }
            @layer app-web {
                ${toBrowserCss(autoHideScrollbarStyles, lightTheme)}
                ${toBrowserCss(roomViewStyles, lightTheme, fontSizes)}
                ${toBrowserCss(baseCardStyles, lightTheme, fontSizes)}
                ${toBrowserCss(decoratedRoomAvatarStyles, lightTheme, fontSizes)}
                ${toBrowserCss(filterTabGroupStyles, commonStyles, lightTheme)}
                ${toBrowserCss(threadsActivityCentreStyles, commonStyles, lightTheme, fontSizes)}
                ${toBrowserCss(threadPanelStyles, lightTheme, fontSizes)}
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
        root?.unmount();
        root = undefined;
        document.body.innerHTML = "";
    });

    describe("threads activity centre", () => {
        it("insets its rows 4px from the menu's edges, with the avatar 12px inside on the tabs' 16px edge", async () => {
            const menu = await renderActivityCentre(["Design", "Engineering"]);
            const edge = menu.getBoundingClientRect();
            const firstTab = menu.querySelector('[role="tab"]')!.getBoundingClientRect();

            expect(firstTab.left - edge.left).toBe(16);
            for (const row of threadRows(menu)) {
                const rect = row.getBoundingClientRect();
                expect(rect.left - edge.left).toBe(4);
                expect(edge.right - rect.right).toBe(4);
                expect(cornerRadii(row)).toEqual({ x: 8, y: 8 });
                const avatar = row.querySelector(".mx_DecoratedRoomAvatar > *")!.getBoundingClientRect();
                expect(avatar.height).toBe(40);
                expect([avatar.left - rect.left, avatar.top - rect.top, rect.bottom - avatar.bottom]).toEqual([
                    12, 12, 12,
                ]);
                expect(avatar.left).toBe(firstTab.left);
            }
        });

        it("draws its tabs as the app's filter chips: 28px, 8px apart, 16px inside the menu, the selected one filled", async () => {
            const menu = await renderActivityCentre(["Design"]);
            const edge = menu.getBoundingClientRect();
            const [mine, other] = [...menu.querySelectorAll<HTMLElement>('[role="tab"]')];
            const [mineBox, otherBox] = [mine, other].map((tab) => tab.getBoundingClientRect());
            // FilterTabGroup, as the threads card and the Polls dialog filter with it
            const group = document.createElement("fieldset");
            group.className = "mx_FilterTabGroup";
            group.innerHTML = `
                <label><input type="radio" name="chips" checked /><span>My threads</span></label>
                <label><input type="radio" name="chips" /><span>Other threads</span></label>
            `;
            document.body.append(group);
            const chips = [...group.querySelectorAll("span")];
            const look = (element: Element): string[] => {
                const { blockSize, font, color, backgroundColor, borderTopColor, borderTopLeftRadius, paddingInline } =
                    settledStyle(element as HTMLElement);
                return [blockSize, font, color, backgroundColor, borderTopColor, borderTopLeftRadius, paddingInline];
            };

            expect([mineBox.height, otherBox.height]).toEqual([28, 28]);
            expect([mineBox.left - edge.left, mineBox.top - edge.top]).toEqual([16, 16]);
            expect(otherBox.left - mineBox.right).toBe(8);
            expect(look(mine)).toEqual(look(chips[0]));
            expect(look(other)).toEqual(look(chips[1]));
            expect(mineBox.width).toBeCloseTo(chips[0].getBoundingClientRect().width, 0);
            expect(settledStyle(mine).backgroundColor).not.toBe(settledStyle(other).backgroundColor);
            // Neither the bar's line nor the selected tab's underline
            expect(getComputedStyle(menu.querySelector(".mx_ThreadsActivityCentre_tabs")!).borderBottomWidth).toBe(
                "0px",
            );
            for (const tab of menu.querySelectorAll(".mx_ThreadsActivityCentre_tabs li")) {
                expect(getComputedStyle(tab, "::before").content).toBe("none");
            }
        });

        it("starts its rows 12px under the tabs", async () => {
            const menu = await renderActivityCentre(["Design"]);
            const tab = menu.querySelector('[role="tab"]')!.getBoundingClientRect();

            expect(threadRows(menu)[0].getBoundingClientRect().top - tab.bottom).toBe(12);
        });

        it("keeps the last row 4px from the menu's bottom edge when scrolled to the end", async () => {
            const menu = await renderActivityCentre(Array.from({ length: 10 }, (_, index) => `Room ${index + 1}`));
            const list = menu.querySelector<HTMLElement>(".mx_ThreadsActivityCentre_rows")!;
            list.scrollTop = list.scrollHeight;

            expect(list.scrollTop).toBeGreaterThan(0);
            expect(list.getBoundingClientRect().bottom - threadRows(menu).at(-1)!.getBoundingClientRect().bottom).toBe(
                4,
            );
        });

        it("draws the keyboard focus ring inside the focused row", async () => {
            const menu = await renderActivityCentre(["Design", "Engineering"]);
            const row = threadRows(menu)[1];

            await userEvent.keyboard("{Shift}");
            row.focus();

            expect(row.matches(":focus-visible")).toBe(true);
            const style = getComputedStyle(row);
            expect(`${style.outlineStyle} ${style.outlineWidth} ${style.outlineOffset}`).toBe("solid 2px -2px");
        });

        it("keeps its height without threads and centers the threads icon in a 56px tile over the caption in it", async () => {
            const menu = await renderActivityCentre([]);
            const list = menu.querySelector<HTMLElement>(".mx_ThreadsActivityCentre_rows")!;
            const icon = menu.querySelector<SVGElement>(".mx_ThreadsActivityCentre_emptyState svg")!;
            const caption = menu.querySelector<HTMLElement>(".mx_ThreadsActivityCentre_emptyState p")!;
            const listBox = list.getBoundingClientRect();
            const listBottom = listBox.bottom - parseFloat(getComputedStyle(list).paddingBottom);
            const iconBox = icon.getBoundingClientRect();
            const captionBox = caption.getBoundingClientRect();
            const centerX = (box: DOMRect): number => (box.left + box.right) / 2;
            const iconStyle = getComputedStyle(icon);

            expect(getComputedStyle(list).height).toBe("432px");
            expect(Math.abs(iconBox.top - listBox.top - (listBottom - captionBox.bottom))).toBeLessThanOrEqual(0.5);
            expect(Math.abs(centerX(iconBox) - centerX(listBox))).toBeLessThanOrEqual(0.5);
            expect(Math.abs(centerX(captionBox) - centerX(listBox))).toBeLessThanOrEqual(0.5);
            expect(captionBox.top - iconBox.bottom).toBe(16);

            expect([iconBox.width, iconBox.height]).toEqual([56, 56]);
            expect(cornerRadii(icon)).toEqual({ x: 8, y: 8 });
            expect(iconStyle.backgroundColor).toBe(tokenColor("--cpd-color-alpha-gray-300", menu));
            expect(iconStyle.paddingTop).toBe("12px");
            expect(iconStyle.color).toBe(tokenColor("--cpd-color-icon-secondary", menu));

            expect(getComputedStyle(caption).fontSize).toBe("13px");
            expect(getComputedStyle(caption).textAlign).toBe("center");
            expect(getComputedStyle(caption).color).toBe(tokenColor("--cpd-color-text-secondary", menu));
        });

        it("highlights the row focused with the keyboard as on hover, as the other menus do", async () => {
            const menu = await renderActivityCentre(["Design", "Engineering"]);
            const row = threadRows(menu)[1];

            await userEvent.keyboard("{Shift}");
            row.focus();

            expect(row.matches(":focus-visible")).toBe(true);
            expect(settledStyle(row).backgroundColor).toBe(
                tokenColor("--cpd-color-bg-action-secondary-hovered", document.body),
            );
        });
    });

    describe.each<ListCard>(["threads", "notifications"])("the %s card", (card) => {
        it.each(["overlay", "classic"] as const)(
            "puts its rows' highlight 4px from the card's edges and the avatar 8px inside it, with a scrollbar that %s",
            async (scrollbar) => {
                const scroller = renderListCard(card, scrollbar, 12);
                const edge = scroller.getBoundingClientRect();
                // Where the scrollbar starts, or the card's edge when it overlays the list
                const contentEnd = edge.left + scroller.clientLeft + scroller.clientWidth;
                const rows = [...scroller.querySelectorAll<HTMLElement>("li")];

                expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);
                expect(edge.right - contentEnd).toBe(scrollbar === "overlay" ? 0 : CLASSIC_SCROLLBAR);
                for (const row of rows) {
                    const rect = row.getBoundingClientRect();
                    const avatar = row.querySelector(".slotAvatar > *")!.getBoundingClientRect();
                    expect(rect.left - edge.left).toBe(4);
                    expect(contentEnd - rect.right).toBe(4);
                    expect(cornerRadii(row)).toEqual({ x: 8, y: 8 });
                    expect(avatar.left - rect.left).toBe(8);
                    expect(avatar.left - edge.left).toBe(12);
                }

                await userEvent.hover(rows[1]);
                expect(settledStyle(rows[1]).backgroundColor).toBe(
                    tokenColor("--event-tile-preview-hover-background", rows[1]),
                );
            },
        );
    });

    it.each(["mx_ThreadView", "mx_TimelineCard"])("leaves the timeline of the %s card as it was", (cardClass) => {
        const scroller = renderListCard("notifications", "overlay", 2, cardClass);
        const list = scroller.querySelector(".mx_RoomView_MessageList")!;

        expect(getComputedStyle(list).paddingInlineStart).toBe("8px");
        expect(list.getBoundingClientRect().width - scroller.clientWidth).toBe(6);
    });
});
