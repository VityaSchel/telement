/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { composeStories } from "@storybook/react-vite";
import userEvent from "@testing-library/user-event";
import { userEvent as pointer } from "vitest/browser";
import { render, screen } from "@test-utils";
import { describe, expect, it, vi } from "vitest";
// The layout assertions need the real spacing tokens, Compound's pill radius and Telement's tokens
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../tokens.css";

import * as stories from "./DialogFooterView.stories";
import { DialogFooterButton, DialogFooterView } from "./DialogFooterView";

const { Default, Destructive, DisabledAction, AloneOk, WithStart, WithStartButton, Wrapping } = composeStories(stories);

/** What a color token resolves to where the footer is drawn. */
function tokenColor(token: string): string {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    screen.getByTestId("dialog").append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}

/** The box of a button's label, as drawn. */
function labelBox(button: HTMLElement): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(button);
    return range.getBoundingClientRect();
}

describe("DialogFooterView", () => {
    it("puts Cancel before the action, both plain buttons rather than submit buttons", () => {
        render(<Default />);
        const buttons = screen.getAllByRole("button");

        expect(buttons.map((button) => button.textContent)).toEqual(["Cancel", "Leave"]);
        for (const button of buttons) expect(button).toHaveAttribute("type", "button");
    });

    it("makes a button a form's submit button when asked to", () => {
        render(
            <DialogFooterView>
                <DialogFooterButton type="submit">Save</DialogFooterButton>
            </DialogFooterView>,
        );

        expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
    });

    it("calls a button's handler, and not a disabled one's", async () => {
        const onSave = vi.fn();
        const onDisabled = vi.fn();
        render(
            <DialogFooterView>
                <DialogFooterButton onClick={onDisabled} disabled>
                    Cancel
                </DialogFooterButton>
                <DialogFooterButton onClick={onSave}>Save</DialogFooterButton>
            </DialogFooterView>,
        );

        await userEvent.click(screen.getByRole("button", { name: "Save" }));
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onDisabled).not.toHaveBeenCalled();
    });

    it("keeps the footer's own class and attributes", () => {
        render(<DialogFooterView className="mx_Dialog_buttons" data-testid="footer" />);

        expect(screen.getByTestId("footer")).toHaveClass("mx_Dialog_buttons");
    });

    it("draws flat 36px pill buttons with their label 12px inside, in the accent, 8px apart", () => {
        render(<Default />);
        const [cancel, leave] = screen.getAllByRole("button");
        const style = getComputedStyle(leave);

        expect(leave.getBoundingClientRect().height).toBe(36);
        expect(leave.getBoundingClientRect().width / 2).toBeGreaterThanOrEqual(18);
        expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThanOrEqual(18);
        expect([style.backgroundColor, style.borderTopStyle]).toEqual(["rgba(0, 0, 0, 0)", "none"]);
        expect([style.fontSize, style.fontWeight]).toEqual(["15px", "600"]);
        expect(style.color).toBe(tokenColor("--cpd-color-text-action-accent"));
        expect(getComputedStyle(cancel).color).toBe(tokenColor("--cpd-color-text-action-accent"));
        expect(labelBox(leave).right).toBeCloseTo(leave.getBoundingClientRect().right - 12, 0);
        expect(leave.getBoundingClientRect().left - cancel.getBoundingClientRect().right).toBe(8);
    });

    it("writes a destructive action in red", () => {
        render(<Destructive />);

        expect(getComputedStyle(screen.getByRole("button", { name: "Leave" })).color).toBe(
            tokenColor("--cpd-color-text-critical-primary"),
        );
        expect(getComputedStyle(screen.getByRole("button", { name: "Cancel" })).color).toBe(
            tokenColor("--cpd-color-text-action-accent"),
        );
    });

    it("writes a disabled button's label in the disabled color", () => {
        render(<DisabledAction />);

        expect(getComputedStyle(screen.getByRole("button", { name: "Create poll" })).color).toBe(
            tokenColor("--cpd-color-text-disabled"),
        );
    });

    it("draws a button that can't be used but says why in a tooltip as a disabled one, which still takes the focus", async () => {
        render(
            <div data-testid="dialog">
                <DialogFooterView>
                    <DialogFooterButton aria-disabled={true}>Use recovery key</DialogFooterButton>
                </DialogFooterView>
            </div>,
        );
        const button = screen.getByRole("button", { name: "Use recovery key" });
        await pointer.hover(button);
        for (const animation of button.getAnimations()) animation.finish();

        expect(getComputedStyle(button).color).toBe(tokenColor("--cpd-color-text-disabled"));
        expect(getComputedStyle(button).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        button.focus();
        expect(button).toHaveFocus();
        await pointer.unhover(button);
    });

    it("keeps a running action's spinner 8px from its label", () => {
        render(
            <DialogFooterView>
                <DialogFooterButton disabled>
                    <svg data-testid="spinner" width={20} height={20} /> Reset in progress…
                </DialogFooterButton>
            </DialogFooterView>,
        );
        const spinner = screen.getByTestId("spinner");
        const label = document.createRange();
        label.selectNodeContents(spinner.nextSibling!);

        expect(label.getBoundingClientRect().left - spinner.getBoundingClientRect().right).toBeCloseTo(8, 0);
    });

    it("ends the action's label on the dialog's 24px edge, 24px under the content, its box 12px inside the corner", () => {
        render(<Default />);
        const dialog = screen.getByTestId("dialog").getBoundingClientRect();
        const content = screen.getByTestId("content").getBoundingClientRect();
        const leave = screen.getByRole("button", { name: "Leave" });
        const box = leave.getBoundingClientRect();

        expect(dialog.right - labelBox(leave).right).toBeCloseTo(24, 0);
        expect([dialog.right - box.right, dialog.bottom - box.bottom]).toEqual([12, 12]);
        // The label is centered in its box, so it sits as far from the bottom edge as from the end
        expect(box.top - content.bottom).toBe(12);
        // The box's 18px corners, 12px inside the dialog's 30px ones, are concentric with them
        expect(12 + box.height / 2).toBe(30);
    });

    it("keeps an OK button alone at the end of the line", () => {
        render(<AloneOk />);
        const dialog = screen.getByTestId("dialog").getBoundingClientRect();

        expect(dialog.right - labelBox(screen.getByRole("button", { name: "OK" })).right).toBeCloseTo(24, 0);
    });

    it("puts what goes at the start on the content's start edge, centered on the buttons' line", () => {
        render(<WithStart />);
        const dialog = screen.getByTestId("dialog").getBoundingClientRect();
        const start = screen.getByRole("checkbox").closest("label")!.getBoundingClientRect();
        const leave = screen.getByRole("button", { name: "Leave" }).getBoundingClientRect();

        expect(start.left - dialog.left).toBe(24);
        expect(start.top + start.height / 2).toBeCloseTo(leave.top + leave.height / 2, 0);
    });

    it("puts a button at the start with its label on the content's start edge, as the last one's is on the end", () => {
        render(<WithStartButton />);
        const dialog = screen.getByTestId("dialog").getBoundingClientRect();
        const remove = screen.getByRole("button", { name: "Remove" });

        expect(labelBox(remove).left - dialog.left).toBeCloseTo(24, 0);
        expect(remove.getBoundingClientRect().top).toBe(
            screen.getByRole("button", { name: "Save" }).getBoundingClientRect().top,
        );
    });

    it("stacks buttons that don't fit on one line 8px apart, each line ending on the edge", () => {
        render(<Wrapping />);
        const dialog = screen.getByTestId("dialog").getBoundingClientRect();
        const boxes = screen.getAllByRole("button").map((button) => button.getBoundingClientRect());
        const lines = [...new Set(boxes.map((box) => box.top))].sort((a, b) => a - b);

        expect(lines.length).toBeGreaterThan(1);
        expect(lines[1] - lines[0]).toBe(36 + 8);
        expect(dialog.right - boxes.at(-1)!.right).toBe(12);
    });

    it("mirrors in right-to-left text, the action ending on the left edge", () => {
        render(
            <div dir="rtl">
                <Default />
            </div>,
        );
        const dialog = screen.getByTestId("dialog").getBoundingClientRect();
        const [cancel, leave] = screen.getAllByRole("button").map((button) => button.getBoundingClientRect());

        expect(leave.left - dialog.left).toBe(12);
        expect(cancel.left - leave.right).toBe(8);
    });

    it("fills a hovered button with the one hover gray, and a destructive one with the red hover", async () => {
        render(<Destructive />);
        const fill = (button: HTMLElement): string => {
            for (const animation of button.getAnimations()) animation.finish();
            return getComputedStyle(button).backgroundColor;
        };
        const backgroundOf = (token: string): string => {
            const probe = document.createElement("div");
            probe.style.backgroundColor = `var(${token})`;
            screen.getByTestId("dialog").append(probe);
            const color = getComputedStyle(probe).backgroundColor;
            probe.remove();
            return color;
        };
        const cancel = screen.getByRole("button", { name: "Cancel" });
        const leave = screen.getByRole("button", { name: "Leave" });

        // The browser's own pointer, as :hover only follows a real one
        await pointer.hover(cancel);
        expect(fill(cancel)).toBe(backgroundOf("--cpd-color-bg-action-secondary-hovered"));
        await pointer.hover(leave);
        expect(fill(leave)).toBe(backgroundOf("--tl-color-bg-menu-critical-hovered"));
        expect(fill(cancel)).toBe("rgba(0, 0, 0, 0)");
        await pointer.unhover(leave);
    });
});
