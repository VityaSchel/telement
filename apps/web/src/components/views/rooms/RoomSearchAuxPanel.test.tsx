/*
Copyright 2024 New Vector Ltd.
Copyright 2024 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "test-utils-rtl";

import { type ISearchResults, MatrixEvent, type SearchResult } from "matrix-js-sdk/src/matrix";

import RoomSearchAuxPanel from "./RoomSearchAuxPanel";
import { type SearchInfo, SearchScope } from "../../../Searching";

describe("RoomSearchAuxPanel", () => {
    it("should render the count of results", () => {
        render(
            <RoomSearchAuxPanel
                searchInfo={{
                    searchId: 1234,
                    count: 5,
                    term: "abcd",
                    scope: SearchScope.Room,
                    promise: new Promise(() => {}),
                }}
                isRoomEncrypted={false}
                onSearchScopeChange={vi.fn()}
                onCancelClick={vi.fn()}
            />,
        );

        expect(screen.getByText("5 results found for", { exact: false })).toHaveTextContent(
            "5 results found for “abcd”",
        );
    });

    it("should allow the user to toggle to all rooms search", async () => {
        const onSearchScopeChange = vi.fn();

        render(
            <RoomSearchAuxPanel
                isRoomEncrypted={false}
                onSearchScopeChange={onSearchScopeChange}
                onCancelClick={vi.fn()}
            />,
        );

        screen.getByText("Search all rooms").click();
        expect(onSearchScopeChange).toHaveBeenCalledWith(SearchScope.All);
    });

    it("should allow the user to toggle back to room-specific search", async () => {
        const onSearchScopeChange = vi.fn();

        render(
            <RoomSearchAuxPanel
                searchInfo={{
                    searchId: 1234,
                    term: "abcd",
                    scope: SearchScope.All,
                    promise: new Promise(() => {}),
                }}
                isRoomEncrypted={false}
                onSearchScopeChange={onSearchScopeChange}
                onCancelClick={vi.fn()}
            />,
        );

        screen.getByText("Search this room").click();
        expect(onSearchScopeChange).toHaveBeenCalledWith(SearchScope.Room);
    });

    it("should allow the user to cancel a search", async () => {
        const onCancelClick = vi.fn();

        render(
            <RoomSearchAuxPanel isRoomEncrypted={false} onSearchScopeChange={vi.fn()} onCancelClick={onCancelClick} />,
        );

        screen.getByRole("button", { name: "Cancel" }).click();
        expect(onCancelClick).toHaveBeenCalled();
    });

    it("shows the scope switch as a text button and closes with a plain 36px icon button, not a red one", () => {
        render(<RoomSearchAuxPanel isRoomEncrypted={false} onSearchScopeChange={vi.fn()} onCancelClick={vi.fn()} />);

        expect(screen.getByText("Search all rooms")).toHaveClass("mx_RoomSearchAuxPanel_scopeButton");
        const cancel = screen.getByRole("button", { name: "Cancel" });
        // Compound's destructive icon button would draw the cross in red, kept for actions that destroy something
        expect(cancel.className).not.toMatch(/destructive/);
        expect(cancel.style.getPropertyValue("--cpd-icon-button-size")).toBe("var(--tl-control-size)");
        expect(cancel.style.padding).toBe("var(--cpd-space-1-5x)");
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
                    isRoomEncrypted={false}
                    onSearchScopeChange={vi.fn()}
                    onCancelClick={vi.fn()}
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
