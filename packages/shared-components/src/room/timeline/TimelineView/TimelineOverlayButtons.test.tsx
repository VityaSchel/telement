/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import { render, screen } from "@test-utils";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";

import "../../../telement/tokens.css";
import { TimelineOverlayButtons } from "./TimelineOverlayButtons";
import type { TimelineViewActions, TimelineViewSnapshot } from "./types";

const baseSnapshot: TimelineViewSnapshot = {
    items: [],
    atLiveEnd: true,
    pendingAnchor: null,
    highlightedEventId: null,
    isAtBottom: true,
    canJumpToReadMarker: false,
    numUnreadMessages: 0,
    hasHighlights: false,
};

// vi.fn() carries a constructable signature that trips assignability to the
// action method types, so cast the record of spies to the interface.
function makeActions(): TimelineViewActions {
    return {
        onStartReached: vi.fn(),
        onEndReached: vi.fn(),
        onAnchorReached: vi.fn(),
        onVisibleRangeChanged: vi.fn(),
        onAtBottomStateChange: vi.fn(),
        onJumpToReadMarker: vi.fn(),
        onMarkAllAsRead: vi.fn(),
        onJumpToLive: vi.fn(),
    } as unknown as TimelineViewActions;
}

// The jump controls must be exposed to AT/keyboard (the overlay is not aria-hidden),
// so plain role queries (which exclude hidden elements) are expected to find them.
const button = (name: string): HTMLElement => screen.getByRole("button", { name });
const queryButton = (name: string): HTMLElement | null => screen.queryByRole("button", { name });

const JUMP_TO_BOTTOM = "Scroll to most recent messages";
const JUMP_READ_MARKER = "Scroll to first unread message.";
const MARK_ALL_READ = "Mark all as read";

