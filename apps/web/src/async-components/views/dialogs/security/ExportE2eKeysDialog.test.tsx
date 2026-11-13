/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { screen, fireEvent, render, waitFor, act } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { type IMegolmSessionData } from "matrix-js-sdk/src/matrix";
import { type CryptoApi } from "matrix-js-sdk/src/crypto-api";
import { vi, describe, it, expect } from "vitest";

import { createTestClient } from "test-utils";
import * as MegolmExportEncryption from "../../../../utils/MegolmExportEncryption";
import ExportE2eKeysDialog from "./ExportE2eKeysDialog";

describe("ExportE2eKeysDialog", () => {
    it("renders", () => {
        const cli = createTestClient();
        const onFinished = vi.fn();
        const { asFragment } = render(<ExportE2eKeysDialog matrixClient={cli} onFinished={onFinished} />);
        expect(asFragment()).toMatchSnapshot();
    });

    it("marks Cancel as the footer's cancel button, which the footer leaves an outline", () => {
        render(<ExportE2eKeysDialog matrixClient={createTestClient()} onFinished={vi.fn()} />);
        const cancel = screen.getByRole("button", { name: "Cancel" });

        expect(cancel).toHaveClass("mx_LegacyDialogButton", "cancel");
        // The selector of the footer's cancel rule in _common.pcss, whose colors DialogButtons.test.browser.ts measures
        expect(cancel.matches(".mx_Dialog_buttons button.mx_LegacyDialogButton.cancel")).toBe(true);
    });

    it("puts Cancel first and Export last in the footer, as DialogButtons does", () => {
        const { container } = render(<ExportE2eKeysDialog matrixClient={createTestClient()} onFinished={vi.fn()} />);
        const footer = container.querySelector(".mx_Dialog_buttons")!;
        const exportButton = screen.getByRole("button", { name: "Export" });

        expect([...footer.children].map((button) => button.textContent)).toEqual(["Cancel", "Export"]);
        // The footer rule in _common.pcss that leaves no margin after the last button, which
        // DialogButtons.test.browser.ts measures
        expect(exportButton.matches("button.mx_LegacyDialogButton.mx_Dialog_primary:last-child")).toBe(true);
    });

    it("moves focus from the passphrase fields to Cancel, then to Export", async () => {
        render(<ExportE2eKeysDialog matrixClient={createTestClient()} onFinished={vi.fn()} />);
        expect(screen.getByLabelText("Enter passphrase")).toHaveFocus();

        await userEvent.tab();
        expect(screen.getByLabelText("Confirm passphrase")).toHaveFocus();
        await userEvent.tab();
        expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
        await userEvent.tab();
        expect(screen.getByRole("button", { name: "Export" })).toHaveFocus();
    });

    it("should have disabled submit button initially", async () => {
        const cli = createTestClient();
        const onFinished = vi.fn();
        const { container } = render(<ExportE2eKeysDialog matrixClient={cli} onFinished={onFinished} />);
        await act(() => fireEvent.click(container.querySelector("[type=submit]")!));
        expect(screen.getByLabelText("Enter passphrase")).toBeInTheDocument();
    });

    it("should complain about weak passphrases", async () => {
        const cli = createTestClient();
        const onFinished = vi.fn();

        const { container } = render(<ExportE2eKeysDialog matrixClient={cli} onFinished={onFinished} />);
        const input = screen.getByLabelText("Enter passphrase");
        await userEvent.type(input, "password");
        await act(() => fireEvent.click(container.querySelector("[type=submit]")!));
        await expect(screen.findByText("This is a top-10 common password")).resolves.toBeInTheDocument();
    });

    it("should complain if passphrases don't match", async () => {
        const cli = createTestClient();
        const onFinished = vi.fn();

        const { container } = render(<ExportE2eKeysDialog matrixClient={cli} onFinished={onFinished} />);
        await userEvent.type(screen.getByLabelText("Enter passphrase"), "ThisIsAMoreSecurePW123$$");
        await userEvent.type(screen.getByLabelText("Confirm passphrase"), "ThisIsAMoreSecurePW124$$");
        await act(() => fireEvent.click(container.querySelector("[type=submit]")!));
        await expect(screen.findByText("Passphrases must match")).resolves.toBeInTheDocument();
    });

    it("should export if everything is fine", async () => {
        // Given a client able to export keys
        const cli = createTestClient();
        const keys: IMegolmSessionData[] = [];
        const passphrase = "ThisIsAMoreSecurePW123$$";
        const exportRoomKeysAsJson = vi.fn().mockResolvedValue(JSON.stringify(keys));
        cli.getCrypto = () => {
            return {
                exportRoomKeysAsJson,
            } as unknown as CryptoApi;
        };

        // Mock the result of encrypting the sessions. If we don't do this, the
        // encryption process fails, possibly because we didn't initialise
        // something.
        vi.spyOn(MegolmExportEncryption, "encryptMegolmKeyFile").mockResolvedValue(new ArrayBuffer(3));

        // When we tell the dialog to export
        const { container } = render(<ExportE2eKeysDialog matrixClient={cli} onFinished={vi.fn()} />);
        await userEvent.type(screen.getByLabelText("Enter passphrase"), passphrase);
        await userEvent.type(screen.getByLabelText("Confirm passphrase"), passphrase);
        await act(() => fireEvent.click(container.querySelector("[type=submit]")!));

        // Then it exports keys and encrypts them
        await waitFor(() => expect(exportRoomKeysAsJson).toHaveBeenCalled());
        await waitFor(() =>
            expect(MegolmExportEncryption.encryptMegolmKeyFile).toHaveBeenCalledWith(JSON.stringify(keys), passphrase),
        );
    });

    it("still exports on Enter in a passphrase field, not cancels", async () => {
        const cli = createTestClient();
        const passphrase = "ThisIsAMoreSecurePW123$$";
        const exportRoomKeysAsJson = vi.fn().mockResolvedValue("[]");
        cli.getCrypto = () => ({ exportRoomKeysAsJson }) as unknown as CryptoApi;
        vi.spyOn(MegolmExportEncryption, "encryptMegolmKeyFile").mockResolvedValue(new ArrayBuffer(3));
        const onFinished = vi.fn();

        render(<ExportE2eKeysDialog matrixClient={cli} onFinished={onFinished} />);
        fireEvent.change(screen.getByLabelText("Enter passphrase"), { target: { value: passphrase } });
        fireEvent.change(screen.getByLabelText("Confirm passphrase"), { target: { value: passphrase } });
        screen.getByLabelText("Confirm passphrase").focus();
        await userEvent.keyboard("{Enter}");

        await waitFor(() => expect(exportRoomKeysAsJson).toHaveBeenCalled());
        expect(onFinished).not.toHaveBeenCalledWith(false);
    });
});
