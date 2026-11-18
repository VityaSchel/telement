/*
 * Copyright 2025 New Vector Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import { render, screen } from "@test-utils";
import { composeStories } from "@storybook/react-vite";
import React from "react";
import userEvent from "@testing-library/user-event";
import { describe, it, vi, afterEach, expect } from "vitest";
import { userEvent as browserUserEvent } from "vitest/browser";

import * as stories from "./RoomListSearchView.stories";
import {
    RoomListSearchView,
    type RoomListSearchViewActions,
    type RoomListSearchViewSnapshot,
} from "./RoomListSearchView";
import { MockViewModel } from "../../core/viewmodel/MockViewModel";

const { Default, WithDialPad, WithoutExplore, AllButtons } = composeStories(stories);

/** The color a token resolves to. */
function colorOf(token: string): string {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}

describe("RoomListSearchView", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Storybook snapshots", () => {
        it("renders the default state", () => {
            const { container } = render(<Default />);
            expect(container).toMatchSnapshot();
        });

        it("renders with dial pad button", () => {
            const { container } = render(<WithDialPad />);
            expect(container).toMatchSnapshot();
        });

        it("renders without explore button", () => {
            const { container } = render(<WithoutExplore />);
            expect(container).toMatchSnapshot();
        });

        it("renders with all buttons visible", () => {
            const { container } = render(<AllButtons />);
            expect(container).toMatchSnapshot();
        });
    });

    describe("User interactions", () => {
        const onSearchClick = vi.fn();
        const onDialPadClick = vi.fn();
        const onExploreClick = vi.fn();

        class TestViewModel extends MockViewModel<RoomListSearchViewSnapshot> implements RoomListSearchViewActions {
            public onSearchClick = onSearchClick;
            public onDialPadClick = onDialPadClick;
            public onExploreClick = onExploreClick;
        }

        it("should call onSearchClick when search button is clicked", async () => {
            const user = userEvent.setup();
            const vm = new TestViewModel({
                displayExploreButton: false,
                displayDialButton: false,
                searchShortcut: "⌘K",
            });

            render(<RoomListSearchView vm={vm} />);

            await user.click(screen.getByRole("button", { name: "Search (⌘K)" }));
            expect(onSearchClick).toHaveBeenCalledTimes(1);
        });

        it("should keep the search a button that opens the search dialog rather than a field", () => {
            const vm = new TestViewModel({
                displayExploreButton: false,
                displayDialButton: false,
                searchShortcut: "Ctrl+K",
            });

            render(<RoomListSearchView vm={vm} />);

            const search = screen.getByRole("button", { name: "Search (Ctrl+K)" });
            expect(search).toHaveAttribute("id", "room-list-search-button");
            expect(screen.queryByRole("textbox")).toBeNull();
        });

        it("should call onDialPadClick when dial pad button is clicked", async () => {
            const user = userEvent.setup();
            const vm = new TestViewModel({
                displayExploreButton: false,
                displayDialButton: true,
                searchShortcut: "⌘K",
            });

            render(<RoomListSearchView vm={vm} />);

            await user.click(screen.getByRole("button", { name: "Open dial pad" }));
            expect(onDialPadClick).toHaveBeenCalledTimes(1);
        });

        it("should call onExploreClick when explore button is clicked", async () => {
            const user = userEvent.setup();
            const vm = new TestViewModel({
                displayExploreButton: true,
                displayDialButton: false,
                searchShortcut: "⌘K",
            });

            render(<RoomListSearchView vm={vm} />);

            await user.click(screen.getByRole("button", { name: "Explore rooms" }));
            expect(onExploreClick).toHaveBeenCalledTimes(1);
        });
    });

    it.each(["Explore rooms", "Open dial pad"])(
        "makes %s a plain 36px icon button around a 24px icon, transparent and borderless until hovered",
        async (name) => {
            render(<AllButtons />);
            const button = screen.getByRole("button", { name });
            const icon = button.querySelector("svg")!.getBoundingClientRect();
            const box = button.getBoundingClientRect();

            expect([box.width, box.height]).toEqual([36, 36]);
            expect([icon.width, icon.height]).toEqual([24, 24]);
            expect([icon.left - box.left, icon.top - box.top]).toEqual([6, 6]);
            expect(getComputedStyle(button).backgroundColor).toBe("rgba(0, 0, 0, 0)");
            expect(getComputedStyle(button).borderTopWidth).toBe("0px");
            await browserUserEvent.hover(button);
            await expect
                .poll(() => getComputedStyle(button).backgroundColor)
                .toBe(colorOf("--cpd-color-bg-subtle-primary"));
        },
    );

    it.each(["Explore rooms", "Open dial pad"])(
        "draws the %s icon in the gray of the header's icons, darker when it is hovered",
        async (name) => {
            render(<AllButtons />);
            const icon = screen.getByRole("button", { name }).querySelector("svg")!;

            expect(getComputedStyle(icon).fill).toBe(colorOf("--cpd-color-icon-secondary"));
            await browserUserEvent.hover(screen.getByRole("button", { name }));
            await expect.poll(() => getComputedStyle(icon).fill).toBe(colorOf("--cpd-color-icon-primary"));
        },
    );
});
