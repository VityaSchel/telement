/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import { render, screen } from "@test-utils";
import userEvent from "@testing-library/user-event";
import { VirtuosoMockContext } from "react-virtuoso";
import { composeStories } from "@storybook/react-vite";
import { describe, it, expect } from "vitest";
// The empty state's layout assertions need the real type and spacing tokens and Telement's radius tokens
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../telement/tokens.css";

import * as stories from "./RoomListView.stories";

const {
    Default,
    Loading,
    Empty,
    EmptyWithoutCreatePermission,
    WithActiveFilter,
    SmallFlatList,
    LargeFlatList,
    EmptyPeopleFilter,
    EmptyRoomsFilter,
    EmptyUnreadFilter,
    EmptyInvitesFilter,
    EmptyMentionsFilter,
    UnreadActivityBelow,
} = composeStories(stories);

const renderWithMockContext = (component: React.ReactElement): ReturnType<typeof render> => {
    return render(component, {
        wrapper: ({ children }) => (
            <VirtuosoMockContext.Provider value={{ viewportHeight: 600, itemHeight: 52 }}>
                {children}
            </VirtuosoMockContext.Provider>
        ),
    });
};

describe("<RoomListView />", () => {
    it("renders Default story", () => {
        const { container } = renderWithMockContext(<Default />);
        expect(container).toMatchSnapshot();
    });

    it("renders Loading story", () => {
        const { container } = renderWithMockContext(<Loading />);
        expect(container).toMatchSnapshot();
    });

    it("renders Empty story", () => {
        const { container } = renderWithMockContext(<Empty />);
        expect(container).toMatchSnapshot();
    });

    it("renders EmptyWithoutCreatePermission story", () => {
        const { container } = renderWithMockContext(<EmptyWithoutCreatePermission />);
        expect(container).toMatchSnapshot();
    });

    it("renders WithActiveFilter story", () => {
        const { container } = renderWithMockContext(<WithActiveFilter />);
        expect(container).toMatchSnapshot();
    });

    it("renders SmallFlatList story", () => {
        const { container } = renderWithMockContext(<SmallFlatList />);
        expect(container).toMatchSnapshot();
    });

    it("renders LargeFlatList story", () => {
        const { container } = renderWithMockContext(<LargeFlatList />);
        expect(container).toMatchSnapshot();
    });

    it("renders EmptyPeopleFilter story", () => {
        const { container } = renderWithMockContext(<EmptyPeopleFilter />);
        expect(container).toMatchSnapshot();
    });

    it("renders EmptyRoomsFilter story", () => {
        const { container } = renderWithMockContext(<EmptyRoomsFilter />);
        expect(container).toMatchSnapshot();
    });

    it("renders EmptyUnreadFilter story", () => {
        const { container } = renderWithMockContext(<EmptyUnreadFilter />);
        expect(container).toMatchSnapshot();
    });

    it("renders EmptyInvitesFilter story", () => {
        const { container } = renderWithMockContext(<EmptyInvitesFilter />);
        expect(container).toMatchSnapshot();
    });

    it("renders EmptyMentionsFilter story", () => {
        const { container } = renderWithMockContext(<EmptyMentionsFilter />);
        expect(container).toMatchSnapshot();
    });

    it("should call onToggleFilter when filter is clicked", async () => {
        const user = userEvent.setup();
        renderWithMockContext(<Default />);

        await user.click(screen.getByRole("option", { name: "People" }));

        expect(Default.args.onToggleFilter).toHaveBeenCalled();
    });

    it("should call createRoom when New room button is clicked", async () => {
        const user = userEvent.setup();
        renderWithMockContext(<Empty />);

        await user.click(screen.getByRole("button", { name: "New room" }));

        expect(Empty.args.createRoom).toHaveBeenCalled();
    });

    it("should call createChatRoom when Start chat button is clicked", async () => {
        const user = userEvent.setup();
        renderWithMockContext(<Empty />);

        await user.click(screen.getByRole("button", { name: "Start chat" }));

        expect(Empty.args.createChatRoom).toHaveBeenCalled();
    });

    it.each([
        ["people", EmptyPeopleFilter],
        ["rooms", EmptyRoomsFilter],
        ["unread", EmptyUnreadFilter],
        ["invites", EmptyInvitesFilter],
        ["mentions", EmptyMentionsFilter],
        // The unread story with the low priority filter on, whose empty state is the unfiltered list's text
        ["low_priority", EmptyUnreadFilter],
    ] as const)("offers only to clear filters when the %s filter has no rooms", async (filterId, Story) => {
        const user = userEvent.setup();
        renderWithMockContext(<Story filterIds={[filterId]} activeFilterId={filterId} />);
        const placeholder = screen.getByTestId("empty-room-list");

        expect([...placeholder.querySelectorAll("button")].map((button) => button.textContent)).toEqual([
            "Clear filters",
        ]);
        await user.click(screen.getByRole("button", { name: "Clear filters" }));

        expect(Story.args.onToggleFilter).toHaveBeenLastCalledWith(filterId);
    });

    it.each([
        ["no rooms", Empty],
        ["no rooms the user can't add to", EmptyWithoutCreatePermission],
        ["the People filter", EmptyPeopleFilter],
        ["the Unread filter", EmptyUnreadFilter],
    ])("centers the empty state for %s in the list both ways, as the right panel's are", (_, Story) => {
        renderWithMockContext(<Story />);
        const placeholder = screen.getByTestId("empty-room-list");
        const list = placeholder.parentElement!.getBoundingClientRect();
        const tile = placeholder.querySelector("svg")!.getBoundingClientRect();
        const lastButton = [...placeholder.querySelectorAll("button")].at(-1)!.getBoundingClientRect();

        expect([tile.width, tile.height]).toEqual([56, 56]);
        expect(Math.abs(tile.top - list.top - (list.bottom - lastButton.bottom))).toBeLessThanOrEqual(1);
        expect(Math.abs(lastButton.left - list.left - (list.right - lastButton.right))).toBeLessThanOrEqual(1);
        expect(Math.abs(tile.left - list.left - (list.right - tile.right))).toBeLessThanOrEqual(1);
    });

    it("titles the empty list in the right panel's 20px", () => {
        renderWithMockContext(<EmptyPeopleFilter />);

        expect(getComputedStyle(screen.getByText("You don’t have direct chats with anyone yet")).fontSize).toBe("20px");
    });

    it.each([
        ["rooms", Default],
        ["no rooms", Empty],
        ["the rooms loading", Loading],
    ])(
        "docks the app's toasts under the filters, above %s, where the list's scrolling doesn't take them",
        (_, Story) => {
            renderWithMockContext(<Story toasts={<div data-testid="toast">Verify this device</div>} />);
            const toast = screen.getByTestId("toast");
            const listBox = toast.nextElementSibling!;

            expect(toast.previousElementSibling).toContainElement(
                screen.getByRole("listbox", { name: "Room list filters" }),
            );
            // The rooms, the empty state or the loading skeleton scroll in the next box, without the toast
            expect(listBox.textContent).not.toContain("Verify this device");
            expect(listBox.childElementCount).toBeGreaterThan(0);
        },
    );

    it("should call scrollToUnreadActivity when the unread activity toast is clicked", async () => {
        const user = userEvent.setup();
        renderWithMockContext(<UnreadActivityBelow />);

        await user.click(screen.getByRole("button", { name: "Unread messages" }));

        expect(UnreadActivityBelow.args.scrollToUnreadActivity).toHaveBeenCalled();
    });
});
