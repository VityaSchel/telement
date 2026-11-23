/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import userEvent from "@testing-library/user-event";
import { userEvent as pointer } from "vitest/browser";
import { render, screen } from "@test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
// The layout assertions need the real spacing tokens and Telement's tokens
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../tokens.css";

import {
    SettingsSearchView,
    type SettingsSearchViewActions,
    type SettingsSearchViewSnapshot,
} from "./SettingsSearchView";
import { MockViewModel } from "../../../core/viewmodel/MockViewModel";

const RESULTS = [
    { id: "previews", path: ["Preferences", "Room list", "Show message previews"] },
    { id: "url", path: ["Preferences", "Link previews", "Enable inline URL previews by default"] },
    { id: "font", path: ["Appearance", "Font size"] },
];

/** A view model of the search with mocked actions. */
function searchViewModel(
    snapshot: Partial<SettingsSearchViewSnapshot> = {},
): MockViewModel<SettingsSearchViewSnapshot> & SettingsSearchViewActions {
    const vm = new MockViewModel<SettingsSearchViewSnapshot>({
        query: "preview",
        results: RESULTS,
        activeIndex: 0,
        ...snapshot,
    });
    return Object.assign(vm, {
        setQuery: vi.fn(),
        moveActive: vi.fn(),
        setActiveIndex: vi.fn(),
        choose: vi.fn(),
    });
}

