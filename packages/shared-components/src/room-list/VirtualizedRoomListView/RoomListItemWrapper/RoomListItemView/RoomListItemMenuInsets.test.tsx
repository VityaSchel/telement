/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../../../telement/tokens.css";
import React, { type JSX } from "react";
import { render, screen, waitFor } from "@test-utils";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { page, userEvent as browserUserEvent } from "vitest/browser";

import { RoomListItemMoreOptionsMenu } from "./RoomListItemMoreOptionsMenu";
import { useMockedViewModel } from "../../../../core/viewmodel";
import type { RoomListItemViewSnapshot } from "./RoomListItemView";
import { defaultSnapshot } from "./default-snapshot";
import { mockedActions } from "./mocked-actions";

/** Where an icon's drawing, rather than its box, ends on the screen. */
function inkRight(svg: SVGSVGElement): number {
    const path = svg.querySelector("path")!;
    const box = path.getBBox();
    return new DOMPoint(box.x + box.width, box.y).matrixTransform(path.getScreenCTM()!).x;
}

/** The color a token resolves to in the current theme. */
function colorOf(token: string): string {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}

function renderMenu(overrides: Partial<RoomListItemViewSnapshot> = {}): void {
    const TestComponent = (): JSX.Element => {
        const vm = useMockedViewModel(
            { ...defaultSnapshot, showMoreOptionsMenu: true, showNotificationMenu: true, ...overrides },
            mockedActions,
        );
        return <RoomListItemMoreOptionsMenu vm={vm} />;
    };
    render(<TestComponent />);
}

describe("Room menu insets", () => {
    let viewport: { width: number; height: number };

    // Room on the right of the menu for the submenu, as next to the room list
    beforeAll(async () => {
        viewport = { width: window.innerWidth, height: window.innerHeight };
        await page.viewport(1024, 768);
    });

    afterAll(async () => {
        await page.viewport(viewport.width, viewport.height);
    });

    it("ends the Low priority toggle and the Notifications chevron 16px from the menu's edge", async () => {
        const user = userEvent.setup();
        renderMenu();

        await user.click(screen.getByRole("button", { name: "More Options" }));
        const menu = screen.getByRole("menu", { name: "More Options" }).getBoundingClientRect();
        const toggleItem = screen.getByRole("menuitemcheckbox", { name: "Low priority" });
        const toggle = toggleItem.querySelector(":scope > :last-child")!.getBoundingClientRect();
        const chevron = screen
            .getByRole("menuitem", { name: "Notifications" })
            .querySelector<SVGSVGElement>(":scope > svg:last-child")!;

        expect(menu.right - toggle.right).toBe(16);
        expect(menu.right - inkRight(chevron)).toBeCloseTo(16, 1);
        // The icons start as far in, 12px inside their item as from its top
        const icon = toggleItem.querySelector("svg")!.getBoundingClientRect();
        expect(icon.left - menu.left).toBe(16);
        expect(icon.top - toggleItem.getBoundingClientRect().top).toBe(12);
    });

    it("lines the submenu's labels and check up with the menu's icons and toggle, in 40px rows", async () => {
        const user = userEvent.setup();
        renderMenu();

        await user.click(screen.getByRole("button", { name: "More Options" }));
        await user.click(screen.getByRole("menuitem", { name: "Notifications" }));
        const option = await screen.findByRole("menuitemradio", { name: "Match default settings" });
        const subMenu = option.closest('[role="menu"]')!;
        await waitFor(() => expect(subMenu).toHaveAttribute("data-state", "open"));
        const edge = subMenu.getBoundingClientRect();

        for (const item of subMenu.querySelectorAll<HTMLElement>('[role="menuitemradio"]')) {
            const rect = item.getBoundingClientRect();
            expect(rect.height).toBe(40);
            expect(rect.left - edge.left).toBe(4);
            expect(item.querySelector("span")!.getBoundingClientRect().left - edge.left).toBe(16);
        }
        expect(edge.right - inkRight(option.querySelector("svg")!)).toBeCloseTo(16, 1);
    });

    it("draws the keyboard focus ring inside the item's highlight, 4px clear of the menu's edge", async () => {
        renderMenu({ canMarkAsRead: true, canMarkAsUnread: false });

        await browserUserEvent.click(screen.getByRole("button", { name: "More Options" }));
        const markAsRead = screen.getByRole("menuitem", { name: "Mark as read" });
        await browserUserEvent.keyboard("{ArrowDown}");
        await waitFor(() => expect(markAsRead).toHaveFocus());

        expect(markAsRead.matches(":focus-visible")).toBe(true);
        const style = getComputedStyle(markAsRead);
        expect(style.outlineStyle).toBe("solid");
        expect(style.outlineWidth).toBe("2px");
        expect(style.outlineOffset).toBe("-2px");
        expect(style.outlineColor).toBe(colorOf("--cpd-color-border-focused"));
        const menu = screen.getByRole("menu", { name: "More Options" }).getBoundingClientRect();
        expect(markAsRead.getBoundingClientRect().left - menu.left).toBe(4);
    });

    it("centers an item's icon on the first line of a label that wraps", async () => {
        const user = userEvent.setup();
        renderMenu();

        await user.click(screen.getByRole("button", { name: "More Options" }));
        const item = screen.getByRole("menuitem", { name: "Mark as unread" });
        const label = item.querySelector("span")!;
        label.textContent = "Mark this room as unread so that it stands out in the room list until you open it";
        const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
        const icon = item.querySelector("svg")!.getBoundingClientRect();

        expect(label.getBoundingClientRect().height).toBeGreaterThanOrEqual(2 * lineHeight);
        expect(icon.top + icon.height / 2).toBe(label.getBoundingClientRect().top + lineHeight / 2);
    });
});
