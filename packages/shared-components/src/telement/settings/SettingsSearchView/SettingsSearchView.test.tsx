/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import userEvent from "@testing-library/user-event";
import { userEvent as pointer } from "vitest/browser";
import { render, screen } from "@test-utils";
import { describe, expect, it, vi } from "vitest";
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
});
