/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../../../telement/tokens.css";
import React, { type JSX } from "react";
import { render, screen, waitFor } from "@test-utils";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { page } from "vitest/browser";

import { RoomListItemMoreOptionsMenu } from "./RoomListItemMoreOptionsMenu";
import { RoomListItemContextMenu } from "./RoomListItemContextMenu";
import { RoomNotifState } from "./RoomNotifs";
import { useMockedViewModel } from "../../../../core/viewmodel";
import type { RoomListItemViewSnapshot } from "./RoomListItemView";
import { defaultSnapshot } from "./default-snapshot";
import { mockedActions as mockCallbacks } from "./mocked-actions";

describe("<RoomListItemNotificationMenu />", () => {
    let viewport: { width: number; height: number };

    // As in the app, where the room list is on the left, there is room for the submenu on the right of the menu. Radix
    // can't tell that a pointer jumping into a submenu on the other side is heading for it, and closes the submenu.
    beforeAll(async () => {
        viewport = { width: window.innerWidth, height: window.innerHeight };
        await page.viewport(1024, 768);
    });

    afterAll(async () => {
        await page.viewport(viewport.width, viewport.height);
    });

    beforeEach(() => {
        vi.mocked(mockCallbacks.onSetRoomNotifState).mockClear();
    });

    const renderMenu = (overrides: Partial<RoomListItemViewSnapshot> = {}): ReturnType<typeof render> => {
        const TestComponent = (): JSX.Element => {
            const vm = useMockedViewModel({ ...defaultSnapshot, ...overrides }, mockCallbacks);
            return <RoomListItemMoreOptionsMenu vm={vm} />;
        };
        return render(<TestComponent />);
    };

    const openMoreOptions = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
        await user.click(screen.getByRole("button", { name: "More Options" }));
        return screen.getByRole("menuitem", { name: "Notifications" });
    };

    const openSubmenu = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
        await user.click(await openMoreOptions(user));
        await screen.findByRole("menuitemradio", { name: "Match default settings" });
    };

    it("should show a Notifications item with a chevron at its end, which opens a submenu", async () => {
        const user = userEvent.setup();
        renderMenu();

        const item = await openMoreOptions(user);
        expect(item).toHaveAttribute("aria-haspopup", "menu");
        expect(item.lastElementChild?.tagName).toBe("svg");
        expect(item.lastElementChild).toBeVisible();
    });

    it("should not show the Notifications item when the notification options aren't available", async () => {
        const user = userEvent.setup();
        renderMenu({ showNotificationMenu: false });

        await user.click(screen.getByRole("button", { name: "More Options" }));
        expect(screen.getByRole("menuitem", { name: "Leave room" })).toBeInTheDocument();
        expect(screen.queryByRole("menuitem", { name: "Notifications" })).not.toBeInTheDocument();
    });

    it("should list the notification options in the submenu", async () => {
        const user = userEvent.setup();
        renderMenu();

        await openSubmenu(user);
        expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
            "Match default settings",
            "All messages",
            "Mentions and keywords",
            "Mute room",
        ]);
    });

    it.each([
        [RoomNotifState.AllMessages, "Match default settings"],
        [RoomNotifState.AllMessagesLoud, "All messages"],
        [RoomNotifState.MentionsOnly, "Mentions and keywords"],
        [RoomNotifState.Mute, "Mute room"],
    ])("should check the current option when the state is %s", async (roomNotifState, label) => {
        const user = userEvent.setup();
        renderMenu({ roomNotifState });

        await openSubmenu(user);
        const checked = screen.getAllByRole("menuitemradio", { checked: true });
        expect(checked).toHaveLength(1);
        expect(checked[0]).toHaveAccessibleName(label);
        expect(checked[0].querySelector("svg")).toBeVisible();
    });

    it.each([
        ["Match default settings", RoomNotifState.AllMessages],
        ["All messages", RoomNotifState.AllMessagesLoud],
        ["Mentions and keywords", RoomNotifState.MentionsOnly],
        ["Mute room", RoomNotifState.Mute],
    ])("should call onSetRoomNotifState when %s is selected and close the menus", async (label, state) => {
        const user = userEvent.setup();
        renderMenu();

        await openSubmenu(user);
        await user.click(screen.getByRole("menuitemradio", { name: label }));

        expect(mockCallbacks.onSetRoomNotifState).toHaveBeenCalledWith(state);
        await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    });

    it("should open the submenu with the right arrow and close it with the left arrow", async () => {
        const user = userEvent.setup();
        renderMenu();

        const item = await openMoreOptions(user);
        item.focus();
        await user.keyboard("{ArrowRight}");
        expect(await screen.findByRole("menuitemradio", { name: "Mute room" })).toBeInTheDocument();
        await waitFor(() => expect(item).toHaveAttribute("aria-expanded", "true"));

        await user.keyboard("{ArrowDown}");
        await user.keyboard("{ArrowLeft}");
        await waitFor(() => expect(screen.queryByRole("menuitemradio")).not.toBeInTheDocument());
        expect(item).toHaveFocus();
        expect(screen.getByRole("menu", { name: "More Options" })).toBeInTheDocument();
    });

    it("should open the submenu with Enter", async () => {
        const user = userEvent.setup();
        renderMenu();

        const item = await openMoreOptions(user);
        item.focus();
        await user.keyboard("{Enter}");
        expect(await screen.findByRole("menuitemradio", { name: "Mute room" })).toBeInTheDocument();
    });

    it("should close only the submenu with Escape and focus the Notifications item", async () => {
        const user = userEvent.setup();
        renderMenu();

        const item = await openMoreOptions(user);
        item.focus();
        await user.keyboard("{ArrowRight}");
        await screen.findByRole("menuitemradio", { name: "Mute room" });
        await user.keyboard("{ArrowDown}");

        await user.keyboard("{Escape}");
        await waitFor(() => expect(screen.queryByRole("menuitemradio")).not.toBeInTheDocument());
        expect(screen.getByRole("menu", { name: "More Options" })).toBeInTheDocument();
        expect(item).toHaveFocus();

        // A second Escape closes the menu
        await user.keyboard("{Escape}");
        await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    });

    it("should line the first option up with the Notifications item", async () => {
        const user = userEvent.setup();
        renderMenu();

        const item = await openMoreOptions(user);
        await user.click(item);
        const firstOption = await screen.findByRole("menuitemradio", { name: "Match default settings" });

        // Within the half pixel that Radix rounds the submenu's position to
        await waitFor(() =>
            expect(
                Math.abs(firstOption.getBoundingClientRect().top - item.getBoundingClientRect().top),
            ).toBeLessThanOrEqual(0.5),
        );
    });

    describe("placement next to the menu", () => {
        const renderContextMenu = (): ReturnType<typeof render> => {
            const TestComponent = (): JSX.Element => {
                const vm = useMockedViewModel(defaultSnapshot, mockCallbacks);
                return (
                    <RoomListItemContextMenu vm={vm}>
                        <button type="button">Room</button>
                    </RoomListItemContextMenu>
                );
            };
            return render(<TestComponent />);
        };

        const openContextMenu = async (
            user: ReturnType<typeof userEvent.setup>,
            clientX: number,
        ): Promise<HTMLElement> => {
            await user.pointer({
                keys: "[MouseRight]",
                target: screen.getByRole("button", { name: "Room" }),
                coords: { clientX, clientY: 100 },
            });
            return screen.findByRole("menuitem", { name: "Notifications" });
        };

        /** Opens the submenu with the keyboard, as a pointer moving across the menu to it can close it on the way. */
        const openSubmenuFrom = async (
            user: ReturnType<typeof userEvent.setup>,
            item: HTMLElement,
        ): Promise<{ menu: DOMRect; subMenu: HTMLElement }> => {
            const menu = item.closest('[role="menu"]')!.getBoundingClientRect();
            item.focus();
            await user.keyboard("{ArrowRight}");
            const option = await screen.findByRole("menuitemradio", { name: "Match default settings" });
            const subMenu = option.closest<HTMLElement>('[role="menu"]')!;
            return { menu, subMenu };
        };

        it.each([
            [
                "more options",
                async (user: ReturnType<typeof userEvent.setup>) => {
                    renderMenu();
                    return openMoreOptions(user);
                },
            ],
            [
                "right-click",
                async (user: ReturnType<typeof userEvent.setup>) => {
                    renderContextMenu();
                    return openContextMenu(user, 0);
                },
            ],
        ])("should open the %s menu's submenu against the menu's right edge", async (_, open) => {
            const user = userEvent.setup();
            const { menu, subMenu } = await openSubmenuFrom(user, await open(user));

            await waitFor(() => expect(subMenu).toHaveAttribute("data-side", "right"));
            // Within the half pixel that Radix rounds the submenu's position to
            await waitFor(() =>
                expect(Math.abs(subMenu.getBoundingClientRect().left - menu.right)).toBeLessThanOrEqual(0.5),
            );
        });

        it("should open the right-click menu's submenu against the menu's left edge without room on the right", async () => {
            const user = userEvent.setup();
            renderContextMenu();
            const { menu, subMenu } = await openSubmenuFrom(user, await openContextMenu(user, window.innerWidth - 1));

            await waitFor(() => expect(subMenu).toHaveAttribute("data-side", "left"));
            await waitFor(() =>
                expect(Math.abs(subMenu.getBoundingClientRect().right - menu.left)).toBeLessThanOrEqual(0.5),
            );
        });
    });
});
