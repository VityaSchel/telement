/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";

import DialogButtons from "./DialogButtons";

/** Whether the shared footer draws the button in red, by its CSS module class. */
const isRed = (button: HTMLElement): boolean => /(^|\s)_destructive/.test(button.className);

describe("DialogButtons", () => {
    it("renders the shared dialog footer: Cancel, what the dialog adds, then the action, as text buttons", () => {
        render(
            <DialogButtons primaryButton="Leave" onPrimaryButtonClick={vi.fn()} onCancel={vi.fn()}>
                <button type="button">Other</button>
            </DialogButtons>,
        );
        const buttons = screen.getAllByRole("button");

        expect(buttons.map((button) => button.textContent)).toEqual(["Cancel", "Other", "Leave"]);
        expect(buttons[0].parentElement).toHaveClass("mx_Dialog_buttons");
        expect(buttons[0]).not.toHaveClass("mx_LegacyDialogButton");
        expect(buttons[2]).not.toHaveClass("mx_LegacyDialogButton");
        expect(buttons[2]).toHaveClass("mx_Dialog_primary");
    });

    it("draws a danger action and a danger or warning Cancel in red, and nothing else", () => {
        const { rerender } = render(
            <DialogButtons primaryButton="Leave" primaryButtonClass="danger" cancelButtonClass="warning" />,
        );

        expect(isRed(screen.getByRole("button", { name: "Leave" }))).toBe(true);
        expect(isRed(screen.getByRole("button", { name: "Cancel" }))).toBe(true);

        rerender(<DialogButtons primaryButton="Leave" primaryButtonClass="primary" />);
        expect(isRed(screen.getByRole("button", { name: "Leave" }))).toBe(false);
        expect(isRed(screen.getByRole("button", { name: "Cancel" }))).toBe(false);
    });

    it("keeps Cancel a plain button and makes the action a submit button when asked to", () => {
        render(<DialogButtons primaryButton="Save" primaryIsSubmit />);

        expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute("type", "button");
        expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
    });

    it("puts what sits next to the buttons at the footer's start", () => {
        render(<DialogButtons primaryButton="Allow" additive={<span>Remember my choice</span>} />);
        const footer = screen.getByRole("button", { name: "Allow" }).parentElement!;

        expect(footer.firstElementChild).toHaveTextContent("Remember my choice");
    });

    it("calls the handlers, and disables both buttons or only the action", async () => {
        const onPrimary = vi.fn();
        const onCancel = vi.fn();
        const { rerender } = render(
            <DialogButtons primaryButton="Leave" onPrimaryButtonClick={onPrimary} onCancel={onCancel} />,
        );

        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
        await userEvent.click(screen.getByRole("button", { name: "Leave" }));
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onPrimary).toHaveBeenCalledTimes(1);

        rerender(<DialogButtons primaryButton="Leave" primaryDisabled />);
        expect(screen.getByRole("button", { name: "Leave" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();

        rerender(<DialogButtons primaryButton="Leave" disabled />);
        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });
});
