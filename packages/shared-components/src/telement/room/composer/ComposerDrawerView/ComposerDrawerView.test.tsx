/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { composeStories } from "@storybook/react-vite";
import { act, fireEvent, render, screen } from "@test-utils";
import { describe, expect, it, vi } from "vitest";
// The layout assertions need the real spacing tokens, Compound's pill radius and Telement's radius tokens
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../../tokens.css";

import * as stories from "./ComposerDrawerView.stories";
import { EmojiPicker } from "../../../../core/EmojiPicker";
import {
    ComposerDrawerView,
    type ComposerDrawerViewActions,
    type ComposerDrawerViewModel,
    type ComposerDrawerViewSnapshot,
} from "./ComposerDrawerView";

const { EmojiTab, SearchableTab } = composeStories(stories);

class TestDrawerViewModel implements ComposerDrawerViewModel {
    private readonly listeners = new Set<() => void>();
    public readonly onTabSelected = vi.fn<NonNullable<ComposerDrawerViewActions["onTabSelected"]>>((id) => {
        this.snapshot = { ...this.snapshot, activeTab: id };
        act(() => this.listeners.forEach((listener) => listener()));
    });

    public constructor(private snapshot: ComposerDrawerViewSnapshot) {}

    public getSnapshot = (): ComposerDrawerViewSnapshot => this.snapshot;

    public subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };
}

const createVm = (): TestDrawerViewModel =>
    new TestDrawerViewModel({
        tabs: [
            { id: "emoji", label: "Emoji" },
            { id: "stickers", label: "Stickers" },
            { id: "gifs", label: "GIFs" },
        ],
        activeTab: "emoji",
    });

