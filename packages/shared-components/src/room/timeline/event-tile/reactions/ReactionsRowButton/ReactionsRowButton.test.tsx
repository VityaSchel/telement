/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../../../../telement/tokens.css";
import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@test-utils";
import React from "react";
import { describe, it, expect } from "vitest";

import * as stories from "./ReactionsRowButton.stories";

const { Default, Selected, WithReactors, WithReactorsSelected } = composeStories(stories);

const avatarsOf = (button: HTMLElement): HTMLElement[] => [
    ...button.querySelectorAll<HTMLElement>("[class*='reactionsRowButtonReactor']:not([class*='Reactors'])"),
];

describe("ReactionsRowButton", () => {
    it("renders the default reaction button", () => {
        const { container } = render(<Default />);
        expect(container).toMatchSnapshot();
    });

    it("renders the selected reaction button", () => {
        const { container } = render(<Selected />);
        expect(container).toMatchSnapshot();
    });

    describe("with the avatars of the people who reacted", () => {
        it("shows them in a bubble in place of the count, hidden from screen readers, which read the label", () => {
            render(<WithReactors />);
            const button = screen.getByRole("button", { name: "Alice, Bob and Charlie reacted with 👍" });

            expect(avatarsOf(button)).toHaveLength(3);
            expect(button.querySelector("[class*='reactionsRowButtonCount']")).toBeNull();
            expect(button.querySelector("[class*='reactionsRowButtonReactors']")).toHaveAttribute(
                "aria-hidden",
                "true",
            );
        });

        it("keeps the count outside bubbles, in Element's chip", () => {
            render(<WithReactors layout="group" />);
            const button = screen.getByRole("button");

            expect(avatarsOf(button)).toHaveLength(0);
            expect(button.querySelector("[class*='reactionsRowButtonCount']")).toHaveTextContent("3");
        });

        it.each([
            ["another person's", WithReactors],
            ["your own", WithReactorsSelected],
        ])(
            "lines up 16px avatars in the middle of %s 24px chip, 4px under each other and the last 4px from its end",
            (_name, Story) => {
                render(<Story />);
                const button = screen.getByRole("button");
                const chip = button.getBoundingClientRect();
                const avatars = avatarsOf(button).map((avatar) => avatar.getBoundingClientRect());

                expect(chip.height).toBe(24);
                for (const avatar of avatars) {
                    expect([avatar.width, avatar.height]).toEqual([16, 16]);
                    expect(avatar.top - chip.top).toBe(4);
                    expect(chip.bottom - avatar.bottom).toBe(4);
                }
                expect(avatars[1].left - avatars[0].left).toBe(12);
                expect(avatars[2].left - avatars[1].left).toBe(12);
                expect(chip.right - avatars[2].right).toBe(4);
                // 4px after the emoji
                const emoji = button.querySelector("[class*='reactionsRowButtonContent']")!;
                expect(avatars[0].left - emoji.getBoundingClientRect().right).toBeCloseTo(0, 0);
                expect(parseFloat(getComputedStyle(emoji).paddingInlineEnd)).toBe(4);
            },
        );

        it.each(["ltr", "rtl"])(
            "cuts each avatar away around the next with a gap that shows the chip's fill, rather than a ring (%s)",
            (dir) => {
                render(
                    <div dir={dir}>
                        <WithReactors />
                    </div>,
                );
                const avatars = avatarsOf(screen.getByRole("button"));
                const masks = avatars.map((avatar) => getComputedStyle(avatar).maskImage);
                const centre = dir === "ltr" ? "calc(100% + 4px) 50%" : "-4px 50%";

                for (const mask of masks.slice(0, -1)) {
                    expect(mask).toBe(
                        `radial-gradient(circle at ${centre}, rgba(0, 0, 0, 0) 9.5px, rgb(0, 0, 0) 10px)`,
                    );
                }
                expect(masks.at(-1)).toBe("none");
                for (const avatar of avatars) expect(getComputedStyle(avatar).boxShadow).toBe("none");
            },
        );
    });
});
