/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../telement/tokens.css";
import React from "react";
import { act, render, screen } from "@test-utils";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cdp } from "vitest/browser";

import * as stories from "./RoomListPrimaryFilters.stories";

const { Default, PeopleSelected, NoFilters, NarrowContainer, NarrowWithActiveWrappingFilter } = composeStories(stories);

describe("<RoomListPrimaryFilters /> stories", () => {
    describe("snapshots", () => {
        it("renders Default story", () => {
            const { container } = render(<Default />);
            expect(container).toMatchSnapshot();
        });

        it("renders PeopleSelected story", () => {
            const { container } = render(<PeopleSelected />);
            expect(container).toMatchSnapshot();
        });

        it("renders NoFilters story", () => {
            const { container } = render(<NoFilters />);
            expect(container).toMatchSnapshot();
        });

        it("renders NarrowContainer story", () => {
            const { container } = render(<NarrowContainer />);
            expect(container).toMatchSnapshot();
        });

        it("renders NarrowWithActiveWrappingFilter story", () => {
            const { container } = render(<NarrowWithActiveWrappingFilter />);
            expect(container).toMatchSnapshot();
        });
    });

    describe("behavior", () => {
        it("should call onToggleFilter when a filter is clicked", async () => {
            const user = userEvent.setup();
            render(<Default />);

            await user.click(screen.getByRole("option", { name: "People" }));

            expect(Default.args.onToggleFilter).toHaveBeenCalled();
        });

        it("makes the filters one Tab stop, which the arrow keys, Home and End move through, as a listbox is", async () => {
            const user = userEvent.setup();
            render(
                <>
                    <Default />
                    <button type="button">After</button>
                </>,
            );
            const options = screen.getAllByRole("option");

            expect(options.map((option) => option.tabIndex)).toEqual([0, ...options.slice(1).map(() => -1)]);
            await user.tab();
            expect(options[0]).toHaveFocus();
            await user.keyboard("{ArrowRight}");
            expect(options[1]).toHaveFocus();
            expect(options[1].tabIndex).toBe(0);
            expect(options[0].tabIndex).toBe(-1);
            await user.keyboard("{End}");
            expect(options.at(-1)).toHaveFocus();
            await user.keyboard("{Home}");
            expect(options[0]).toHaveFocus();
            await user.tab();
            expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
        });

        /** The filter's background while the left mouse button is held on it, through CDP, which can hold it down. */
        async function pressedFill(target: HTMLElement): Promise<string> {
            const frame = window.frameElement!.getBoundingClientRect();
            const scale = frame.width / document.documentElement.clientWidth;
            const box = target.getBoundingClientRect();
            const x = frame.left + (box.left + box.width / 2) * scale;
            const y = frame.top + (box.top + box.height / 2) * scale;
            await cdp().send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
            await cdp().send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
            try {
                return getComputedStyle(target).backgroundColor;
            } finally {
                await cdp().send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left" });
            }
        }

        function colorOf(token: string): string {
            const probe = document.createElement("div");
            probe.style.color = `var(${token})`;
            document.body.append(probe);
            const color = getComputedStyle(probe).color;
            probe.remove();
            return color;
        }

        it("presses a filter a step deeper than its hover, and the selected filter a step deeper than its fill", async () => {
            render(<PeopleSelected />);

            expect(await pressedFill(screen.getByRole("option", { name: "Rooms" }))).toBe(
                colorOf("--tl-color-bg-subtle-pressed"),
            );
            expect(await pressedFill(screen.getByRole("option", { name: "People" }))).toBe(
                colorOf("--cpd-color-bg-action-primary-pressed"),
            );
        });
    });

    describe("resize behavior", () => {
        let resizeCallback: ResizeObserverCallback;

        beforeEach(() => {
            globalThis.ResizeObserver = class MockResizeObserver {
                public constructor(callback: ResizeObserverCallback) {
                    resizeCallback = callback;
                }
                public observe = vi.fn();
                public unobserve = vi.fn();
                public disconnect = vi.fn();
            } as unknown as typeof ResizeObserver;
        });

        function mockFiltersNotWrapping(): void {
            vi.spyOn(screen.getByText("People"), "offsetLeft", "get").mockReturnValue(0);
            vi.spyOn(screen.getByText("Rooms"), "offsetLeft", "get").mockReturnValue(30);
            vi.spyOn(screen.getByText("Unread"), "offsetLeft", "get").mockReturnValue(60);

            const listbox = screen.getByRole("listbox", { name: "Room list filters" });
            act(() => resizeCallback([{ target: listbox } as any], {} as ResizeObserver));
        }

        function mockUnreadWrapping(): void {
            vi.spyOn(screen.getByText("People"), "offsetLeft", "get").mockReturnValue(0);
            vi.spyOn(screen.getByText("Rooms"), "offsetLeft", "get").mockReturnValue(30);
            vi.spyOn(screen.getByText("Unread"), "offsetLeft", "get").mockReturnValue(0);

            const listbox = screen.getByRole("listbox", { name: "Room list filters" });
            act(() => resizeCallback([{ target: listbox } as any], {} as ResizeObserver));
        }

        it("should hide wrapping filters and show chevron", () => {
            render(<NarrowContainer />);
            mockUnreadWrapping();

            expect(screen.queryByRole("option", { name: "Unreads" })).toBeNull();
            expect(screen.getByRole("button", { name: "Expand filter list" })).toBeInTheDocument();
        });

        it("puts the chevron after the filters, where it is drawn, so that Tab reaches it after them", () => {
            render(<NarrowContainer />);
            mockUnreadWrapping();
            const listbox = screen.getByRole("listbox", { name: "Room list filters" });
            const chevron = screen.getByRole("button", { name: "Expand filter list" });

            expect(listbox.compareDocumentPosition(chevron) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            expect(chevron.getBoundingClientRect().left).toBeGreaterThan(listbox.getBoundingClientRect().left);
        });

        it("moves the filters' Tab stop to the first filter shown when the one that held it wraps out of sight", async () => {
            const user = userEvent.setup();
            render(<NarrowContainer />);
            mockFiltersNotWrapping();
            await user.tab();
            await user.keyboard("{End}");
            expect(screen.getByRole("option", { name: "Unread" })).toHaveFocus();

            mockUnreadWrapping();
            const shown = screen.getAllByRole("option");
            expect(shown.map((option) => option.tabIndex)).toEqual([0, ...shown.slice(1).map(() => -1)]);
        });

        it("should expand and collapse filter list with chevron button", async () => {
            const user = userEvent.setup();
            render(<NarrowContainer />);
            mockUnreadWrapping();

            expect(screen.queryByRole("option", { name: "Unread" })).toBeNull();

            await user.click(screen.getByRole("button", { name: "Expand filter list" }));
            expect(screen.getByRole("option", { name: "Unread" })).toBeVisible();

            await user.click(screen.getByRole("button", { name: "Collapse filter list" }));
            expect(screen.queryByRole("option", { name: "Unread" })).toBeNull();
        });

        it("should move active filter to front when collapsed and wrapping", () => {
            render(<NarrowWithActiveWrappingFilter />);
            mockUnreadWrapping();

            const listbox = screen.getByRole("listbox", { name: "Room list filters" });
            expect(listbox.children[0]).toBe(screen.getByRole("option", { name: "Unread" }));
        });

        it("should restore original filter order when expanded", async () => {
            const user = userEvent.setup();
            render(<NarrowWithActiveWrappingFilter />);
            mockUnreadWrapping();

            await user.click(screen.getByRole("button", { name: "Expand filter list" }));

            const listbox = screen.getByRole("listbox", { name: "Room list filters" });
            expect(listbox.children[0]).toBe(screen.getByRole("option", { name: "People" }));
        });

        it("should handle resize from non-wrapping to wrapping", () => {
            render(<NarrowContainer />);
            mockFiltersNotWrapping();

            expect(screen.queryByRole("button", { name: "Expand filter list" })).toBeNull();

            mockUnreadWrapping();
            expect(screen.getByRole("button", { name: "Expand filter list" })).toBeInTheDocument();
        });
    });
});
