/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { fireEvent, render, screen } from "test-utils-rtl";

import defaultDispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import Modal from "../../Modal";
import { openSearchOnTyping } from "./openSearchOnTyping";

describe("openSearchOnTyping", () => {
    const onParentKeyDown = vi.fn();

    /** A room list with one room, whose row holds a "…" button, inside a parent that hears the keys it lets through */
    function renderList(): void {
        render(
            <div onKeyDown={onParentKeyDown}>
                <div role="listbox" aria-label="Room list" tabIndex={0} onKeyDown={openSearchOnTyping}>
                    <div role="option" aria-selected={false} tabIndex={-1}>
                        General
                        <button aria-label="More Options" />
                    </div>
                </div>
            </div>,
        );
    }

    beforeEach(() => {
        vi.spyOn(defaultDispatcher, "dispatch").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        onParentKeyDown.mockClear();
    });

    it.each([
        ["a letter", { key: "d" }, "d"],
        ["a capital", { key: "D", shiftKey: true }, "D"],
        ["a digit", { key: "7" }, "7"],
        ["an accented letter typed with Alt", { key: "å", altKey: true }, "å"],
    ])("opens the search dialog with %s typed on a room", (_, init, text) => {
        renderList();

        const notPrevented = fireEvent.keyDown(screen.getByRole("option"), init);

        expect(defaultDispatcher.dispatch).toHaveBeenCalledWith(
            { action: Action.OpenSpotlight, initialText: text },
            true,
        );
        expect(notPrevented).toBe(false);
        // Not on to the app, which would send it to the composer
        expect(onParentKeyDown).not.toHaveBeenCalled();
    });

    it("opens the search dialog with a character typed on the list itself", () => {
        renderList();

        fireEvent.keyDown(screen.getByRole("listbox"), { key: "x" });

        expect(defaultDispatcher.dispatch).toHaveBeenCalledWith(
            { action: Action.OpenSpotlight, initialText: "x" },
            true,
        );
    });

    it.each([
        ["Space", { key: " " }],
        ["Enter", { key: "Enter" }],
        ["Down", { key: "ArrowDown" }],
        ["Home", { key: "Home" }],
        ["End", { key: "End" }],
        ["Ctrl+K", { key: "k", ctrlKey: true }],
        ["Cmd+K", { key: "k", metaKey: true }],
    ])("leaves %s to the list", (_, init) => {
        renderList();

        fireEvent.keyDown(screen.getByRole("option"), init);

        expect(defaultDispatcher.dispatch).not.toHaveBeenCalled();
        expect(onParentKeyDown).toHaveBeenCalled();
    });

    it("leaves a character typed on a button inside a room's row alone", () => {
        renderList();

        fireEvent.keyDown(screen.getByRole("button", { name: "More Options" }), { key: "d" });

        expect(defaultDispatcher.dispatch).not.toHaveBeenCalled();
    });

    it("opens no second dialog for a character typed before the first one took the focus", () => {
        vi.spyOn(Modal, "hasDialogs").mockReturnValue(true);
        renderList();

        fireEvent.keyDown(screen.getByRole("option"), { key: "e" });

        expect(defaultDispatcher.dispatch).not.toHaveBeenCalled();
    });
});