describe("ComposerDrawerView", () => {
    it("matches snapshot", () => {
        const { container } = render(<EmojiTab />);
        expect(container).toMatchSnapshot();
    });

    it("shows the active tab's content in a panel labelled by that tab", () => {
        render(
            <ComposerDrawerView vm={createVm()}>
                <p>Emoji picker</p>
            </ComposerDrawerView>,
        );

        const emojiTab = screen.getByRole("tab", { name: "Emoji" });
        expect(emojiTab).toHaveAttribute("aria-selected", "true");
        expect(emojiTab).toHaveAttribute("tabindex", "0");
        expect(screen.getByRole("tab", { name: "Stickers" })).toHaveAttribute("tabindex", "-1");
        expect(screen.getByRole("tabpanel", { name: "Emoji" })).toHaveTextContent("Emoji picker");
    });

    it("shows the tabs below the active tab's content, as in Telegram for macOS", () => {
        render(
            <ComposerDrawerView vm={createVm()}>
                <p>Emoji picker</p>
            </ComposerDrawerView>,
        );

        const panel = screen.getByRole("tabpanel", { name: "Emoji" });
        const tablist = screen.getByRole("tablist");
        expect(panel.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(tablist.getBoundingClientRect().top).toBeGreaterThanOrEqual(panel.getBoundingClientRect().bottom);
    });

    it("lets the active tab's content start with a search field that scrolls with it", () => {
        render(<SearchableTab />);

        const panel = screen.getByRole("tabpanel", { name: "Emoji" });
        const search = screen.getByRole("textbox", { name: "Search" });
        const scroller = screen.getByTestId("searchable-tab-scroller");
        expect(scroller).toContainElement(search);
        expect(panel).toContainElement(scroller);
        expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);

        scroller.scrollTop = scroller.scrollHeight;
        expect(search.getBoundingClientRect().bottom).toBeLessThanOrEqual(scroller.getBoundingClientRect().top);
    });

    it("rounds its corners to match the search field at the top and the tabs at the bottom", () => {
        render(<SearchableTab />);

        const tab = screen.getByRole("tab", { name: "Emoji" });
        const drawer = tab.parentElement!.parentElement!;
        const fieldElement = screen.getByRole("textbox", { name: "Search" }).parentElement!;
        const field = fieldElement.getBoundingClientRect();
        const tabBox = tab.getBoundingClientRect();
        const drawerBox = drawer.getBoundingClientRect();
        const style = getComputedStyle(drawer);

        // The search field and the tabs are pills, so their corners are half their height
        expect(parseFloat(getComputedStyle(fieldElement).borderTopLeftRadius)).toBeGreaterThanOrEqual(field.height / 2);
        expect(parseFloat(getComputedStyle(tab).borderBottomLeftRadius)).toBeGreaterThanOrEqual(tabBox.height / 2);
        // Concentric: each corner's radius is the pill's radius plus the pill's inset from the drawer's edges
        expect(field.left - drawerBox.left).toBe(field.top - drawerBox.top);
        expect(parseFloat(style.borderTopLeftRadius)).toBe(field.height / 2 + field.top - drawerBox.top);
        expect(style.borderTopRightRadius).toBe(style.borderTopLeftRadius);
        expect(tabBox.left - drawerBox.left).toBe(drawerBox.bottom - tabBox.bottom);
        expect(parseFloat(style.borderBottomLeftRadius)).toBe(tabBox.height / 2 + drawerBox.bottom - tabBox.bottom);
        expect(style.borderBottomRightRadius).toBe(style.borderBottomLeftRadius);
        expect(style.borderTopLeftRadius).toBe("26px");
        expect(style.borderBottomLeftRadius).toBe("24px");
        expect(style.overflow).toBe("clip");
    });

    it("rounds its top corners concentric with the emoji picker's category tabs too", async () => {
        render(
            <ComposerDrawerView vm={createVm()}>
                <EmojiPicker onChoose={vi.fn()} onFinished={vi.fn()} showQuickReactions={false} />
            </ComposerDrawerView>,
        );
        // The first category, in the corner
        const category = await screen.findByRole("tab", { name: "🕒" });

        const drawer = screen.getByRole("tab", { name: "Emoji" }).parentElement!.parentElement!;
        const categoryBox = category.getBoundingClientRect();
        const drawerBox = drawer.getBoundingClientRect();
        const inset = categoryBox.top - drawerBox.top;
        expect(categoryBox.left - drawerBox.left).toBe(inset);
        expect(parseFloat(getComputedStyle(category).borderTopLeftRadius)).toBeGreaterThanOrEqual(
            categoryBox.height / 2,
        );
        expect(parseFloat(getComputedStyle(drawer).borderTopLeftRadius)).toBe(categoryBox.height / 2 + inset);
    });

    it("asks a focus lock to focus the selected tab unless the content marks an element first", () => {
        const vm = createVm();
        render(<ComposerDrawerView vm={vm} />);

        expect(screen.getByRole("tab", { name: "Emoji" })).toHaveAttribute("data-autofocus", "true");
        expect(screen.getByRole("tab", { name: "Stickers" })).not.toHaveAttribute("data-autofocus");

        fireEvent.click(screen.getByRole("tab", { name: "Stickers" }));

        expect(screen.getByRole("tab", { name: "Stickers" })).toHaveAttribute("data-autofocus", "true");
        expect(screen.getByRole("tab", { name: "Emoji" })).not.toHaveAttribute("data-autofocus");
    });

    it("doesn't let the user select its text", () => {
        render(<EmojiTab />);

        expect(
            getComputedStyle(screen.getByRole("tab", { name: "Emoji" }).parentElement!.parentElement!).userSelect,
        ).toBe("none");
    });

    it("selects a tab on click", () => {
        const vm = createVm();
        render(<ComposerDrawerView vm={vm} />);

        fireEvent.click(screen.getByRole("tab", { name: "Stickers" }));

        expect(vm.onTabSelected).toHaveBeenCalledWith("stickers");
        expect(screen.getByRole("tab", { name: "Stickers" })).toHaveAttribute("aria-selected", "true");
    });

    it("moves between tabs with the arrow keys, wrapping around", () => {
        const vm = createVm();
        render(<ComposerDrawerView vm={vm} />);

        fireEvent.keyDown(screen.getByRole("tab", { name: "Emoji" }), { key: "ArrowLeft" });
        expect(vm.onTabSelected).toHaveBeenLastCalledWith("gifs");
        expect(screen.getByRole("tab", { name: "GIFs" })).toHaveFocus();

        fireEvent.keyDown(screen.getByRole("tab", { name: "GIFs" }), { key: "ArrowRight" });
        expect(vm.onTabSelected).toHaveBeenLastCalledWith("emoji");
        expect(screen.getByRole("tab", { name: "Emoji" })).toHaveFocus();
    });
});
