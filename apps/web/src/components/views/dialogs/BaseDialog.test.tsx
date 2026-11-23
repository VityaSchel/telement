/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { render, screen } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { afterEach, vi, describe, it, expect } from "vitest";
import { MockViewModel, ValueRowView, type ValueRowViewSnapshot } from "@element-hq/web-shared-components";

import BaseDialog from "./BaseDialog.tsx";

/** A setting whose value is picked from a short menu. */
function valueRow(): React.ReactElement {
    const vm = new MockViewModel<ValueRowViewSnapshot>({
        label: "Send messages",
        value: "Default",
        options: [
            { key: "0", label: "Default" },
            { key: "50", label: "Moderator" },
        ],
        selectedKey: "0",
        disabled: false,
    });
    const actions = {
        select: vi.fn(),
        startCustom: vi.fn(),
        setCustomValue: vi.fn(),
        commitCustom: vi.fn(),
        cancelCustom: vi.fn(),
    };
    return <ValueRowView vm={Object.assign(vm, actions)} />;
}

describe("BaseDialog", () => {
    const fadeOut = document.createElement("style");

    afterEach(() => {
        fadeOut.remove();
    });

    it("calls onFinished when Escape is pressed", async () => {
        const onFinished = vi.fn();
        const { container } = render(<BaseDialog onFinished={onFinished} />);
        // Autolock's autofocus in the empty dialog is focusing on the close button and bringing up the tooltip
        // So we either need to call escape twice(one for the tooltip and one for the dialog) or focus
        // on the dialog first.
        const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!;
        dialog?.focus();
        await userEvent.keyboard("{Escape}");
        expect(onFinished).toHaveBeenCalled();
    });

    it("stays open when Escape closes a menu in it that fades out, as with reduced motion", async () => {
        // The closed menu stays in the document until it has faded, so the key that closed it still reaches the dialog
        fadeOut.textContent = '[role="menu"][data-state="closed"] { animation-name: fade-out; }';
        document.head.append(fadeOut);
        const onFinished = vi.fn();
        const onKeyDown = vi.fn();
        render(
            <BaseDialog onFinished={onFinished} onKeyDown={onKeyDown}>
                {valueRow()}
            </BaseDialog>,
        );
        await userEvent.click(screen.getByRole("button", { name: "Send messages Default" }));
        const menu = screen.getByRole("menu");

        await userEvent.keyboard("{Escape}");

        expect(menu).toHaveAttribute("data-state", "closed");
        expect(menu).toBeInTheDocument();
        expect(onFinished).not.toHaveBeenCalled();
        expect(onKeyDown).not.toHaveBeenCalled();
    });
});
