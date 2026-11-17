/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "test-utils-rtl";

import {
    GenericDropdownMenu,
    GenericDropdownMenuOption,
    type GenericDropdownMenuItem,
} from "./GenericDropdownMenu.tsx";

describe("GenericDropdownMenu", () => {
    it("should check the radio of the selected option", async () => {
        const options: GenericDropdownMenuItem<string>[] = [
            {
                key: "selected",
                label: "Selected",
                description: "This item is selected",
            },
            {
                key: "not-selected",
                label: "Not selected",
            },
        ];

        render(
            <GenericDropdownMenu
                value="selected"
                options={options}
                onChange={vi.fn()}
                selectedLabel={() => "Selected"}
            />,
        );

        const trigger = screen.getByRole("button");
        fireEvent.click(trigger);

        const dropdown = await screen.findByRole("menu");
        const radioOf = (option: string): HTMLInputElement | null | undefined =>
            dropdown
                .querySelector(`[aria-checked="${option}"]`)
                ?.querySelector<HTMLInputElement>(".mx_GenericDropdownMenu_Option--selection input");
        expect(radioOf("true")?.checked).toBe(true);
        expect(radioOf("false")?.checked).toBe(false);
        expect(dropdown).toMatchSnapshot();
    });

    it("should show an action option's icon instead of a radio", async () => {
        const options: GenericDropdownMenuItem<string>[] = [{ key: "only", label: "Only" }];
        render(
            <GenericDropdownMenu
                value="only"
                options={options}
                onChange={vi.fn()}
                selectedLabel={() => "Only"}
                AdditionalOptions={() => (
                    <GenericDropdownMenuOption
                        key="action"
                        label="Add server"
                        icon={<svg data-testid="add-icon" />}
                        onClick={vi.fn()}
                    />
                )}
            />,
        );

        fireEvent.click(screen.getByRole("button"));
        const action = await screen.findByRole("menuitemradio", { name: "Add server" });
        expect(action.querySelector('input[type="radio"]')).toBeNull();
        expect(screen.getByTestId("add-icon")).toBeInTheDocument();
    });
});
