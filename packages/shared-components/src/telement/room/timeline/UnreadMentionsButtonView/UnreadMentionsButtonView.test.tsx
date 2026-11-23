/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "../../../tokens.css";

import { render, screen } from "@test-utils";
import { MockViewModel } from "../../../../core/viewmodel";
import {
    UnreadMentionsButtonView,
    type UnreadMentionsButtonViewActions,
    type UnreadMentionsButtonViewSnapshot,
} from "./UnreadMentionsButtonView";
import styles from "./UnreadMentionsButtonView.module.css";

function renderButton(count: number, onClick = vi.fn()): HTMLElement | null {
    const vm = new MockViewModel<UnreadMentionsButtonViewSnapshot>({
        count,
    }) as MockViewModel<UnreadMentionsButtonViewSnapshot> & UnreadMentionsButtonViewActions;
    vm.onClick = onClick;
    render(<UnreadMentionsButtonView vm={vm} />);
    return screen.queryByRole("button");
}

describe("UnreadMentionsButtonView", () => {
    it("is a 36px circle with the @, outlined like the jump to bottom button", () => {
        const button = renderButton(2)!;
        const style = getComputedStyle(button);

        expect(button).toHaveAccessibleName("2 unread mentions");
        expect(button.getBoundingClientRect().width).toBe(36);
        expect(button.getBoundingClientRect().height).toBe(36);
        expect(style.borderRadius).toBe("50%");
        // 1.3px, which the browser draws on whole device pixels, in the glyph's color
        expect(style.borderTopStyle).toBe("solid");
        expect(parseFloat(style.borderTopWidth)).toBeGreaterThanOrEqual(1);
        expect(style.borderTopColor).toBe(style.color);
        expect(button.querySelector("svg")!.getBoundingClientRect().width).toBe(24);
    });

    it("puts the room list's accent counter on its top end edge", () => {
        const button = renderButton(2)!;
        const counter = button.parentElement!.querySelector<HTMLElement>(`.${styles.counter}`)!;
        const box = counter.getBoundingClientRect();
        const circle = button.getBoundingClientRect();

        expect(counter).toHaveTextContent("2");
        expect(counter).toHaveAttribute("aria-hidden", "true");
        // 20px at the default font size, one digit a circle
        expect(box.height).toBe(20);
        expect(box.width).toBe(20);
        // The accent, Telegram's #2481cc in the light theme
        expect(getComputedStyle(counter).backgroundColor).toBe("rgb(36, 129, 204)");
        expect(getComputedStyle(counter).color).toBe("rgb(255, 255, 255)");
        // Its middle 4px down from the circle's top and 6px in from its end
        expect((box.top + box.bottom) / 2 - circle.top).toBe(4);
        expect(circle.right - (box.left + box.right) / 2).toBe(6);
    });

    it("grows the counter into a pill toward the start for longer counts", () => {
        const button = renderButton(128)!;
        const box = button.parentElement!.querySelector(`.${styles.counter}`)!.getBoundingClientRect();
        const circle = button.getBoundingClientRect();

        expect(box.height).toBe(20);
        expect(box.width).toBeGreaterThan(20);
        expect(circle.right - box.right).toBe(-4);
    });

    it("jumps to the next unread mention when pressed", async () => {
        const onClick = vi.fn();
        await userEvent.click(renderButton(1, onClick)!);

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("isn't shown without unread mentions", () => {
        expect(renderButton(0)).toBeNull();
    });
});
