/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
    Avatar,
    Button,
    Form,
    IconButton,
    Link,
    MenuItem,
    Search,
    Separator,
    ToggleMenuItem,
} from "@vector-im/compound-web";
import {
    ChatIcon,
    ChevronDownIcon,
    FilesIcon,
    LeaveIcon,
    OverflowHorizontalIcon,
    PinIcon,
    ShareIcon,
    UserAddIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
// eslint-disable-next-line no-restricted-imports
import mediaBodyStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/body/MediaBody/MediaBody.module.css?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import filePanelStyles from "../../res/css/structures/_FilePanel.pcss?raw";
import rightPanelStyles from "../../res/css/structures/_RightPanel.pcss?raw";
import roomViewStyles from "../../res/css/structures/_RoomView.pcss?raw";
import baseCardStyles from "../../res/css/views/right_panel/_BaseCard.pcss?raw";
import emptyStateStyles from "../../res/css/views/right_panel/_EmptyState.pcss?raw";
import extensionsCardStyles from "../../res/css/views/right_panel/_ExtensionsCard.pcss?raw";
import pinnedMessagesCardStyles from "../../res/css/views/right_panel/_PinnedMessagesCard.pcss?raw";
import roomSummaryCardStyles from "../../res/css/views/right_panel/_RoomSummaryCard.pcss?raw";
import userInfoStyles from "../../res/css/views/right_panel/_UserInfo.pcss?raw";
import verificationPanelStyles from "../../res/css/views/right_panel/_VerificationPanel.pcss?raw";
import accessibleButtonStyles from "../../res/css/views/elements/_AccessibleButton.pcss?raw";
import memberListHeaderViewStyles from "../../res/css/views/rooms/_MemberListHeaderView.pcss?raw";
import memberTileViewStyles from "../../res/css/views/rooms/_MemberTileView.pcss?raw";
import pinnedEventTileStyles from "../../res/css/views/rooms/_PinnedEventTile.pcss?raw";
import thirdPartyMemberInfoStyles from "../../res/css/views/rooms/_ThirdPartyMemberInfo.pcss?raw";
import compoundOverrides from "../../res/css/telement/_CompoundOverrides.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { cornerRadii, toBrowserCss } from "../test/telement/browserCss";
import { settledStyle, tokenColor } from "../test/telement/computedStyle";
import { EMPTY_STATE_VIEW_STYLES, emptyStateView } from "../test/telement/emptyStateView";

/** The right panel's width less its 1px border, which is what the cards inside it get. */
const CARD_WIDTH = 351;

/** The card header's inset, like the room header's beside it: every card puts its content this far from its edges. */
const CONTENT_EDGE = 12;

const html = (element: ReturnType<typeof createElement>): string => renderToStaticMarkup(element);

const menuItem = (label: string, Icon: typeof ChatIcon, props: Record<string, unknown> = {}): string =>
    html(createElement(MenuItem, { label, Icon, onSelect: () => {}, ...props }));

/** Shared-components' Flex, with the styles its module would give it. */
const flex = (direction: "row" | "column", className: string, children: string, gap = "0"): string =>
    `<div class="${className}" style="display: flex; flex-direction: ${direction}; gap: ${gap}">${children}</div>`;

/** Where `element` starts and ends inside `card`, measured from the card's start and end edges in its direction. */
function insets(element: Element | Range, card: Element): { start: number; end: number } {
    const box = element.getBoundingClientRect();
    const edge = card.getBoundingClientRect();
    const rtl = getComputedStyle(card).direction === "rtl";
    return rtl
        ? { start: edge.right - box.right, end: box.left - edge.left }
        : { start: box.left - edge.left, end: edge.right - box.right };
}

/** The box of an element's text, rather than of the element. */
function textOf(element: Element): Range {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range;
}

/** RoomSummaryCardView: the summary with a topic, its menu bar of Compound items in groups, and the bottom options. */
function renderRoomSummaryCard(dir = "ltr"): HTMLElement {
    const topic = flex(
        "column",
        "mx_RoomSummaryCard_topic",
        `<div class="mx_RoomSummaryCard_topic_container mx_RoomSummaryCard_topic_box" style="flex: 1">
            <p>This is the room's topic, which is long enough to wrap onto a second line in the right panel</p>
            ${html(createElement(IconButton, { className: "mx_RoomSummaryCard_topic_chevron", size: "24px" }, createElement(ChevronDownIcon)))}
        </div>
        <div class="mx_RoomSummaryCard_topic_edit" style="flex: 1">${html(createElement(Link, { kind: "primary", className: "mx_RoomSummaryCard_topic_link" }, "Edit"))}</div>`,
        "var(--cpd-space-2x)",
    );
    document.body.innerHTML = `
        <div class="mx_BaseCard mx_RoomSummaryCard" dir="${dir}" style="width: ${CARD_WIDTH}px">
            <header class="mx_RoomSummaryCard_container"><h1 class="mx_RoomSummaryCard_roomName">Design</h1>${topic}</header>
            ${html(createElement(Separator))}
            <div role="menubar" aria-orientation="vertical">
                ${html(createElement(ToggleMenuItem, { Icon: PinIcon, label: "Pin to top", checked: false, onSelect: () => {} }))}
                ${menuItem("Invite", UserAddIcon)}
                ${html(createElement(Separator))}
                ${menuItem("Files", FilesIcon)}
                <div class="mx_RoomSummaryCard_bottomOptions">${menuItem("Leave room", LeaveIcon, { kind: "critical" })}</div>
            </div>
        </div>
    `;
    return document.querySelector(".mx_RoomSummaryCard")!;
}

/** UserInfo: the profile and then its containers of Compound items acting as buttons, each below a separator. */
function renderUserInfo(dir = "ltr"): HTMLElement {
    document.body.innerHTML = `
        <div class="mx_BaseCard mx_UserInfo" dir="${dir}" style="width: ${CARD_WIDTH}px">
            <div class="mx_UserInfo_container mx_UserInfo_header"><h1>Alice</h1></div>
            <div class="mx_UserInfo_container">
                ${menuItem("Send message", ChatIcon, { role: "button" })}
                ${menuItem("Share profile", ShareIcon, { role: "button" })}
            </div>
            <div class="mx_UserInfo_container">${menuItem("Ignore", LeaveIcon, { role: "button", kind: "critical" })}</div>
            <div class="mx_UserInfo_container"><h3>Verify User</h3><div><p>Compare a one-time code on both devices.</p></div></div>
        </div>
    `;
    return document.querySelector(".mx_UserInfo")!;
}

/** MemberTileView: the tile in the wrapper that MemberTileView puts around it. */
const memberTile = (name: string, tabIndex: number): string => `
    <div>
        <div class="mx_AccessibleButton mx_MemberTileView" role="option" tabindex="${tabIndex}">
            <div class="mx_MemberTileView_left">
                <div class="mx_MemberTileView_avatar">
                    ${html(createElement(Avatar, { id: `@${name.toLowerCase()}:example.org`, name, size: "32px" }))}
                </div>
                <div class="mx_MemberTileView_name">${name}</div>
            </div>
            <div class="mx_MemberTileView_right"><svg width="16" height="16"></svg></div>
        </div>
    </div>
`;

/** MemberListView: MemberListHeaderView's search field, invite button and count, then two member tiles. */
function renderMemberList(dir = "ltr"): HTMLElement {
    const search = html(
        createElement(
            Form.Root,
            null,
            createElement(Search, {
                className: "mx_MemberListHeaderView_search mx_no_textinput",
                name: "searchMembers",
                placeholder: "Filter People…",
                onChange: () => {},
            }),
        ),
    ).replace(/^<form[^>]*>|<\/form>$/g, "");
    const invite = html(
        createElement(Button, {
            "kind": "primary",
            "size": "md",
            "iconOnly": true,
            "Icon": UserAddIcon,
            "aria-label": "Invite",
        }),
    );
    const header = flex(
        "column",
        "mx_MemberListHeaderView",
        `${flex("row", "mx_MemberListHeaderView_container", search + invite, "var(--cpd-space-3x)")}
        <div class="mx_MemberListHeaderView_label">4 Members</div>`,
    );
    document.body.innerHTML = `
        <div class="mx_BaseCard mx_MemberListView" dir="${dir}" style="width: ${CARD_WIDTH}px">
            <form>${header}</form>
            <div role="listbox">${memberTile("Alice", 0)}${memberTile("Bob", -1)}</div>
        </div>
    `;
    return document.querySelector(".mx_MemberListView")!;
}

/** EmptyState as the files card shows it when the room has no files: the shared empty state, with the card's glow. */
const filesEmptyState = (): string =>
    emptyStateView({
        className: "mx_EmptyState",
        Icon: FilesIcon,
        title: "No files in this room",
        description: "Use the attachment button in the composer, or drag and drop files into the room.",
    });

function rows(card: HTMLElement): HTMLElement[] {
    return [...card.querySelectorAll<HTMLElement>('[class*="_item_"]')];
}

/** Focuses the row as the keyboard does, so that it matches :focus-visible, and returns its focus ring. */
async function keyboardFocusRing(row: HTMLElement): Promise<string> {
    await userEvent.keyboard("{Shift}");
    row.focus();
    expect(row.matches(":focus-visible")).toBe(true);
    const style = getComputedStyle(row);
    return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineOffset}`;
}

/** What hovering paints behind a row of each kind: rows that leave a room or ignore someone are red. */
/** A row's hover fill: Compound's, or the menus' red for a destructive row (_CompoundOverrides.pcss). */
const hoverColor = (kind: "primary" | "critical"): string =>
    tokenColor(
        kind === "primary" ? "--cpd-color-bg-action-secondary-hovered" : "--tl-color-bg-menu-critical-hovered",
        document.body,
    );

/** Focuses the row as the keyboard does and returns its background. */
async function keyboardFocusBackground(row: HTMLElement): Promise<string> {
    await keyboardFocusRing(row);
    return settledStyle(row).backgroundColor;
}

/**
 * Inset rows, as in the room list: the highlight 4px from the card's edges, and its icon 8px inside it on every side,
 * on the card's 12px content edge.
 */
function expectInsetRows(card: HTMLElement): void {
    expect(rows(card).length).toBeGreaterThan(0);
    for (const row of rows(card)) {
        const box = row.getBoundingClientRect();
        expect(insets(row, card)).toEqual({ start: 4, end: 4 });
        expect(box.height).toBe(40);
        expect(cornerRadii(row)).toEqual({ x: 8, y: 8 });
        const icon = row.querySelector("svg")!;
        expect(insets(icon, row).start).toBe(8);
        expect([icon.getBoundingClientRect().top - box.top, box.bottom - icon.getBoundingClientRect().bottom]).toEqual([
            8, 8,
        ]);
        expect(insets(icon, card).start).toBe(CONTENT_EDGE);
    }
}

let stylesheet: HTMLStyleElement;

describe("Right panel", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        // In the order _components.pcss imports them: _FilePanel.pcss comes before _RightPanel.pcss
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} ${telementTokens}
            }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${mediaBodyStyles} ${EMPTY_STATE_VIEW_STYLES} }
            @layer app-web {
                body { margin: 0; }
                ${[
                    accessibleButtonStyles,
                    filePanelStyles,
                    rightPanelStyles,
                    roomViewStyles,
                    baseCardStyles,
                    emptyStateStyles,
                    extensionsCardStyles,
                    pinnedMessagesCardStyles,
                    roomSummaryCardStyles,
                    userInfoStyles,
                    verificationPanelStyles,
                    memberListHeaderViewStyles,
                    memberTileViewStyles,
                    pinnedEventTileStyles,
                    thirdPartyMemberInfoStyles,
                    compoundOverrides,
                ]
                    .map((styles) => toBrowserCss(styles, lightTheme, fontSizes))
                    .join("\n")}
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

    describe("room info", () => {
        it("insets its rows 4px from the panel's edges, with their icons on the card's 12px content edge", () => {
            const card = renderRoomSummaryCard();
            expectInsetRows(card);

            for (const separator of card.querySelectorAll('[role="separator"]')) {
                expect(insets(separator, card)).toEqual({ start: CONTENT_EDGE, end: CONTENT_EDGE });
            }
            const toggle = card.querySelector('[role="menuitemcheckbox"] input')!.parentElement!;
            expect(insets(toggle, card).end).toBe(CONTENT_EDGE);
        });

        it("puts the summary and its topic on the card's 12px content edge", () => {
            const card = renderRoomSummaryCard();

            expect(insets(card.querySelector(".mx_RoomSummaryCard_container")!, card)).toEqual({
                start: CONTENT_EDGE,
                end: CONTENT_EDGE,
            });
            expect(insets(textOf(card.querySelector(".mx_RoomSummaryCard_topic p")!), card).start).toBe(CONTENT_EDGE);
            expect(insets(card.querySelector(".mx_RoomSummaryCard_topic_chevron")!, card).end).toBe(CONTENT_EDGE);
            expect(insets(textOf(card.querySelector(".mx_RoomSummaryCard_topic_edit a")!), card).start).toBe(
                CONTENT_EDGE,
            );
        });

        it("shows the topic's Edit link as a text button in the accent", () => {
            const card = renderRoomSummaryCard();
            const style = getComputedStyle(card.querySelector(".mx_RoomSummaryCard_topic_edit a")!);

            expect(style.color).toBe(tokenColor("--tl-accent-900", card));
            expect(style.textDecorationLine).toBe("none");
        });

        it("mirrors its rows and summary right to left", () => {
            const card = renderRoomSummaryCard("rtl");
            expectInsetRows(card);

            expect(insets(textOf(card.querySelector(".mx_RoomSummaryCard_topic p")!), card).start).toBe(CONTENT_EDGE);
            expect(insets(card.querySelector('[role="separator"]')!, card)).toEqual({
                start: CONTENT_EDGE,
                end: CONTENT_EDGE,
            });
        });

        it("draws the keyboard focus ring inside the focused row", async () => {
            const card = renderRoomSummaryCard();

            expect(await keyboardFocusRing(rows(card)[1])).toBe("solid 2px -2px");
        });

        it("highlights the row focused with the keyboard as on hover", async () => {
            const card = renderRoomSummaryCard();
            const [invite, leave] = [rows(card)[1], rows(card).at(-1)!];

            expect([invite.dataset.kind, leave.dataset.kind]).toEqual(["primary", "critical"]);
            expect(await keyboardFocusBackground(invite)).toBe(hoverColor("primary"));
            expect(await keyboardFocusBackground(leave)).toBe(hoverColor("critical"));
        });
    });

    describe("member info", () => {
        it("insets its rows 4px from the panel's edges, with their icons on the card's 12px content edge", () => {
            const card = renderUserInfo();
            expectInsetRows(card);

            // The separator is the border of the container that follows another
            const container = card.querySelectorAll(".mx_UserInfo_container")[2];
            expect(getComputedStyle(container).borderTopWidth).toBe("1px");
            expect(insets(container, card)).toEqual({ start: CONTENT_EDGE, end: CONTENT_EDGE });
        });

        it("puts the profile and the encryption and verification text on the card's 12px content edge", () => {
            const card = renderUserInfo();

            expect(insets(card.querySelector(".mx_UserInfo_header")!, card)).toEqual({
                start: CONTENT_EDGE,
                end: CONTENT_EDGE,
            });
            expect(insets(textOf(card.querySelector("h3")!), card).start).toBe(CONTENT_EDGE);
            expect(insets(textOf(card.querySelector("p")!), card).start).toBe(CONTENT_EDGE);
        });

        it("mirrors its rows and separators right to left", () => {
            const card = renderUserInfo("rtl");
            expectInsetRows(card);

            expect(insets(card.querySelectorAll(".mx_UserInfo_container")[2], card)).toEqual({
                start: CONTENT_EDGE,
                end: CONTENT_EDGE,
            });
        });

        it("draws the keyboard focus ring inside the focused row", async () => {
            const card = renderUserInfo();

            expect(await keyboardFocusRing(rows(card)[0])).toBe("solid 2px -2px");
        });

        it("highlights the row focused with the keyboard as on hover", async () => {
            const card = renderUserInfo();
            const [message, ignore] = [rows(card)[0], rows(card).at(-1)!];

            expect([message.dataset.kind, ignore.dataset.kind]).toEqual(["primary", "critical"]);
            expect(await keyboardFocusBackground(message)).toBe(hoverColor("primary"));
            expect(await keyboardFocusBackground(ignore)).toBe(hoverColor("critical"));
        });
    });

    describe("member list", () => {
        it("makes the search field the filled pill of every search, ringed in Compound's focus blue while focused", () => {
            const card = renderMemberList();
            const search = card.querySelector<HTMLElement>(".mx_MemberListHeaderView_search")!;
            const fill = (): string => getComputedStyle(search).backgroundColor;
            const probe = document.createElement("span");
            probe.style.backgroundColor = "var(--cpd-color-bg-subtle-secondary)";
            card.append(probe);
            const subtle = getComputedStyle(probe).backgroundColor;
            probe.remove();

            expect(fill()).toBe(subtle);
            expect(settledStyle(search).borderTopColor).toBe("rgba(0, 0, 0, 0)");
            expect(search.getBoundingClientRect().height).toBe(36);
            search.querySelector("input")!.focus();
            expect(settledStyle(search).borderTopColor).toBe("rgba(0, 0, 0, 0)");
            const focused = getComputedStyle(search);
            expect(`${focused.outlineStyle} ${focused.outlineWidth} ${focused.outlineOffset}`).toBe("solid 2px -2px");
            expect(getComputedStyle(search).outlineColor).toBe(tokenColor("--cpd-color-border-focused", card));
        });

        it.each(["ltr", "rtl"])(
            "starts the search field and the member count and ends the invite button on the content edge (%s)",
            (dir) => {
                const card = renderMemberList(dir);

                expect(insets(card.querySelector(".mx_MemberListHeaderView_search")!, card).start).toBe(CONTENT_EDGE);
                expect(insets(card.querySelector(".mx_MemberListHeaderView_container > button")!, card).end).toBe(
                    CONTENT_EDGE,
                );
                expect(insets(textOf(card.querySelector(".mx_MemberListHeaderView_label")!), card).start).toBe(
                    CONTENT_EDGE,
                );
            },
        );

        it.each(["ltr", "rtl"])(
            "stops the line under the member count on the content edge at both ends, as room info's dividers do (%s)",
            (dir) => {
                const card = renderMemberList(dir);
                const header = card.querySelector(".mx_MemberListHeaderView")!;

                expect(getComputedStyle(header).borderBottomWidth).toBe("1px");
                expect(insets(header, card)).toEqual({ start: CONTENT_EDGE, end: CONTENT_EDGE });
            },
        );

        it.each(["ltr", "rtl"])(
            "puts the avatar 12px from the tile's start, top and bottom and ends the tile's content on the content edge (%s)",
            (dir) => {
                const card = renderMemberList(dir);
                const tile = card.querySelector(".mx_MemberTileView")!;
                const avatar = card.querySelector(".mx_MemberTileView_avatar > *")!;
                const tileBox = tile.getBoundingClientRect();
                const avatarBox = avatar.getBoundingClientRect();

                // MemberListView lays the tiles out as 56px rows
                expect(tileBox.height).toBe(56);
                expect(avatarBox.height).toBe(32);
                expect([avatarBox.top - tileBox.top, tileBox.bottom - avatarBox.bottom]).toEqual([12, 12]);
                expect(insets(avatar, card).start).toBe(CONTENT_EDGE);
                expect(insets(card.querySelector(".mx_MemberTileView_right svg")!, card).end).toBe(CONTENT_EDGE);
            },
        );

        it.each(["ltr", "rtl"])(
            "highlights the tiles like room info's rows, 4px from the panel's edges and rounded by 8, with no dividers between them (%s)",
            async (dir) => {
                const card = renderMemberList(dir);
                const tiles = [...card.querySelectorAll<HTMLElement>(".mx_MemberTileView")];

                for (const tile of tiles) {
                    expect(insets(tile, card)).toEqual({ start: 4, end: 4 });
                    expect(cornerRadii(tile)).toEqual({ x: 8, y: 8 });
                    expect(getComputedStyle(tile).borderBottomStyle).toBe("none");
                    expect(settledStyle(tile).backgroundColor).toBe("rgba(0, 0, 0, 0)");
                }
                expect(tiles[1].getBoundingClientRect().top).toBe(tiles[0].getBoundingClientRect().bottom);
                await userEvent.hover(tiles[1]);
                expect(settledStyle(tiles[1]).backgroundColor).toBe(hoverColor("primary"));
                await userEvent.unhover(tiles[1]);
            },
        );

        it("draws the keyboard focus ring inside the focused tile, highlighted as on hover", async () => {
            const tile = renderMemberList().querySelector<HTMLElement>(".mx_MemberTileView")!;

            expect(await keyboardFocusRing(tile)).toBe("solid 2px -2px");
            expect(await keyboardFocusBackground(tile)).toBe(hoverColor("primary"));
        });
    });

    describe("extensions", () => {
        it.each(["ltr", "rtl"])(
            "starts and ends the widget rows and the layout link on the card's 12px content edge (%s)",
            (dir) => {
                document.body.innerHTML = `
                    <div class="mx_BaseCard mx_ExtensionsCard" dir="${dir}" style="width: ${CARD_WIDTH}px">
                        <div class="mx_AutoHideScrollbar">
                            ${html(createElement(Separator))}
                            <div class="mx_BaseCard_Button mx_ExtensionsCard_Button">
                                <div class="mx_AccessibleButton mx_ExtensionsCard_icon_app" role="button" tabindex="0">
                                    ${html(createElement(Avatar, { id: "widget", name: "Jitsi", size: "24px", className: "mx_WidgetAvatar" }))}
                                    <p>Jitsi</p>
                                </div>
                                <div class="mx_AccessibleButton mx_ExtensionsCard_app_options" role="button" tabindex="0">
                                    <svg width="16" height="16"></svg>
                                </div>
                                <div class="mx_AccessibleButton mx_ExtensionsCard_app_pinToggle" role="button" tabindex="0">
                                    <svg width="16" height="16"></svg>
                                </div>
                            </div>
                            ${html(createElement(Link, { kind: "primary" }, "Set layout for everyone"))}
                        </div>
                    </div>
                `;
                const card = document.querySelector(".mx_ExtensionsCard")!;
                const pin = card.querySelector(".mx_ExtensionsCard_app_pinToggle")!;

                expect(insets(card.querySelector('[role="separator"]')!, card)).toEqual({
                    start: CONTENT_EDGE,
                    end: CONTENT_EDGE,
                });
                expect(insets(card.querySelector(".mx_WidgetAvatar")!, card).start).toBe(CONTENT_EDGE);
                expect(insets(pin, card).end).toBe(CONTENT_EDGE);
                // The options button sits just before the pin toggle
                expect(insets(card.querySelector(".mx_ExtensionsCard_app_options")!, card).end).toBe(
                    CONTENT_EDGE + pin.getBoundingClientRect().width,
                );
                expect(insets(textOf(card.querySelector("a")!), card).start).toBe(CONTENT_EDGE);
            },
        );
    });

    describe("files", () => {
        it("puts the file tiles on the card's 12px content edge, past the right panel timelines' 18px", () => {
            document.body.innerHTML = `
                <aside class="mx_RightPanel" style="width: ${CARD_WIDTH + 1}px; height: 400px">
                    <div class="mx_BaseCard mx_FilePanel">
                        <div class="mx_RoomView_messagePanel">
                            <div class="mx_RoomView_messageListWrapper">
                                <ol class="mx_RoomView_MessageList"><li style="height: 80px">spec.pdf</li></ol>
                            </div>
                        </div>
                    </div>
                </aside>
            `;
            const card = document.querySelector(".mx_FilePanel")!;

            expect(insets(card.querySelector("li")!, card)).toEqual({ start: CONTENT_EDGE, end: CONTENT_EDGE });
        });

        it.each(["ltr", "rtl"])(
            "spans a voice message's player to the content edge at both ends, as the file cards are (%s)",
            (dir) => {
                document.body.innerHTML = `
                    <aside class="mx_RightPanel" dir="${dir}" style="width: ${CARD_WIDTH + 1}px; height: 400px">
                        <div class="mx_BaseCard mx_FilePanel">
                            <div class="mx_RoomView_messagePanel">
                                <div class="mx_RoomView_messageListWrapper">
                                    <ol class="mx_RoomView_MessageList">
                                        <li><span class="mx_MVoiceMessageBody">
                                            <div class="mediaBody mx_VoiceMessagePrimaryContainer">00:01</div>
                                        </span></li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </aside>
                `;
                const card = document.querySelector(".mx_FilePanel")!;
                const player = card.querySelector(".mx_VoiceMessagePrimaryContainer")!;

                expect(insets(player, card)).toEqual({ start: CONTENT_EDGE, end: CONTENT_EDGE });
            },
        );

        it.each(["ltr", "rtl"])(
            "centers its empty state on the card, which TimelinePanel puts where the room's empty timeline goes (%s)",
            (dir) => {
                document.body.innerHTML = `
                    <aside class="mx_RightPanel" dir="${dir}" style="width: ${CARD_WIDTH + 1}px; height: 600px">
                        <div class="mx_BaseCard mx_FilePanel">
                            <div class="undefined mx_RoomView_messageListWrapper">
                                <div class="mx_RoomView_empty">${filesEmptyState()}</div>
                            </div>
                        </div>
                    </aside>
                `;
                const card = document.querySelector(".mx_FilePanel")!.getBoundingClientRect();
                const tile = document.querySelector(".mx_EmptyState svg")!.getBoundingClientRect();
                const title = document.querySelector(".mx_EmptyState p")!.getBoundingClientRect();

                expect(tile.left + tile.width / 2).toBeCloseTo(card.left + card.width / 2, 0);
                expect(title.left + title.width / 2).toBeCloseTo(card.left + card.width / 2, 0);
            },
        );
    });

    describe("pinned messages", () => {
        /** PinnedMessagesCard with one pinned message, as PinnedEventTile renders it. */
        function renderPinnedMessage(): HTMLElement {
            document.body.innerHTML = `
                <div class="mx_BaseCard mx_PinnedMessagesCard" style="width: ${CARD_WIDTH}px">
                    <div class="mx_PinnedMessagesCard_wrapper" role="list">
                        <div class="mx_PinnedEventTile" role="listitem">
                            <div>${html(createElement(Avatar, { id: "@alice:example.org", name: "Alice", size: "32px", className: "mx_PinnedEventTile_senderAvatar" }))}</div>
                            <div class="mx_PinnedEventTile_wrapper">
                                <div class="mx_PinnedEventTile_top">
                                    <span class="mx_PinnedEventTile_sender">Alice</span>
                                    ${html(createElement(IconButton, { "size": "24px", "aria-label": "Open menu" }, createElement(OverflowHorizontalIcon)))}
                                </div>
                                <div class="mx_EventTile_content">The second one</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            return document.querySelector(".mx_PinnedMessagesCard")!;
        }

        it("puts the sender's name 8px after the avatar, as the member list does", () => {
            const card = renderPinnedMessage();
            const avatar = card.querySelector(".mx_PinnedEventTile_senderAvatar")!.getBoundingClientRect();

            expect(textOf(card.querySelector(".mx_PinnedEventTile_sender")!).getBoundingClientRect().left).toBe(
                avatar.right + 8,
            );
            expect(insets(textOf(card.querySelector(".mx_EventTile_content")!), card).start).toBe(
                CONTENT_EDGE + 32 + 8,
            );
        });

        it("draws the menu's … as a 24px icon in a 36px button that hangs over the sender's line, unclipped", () => {
            const card = renderPinnedMessage();
            const button = card.querySelector<HTMLElement>(".mx_PinnedEventTile_top > button")!;
            const box = button.getBoundingClientRect();
            const icon = button.querySelector("svg")!.getBoundingClientRect();
            const top = card.querySelector(".mx_PinnedEventTile_top")!.getBoundingClientRect();
            const wrapper = card.querySelector(".mx_PinnedEventTile_wrapper")!;

            expect([box.width, box.height]).toEqual([36, 36]);
            expect([icon.width, icon.height]).toEqual([24, 24]);
            expect([icon.left - box.left, icon.top - box.top]).toEqual([6, 6]);
            // The sender's line keeps the height of the 24px button it had, and the button is centered on it
            expect(top.height).toBe(24);
            expect(box.top + box.height / 2).toBe(top.top + top.height / 2);
            expect(getComputedStyle(wrapper).overflowY).toBe("visible");
            expect(insets(button, card).end).toBe(CONTENT_EDGE);
        });

        it("puts the pinned messages and their separators on the card's 12px content edge", () => {
            const tile = `
                <div class="mx_PinnedEventTile" role="listitem">
                    <div>${html(createElement(Avatar, { id: "@alice:example.org", name: "Alice", size: "32px", className: "mx_PinnedEventTile_senderAvatar" }))}</div>
                    <div class="mx_PinnedEventTile_wrapper">
                        <div class="mx_PinnedEventTile_top">
                            <span class="mx_PinnedEventTile_sender">Alice</span>
                            ${html(createElement(IconButton, { "size": "24px", "aria-label": "Open menu" }, createElement(OverflowHorizontalIcon)))}
                        </div>
                        <div class="mx_EventTile_content">The second one</div>
                    </div>
                </div>
            `;
            document.body.innerHTML = `
                <div class="mx_BaseCard mx_PinnedMessagesCard" style="width: ${CARD_WIDTH}px">
                    <div class="mx_PinnedMessagesCard_wrapper" role="list">
                        ${tile}
                        ${html(createElement(Separator, { className: "mx_PinnedMessagesCard_Separator" }))}
                        ${tile}
                    </div>
                </div>
            `;
            const card = document.querySelector(".mx_PinnedMessagesCard")!;

            expect(insets(card.querySelector(".mx_PinnedEventTile_senderAvatar")!, card).start).toBe(CONTENT_EDGE);
            expect(insets(card.querySelector(".mx_PinnedEventTile_top > button")!, card).end).toBe(CONTENT_EDGE);
            expect(insets(card.querySelector(".mx_PinnedMessagesCard_Separator")!, card)).toEqual({
                start: CONTENT_EDGE,
                end: CONTENT_EDGE,
            });
        });
    });

    describe("verification", () => {
        const legacyButton = (label: string, className: string): string =>
            `<div class="mx_AccessibleButton ${className} mx_AccessibleButton_hasKind mx_AccessibleButton_kind_primary" role="button" tabindex="0">${label}</div>`;

        it("puts each button 16px under the text before it, at the content edge and as wide as its label", () => {
            document.body.innerHTML = `
                <div class="mx_BaseCard mx_UserInfo" style="width: ${CARD_WIDTH}px">
                    <div class="mx_UserInfo_container"><h3>Verify User</h3><div>
                        <p>For extra security, verify this user by checking a one-time code on both of your devices.</p>
                        <p>To be secure, do this in person or use a trusted way to communicate.</p>
                        ${legacyButton("Start Verification", "mx_UserInfo_wideButton mx_UserInfo_startVerification")}
                    </div></div>
                    <div class="mx_UserInfo_container"><h3>Verify by emoji</h3>
                        <p>If you can't scan the code above, verify by comparing unique emoji.</p>
                        ${legacyButton("Verify by emoji", "mx_UserInfo_wideButton mx_VerificationPanel_verifyByEmojiButton")}
                    </div>
                    <div class="mx_UserInfo_container">
                        <p>You cancelled verification.</p>
                        ${legacyButton("Got it", "mx_UserInfo_wideButton")}
                    </div>
                </div>
            `;
            const card = document.querySelector(".mx_UserInfo")!;
            const buttons = [...card.querySelectorAll<HTMLElement>(".mx_UserInfo_wideButton")];

            expect(buttons).toHaveLength(3);
            for (const button of buttons) {
                const text = [...button.parentElement!.querySelectorAll("p")].at(-1)!;
                expect(button.getBoundingClientRect().top - text.getBoundingClientRect().bottom).toBe(16);
                expect(insets(button, card).start).toBe(CONTENT_EDGE);
                expect(button.getBoundingClientRect().width).toBeLessThan(CARD_WIDTH / 2);
            }
        });
    });

    describe("empty states and other cards", () => {
        it("lays the empty state of the files, notifications, pinned messages and extensions cards out between the content edges", () => {
            document.body.innerHTML = `
                <div class="mx_BaseCard" style="width: ${CARD_WIDTH}px; position: relative">${filesEmptyState()}</div>
            `;
            const card = document.querySelector(".mx_BaseCard")!;

            expect(insets(card.querySelector(".mx_EmptyState p:last-child")!, card)).toEqual({
                start: CONTENT_EDGE,
                end: CONTENT_EDGE,
            });
        });

        it("puts the title 16px under the icon's tile and the description 8px under the title", () => {
            document.body.innerHTML = `
                <div class="mx_BaseCard" style="width: ${CARD_WIDTH}px; height: 600px; position: relative">
                    ${filesEmptyState()}
                </div>
            `;
            const tile = document.querySelector(".mx_EmptyState svg")!.getBoundingClientRect();
            const [title, description] = [...document.querySelectorAll(".mx_EmptyState p")].map((paragraph) =>
                paragraph.getBoundingClientRect(),
            );

            expect(title.top - tile.bottom).toBe(16);
            expect(description.top - title.bottom).toBe(8);
        });

        it("puts a third-party invite's details on the card's 12px content edge", () => {
            document.body.innerHTML = `
                <div class="mx_BaseCard" style="width: ${CARD_WIDTH}px">
                    ${flex("column", "mx_ThirdPartyMemberInfo", `<section><h2>Invited by email</h2></section>`)}
                </div>
            `;
            const card = document.querySelector(".mx_BaseCard")!;

            expect(insets(card.querySelector(".mx_ThirdPartyMemberInfo section")!, card)).toEqual({
                start: CONTENT_EDGE,
                end: CONTENT_EDGE,
            });
        });
    });
});
