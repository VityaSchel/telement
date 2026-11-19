/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import { render, screen } from "@test-utils";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, afterEach, expect } from "vitest";
// The check's size and color need the real tokens
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";

import { OptionMenuView } from "./OptionMenuView";
import { defaultSnapshot, MockedViewModel } from "../test-utils";

describe("<OptionMenuView />", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should match snapshot", () => {
        const vm = new MockedViewModel(defaultSnapshot);
        const { asFragment } = render(<OptionMenuView vm={vm} />);

        expect(asFragment()).toMatchSnapshot();
    });

    it("should show A to Z selected if activeSortOption is alphabetical", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel({ ...defaultSnapshot, activeSortOption: "alphabetical" });
        render(<OptionMenuView vm={vm} />);

        // Open the menu
        const button = screen.getByRole("button", { name: "Room Options" });
        await user.click(button);

        expect(screen.getByRole("menuitemradio", { name: "A-Z" })).toBeChecked();
        expect(screen.getByRole("menuitemradio", { name: "Latest activity" })).not.toBeChecked();
        expect(screen.getByRole("menuitemradio", { name: "Unread first" })).not.toBeChecked();
    });

    it("should show Activity selected if activeSortOption is recent", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel({ ...defaultSnapshot, activeSortOption: "recent" });
        render(<OptionMenuView vm={vm} />);

        // Open the menu
        const button = screen.getByRole("button", { name: "Room Options" });
        await user.click(button);

        expect(screen.getByRole("menuitemradio", { name: "A-Z" })).not.toBeChecked();
        expect(screen.getByRole("menuitemradio", { name: "Unread first" })).not.toBeChecked();
        expect(screen.getByRole("menuitemradio", { name: "Latest activity" })).toBeChecked();
    });

    it("should show `Unread First` selected if activeSortOption is unread-first", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel({ ...defaultSnapshot, activeSortOption: "unread-first" });
        render(<OptionMenuView vm={vm} />);

        // Open the menu
        const button = screen.getByRole("button", { name: "Room Options" });
        await user.click(button);

        expect(screen.getByRole("menuitemradio", { name: "A-Z" })).not.toBeChecked();
        expect(screen.getByRole("menuitemradio", { name: "Latest activity" })).not.toBeChecked();
        expect(screen.getByRole("menuitemradio", { name: "Unread first" })).toBeChecked();
    });

    it("should mark the active option with a 16px check in the text color instead of radios", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel({ ...defaultSnapshot, activeSortOption: "unread-first" });
        render(<OptionMenuView vm={vm} />);

        await user.click(screen.getByRole("button", { name: "Room Options" }));

        const menu = screen.getByRole("menu");
        expect(menu.querySelector('input[type="radio"]')).toBeNull();
        // Telegram marks the chosen option with a check at its end, in the text color
        const check = screen.getByRole("menuitemradio", { name: "Unread first" }).querySelector("svg")!;
        expect(check).toBeInTheDocument();
        expect(check.nextElementSibling).toBeNull();
        const { width, height } = check.getBoundingClientRect();
        expect([width, height]).toEqual([16, 16]);
        const textColor = document.createElement("span");
        textColor.style.color = "var(--cpd-color-text-primary)";
        menu.append(textColor);
        expect(getComputedStyle(check).color).toBe(getComputedStyle(textColor).color);
        for (const name of ["Latest activity", "A-Z"]) {
            expect(screen.getByRole("menuitemradio", { name }).querySelector("svg")).toBeNull();
        }
    });

    it("should sort A to Z", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel(defaultSnapshot);
        render(<OptionMenuView vm={vm} />);

        await user.click(screen.getByRole("button", { name: "Room Options" }));

        await user.click(screen.getByRole("menuitemradio", { name: "A-Z" }));

        expect(vm.sort).toHaveBeenCalledWith("alphabetical");
    });

    it("should sort by activity", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel({ ...defaultSnapshot, activeSortOption: "recent" });
        render(<OptionMenuView vm={vm} />);

        await user.click(screen.getByRole("button", { name: "Room Options" }));

        await user.click(screen.getByRole("menuitemradio", { name: "Latest activity" }));

        expect(vm.sort).toHaveBeenCalledWith("recent");
    });

    it("should sort by unread first", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel({ ...defaultSnapshot, activeSortOption: "recent" });
        render(<OptionMenuView vm={vm} />);

        await user.click(screen.getByRole("button", { name: "Room Options" }));

        await user.click(screen.getByRole("menuitemradio", { name: "Unread first" }));

        expect(vm.sort).toHaveBeenCalledWith("unread-first");
    });
});
