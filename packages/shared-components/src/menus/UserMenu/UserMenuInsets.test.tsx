/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../telement/tokens.css";
import React from "react";
import { composeStories } from "@storybook/react-vite";
import { render, screen, waitFor } from "@test-utils";
import { describe, it, expect } from "vitest";
import { userEvent } from "vitest/browser";

import * as stories from "./UserMenu.stories.tsx";

const { Default, Open } = composeStories(stories);

/** The space panel's width when collapsed; the app's 32px space avatars start 18px from its edge, so center on 34px. */
const SPACE_PANEL_WIDTH = 68;
const SPACE_AVATAR_AXIS = 18 + 32 / 2;

/** Where an icon's drawing, rather than its box, ends on the screen. */
function inkRight(svg: SVGSVGElement): number {
    const path = svg.querySelector("path")!;
    const box = path.getBBox();
    return new DOMPoint(box.x + box.width, box.y).matrixTransform(path.getScreenCTM()!).x;
}

describe("User menu insets", () => {
    it("insets the items 4px from the menu's edge as 32px rows with no gaps, rounded concentrically with it", async () => {
        render(<Open />);
        const menu = await screen.findByRole("menu");
        await Promise.all(menu.getAnimations().map((animation) => animation.finished));
        const edge = menu.getBoundingClientRect();
        const items = screen.getAllByRole("menuitem");

        expect(getComputedStyle(menu).borderRadius).toBe("12px");
        for (const [index, item] of items.entries()) {
            const rect = item.getBoundingClientRect();
            expect(rect.left - edge.left).toBe(4);
            expect(edge.right - rect.right).toBe(4);
            expect(rect.height).toBe(32);
            expect(getComputedStyle(item).borderRadius).toBe("8px");
            if (index > 0) expect(rect.top).toBe(items[index - 1].getBoundingClientRect().bottom);

            // A 16px icon as far from the item's start as from its top, 16px from the menu's edge, and the label in
            // regular text 12px after it
            const icon = item.querySelector("svg")!.getBoundingClientRect();
            expect(icon.width).toBe(16);
            expect(icon.left - edge.left).toBe(16);
            expect(icon.top - rect.top).toBe(8);
            const label = item.querySelector("span")!;
            expect(label.getBoundingClientRect().left - icon.right).toBe(10);
            expect(getComputedStyle(label).fontWeight).toBe("400");
        }
        expect(edge.bottom - items.at(-1)!.getBoundingClientRect().bottom).toBe(4);
        const separator = menu.querySelector('[role="separator"]')!.getBoundingClientRect();
        expect(separator.left - edge.left).toBe(4);
        expect(edge.right - separator.right).toBe(4);
        expect(items[0].getBoundingClientRect().top - separator.bottom).toBe(4);
    });

    it("ends the hover chevron's drawing 16px from the menu's edge", async () => {
        render(<Open />);
        const menu = await screen.findByRole("menu");
        await Promise.all(menu.getAnimations().map((animation) => animation.finished));
        const item = screen.getAllByRole("menuitem")[0];
        await userEvent.hover(item);

        const chevron = item.querySelector<SVGSVGElement>(":scope > svg:last-child")!;
        expect(chevron.getBoundingClientRect().height).toBe(16);
        expect(menu.getBoundingClientRect().right - inkRight(chevron)).toBeCloseTo(16, 1);
    });

    it("draws the keyboard focus ring inside the focused item's highlight", async () => {
        render(<Open />);
        const menu = await screen.findByRole("menu");
        await Promise.all(menu.getAnimations().map((animation) => animation.finished));
        const item = screen.getAllByRole("menuitem")[0];
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => expect(item).toHaveFocus());

        expect(item.matches(":focus-visible")).toBe(true);
        const style = getComputedStyle(item);
        expect(style.outlineStyle).toBe("solid");
        expect(style.outlineWidth).toBe("2px");
        expect(style.outlineOffset).toBe("-2px");
    });

    it.each([false, true])(
        "centers the avatar on the space panel's axis, as the space avatars are, when expanded is %s",
        (expanded) => {
            render(
                <div data-testid="space-panel" style={{ inlineSize: expanded ? "240px" : `${SPACE_PANEL_WIDTH}px` }}>
                    <Default expanded={expanded} />
                </div>,
            );
            const avatarWrapper = screen.getByRole("button", { name: "User menu" }).firstElementChild!;
            const box = avatarWrapper.firstElementChild!.getBoundingClientRect();
            const start = box.left - screen.getByTestId("space-panel").getBoundingClientRect().left;

            expect(box.width).toBe(36);
            expect(start + box.width / 2).toBe(SPACE_AVATAR_AXIS);
        },
    );
});
