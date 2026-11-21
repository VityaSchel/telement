/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../telement/tokens.css";
import { composeStories } from "@storybook/react-vite";
import { render, screen, waitFor } from "@test-utils";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach } from "vitest";
import React from "react";

import * as stories from "./RoomListHeaderView.stories";

const { Default, NoSpaceMenu, NoComposeMenu } = composeStories(stories);

describe("RoomListHeaderView", () => {
    it("renders the default state", () => {
        const { container } = render(<Default />);
        expect(container).toMatchSnapshot();
    });

    it("renders without space menu", () => {
        const { container } = render(<NoSpaceMenu />);
        expect(container).toMatchSnapshot();
    });

    it("renders a start chat button instead of the compose menu when rooms can't be created", () => {
        const { getByRole } = render(<NoComposeMenu />);
        getByRole("button", { name: "Start chat" }).click();
        expect(NoComposeMenu.args?.createChatRoom).toHaveBeenCalled();
    });
});

/** The color a token resolves to in the theme of the document's root. */
function colorOf(token: string): string {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}

/** The color a button's glyph is painted in: the fill its paths end up with. */
function glyphColor(button: Element): string {
    return getComputedStyle(button.querySelector("svg path")!).fill;
}

describe.each(["cpd-theme-light", "cpd-theme-dark"])("RoomListHeaderView in %s", (theme) => {
    afterEach(() => {
        document.documentElement.classList.remove(theme);
    });

    it.each(["Open space menu", "Room Options", "New"])(
        "draws the glyph of %s in the accent while its menu is open, with no fill of its own, as the room header does",
        async (name) => {
            document.documentElement.classList.add(theme);
            const user = userEvent.setup();
            render(<Default />);
            const button = screen.getByRole("button", { name });
            const rest = glyphColor(button);

            await user.click(button);
            await waitFor(() => expect(button).toHaveAttribute("aria-expanded", "true"));
            expect(glyphColor(button)).toBe(colorOf("--cpd-color-icon-accent-primary"));
            expect(glyphColor(button)).not.toBe(rest);
            expect(getComputedStyle(button).backgroundColor).toBe("rgba(0, 0, 0, 0)");
            await user.keyboard("{Escape}");
            await waitFor(() => expect(button).toHaveAttribute("aria-expanded", "false"));
            expect(glyphColor(button)).toBe(rest);
        },
    );
});