describe("<TimelineOverlayButtons />", () => {
    it("renders no buttons at the live bottom with no read marker", () => {
        const actions = makeActions();
        render(<TimelineOverlayButtons snapshot={baseSnapshot} vm={actions} scrollNow={vi.fn()} />);

        expect(queryButton(JUMP_TO_BOTTOM)).toBeNull();
        expect(queryButton(JUMP_READ_MARKER)).toBeNull();
        expect(queryButton(MARK_ALL_READ)).toBeNull();
    });

    describe("jump-to-bottom button", () => {
        it("shows when not at the live end", () => {
            render(
                <TimelineOverlayButtons
                    snapshot={{ ...baseSnapshot, atLiveEnd: false }}
                    vm={makeActions()}
                    scrollNow={vi.fn()}
                />,
            );
            expect(button(JUMP_TO_BOTTOM)).toBeInTheDocument();
        });

        it("shows when at the live end but scrolled up off the bottom", () => {
            render(
                <TimelineOverlayButtons
                    snapshot={{ ...baseSnapshot, atLiveEnd: true, isAtBottom: false }}
                    vm={makeActions()}
                    scrollNow={vi.fn()}
                />,
            );
            expect(button(JUMP_TO_BOTTOM)).toBeInTheDocument();
        });

        it("calls onJumpToLive with the imperative scroll handle when clicked", async () => {
            const user = userEvent.setup();
            const actions = makeActions();
            const scrollNow = vi.fn();
            render(
                <TimelineOverlayButtons
                    snapshot={{ ...baseSnapshot, isAtBottom: false }}
                    vm={actions}
                    scrollNow={scrollNow}
                />,
            );

            await user.click(button(JUMP_TO_BOTTOM));

            expect(actions.onJumpToLive).toHaveBeenCalledWith(scrollNow);
        });

        it("renders the unread badge count", () => {
            render(
                <TimelineOverlayButtons
                    snapshot={{ ...baseSnapshot, isAtBottom: false, numUnreadMessages: 7 }}
                    vm={makeActions()}
                    scrollNow={vi.fn()}
                />,
            );
            expect(screen.getByText("7")).toBeInTheDocument();
        });

        it("omits the badge when there are no unread messages", () => {
            render(
                <TimelineOverlayButtons
                    snapshot={{ ...baseSnapshot, isAtBottom: false, numUnreadMessages: 0 }}
                    vm={makeActions()}
                    scrollNow={vi.fn()}
                />,
            );
            expect(screen.queryByText("0")).toBeNull();
        });

        it("applies the highlight style when there are highlight messages", () => {
            const { container } = render(
                <TimelineOverlayButtons
                    snapshot={{ ...baseSnapshot, isAtBottom: false, numUnreadMessages: 1, hasHighlights: true }}
                    vm={makeActions()}
                    scrollNow={vi.fn()}
                />,
            );
            expect(container.querySelector('[class*="highlight"]')).not.toBeNull();
        });
    });

    describe("unread bar", () => {
        it("shows scroll-up and mark-as-read when the marker is above the viewport", () => {
            render(
                <TimelineOverlayButtons
                    snapshot={{ ...baseSnapshot, canJumpToReadMarker: "above" }}
                    vm={makeActions()}
                    scrollNow={vi.fn()}
                />,
            );
            expect(button(JUMP_READ_MARKER)).toBeInTheDocument();
            expect(button(MARK_ALL_READ)).toBeInTheDocument();
        });

        it("shows the bar when the marker is below the viewport", () => {
            render(
                <TimelineOverlayButtons
                    snapshot={{ ...baseSnapshot, canJumpToReadMarker: "below" }}
                    vm={makeActions()}
                    scrollNow={vi.fn()}
                />,
            );
            expect(button(JUMP_READ_MARKER)).toBeInTheDocument();
            expect(button(MARK_ALL_READ)).toBeInTheDocument();
        });

        it("calls onJumpToReadMarker with the scroll handle and onMarkAllAsRead on click", async () => {
            const user = userEvent.setup();
            const actions = makeActions();
            const scrollNow = vi.fn();
            render(
                <TimelineOverlayButtons
                    snapshot={{ ...baseSnapshot, canJumpToReadMarker: "above" }}
                    vm={actions}
                    scrollNow={scrollNow}
                />,
            );

            await user.click(button(JUMP_READ_MARKER));
            expect(actions.onJumpToReadMarker).toHaveBeenCalledWith(scrollNow);

            await user.click(button(MARK_ALL_READ));
            expect(actions.onMarkAllAsRead).toHaveBeenCalledTimes(1);
        });
    });

    describe("layout", () => {
        const TIMELINE_SIZE = 400;

        /** Renders the overlay over a square the size of {@link TIMELINE_SIZE}, standing in for the timeline. */
        function renderOverTimeline(snapshot: Partial<TimelineViewSnapshot>): DOMRect {
            const { container } = render(
                <div style={{ position: "relative", width: TIMELINE_SIZE, height: TIMELINE_SIZE }}>
                    <TimelineOverlayButtons
                        snapshot={{ ...baseSnapshot, ...snapshot }}
                        vm={makeActions()}
                        scrollNow={vi.fn()}
                    />
                </div>,
            );
            return container.firstElementChild!.getBoundingClientRect();
        }

        /** The center of the unread dot, which the bar draws as its `::after`, relative to the bar. */
        function dotCenter(bar: HTMLElement): { x: number; y: number } {
            const dot = getComputedStyle(bar, "::after");
            const size = parseFloat(dot.width) + parseFloat(dot.borderLeftWidth) + parseFloat(dot.borderRightWidth);
            return { x: parseFloat(dot.left) + size / 2, y: parseFloat(dot.top) + size / 2 };
        }

        function expectRoundControl(element: HTMLElement): DOMRect {
            const box = element.getBoundingClientRect();
            expect(box.width).toBe(36);
            expect(box.height).toBe(36);
            const radius = getComputedStyle(element).borderTopLeftRadius;
            expect(radius === "50%" || parseFloat(radius) >= box.height / 2).toBe(true);
            return box;
        }

        it("centers the unread dot on the top edge of the scroll-up button", () => {
            renderOverTimeline({ canJumpToReadMarker: "above" });

            const scrollUp = button(JUMP_READ_MARKER);
            const box = expectRoundControl(scrollUp);
            expect(dotCenter(scrollUp.parentElement!)).toEqual({ x: box.width / 2, y: 0 });
        });

        it("centers the unread dot on the bottom edge of the scroll-down button", () => {
            renderOverTimeline({ canJumpToReadMarker: "below" });

            const scrollDown = button(JUMP_READ_MARKER);
            const box = expectRoundControl(scrollDown);
            expect(dotCenter(scrollDown.parentElement!)).toEqual({ x: box.width / 2, y: box.height });
        });

        it("keeps the jump-to-bottom button 24px from the corner with its badge centered under it", () => {
            const timeline = renderOverTimeline({ isAtBottom: false, numUnreadMessages: 7 });

            const box = expectRoundControl(button(JUMP_TO_BOTTOM));
            expect(timeline.right - box.right).toBe(24);
            expect(timeline.bottom - box.bottom).toBe(24);
            const badge = screen.getByText("7").getBoundingClientRect();
            expect(badge.left + badge.width / 2).toBeCloseTo(box.left + box.width / 2, 1);
            expect(badge.top).toBeLessThan(box.bottom);
        });
    });
});
