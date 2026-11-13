/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { type CryptoApi } from "matrix-js-sdk/src/crypto-api";
import { createTestClient } from "test-utils";

import ImportE2eKeysDialog from "./ImportE2eKeysDialog";
import * as MegolmExportEncryption from "../../../../utils/MegolmExportEncryption";

describe("ImportE2eKeysDialog", () => {
    it("renders", () => {
        const cli = createTestClient();
        const onFinished = vi.fn();
        const { asFragment } = render(<ImportE2eKeysDialog matrixClient={cli} onFinished={onFinished} />);
        expect(asFragment()).toMatchSnapshot();
    });

    it("marks Cancel as the footer's cancel button, which the footer leaves an outline", () => {
        render(<ImportE2eKeysDialog matrixClient={createTestClient()} onFinished={vi.fn()} />);
        const cancel = screen.getByRole("button", { name: "Cancel" });

        expect(cancel).toHaveClass("mx_LegacyDialogButton", "cancel");
        // The selector of the footer's cancel rule in _common.pcss, whose colors DialogButtons.test.browser.ts measures
        expect(cancel.matches(".mx_Dialog_buttons button.mx_LegacyDialogButton.cancel")).toBe(true);
    });

    it("puts Cancel first and Import last in the footer, as DialogButtons does", () => {
        const { container } = render(<ImportE2eKeysDialog matrixClient={createTestClient()} onFinished={vi.fn()} />);
        const footer = container.querySelector(".mx_Dialog_buttons")!;
        const importButton = screen.getByRole("button", { name: "Import" });

        expect([...footer.children].map((button) => button.textContent)).toEqual(["Cancel", "Import"]);
        // The footer rule in _common.pcss that leaves no margin after the last button, which
        // DialogButtons.test.browser.ts measures
        expect(importButton.matches("button.mx_LegacyDialogButton.mx_Dialog_primary:last-child")).toBe(true);
    });

    it("moves focus from the file and passphrase fields to Cancel, then to Import", async () => {
        const { container } = render(<ImportE2eKeysDialog matrixClient={createTestClient()} onFinished={vi.fn()} />);
        const fileInput = container.querySelector<HTMLInputElement>("[type=file]")!;
        expect(fileInput).toHaveFocus();
        fireEvent.change(fileInput, { target: { files: [new File(["test"], "file.txt", { type: "text/plain" })] } });

        await userEvent.tab();
        expect(container.querySelector("[type=password]")).toHaveFocus();
        await userEvent.paste("passphrase");
        await userEvent.tab();
        expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
        await userEvent.tab();
        expect(screen.getByRole("button", { name: "Import" })).toHaveFocus();
    });

    it("still imports on Enter in the passphrase field, not cancels", async () => {
        const cli = createTestClient();
        const importRoomKeysAsJson = vi.fn();
        cli.getCrypto = () => ({ importRoomKeysAsJson }) as unknown as CryptoApi;
        vi.spyOn(MegolmExportEncryption, "decryptMegolmKeyFile").mockResolvedValue("[]");
        const onFinished = vi.fn();

        const { container } = render(<ImportE2eKeysDialog matrixClient={cli} onFinished={onFinished} />);
        fireEvent.change(container.querySelector("[type=file]")!, {
            target: { files: [new File(["test"], "file.txt", { type: "text/plain" })] },
        });
        await userEvent.click(container.querySelector("[type=password]")!);
        await userEvent.paste("passphrase");
        await userEvent.keyboard("{Enter}");

        await waitFor(() => expect(importRoomKeysAsJson).toHaveBeenCalled());
        expect(onFinished).not.toHaveBeenCalledWith(false);
    });

    it("should have disabled submit button initially", () => {
        const cli = createTestClient();
        const onFinished = vi.fn();
        const { container } = render(<ImportE2eKeysDialog matrixClient={cli} onFinished={onFinished} />);
        expect(container.querySelector("[type=submit]")!).toBeDisabled();
    });

    it("should enable submit once file is uploaded and passphrase typed in", () => {
        const cli = createTestClient();
        const onFinished = vi.fn();
        const file = new File(["test"], "file.txt", { type: "text/plain" });

        const { container } = render(<ImportE2eKeysDialog matrixClient={cli} onFinished={onFinished} />);
        fireEvent.change(container.querySelector("[type=file]")!, {
            target: { files: [file] },
        });
        fireEvent.change(container.querySelector("[type=password]")!, {
            target: { value: "passphrase" },
        });
        expect(container.querySelector("[type=submit]")!).toBeEnabled();
    });

    it("should enable submit once file is uploaded and passphrase pasted in", async () => {
        const cli = createTestClient();
        const onFinished = vi.fn();
        const file = new File(["test"], "file.txt", { type: "text/plain" });

        const { container } = render(<ImportE2eKeysDialog matrixClient={cli} onFinished={onFinished} />);
        fireEvent.change(container.querySelector("[type=file]")!, {
            target: { files: [file] },
        });
        await userEvent.click(container.querySelector("[type=password]")!);
        await userEvent.paste("passphrase");
        expect(container.querySelector("[type=submit]")!).toBeEnabled();
    });

    it("should import exported keys on submit", async () => {
        const cli = createTestClient();
        const onFinished = vi.fn();
        const file = new File(["test"], "file.txt", { type: "text/plain" });
        const importRoomKeysAsJson = vi.fn();
        cli.getCrypto = () => {
            return {
                importRoomKeysAsJson,
            } as unknown as CryptoApi;
        };

        // Mock the result of decrypting the sessions, to avoid needing to
        // create encrypted input data.
        vi.spyOn(MegolmExportEncryption, "decryptMegolmKeyFile").mockResolvedValue("[]");

        const { container } = render(<ImportE2eKeysDialog matrixClient={cli} onFinished={onFinished} />);
        fireEvent.change(container.querySelector("[type=file]")!, {
            target: { files: [file] },
        });
        await userEvent.click(container.querySelector("[type=password]")!);
        await userEvent.paste("passphrase");
        fireEvent.click(container.querySelector("[type=submit]")!);

        await waitFor(() => expect(importRoomKeysAsJson).toHaveBeenCalled());
    });
});
