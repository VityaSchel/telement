/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { composeStories } from "@storybook/react-vite";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@test-utils";
import { describe, expect, it } from "vitest";
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";

import * as stories from "./FailedMessageMarkView.stories";

const { Default, MenuOpen } = composeStories(stories);

describe("FailedMessageMarkView", () => {
    it("is a button named by the failed mark, with nothing drawn around the mark", () => {
        render(<Default />);

        const button = screen.getByRole("button", { name: "Failed to send" });
        const style = getComputedStyle(button);
        expect(button).toContainElement(screen.getByRole("img", { name: "Failed to send" }));
        expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(style.borderTopWidth).toBe("0px");
        expect(style.padding).toBe("0px");
        expect(button.getBoundingClientRect()).toMatchObject({ width: 16, height: 16 });
    });

    it("opens a menu offering to resend the message or to delete it, in red", async () => {
        render(<Default />);

        await userEvent.click(screen.getByRole("button", { name: "Failed to send" }));

        const menu = screen.getByRole("menu", { name: "Failed to send" });
        const items = screen.getAllByRole("menuitem");
        expect(menu).toContainElement(items[0]);
        expect(items.map((item) => item.textContent)).toEqual(["Resend", "Delete"]);
        expect(items[1]).toHaveAttribute("data-kind", "critical");
    });

    it.each([
        ["Resend", "resend"],
        ["Delete", "delete"],
    ] as const)("%ss the message from its menu, which closes", async (label, action) => {
        render(<MenuOpen />);

        await userEvent.click(screen.getByRole("menuitem", { name: label }));

        expect(MenuOpen.args[action]).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("menu")).toBeNull();
    });
});
