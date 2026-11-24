/*
Copyright 2024 New Vector Ltd.
Copyright 2024 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { act, render, screen } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { type ISearchResults, MatrixEvent, type SearchResult } from "matrix-js-sdk/src/matrix";

import RoomSearchAuxPanel from "./RoomSearchAuxPanel";
import { type SearchInfo, SearchScope } from "../../../Searching";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";

describe("RoomSearchAuxPanel", () => {
    const props = {
        isRoomEncrypted: false,
        onSearchChange: vi.fn(),
        onSearchScopeChange: vi.fn(),
        onCancelClick: vi.fn(),
    };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("should render the count of results", () => {
        render(
            <RoomSearchAuxPanel
                {...props}
                searchInfo={{
                    searchId: 1234,
                    count: 5,
                    term: "abcd",
                    scope: SearchScope.Room,
                    promise: new Promise(() => {}),
                }}
            />,
        );

        expect(screen.getByText("5 results found for", { exact: false })).toHaveTextContent(
            "5 results found for “abcd”",
        );
    });

    it("should allow the user to toggle to all rooms search", async () => {
        render(
            <RoomSearchAuxPanel
                {...props}
                searchInfo={{
                    searchId: 1234,
                    term: "abcd",
                    scope: SearchScope.Room,
                    promise: new Promise(() => {}),
                }}
            />,
        );

        screen.getByText("Search all rooms").click();
        expect(props.onSearchScopeChange).toHaveBeenCalledWith(SearchScope.All);
    });

    it("should allow the user to toggle back to room-specific search", async () => {
        render(
            <RoomSearchAuxPanel
                {...props}
                searchInfo={{
                    searchId: 1234,
                    term: "abcd",
                    scope: SearchScope.All,
                    promise: new Promise(() => {}),
                }}
            />,
        );

        screen.getByText("Search this room").click();
        expect(props.onSearchScopeChange).toHaveBeenCalledWith(SearchScope.Room);
    });

    it("should allow the user to cancel a search", async () => {
        render(<RoomSearchAuxPanel {...props} />);

        screen.getByRole("button", { name: "Cancel" }).click();
        expect(props.onCancelClick).toHaveBeenCalled();
    });

    describe("search field (Telement)", () => {
        const field = (): HTMLElement => screen.getByRole("searchbox", { name: "Search messages…" });
        const searchFor = (term: string): SearchInfo => ({
            searchId: 1,
            term,
            scope: SearchScope.Room,
            promise: new Promise(() => {}),
        });

        it("takes the focus as the bar opens, which shows nothing else of a search until there is one", () => {
            render(<RoomSearchAuxPanel {...props} />);

            expect(field()).toHaveFocus();
            expect(field()).toHaveValue("");
            expect(screen.queryByText("Search all rooms")).not.toBeInTheDocument();
            expect(screen.queryByText("results found", { exact: false })).not.toBeInTheDocument();
        });

        it("searches for what is typed", async () => {
            render(<RoomSearchAuxPanel {...props} />);
            await userEvent.type(field(), "pizza");

            expect(field()).toHaveValue("pizza");
            expect(props.onSearchChange).toHaveBeenLastCalledWith("pizza");
        });

        it("keeps what is typed while the search before it starts", async () => {
            const { rerender } = render(<RoomSearchAuxPanel {...props} />);
            await userEvent.type(field(), "pizza");
            rerender(<RoomSearchAuxPanel {...props} searchInfo={searchFor("pizza")} />);
            await userEvent.type(field(), "s");
            rerender(<RoomSearchAuxPanel {...props} searchInfo={{ ...searchFor("pizza"), count: 3 }} />);

            expect(field()).toHaveValue("pizzas");
        });

        it("shows a search started elsewhere", () => {
            const { rerender } = render(<RoomSearchAuxPanel {...props} />);
            rerender(<RoomSearchAuxPanel {...props} searchInfo={searchFor("lunch")} />);

            expect(field()).toHaveValue("lunch");
        });

        it("empties with its clear button, the bar staying open", async () => {
            render(<RoomSearchAuxPanel {...props} searchInfo={searchFor("lunch")} />);
            await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

            expect(field()).toHaveValue("");
            expect(props.onSearchChange).toHaveBeenLastCalledWith("");
            expect(props.onCancelClick).not.toHaveBeenCalled();
        });

        it("takes the focus again, its text selected, when the search is asked for", () => {
            render(<RoomSearchAuxPanel {...props} searchInfo={searchFor("lunch")} />);
            const input = field() as HTMLInputElement;
            act(() => input.blur());
            act(() => defaultDispatcher.dispatch({ action: Action.FocusMessageSearch }, true));

            expect(input).toHaveFocus();
            expect([input.selectionStart, input.selectionEnd]).toEqual([0, 5]);
        });

        it("closes the bar on Escape, which goes no further", async () => {
            const onKeyDown = vi.fn();
            render(
                <div onKeyDown={onKeyDown}>
                    <RoomSearchAuxPanel {...props} searchInfo={searchFor("lunch")} />
                </div>,
            );
            await userEvent.type(field(), "{Escape}");

            expect(props.onCancelClick).toHaveBeenCalledTimes(1);
            expect(onKeyDown).not.toHaveBeenCalled();
        });
    });

    it("shows the scope switch and Cancel as text buttons, so that no cross beside the field reads as clearing it", () => {
        render(
            <RoomSearchAuxPanel
                {...props}
                searchInfo={{ searchId: 1, term: "abcd", scope: SearchScope.Room, promise: new Promise(() => {}) }}
            />,
        );

        expect(screen.getByText("Search all rooms")).toHaveClass("mx_RoomSearchAuxPanel_scopeButton");
        const cancel = screen.getByRole("button", { name: "Cancel" });
        expect(cancel).toHaveTextContent("Cancel");
        expect(cancel.querySelector("svg")).toBeNull();
    });

    describe("stepping through the results (Telement)", () => {
        const result = (eventId: string): SearchResult =>
            ({ context: { getEvent: () => new MatrixEvent({ event_id: eventId }) } }) as unknown as SearchResult;
        const results = (count: number, nextBatch?: string): ISearchResults => ({
            results: Array.from({ length: count }, (_, i) => result(`$hit${i}`)),
            highlights: [],
            count,
            next_batch: nextBatch,
        });

        const renderBar = (searchInfo: Partial<SearchInfo>) => {
            const onStepResult = vi.fn();
            const onShowResults = vi.fn();
            render(
                <RoomSearchAuxPanel
                    searchInfo={{
                        searchId: 1,
                        term: "pizza",
                        scope: SearchScope.Room,
                        promise: new Promise(() => {}),
                        ...searchInfo,
                    }}
                    {...props}
                    onStepResult={onStepResult}
                    onShowResults={onShowResults}
                />,
            );
            return { onStepResult, onShowResults };
        };
        const older = (): HTMLElement => screen.getByRole("button", { name: "Older result" });
        const newer = (): HTMLElement => screen.getByRole("button", { name: "Newer result" });
        const isDisabled = (button: HTMLElement): boolean =>
            button.hasAttribute("disabled") || button.getAttribute("aria-disabled") === "true";

        it("opens the newest result from the list with the up arrow", () => {
            const { onStepResult } = renderBar({ results: results(3), count: 3 });

            expect(screen.queryByText("1 of 3")).toBeNull();
            expect(isDisabled(newer())).toBe(true);
            newer().click();
            older().click();

            expect(onStepResult.mock.calls).toEqual([["older"]]);
        });

        it("shows the place of the result the timeline shows, and steps both ways from it", () => {
            const { onStepResult } = renderBar({ results: results(3), count: 3, hit: 1 });

            expect(screen.getByText("2 of 3")).toBeInTheDocument();
            older().click();
            newer().click();

            expect(onStepResult.mock.calls).toEqual([["older"], ["newer"]]);
        });

        it("stops at the newest result, and at the oldest unless more can be loaded", () => {
            renderBar({ results: results(2), count: 2, hit: 0 });
            expect(isDisabled(newer())).toBe(true);
            expect(isDisabled(older())).toBe(false);
        });

        it.each([
            [undefined, true],
            ["next", false],
        ])("with more to load (%s), the oldest result's up arrow is disabled: %s", (nextBatch, disabled) => {
            renderBar({ results: results(2, nextBatch), count: 5, hit: 1 });

            expect(older().hasAttribute("disabled") || older().getAttribute("aria-disabled") === "true").toBe(disabled);
            expect(screen.getByText("2 of 5")).toBeInTheDocument();
        });

        it("offers the list again in place of searching all rooms while a result shows", () => {
            const { onShowResults } = renderBar({ results: results(2), count: 2, hit: 0 });

            expect(screen.queryByText("Search all rooms")).toBeNull();
            screen.getByText("Show results").click();

            expect(onShowResults).toHaveBeenCalled();
        });

        it("has no steps for a search of all rooms, whose results the room's timeline can't show", () => {
            renderBar({ results: results(2), count: 2, scope: SearchScope.All });

            expect(screen.queryByRole("button", { name: "Older result" })).toBeNull();
        });
    });
});
