/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type FocusEvent, type JSX, useEffect, useRef } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";

// The package's build needs a Node environment that the browser hasn't
// eslint-disable-next-line no-restricted-imports
import { FlatVirtualizedList } from "../../../../../packages/shared-components/src/core/VirtualizedList/FlatVirtualizedList/FlatVirtualizedList";
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../packages/shared-components/src/telement/tokens.css?raw";
import rightPanelStyles from "../../../res/css/structures/_RightPanel.pcss?raw";
import baseCardStyles from "../../../res/css/views/right_panel/_BaseCard.pcss?raw";
import memberListViewStyles from "../../../res/css/views/rooms/_MemberListView.pcss?raw";
import memberTileViewStyles from "../../../res/css/views/rooms/_MemberTileView.pcss?raw";
import lightTheme from "../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../test/telement/browserCss";

/** MemberListView's height of an item. */
const ITEM_HEIGHT = 56;

interface TileProps {
    name: string;
    focused: boolean;
    tabIndex: number;
    onFocus(this: void, event: FocusEvent): void;
}

/** MemberTileView, which takes the focus while it is the list's focused item. */
function Tile({ name, focused, tabIndex, onFocus }: TileProps): JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (focused) ref.current?.focus({ preventScroll: true });
    }, [focused]);
    return (
        <div>
            <div
                ref={ref}
                className="mx_MemberTileView"
                role="option"
                aria-selected={false}
                tabIndex={tabIndex}
                onFocus={onFocus}
            >
                <div className="mx_MemberTileView_left">{name}</div>
            </div>
        </div>
    );
}

/** The people's pane as MemberListView renders it: the title, the controls and the list, which scrolls on its own. */
function People({ joined, invited }: { joined: number; invited: number }): JSX.Element {
    const names = Array.from({ length: joined + invited }, (_, i) => `Person ${i + 1}`);
    return (
        <aside className="mx_RightPanel" style={{ width: 352, height: 700 }}>
            <div className="mx_BaseCard mx_MemberListView">
                <div className="mx_BaseCard_header">People</div>
                <header className="mx_BaseCard_controls">Search</header>
                <FlatVirtualizedList
                    items={names}
                    getItemKey={(name) => name}
                    isItemFocusable={() => true}
                    getItemComponent={(index, name, context, onFocus) => {
                        const isTabStop = name === context.tabIndexKey;
                        const tile = (
                            <Tile
                                name={name}
                                focused={isTabStop && context.focused}
                                tabIndex={isTabStop ? 0 : -1}
                                onFocus={(event) => onFocus(name, event)}
                            />
                        );
                        return index === joined ? <div className="mx_MemberListView_separated">{tile}</div> : tile;
                    }}
                    role="listbox"
                    aria-label="Member list"
                    fixedItemHeight={ITEM_HEIGHT}
                    increaseViewportBy={{ top: 15 * ITEM_HEIGHT, bottom: 15 * ITEM_HEIGHT }}
                />
            </div>
        </aside>
    );
}

let root: Root | undefined;
let stylesheet: HTMLStyleElement;

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
const list = (): HTMLElement => document.querySelector<HTMLElement>('[role="listbox"]')!;
const firstTile = (): HTMLElement => document.querySelector<HTMLElement>(".mx_MemberTileView")!;

async function renderPeople(joined: number, invited = 0): Promise<void> {
    document.body.innerHTML = `<div class="cpd-theme-light" style="height: 700px"></div>`;
    root = createRoot(document.body.firstElementChild!);
    root.render(<People joined={joined} invited={invited} />);
    for (let i = 0; i < 100 && !document.querySelector(".mx_MemberTileView"); i++) await frame();
}

