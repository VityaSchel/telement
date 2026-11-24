/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { composeStories } from "@storybook/react-vite";
import userEvent from "@testing-library/user-event";
import { userEvent as pointer } from "vitest/browser";
import { render, screen } from "@test-utils";
import { describe, expect, it, vi } from "vitest";
// The layout assertions need the real spacing tokens, Compound's menus and Telement's tokens
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../tokens.css";

import * as stories from "./ValueRowView.stories";
import {
    ValueRowList,
    type ValueRowOption,
    ValueRowView,
    type ValueRowViewActions,
    type ValueRowViewSnapshot,
} from "./ValueRowView";
import { MockViewModel } from "../../../core/viewmodel/MockViewModel";
import { SettingsStoryCard as Card } from "../SettingsStoryCard";

const { Default, Disabled, CustomValue, EditingCustomValue, Person, LongValue, List, ManyOptions } =
    composeStories(stories);

/** A view model of the row with mocked actions. */
function rowViewModel(
    snapshot: Partial<ValueRowViewSnapshot> = {},
): MockViewModel<ValueRowViewSnapshot> & ValueRowViewActions {
    const vm = new MockViewModel<ValueRowViewSnapshot>({
        label: "Send messages",
        value: "Default",
        options: [
            { key: "0", label: "Default" },
            { key: "50", label: "Moderator" },
        ],
        selectedKey: "0",
        disabled: false,
        ...snapshot,
    });
    return Object.assign(vm, {
        select: vi.fn(),
        startCustom: vi.fn(),
        setCustomValue: vi.fn(),
        commitCustom: vi.fn(),
        cancelCustom: vi.fn(),
    });
}

/** What a color token resolves to in the document. */
function tokenColor(token: string, property: "color" | "backgroundColor" = "color"): string {
    const probe = document.createElement("div");
    probe.style[property] = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe)[property];
    probe.remove();
    return color;
}

/** Where the text of an element is drawn. */
function textBox(element: Element): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect();
}

const card = (): DOMRect => screen.getByTestId("card").getBoundingClientRect();

