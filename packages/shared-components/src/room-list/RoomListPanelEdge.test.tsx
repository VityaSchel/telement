/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../telement/tokens.css";
import React from "react";
import { composeStories } from "@storybook/react-vite";
import { render, screen, waitFor } from "@test-utils";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import * as headerStories from "./RoomListHeaderView/RoomListHeaderView.stories";
import * as searchStories from "./RoomListSearchView/RoomListSearchView.stories";
import * as filterStories from "./RoomListPrimaryFilters/RoomListPrimaryFilters.stories";

const { Default: Header, NoComposeMenu } = composeStories(headerStories);
const { Default: Search } = composeStories(searchStories);
const { Default: Filters } = composeStories(filterStories);

/** The room list panel's width by default; the room list items' avatars are 12px from its edges. */
const PANEL_WIDTH = 370;
const EDGE = 12;

function renderInPanel(element: React.ReactElement): DOMRect {
    render(
        <div data-testid="panel" style={{ width: `${PANEL_WIDTH}px` }}>
            {element}
        </div>,
    );
    return screen.getByTestId("panel").getBoundingClientRect();
}

function rect(element: Element): DOMRect {
    return element.getBoundingClientRect();
}

describe("Room list panel content edge", () => {
    beforeAll(async () => {
        await document.fonts.load("500 13px Inter");
    });

    it("puts the header's title and its 36px buttons on the content edge", () => {
        const panel = renderInPanel(<Header />);
        const header = screen.getByTestId("room-list-header");
        const buttons = [...header.querySelectorAll("button")];
        const title = screen.getByRole("heading");

        expect(rect(title).left - panel.left).toBe(EDGE);
        expect(panel.right - rect(buttons.at(-1)!).right).toBe(EDGE);
        for (const button of buttons) {
            expect(rect(button).width).toBe(36);
            expect(rect(button).height).toBe(36);
            expect(rect(button.querySelector("svg")!).width).toBe(24);
        }
        // Centered between the panel's top and the filters, 12px from both
        expect(rect(header).bottom - rect(buttons[0]).bottom).toBe(EDGE);
        expect(rect(buttons[0]).top - rect(header).top).toBe(EDGE);
    });

    it.each(["Room Options", "New"])(
        "opens the header's %s menu ending with its button, over the room list instead of across its edge",
        async (name) => {
            const panel = renderInPanel(<Header />);
            const button = screen.getByRole("button", { name });

            await userEvent.click(button);
            const menu = await screen.findByRole("menu");
            await Promise.all(menu.getAnimations().map((animation) => animation.finished));

            await waitFor(() => expect(rect(menu).right).toBeCloseTo(rect(button).right, 0));
            expect(rect(menu).left).toBeGreaterThanOrEqual(panel.left);
            // Compound's gap under the button
            expect(rect(menu).top - rect(button).bottom).toBeCloseTo(8, 0);
        },
    );

    it("makes the header's start chat button a 36px control on the content edge too", () => {
        const panel = renderInPanel(<NoComposeMenu />);
        const button = screen.getByRole("button", { name: "Start chat" });

        expect(rect(button).width).toBe(36);
        expect(rect(button.querySelector("svg")!).width).toBe(24);
        expect(panel.right - rect(button).right).toBe(EDGE);
    });

    it("puts the search field on the content edge", () => {
        const panel = renderInPanel(<Search />);
        const buttons = [...screen.getByTestId("room-list-search").querySelectorAll("button")];

        expect(rect(buttons[0]).left - panel.left).toBe(EDGE);
        expect(panel.right - rect(buttons.at(-1)!).right).toBe(EDGE);
        expect(rect(buttons[0]).height).toBe(36);
    });

    it("makes the filters 28px chips on the content edge, four of them fitting at the default width", () => {
        const panel = renderInPanel(<Filters />);
        const filters = screen.getAllByRole("option");
        const visible = filters.filter((option) => option.getAttribute("aria-hidden") !== "true");
        const chevron = screen.getByRole("button", { name: "Expand filter list" });

        expect(rect(filters[0]).left - panel.left).toBe(EDGE);
        expect(panel.right - rect(chevron).right).toBe(EDGE);
        expect(rect(chevron).width).toBe(28);
        expect(rect(chevron).height).toBe(28);
        expect(rect(chevron.querySelector("svg")!).width).toBe(20);
        expect(visible.map((filter) => filter.textContent)).toEqual(["Unread", "People", "Rooms", "Mentions"]);
        for (const filter of visible) {
            expect(rect(filter).height).toBe(28);
            expect(getComputedStyle(filter).paddingInline).toBe("8px");
            expect(rect(filter).top).toBe(rect(chevron).top);
        }
    });

    it("puts the filters' labels in the middle of the chips, by their cap height", () => {
        renderInPanel(<Filters />);

        for (const filter of screen.getAllByRole("option").filter((option) => option.checkVisibility())) {
            const probe = document.createElement("span");
            probe.style.display = "inline-block";
            filter.append(probe);
            const baseline = rect(probe).bottom;
            probe.style.cssText = "position: absolute; display: block; block-size: 1cap;";
            const capHeight = rect(probe).height;
            probe.remove();

            expect(baseline - capHeight - rect(filter).top).toBeCloseTo(rect(filter).bottom - baseline, 1);
        }
    });
});