/** Renders the search at the settings tabs' width. */
function renderSearch(vm: SettingsSearchViewActions & MockViewModel<SettingsSearchViewSnapshot>): HTMLElement {
    render(
        <div style={{ width: 220, padding: 16 }}>
            <SettingsSearchView vm={vm} />
        </div>,
    );
    return screen.getByRole("combobox", { name: "Search settings" });
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

describe("SettingsSearchView", () => {
    it("searches for what the user types", async () => {
        const vm = searchViewModel({ query: "" });
        const field = renderSearch(vm);

        await userEvent.type(field, "f");

        expect(vm.setQuery).toHaveBeenCalledWith("f");
        expect(screen.queryByRole("listbox")).toBeNull();
    });

    it("lists the results only while the field has focus and holds text, each 'Tab › Group › Setting'", async () => {
        const vm = searchViewModel();
        const field = renderSearch(vm);
        expect(screen.queryByRole("listbox")).toBeNull();

        await userEvent.click(field);

        const options = screen.getAllByRole("option");
        expect(options.map((option) => option.textContent)).toEqual([
            "Preferences › Room list › Show message previews",
            "Preferences › Link previews › Enable inline URL previews by default",
            "Appearance › Font size",
        ]);
        expect(field).toHaveAttribute("aria-expanded", "true");
        expect(field).toHaveAttribute("aria-activedescendant", options[0].id);
        expect(options[0]).toHaveAttribute("aria-selected", "true");

        field.blur();
        await vi.waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    });

    it("writes where a setting is in secondary text and the setting itself in the text color", async () => {
        const field = renderSearch(searchViewModel());
        await userEvent.click(field);

        expect(getComputedStyle(screen.getByText("Show message previews")).color).toBe(
            tokenColor("--cpd-color-text-primary"),
        );
        expect(getComputedStyle(screen.getAllByText("Preferences")[0]).color).toBe(
            tokenColor("--cpd-color-text-secondary"),
        );
    });

    it("moves the active result with the arrow keys and opens it with Enter", async () => {
        const vm = searchViewModel({ activeIndex: 1 });
        const field = renderSearch(vm);
        await userEvent.click(field);

        await userEvent.keyboard("{ArrowDown}");
        expect(vm.moveActive).toHaveBeenLastCalledWith(1);
        await userEvent.keyboard("{ArrowUp}");
        expect(vm.moveActive).toHaveBeenLastCalledWith(-1);
        await userEvent.keyboard("{Enter}");
        expect(vm.choose).toHaveBeenCalledWith("url");
        expect(field).not.toHaveFocus();
    });

    it("moves the one highlight to the result under the pointer, and opens a clicked one, closing the list", async () => {
        const vm = searchViewModel();
        const field = renderSearch(vm);
        await userEvent.click(field);
        const font = screen.getAllByRole("option")[2];

        await pointer.hover(font);
        expect(vm.setActiveIndex).toHaveBeenLastCalledWith(2);
        await userEvent.click(font);
        expect(vm.choose).toHaveBeenCalledWith("font");
        expect(field).not.toHaveFocus();
        expect(screen.queryByRole("listbox")).toBeNull();
    });

    it("empties the field on Escape without closing what it is in", async () => {
        const onKeyDown = vi.fn();
        const vm = searchViewModel();
        render(
            <div onKeyDown={onKeyDown}>
                <SettingsSearchView vm={vm} />
            </div>,
        );
        await userEvent.click(screen.getByRole("combobox"));

        await userEvent.keyboard("{Escape}");
        expect(vm.setQuery).toHaveBeenCalledWith("");
        expect(onKeyDown).not.toHaveBeenCalled();
    });

    it("lets Escape through while the field is empty, so that it closes the settings", async () => {
        const onKeyDown = vi.fn();
        const vm = searchViewModel({ query: "" });
        render(
            <div onKeyDown={onKeyDown}>
                <SettingsSearchView vm={vm} />
            </div>,
        );
        await userEvent.click(screen.getByRole("combobox"));

        await userEvent.keyboard("{Escape}");
        expect(vm.setQuery).not.toHaveBeenCalled();
        expect(onKeyDown).toHaveBeenCalledTimes(1);
    });

    it("says when nothing matches", async () => {
        const field = renderSearch(searchViewModel({ results: [] }));
        await userEvent.click(field);

        expect(screen.getByRole("listbox")).toHaveTextContent("No results");
        expect(screen.queryAllByRole("option")).toHaveLength(0);
    });

    it("opens the results 4px under the field as a 12px menu of 32px rows, their text 16px from its edge", async () => {
        const field = renderSearch(searchViewModel());
        await userEvent.click(field);
        const pill = field.parentElement!.getBoundingClientRect();
        const list = screen.getByRole("listbox");
        const box = list.getBoundingClientRect();
        const [first, second] = screen.getAllByRole("option");
        const row = first.getBoundingClientRect();

        expect(box.top - pill.bottom).toBe(4);
        expect(box.left).toBe(pill.left);
        expect(box.width).toBeGreaterThanOrEqual(pill.width);
        expect(box.width).toBeLessThanOrEqual(480);
        expect(getComputedStyle(list).borderTopLeftRadius).toBe("12px");
        expect([row.top - box.top, row.left - box.left, row.height]).toEqual([4, 4, 32]);
        expect(second.getBoundingClientRect().top).toBe(row.bottom);
        expect(getComputedStyle(first).borderTopLeftRadius).toBe("8px");
        expect(parseFloat(getComputedStyle(first).paddingInlineStart) + 4).toBe(16);
        expect(getComputedStyle(first).backgroundColor).toBe(
            tokenColor("--tl-color-bg-floating-hovered", "backgroundColor"),
        );
        expect(getComputedStyle(second).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    });

    describe("with room for an icon only", () => {
        const onKeyDown = vi.fn<(key: string) => void>();

        /** The compact search above a tab, as narrow settings dialogs have it. */
        const compactSearch = (
            vm: SettingsSearchViewActions & MockViewModel<SettingsSearchViewSnapshot>,
        ): React.JSX.Element => (
            <div style={{ width: 600, padding: 16 }} onKeyDown={(event) => onKeyDown(event.key)}>
                <SettingsSearchView vm={vm} compact />
                <button>Account</button>
            </div>
        );

        beforeEach(() => onKeyDown.mockClear());

        const button = (): HTMLElement => screen.getByRole("button", { name: "Search settings" });
        const field = (): HTMLElement => screen.getByRole("combobox", { name: "Search settings" });

        it("is a round 36px button in the field's fill, its 20px magnifier in the middle, with a tooltip", async () => {
            render(compactSearch(searchViewModel({ query: "" })));
            const box = button().getBoundingClientRect();
            const icon = button().querySelector("svg")!.getBoundingClientRect();

            expect(screen.queryByRole("combobox")).toBeNull();
            expect(button()).toHaveAttribute("aria-expanded", "false");
            expect([box.width, box.height]).toEqual([36, 36]);
            expect(parseFloat(getComputedStyle(button()).borderTopLeftRadius)).toBeGreaterThanOrEqual(18);
            expect(getComputedStyle(button()).backgroundColor).toBe(
                tokenColor("--cpd-color-bg-subtle-secondary", "backgroundColor"),
            );
            expect([icon.width, icon.left - box.left, icon.top - box.top]).toEqual([20, 8, 8]);

            await pointer.hover(button());
            // The tooltip, which also names the button
            await vi.waitFor(() => expect(screen.getByText("Search settings")).toBeVisible());
        });

        it("opens the same search over what is beside it, with the focus in the field, moving nothing", async () => {
            const vm = searchViewModel();
            render(compactSearch(vm));
            const start = button().getBoundingClientRect();
            const tab = screen.getByRole("button", { name: "Account" });
            const { left, top } = tab.getBoundingClientRect();

            await userEvent.click(button());

            expect(field()).toHaveFocus();
            const pill = field().parentElement!.getBoundingClientRect();
            expect([pill.left, pill.top, pill.width, pill.height]).toEqual([start.left, start.top, 220, 36]);
            expect([tab.getBoundingClientRect().left, tab.getBoundingClientRect().top]).toEqual([left, top]);
            // Over what is beside it, as a menu is
            const surface = getComputedStyle(field().parentElement!.parentElement!);
            expect(surface.backgroundColor).toBe(tokenColor("--tl-color-bg-floating", "backgroundColor"));
            expect(surface.boxShadow).not.toBe("none");
            expect(surface.zIndex).toBe("1");

            // The results, as in a wide window
            const list = screen.getByRole("listbox").getBoundingClientRect();
            expect(screen.getAllByRole("option")).toHaveLength(3);
            expect([list.left, list.top - pill.bottom]).toEqual([pill.left, 4]);
            expect(list.width).toBeGreaterThanOrEqual(220);
            await userEvent.keyboard("{ArrowDown}");
            expect(vm.moveActive).toHaveBeenLastCalledWith(1);
        });

        it("empties the field on Escape, then becomes the button again with the focus, leaving the settings open", async () => {
            const vm = searchViewModel({ query: "font" });
            const { rerender } = render(compactSearch(vm));
            await userEvent.click(button());

            await userEvent.keyboard("{Escape}");
            expect(vm.setQuery).toHaveBeenCalledWith("");
            expect(field()).toHaveFocus();

            rerender(compactSearch(searchViewModel({ query: "", results: [] })));
            await userEvent.keyboard("{Escape}");
            expect(screen.queryByRole("combobox")).toBeNull();
            expect(button()).toHaveFocus();
            expect(onKeyDown).not.toHaveBeenCalledWith("Escape");
        });

        it("opens the active result with Enter, and becomes the button again", async () => {
            const vm = searchViewModel();
            render(compactSearch(vm));
            await userEvent.click(button());

            await userEvent.keyboard("{Enter}");

            expect(vm.choose).toHaveBeenCalledWith("previews");
            expect(button()).toBeVisible();
            expect(button()).not.toHaveFocus();
        });

        it("opens a clicked result", async () => {
            const vm = searchViewModel();
            render(compactSearch(vm));
            await userEvent.click(button());

            await pointer.click(screen.getAllByRole("option")[2]);

            expect(vm.choose).toHaveBeenCalledWith("font");
            expect(screen.queryByRole("combobox")).toBeNull();
        });

        it("becomes the button again once the focus is elsewhere, but not while it is on the field's clear button", async () => {
            render(compactSearch(searchViewModel()));
            await userEvent.click(button());

            await userEvent.tab();
            expect(screen.getByRole("button", { name: "Clear search" })).toHaveFocus();
            expect(field()).toBeVisible();

            await userEvent.tab();
            expect(screen.queryByRole("combobox")).toBeNull();
            expect(button()).toBeVisible();
        });

        it("opens from the keyboard", async () => {
            render(compactSearch(searchViewModel({ query: "" })));

            await userEvent.tab();
            expect(button()).toHaveFocus();
            await userEvent.keyboard("{Enter}");

            expect(field()).toHaveFocus();
        });
    });
});
