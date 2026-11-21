/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { MatrixError } from "matrix-js-sdk/src/matrix";

import { stubClient, unmockClientPeg } from "test-utils";
import DeactivateAccountDialog from "./DeactivateAccountDialog";

describe("DeactivateAccountDialog", () => {
    beforeEach(() => {
        // Upstream puts the erase checkbox, which StyledCheckbox draws with <div>s, in a <p>, and React warns about the
        // nesting, which the test setup fails a test on. Other errors still fail these tests
        const consoleError = vi.spyOn(console, "error");
        const setupConsoleError = consoleError.getMockImplementation();
        consoleError.mockImplementation((...args) => {
            if (String(args[0]).includes("cannot be a descendant of")) return;
            setupConsoleError?.(...args);
        });

        const client = stubClient();
        // The server asks for the account's password before deactivating it
        client.deactivateAccount = vi
            .fn()
            .mockRejectedValue(new MatrixError({ session: "sess", flows: [{ stages: ["m.login.password"] }] }, 401));
    });

    afterEach(() => {
        unmockClientPeg();
    });

    it("titles the dialog in the dialog title's color, not in red", async () => {
        render(<DeactivateAccountDialog onFinished={vi.fn()} />);

        expect(await screen.findByRole("heading", { name: /deactivate account/i })).not.toHaveClass("danger");
    });

    it("ends the password stage with Cancel, then a red Deactivate account that submits the password", async () => {
        render(<DeactivateAccountDialog onFinished={vi.fn()} />);

        const deactivate = await screen.findByRole("button", { name: /deactivate account/i });
        const cancel = screen.getByRole("button", { name: "Cancel" });
        expect(deactivate).toHaveClass("danger");
        expect(deactivate).toHaveAttribute("type", "submit");
        expect(deactivate).toBeDisabled();
        expect(deactivate.closest(".mx_Dialog_buttons")).toContainElement(cancel);
        expect(cancel.compareDocumentPosition(deactivate) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        await userEvent.type(screen.getByLabelText("Password"), "s3kr3t");
        expect(deactivate).toBeEnabled();
    });

    it("closes from the password stage's Cancel", async () => {
        const onFinished = vi.fn();
        render(<DeactivateAccountDialog onFinished={onFinished} />);

        await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));

        expect(onFinished).toHaveBeenCalledWith(false);
    });
});
