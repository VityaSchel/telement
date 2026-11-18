/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";

import { ChevronFace } from "../../components/structures/ContextMenu";
import UIStore from "../../stores/UIStore";
import { ComposerDrawerButton } from "./ComposerDrawerButton";

// The real picker lays out its grid with measured sizes, which happy-dom doesn't provide. Like the real one, the stand-in
// starts with a search field and marks its selected category for the focus lock.
vi.mock("../../emojipicker/EmojiPickerWithRecents", () => ({
    EmojiPickerWithRecents: ({ onChoose }: { onChoose: (unicode: string) => boolean }) => (
        <>
            <input aria-label="Search" />
            <button role="tab" aria-selected tabIndex={0} data-autofocus>
                Smileys & People
            </button>
            <button onClick={() => onChoose("😀")}>Choose 😀</button>
        </>
    ),
}));

describe("ComposerDrawerButton", () => {
    const renderButton = (showStickers: boolean) => {
        const props = { addEmoji: vi.fn(() => true), onOpenStickerPicker: vi.fn(), showStickers };
        render(<ComposerDrawerButton {...props} />);
        return props;
    };

    afterEach(async () => {
        // Leave the drawer's remembered tab on Emoji for the next test.
        if (screen.queryByRole("tab", { name: "Emoji" })) {
            await userEvent.click(screen.getByRole("tab", { name: "Emoji" }));
        }
    });

    it("opens the emoji picker and inserts the chosen emoji", async () => {
        const { addEmoji } = renderButton(true);

        await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
        expect(screen.getByRole("tab", { name: "Emoji" })).toHaveAttribute("aria-selected", "true");
        // The menu's corners are rounded to match the drawer's
        expect(screen.getByRole("tablist").closest(".mx_ContextualMenu")).toHaveClass("mx_TelementComposerDrawer_menu");
        await userEvent.click(screen.getByRole("button", { name: "Choose 😀" }));

        expect(addEmoji).toHaveBeenCalledWith("😀");
    });

    it("focuses the element the emoji picker marks, before its own selected tab", async () => {
        renderButton(true);

        await userEvent.click(screen.getByRole("button", { name: "Emoji" }));

        await waitFor(() => expect(screen.getByRole("tab", { name: "Smileys & People" })).toHaveFocus());
        expect(screen.getByRole("textbox", { name: "Search" })).not.toHaveFocus();
    });

    it("opens Element's sticker picker from the Stickers tab and closes the drawer", async () => {
        const { onOpenStickerPicker } = renderButton(true);

        await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
        await userEvent.click(screen.getByRole("tab", { name: "Stickers" }));
        await userEvent.click(screen.getByRole("button", { name: "Open sticker packs" }));

        expect(onOpenStickerPicker).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(screen.queryByRole("tablist")).toBeNull());
    });

    it("focuses the selected tab when the tab's content doesn't ask for focus, and gives focus back on close", async () => {
        renderButton(true);
        const button = screen.getByRole("button", { name: "Emoji" });

        await userEvent.click(button);
        await userEvent.click(screen.getByRole("tab", { name: "Stickers" }));
        await userEvent.keyboard("[Escape]");
        await waitFor(() => expect(screen.queryByRole("tablist")).toBeNull());
        expect(button).toHaveFocus();

        // The drawer reopens on the Stickers tab
        await userEvent.click(button);
        await waitFor(() => expect(screen.getByRole("tab", { name: "Stickers" })).toHaveFocus());
    });

    it("opens where the composer's menus do, its end on the button's end, and stays there while emoji are picked", async () => {
        const props = { addEmoji: vi.fn(() => true), onOpenStickerPicker: vi.fn(), showStickers: true };
        // MessageComposer's spot for its menus: over the composer, ending on the composer's end
        const menuPosition = { bottom: 120, right: 0, chevronFace: ChevronFace.None };
        const { rerender } = render(<ComposerDrawerButton {...props} menuPosition={menuPosition} />);
        const button = screen.getByRole("button", { name: "Emoji" });
        const buttonRect = vi.spyOn(button, "getBoundingClientRect");
        buttonRect.mockReturnValue(new DOMRect(UIStore.instance.windowWidth - 44, 700, 36, 36));

        await userEvent.click(button);
        const wrapper = screen.getByRole("tablist").closest<HTMLElement>(".mx_ContextualMenu_wrapper")!;
        expect(wrapper.style).toMatchObject({ bottom: "120px", right: "8px" });

        // Picking an emoji brings in the send button, which moves the emoji button towards the start
        buttonRect.mockReturnValue(new DOMRect(UIStore.instance.windowWidth - 86, 700, 36, 36));
        await userEvent.click(screen.getByRole("button", { name: "Choose 😀" }));
        rerender(<ComposerDrawerButton {...props} menuPosition={{ ...menuPosition }} />);

        expect(wrapper.style).toMatchObject({ bottom: "120px", right: "8px" });
    });

    it("has no Stickers tab when stickers aren't available", async () => {
        renderButton(false);

        await userEvent.click(screen.getByRole("button", { name: "Emoji" }));

        expect(screen.getByRole("tab", { name: "Emoji" })).toBeInTheDocument();
        expect(screen.queryByRole("tab", { name: "Stickers" })).toBeNull();
    });
});