describe("ValueRowView", () => {
    it("shows the label and the value, and opens a menu of the choices with the chosen one checked", async () => {
        render(<Default />);
        const row = screen.getByRole("button", { name: "Send messages Default" });

        await userEvent.click(row);

        const items = screen.getAllByRole("menuitemradio");
        expect(items.map((item) => item.textContent)).toEqual(["Default", "Moderator", "Admin"]);
        expect(items.map((item) => item.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
        // The check ends the chosen item, after its label
        expect(items[0].lastElementChild?.tagName).toBe("svg");
        expect(items[1].querySelector("svg")).toBeNull();
        expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("chooses an option", async () => {
        const vm = rowViewModel();
        render(<ValueRowView vm={vm} />);

        await userEvent.click(screen.getByRole("button"));
        await userEvent.click(screen.getByRole("menuitemradio", { name: "Moderator" }));

        expect(vm.select).toHaveBeenCalledWith("50");
        expect(screen.queryByRole("menu")).toBeNull();
    });

    it("offers a value of one's own last, checked while no option is chosen", async () => {
        render(<CustomValue />);

        await userEvent.click(screen.getByRole("button", { name: "Remove users 75" }));

        const custom = screen.getByRole("menuitemradio", { name: "Custom…" });
        expect(screen.getAllByRole("menuitemradio").at(-1)).toBe(custom);
        expect(custom).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("menuitemradio", { name: "Default" })).toHaveAttribute("aria-checked", "false");
    });

    it("starts typing a value of one's own when the custom item is chosen", async () => {
        const vm = rowViewModel({ customLabel: "Custom…" });
        render(<ValueRowView vm={vm} />);

        await userEvent.click(screen.getByRole("button"));
        await userEvent.click(screen.getByRole("menuitemradio", { name: "Custom…" }));

        expect(vm.startCustom).toHaveBeenCalled();
    });

    it("replaces the value with a focused field, applying it on Enter", async () => {
        const vm = rowViewModel({ customLabel: "Custom…", customValue: "75" });
        render(<ValueRowView vm={vm} />);
        const field = screen.getByRole("spinbutton", { name: "Send messages" });

        await vi.waitFor(() => expect(field).toHaveFocus());
        expect(field).toHaveValue(75);
        expect(screen.queryByRole("button")).toBeNull();

        await userEvent.type(field, "1");
        expect(vm.setCustomValue).toHaveBeenLastCalledWith("751");

        await userEvent.keyboard("{Enter}");
        expect(vm.commitCustom).toHaveBeenCalledTimes(1);
        expect(vm.cancelCustom).not.toHaveBeenCalled();
    });

    it("leaves the field without applying it on Escape, which goes no further", async () => {
        const vm = rowViewModel({ customLabel: "Custom…", customValue: "75" });
        const onKeyDown = vi.fn();
        render(
            <div onKeyDown={onKeyDown}>
                <ValueRowView vm={vm} />
            </div>,
        );
        const field = screen.getByRole("spinbutton");
        await vi.waitFor(() => expect(field).toHaveFocus());

        await userEvent.keyboard("{Escape}");
        field.blur();

        expect(vm.cancelCustom).toHaveBeenCalledTimes(1);
        expect(vm.commitCustom).not.toHaveBeenCalled();
        expect(onKeyDown).not.toHaveBeenCalled();
    });

    it("shows a value that can't be changed without a chevron or a menu", async () => {
        render(<Disabled />);

        expect(screen.queryByRole("button")).toBeNull();
        expect(screen.getByText("Change permissions").closest("[aria-disabled]")).toHaveTextContent(
            "Change permissionsAdmin",
        );
        expect(document.querySelector("svg")).toBeNull();
    });

    it("draws a 44px row on the card's content edge, its fill 4px from the card's edges", () => {
        render(<Default />);
        const row = screen.getByRole("button").getBoundingClientRect();
        const style = getComputedStyle(screen.getByRole("button"));

        expect(row.height).toBe(44);
        expect([row.left - card().left, card().right - row.right, row.top - card().top]).toEqual([4, 4, 4]);
        expect(style.borderTopLeftRadius).toBe("8px");
        expect(textBox(screen.getByText("Send messages")).left - card().left).toBe(16);
    });

    it("writes the label in 15px primary text and the value in secondary text, the chevron 4px after it", () => {
        render(<Default />);
        const label = screen.getByText("Send messages", { selector: "span" });
        const value = screen.getByText("Default", { selector: "span" });
        const chevron = screen.getByRole("button").querySelector("svg")!;

        expect(getComputedStyle(label).fontSize).toBe("15px");
        expect(getComputedStyle(label).color).toBe(tokenColor("--cpd-color-text-primary"));
        expect(getComputedStyle(value).color).toBe(tokenColor("--cpd-color-text-secondary"));
        expect(chevron.getBoundingClientRect().left - value.getBoundingClientRect().right).toBe(4);
        expect(chevron.getBoundingClientRect().width).toBe(16);
    });

    it("ends the drawn chevron on the content edge, centered on the row", () => {
        render(<Default />);
        const row = screen.getByRole("button").getBoundingClientRect();
        const glyph = screen.getByRole("button").querySelector("svg path")!.getBoundingClientRect();

        expect(card().right - glyph.right).toBeCloseTo(16, 0);
        expect(glyph.top + glyph.height / 2).toBeCloseTo(row.top + row.height / 2, 0);
    });

    it("fills the row in the row hover gray while hovered and while its menu is open", async () => {
        render(<Default />);
        const row = screen.getByRole("button");

        expect(getComputedStyle(row).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        await pointer.hover(row);
        expect(getComputedStyle(row).backgroundColor).toBe(
            tokenColor("--cpd-color-bg-action-secondary-hovered", "backgroundColor"),
        );
        await userEvent.click(row);
        await pointer.hover(screen.getByRole("menuitemradio", { name: "Admin" }));
        expect(getComputedStyle(row).backgroundColor).toBe(
            tokenColor("--cpd-color-bg-action-secondary-pressed", "backgroundColor"),
        );
    });

    it("darkens the value and the second line on the pressed fill, while the menu is open", async () => {
        render(<Person />);
        const row = screen.getByRole("button");
        const texts = [screen.getByText("Moderator"), screen.getByText("@bot_0002:localhost")];
        const colors = (): string[] => texts.map((text) => getComputedStyle(text).color);

        expect(new Set(colors())).toEqual(new Set([tokenColor("--cpd-color-text-secondary")]));
        await userEvent.click(row);
        expect(new Set(colors())).toEqual(new Set([tokenColor("--tl-color-text-secondary-on-pressed")]));
    });

    it("draws a person as a 52px two-line row, the 36px avatar on the content edge 8px from its top and bottom", () => {
        render(<Person />);
        const row = screen.getByRole("button").getBoundingClientRect();
        const avatar = screen.getByRole("button").querySelector("[data-type]")!.getBoundingClientRect();
        expect(screen.getByRole("button")).toHaveAccessibleName("BotBob @bot_0002:localhost Moderator");
        const id = screen.getByText("@bot_0002:localhost");

        expect(row.height).toBe(52);
        expect([avatar.width, avatar.height]).toEqual([36, 36]);
        expect([avatar.top - row.top, row.bottom - avatar.bottom]).toEqual([8, 8]);
        expect(avatar.left - card().left).toBe(16);
        expect(getComputedStyle(id).fontSize).toBe("13px");
        expect(getComputedStyle(id).color).toBe(tokenColor("--cpd-color-text-secondary"));
        expect(getComputedStyle(id).fontFeatureSettings).toContain('"calt" 0');
    });

    it("cuts a long value short before it takes more than half the row", () => {
        render(<LongValue />);
        const row = screen.getByRole("button").getBoundingClientRect();
        const value = screen.getAllByText(/MacBook Pro Speakers/)[0];

        expect(value.getBoundingClientRect().width).toBeLessThan(row.width / 2);
        expect(getComputedStyle(value).textOverflow).toBe("ellipsis");
    });

    it("puts rows of a list one under another without gaps, a card holding only them 4px around them", () => {
        render(<List />);
        const rows = screen.getAllByRole("button").map((row) => row.getBoundingClientRect());

        expect(rows[1].top).toBe(rows[0].bottom);
        expect(rows[2].top).toBe(rows[1].bottom);
        expect(rows[0].top - card().top).toBe(4);
        expect(card().bottom - rows[2].bottom).toBe(4);
    });

    it("keeps the card's gap between a list and what comes before it", () => {
        render(
            <Card>
                <div data-testid="field" style={{ height: 36 }} />
                <ValueRowList>
                    <ValueRowView vm={rowViewModel()} />
                    <ValueRowView vm={rowViewModel({ label: "Invite users" })} />
                </ValueRowList>
            </Card>,
        );
        const field = screen.getByTestId("field").getBoundingClientRect();
        const [first, second] = screen.getAllByRole("button").map((row) => row.getBoundingClientRect());

        expect(first.top - field.bottom).toBe(16);
        expect(second.top).toBe(first.bottom);
        expect(card().bottom - second.bottom).toBe(4);
    });

    it("puts the field for a value of one's own on the content edge, 36px tall, keeping the row 44px", () => {
        render(<EditingCustomValue />);
        const field = screen.getByRole("spinbutton");
        const box = field.getBoundingClientRect();
        const row = field.parentElement!.getBoundingClientRect();
        const style = getComputedStyle(field);

        expect(row.height).toBe(44);
        expect(box.height).toBe(36);
        expect([box.top - row.top, card().right - box.right]).toEqual([4, 16]);
        expect([style.borderTopWidth, style.borderTopLeftRadius, style.fontSize]).toEqual(["1px", "8px", "15px"]);
        expect(parseFloat(style.paddingInlineEnd) + 1).toBe(12);
    });

    it("mirrors in right-to-left text, the value and the chevron at the left", () => {
        render(
            <div dir="rtl">
                <Default />
            </div>,
        );
        const glyph = screen.getByRole("button").querySelector("svg path")!.getBoundingClientRect();

        expect(textBox(screen.getByText("Send messages")).right).toBeCloseTo(card().right - 16, 0);
        expect(glyph.left - card().left).toBeCloseTo(16, 0);
    });

    describe("a menu of more than 20 options", () => {
        const LANGUAGES: ValueRowOption[] = [
            { key: "cs", label: "čeština", searchTerms: ["Czech"] },
            { key: "de", label: "Deutsch", searchTerms: ["German"] },
            { key: "en", label: "English", searchTerms: ["English"] },
            { key: "fr", label: "français", searchTerms: ["French"] },
            { key: "pt", label: "português", searchTerms: ["Portuguese"] },
            { key: "pt_BR", label: "português (Brasil)", searchTerms: ["Brazilian Portuguese"] },
            ...Array.from({ length: 24 }, (_, i) => ({
                key: `zone-${i}`,
                label: `America/Somewhere/Zone_${String(i).padStart(2, "0")}`,
            })),
        ];

        const pill = (): HTMLElement => screen.getByRole("textbox", { name: "Search" });
        const labels = (): (string | null)[] => screen.queryAllByRole("menuitemradio").map((item) => item.textContent);
        const highlighted = (): (string | null)[] =>
            screen
                .getAllByRole("menuitemradio")
                .filter((item) => getComputedStyle(item).backgroundColor !== "rgba(0, 0, 0, 0)")
                .map((item) => item.textContent);
        const list = (): HTMLElement => document.getElementById(pill().getAttribute("aria-controls")!)!;

        async function openMenu(
            snapshot: Partial<ValueRowViewSnapshot> = {},
        ): Promise<MockViewModel<ValueRowViewSnapshot> & ValueRowViewActions> {
            const vm = rowViewModel({ options: LANGUAGES, selectedKey: "en", value: "English", ...snapshot });
            render(<ValueRowView vm={vm} />);
            await pointer.click(screen.getByRole("button", { name: /^Send messages/ }));
            await vi.waitFor(() => expect(pill()).toHaveFocus());
            return vm;
        }

        it("starts with a search pill, which a menu of 20 options doesn't", async () => {
            const { unmount } = render(<ValueRowView vm={rowViewModel({ options: LANGUAGES.slice(0, 20) })} />);
            await userEvent.click(screen.getByRole("button"));
            expect(labels()).toHaveLength(20);
            expect(screen.queryByRole("textbox")).toBeNull();
            unmount();

            await openMenu({ options: LANGUAGES.slice(0, 21) });
            expect(labels()).toHaveLength(21);
            expect(pill()).toHaveAttribute("placeholder", "Search");
        });

        it("filters the options as the user types, in their order, in any case and without accents", async () => {
            await openMenu();

            // Typed, so that the menu's own search by the start of an item's name would take the keys
            await pointer.keyboard("POR");
            expect(labels()).toEqual(["português", "português (Brasil)"]);
            expect(pill()).toHaveFocus();

            await pointer.fill(pill(), "portugues bra");
            expect(labels()).toEqual(["português (Brasil)"]);

            await pointer.fill(pill(), "CESTINA");
            expect(labels()).toEqual(["čeština"]);

            await pointer.fill(pill(), "somewhere zone 07");
            expect(labels()).toEqual(["America/Somewhere/Zone_07"]);
        });

        it("finds an option by what else it is called", async () => {
            await openMenu();

            await pointer.fill(pill(), "german");
            expect(labels()).toEqual(["Deutsch"]);
        });

        it("shows every option again when the pill is cleared, which keeps the focus", async () => {
            await openMenu();
            await pointer.fill(pill(), "german");

            await pointer.click(screen.getByRole("button", { name: "Clear search" }));

            expect(pill()).toHaveValue("");
            expect(labels()).toHaveLength(LANGUAGES.length);
            expect(pill()).toHaveFocus();
        });

        it("says when no option matches, and Enter then chooses nothing", async () => {
            const vm = await openMenu();

            await pointer.fill(pill(), "klingon");
            await pointer.keyboard("{Enter}");

            expect(labels()).toEqual([]);
            expect(list().textContent).toBe("No results");
            expect(vm.select).not.toHaveBeenCalled();
        });

        it("highlights the current choice, checked and in view, and then the first match", async () => {
            await openMenu({ selectedKey: "zone-20" });
            const current = screen.getByRole("menuitemradio", { name: "America/Somewhere/Zone_20" });
            const check = current.querySelector("svg")!;

            expect(highlighted()).toEqual(["America/Somewhere/Zone_20"]);
            expect(pill()).toHaveAttribute("aria-activedescendant", current.id);
            expect(current).toHaveAttribute("aria-checked", "true");
            expect(current.lastElementChild).toBe(check);
            // In the middle of what the list shows
            const middle = (box: DOMRect): number => box.top + box.height / 2;
            expect(
                Math.abs(middle(current.getBoundingClientRect()) - middle(list().getBoundingClientRect())),
            ).toBeLessThanOrEqual(1);

            await pointer.fill(pill(), "zone");
            expect(highlighted()).toEqual(["America/Somewhere/Zone_00"]);
            expect(list().scrollTop).toBe(0);
            // It stays checked wherever it is
            expect(current).toHaveAttribute("aria-checked", "true");

            await pointer.clear(pill());
            expect(highlighted()).toEqual(["America/Somewhere/Zone_20"]);
        });

        it("moves the highlight with the arrow keys around the list, keeping the focus in the pill, and chooses with Enter", async () => {
            const vm = await openMenu();
            await pointer.keyboard("{ArrowDown}");
            expect(highlighted()).toEqual(["français"]);
            await pointer.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");
            expect(highlighted()).toEqual(["čeština"]);
            await pointer.keyboard("{ArrowUp}");
            expect(highlighted()).toEqual(["America/Somewhere/Zone_23"]);
            const last = screen.getByRole("menuitemradio", { name: "America/Somewhere/Zone_23" });
            expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(list().getBoundingClientRect().bottom);
            expect(pill()).toHaveFocus();
            expect(pill()).toHaveAttribute("aria-activedescendant", last.id);

            await pointer.keyboard("{ArrowDown}{Enter}");
            expect(vm.select).toHaveBeenCalledExactlyOnceWith("cs");
            await vi.waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
            await vi.waitFor(() => expect(screen.getByRole("button")).toHaveFocus());
        });

        it("keeps the highlight clear of the fade at the list's end", async () => {
            await openMenu();
            await pointer.fill(pill(), "zone");
            await pointer.keyboard("{ArrowDown}".repeat(12));
            const active = screen.getByRole("menuitemradio", { name: "America/Somewhere/Zone_12" });

            expect(highlighted()).toEqual(["America/Somewhere/Zone_12"]);
            expect(list()).toHaveAttribute("data-more-below");
            // Compound fades the last 40px out
            expect(
                list().getBoundingClientRect().bottom - active.getBoundingClientRect().bottom,
            ).toBeGreaterThanOrEqual(40);
        });

        it("moves the one highlight to the option under the pointer, which keeps the focus in the pill, and chooses a clicked one", async () => {
            const vm = await openMenu();

            await pointer.hover(screen.getByRole("menuitemradio", { name: "Deutsch" }));
            expect(highlighted()).toEqual(["Deutsch"]);
            expect(pill()).toHaveFocus();
            // The option under the resting pointer isn't highlighted once the keys move on
            await pointer.keyboard("{ArrowUp}");
            expect(highlighted()).toEqual(["čeština"]);

            await pointer.click(screen.getByRole("menuitemradio", { name: "français" }));
            expect(vm.select).toHaveBeenCalledExactlyOnceWith("fr");
            await vi.waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
        });

        it("empties the pill on Escape, then closes the menu, the key going no further", async () => {
            const onKeyDown = vi.fn();
            render(
                <div onKeyDown={(event) => onKeyDown(event.key)}>
                    <ValueRowView vm={rowViewModel({ options: LANGUAGES, selectedKey: "en" })} />
                </div>,
            );
            const row = screen.getByRole("button");
            await pointer.click(row);
            await vi.waitFor(() => expect(pill()).toHaveFocus());
            await pointer.fill(pill(), "ger");
            expect(labels()).toEqual(["Deutsch"]);

            await pointer.keyboard("{Escape}");
            expect(pill()).toHaveValue("");
            expect(labels()).toHaveLength(30);
            expect(pill()).toHaveFocus();

            await pointer.keyboard("{Escape}");
            await vi.waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
            await vi.waitFor(() => expect(row).toHaveFocus());
            expect(onKeyDown).not.toHaveBeenCalledWith("Escape");

            // Nothing typed is left for the next time
            await pointer.click(row);
            await vi.waitFor(() => expect(pill()).toHaveFocus());
            expect(pill()).toHaveValue("");
        });

        it("puts the 36px pill 8px from the edges of the menu, whose corners stay 12px, over a list of eight and a half rows", async () => {
            await openMenu();
            const menu = screen.getByRole("menu").getBoundingClientRect();
            const field = pill().parentElement!.getBoundingClientRect();
            const choices = list().getBoundingClientRect();

            expect(getComputedStyle(screen.getByRole("menu")).borderTopLeftRadius).toBe("12px");
            expect(field.height).toBe(36);
            expect([field.left - menu.left, menu.right - field.right, field.top - menu.top]).toEqual([8, 8, 8]);
            // The first option's highlight is 4px into the list, so 8px under the pill
            expect(choices.top - field.bottom).toBe(4);
            expect(getComputedStyle(list()).paddingTop).toBe("4px");
            expect(choices.height).toBe(8.5 * 32 + 4);
            expect(choices.bottom).toBe(menu.bottom);
        });

        it("keeps the menu's place, width and height whatever the filter leaves", async () => {
            await openMenu();
            const { left, top, width, height } = screen.getByRole("menu").getBoundingClientRect();
            expect(width).toBeGreaterThan(220);

            for (const query of ["engl", "klingon"]) {
                await pointer.fill(pill(), query);
                expect(labels().length).toBeLessThan(2);
                const menu = screen.getByRole("menu").getBoundingClientRect();
                expect([menu.left, menu.top, menu.width, menu.height]).toEqual([left, top, width, height]);
            }
        });

        it("opens from the keyboard with the focus in the pill", async () => {
            render(<ManyOptions />);
            screen.getByRole("button").focus();

            await pointer.keyboard("{Enter}");

            await vi.waitFor(() => expect(pill()).toHaveFocus());
            expect(highlighted()).toEqual(["Europe/Berlin"]);
        });

        it("offers a value of one's own among the options", async () => {
            const vm = await openMenu({ selectedKey: undefined, customLabel: "Custom…" });
            expect(labels().at(-1)).toBe("Custom…");
            expect(highlighted()).toEqual(["Custom…"]);

            await pointer.fill(pill(), "custom");
            await pointer.keyboard("{Enter}");
            expect(vm.startCustom).toHaveBeenCalledOnce();
            expect(vm.select).not.toHaveBeenCalled();
        });
    });
});