describe("the scrolling of the people's list", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            ${[compoundBase, compoundSemantic, compoundLightTheme, compoundLightSemantic, telementTokens].join("\n")}
            body { margin: 0; }
            ${[rightPanelStyles, baseCardStyles, memberListViewStyles, memberTileViewStyles]
                .map((styles) => toBrowserCss(styles, lightTheme))
                .join("\n")}
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        root?.unmount();
        root = undefined;
        document.body.innerHTML = "";
    });

    it.each([
        [500, 0],
        [150, 60],
    ])(
        "keeps its height, so that its scrollbar keeps its place, as it scrolls past %i people in the room and %i invited",
        async (joined, invited) => {
            await renderPeople(joined, invited);
            const scroller = list();
            const heights = new Set<number>();
            const moved: number[] = [];

            for (let top = 0; top < scroller.scrollHeight - scroller.clientHeight; top += 280) {
                scroller.scrollTop = top;
                const asked = scroller.scrollTop;
                await frame();
                heights.add(scroller.scrollHeight);
                if (scroller.scrollTop !== asked) moved.push(scroller.scrollTop - asked);
            }

            expect([...heights]).toEqual([(joined + invited) * ITEM_HEIGHT]);
            expect(moved).toEqual([]);
            expect(
                new Set([...document.querySelectorAll("[data-item-index]")].map((item) => item.clientHeight)),
            ).toEqual(new Set([ITEM_HEIGHT]));
        },
    );

    it("scrolls under its two headers, which stay", async () => {
        await renderPeople(500);
        const headers = [".mx_BaseCard_header", ".mx_BaseCard_controls"].map((selector) =>
            document.querySelector(selector)!,
        );
        const tops = (): number[] => headers.map((header) => header.getBoundingClientRect().top);
        const [before, listTop] = [tops(), list().getBoundingClientRect().top];

        list().scrollTop = 5000;
        await frame();

        expect(tops()).toEqual(before);
        expect(listTop).toBe(headers[1].getBoundingClientRect().bottom);
        // The list ends with the panel, so nothing else scrolls
        expect(list().getBoundingClientRect().bottom).toBe(
            document.querySelector(".mx_BaseCard")!.getBoundingClientRect().bottom,
        );
        expect(document.querySelector(".mx_BaseCard")!.scrollHeight).toBe(
            document.querySelector(".mx_BaseCard")!.clientHeight,
        );
    });

    describe("pressing its scrollbar, which the browser reports as pressing the list itself", () => {
        /** Scrollbars are hidden in this browser, so a border of the list takes the place of one. */
        const pressScrollbar = async (): Promise<void> => {
            const { width, height } = list().getBoundingClientRect();
            await userEvent.click(list(), { position: { x: width - 4, y: height / 2 } });
            for (let i = 0; i < 5; i++) await frame();
        };

        it("leaves the list where it is, though its Tab stop has scrolled out of what is drawn", async () => {
            await renderPeople(500);
            list().style.borderRight = "12px solid";
            list().scrollTop = 5600;
            for (let i = 0; i < 5; i++) await frame();
            expect(document.querySelector('[tabindex="0"].mx_MemberTileView')).toBeNull();

            await pressScrollbar();

            expect(list().scrollTop).toBe(5600);
            expect(list()).not.toBe(document.activeElement);
        });

        it("leaves the focus where it is, such as in the search field", async () => {
            await renderPeople(500);
            list().style.borderRight = "12px solid";
            const field = document.createElement("input");
            document.body.prepend(field);
            field.focus();

            await pressScrollbar();

            expect(document.activeElement).toBe(field);
        });

        it("still lets the keyboard reach the list's Tab stop, scrolled out of what is drawn", async () => {
            await renderPeople(500);
            list().scrollTop = 5600;
            for (let i = 0; i < 5; i++) await frame();
            await userEvent.keyboard("{Tab}");
            for (let i = 0; i < 10; i++) await frame();

            expect(list().scrollTop).toBeLessThan(ITEM_HEIGHT);
            expect(document.activeElement).toBe(firstTile());
        });
    });
});
