/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import "@fontsource/inter/600.css";
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../telement/tokens.css";
import React, { type JSX } from "react";
import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import * as stories from "./NotificationBadgeView.stories";
import { NotificationDecoration } from "../../room-list/VirtualizedRoomListView/RoomListItemWrapper/RoomListItemView/NotificationDecoration";

const { Notification, Dot, Knocked } = composeStories(stories);

/** The room list's unread counter, which the badge should look like, after the @ of a mention. */
function RoomListCounter({
    count,
    muted = false,
    mention = false,
}: {
    count: number;
    muted?: boolean;
    mention?: boolean;
}): JSX.Element {
    return (
        <div data-testid="room-list">
            <NotificationDecoration
                hasAnyNotificationOrActivity={true}
                isUnsentMessage={false}
                invited={false}
                isMention={mention}
                isActivityNotification={false}
                isNotification={true}
                hasUnreadCount={true}
                count={count}
                muted={muted}
            />
        </div>
    );
}

function roomListCounter(): HTMLElement {
    return [...screen.getByTestId("room-list").querySelectorAll<HTMLElement>("[data-badge]")].at(-1)!;
}

function badge(): HTMLElement {
    return screen.getByTestId("notification-badge");
}

function rect(element: Element): DOMRect {
    return element.getBoundingClientRect();
}

/** The baseline of the digits: the bottom of an empty inline block put on their line. */
function baselineOf(element: Element): number {
    const probe = document.createElement("span");
    probe.style.display = "inline-block";
    element.append(probe);
    const baseline = rect(probe).bottom;
    probe.remove();
    return baseline;
}

/** The cap height of an element's font. */
function capHeightOf(element: Element): number {
    const probe = document.createElement("span");
    probe.style.cssText = "position: absolute; display: block; block-size: 1cap;";
    element.append(probe);
    const height = rect(probe).height;
    probe.remove();
    return height;
}

describe("NotificationBadgeView layout", () => {
    beforeAll(async () => {
        await document.fonts.load("600 11px Inter");
    });

    afterEach(() => {
        document.documentElement.style.fontSize = "";
    });

    it.each([
        [16, 20, 6],
        [24, 30, 9],
    ])(
        "counts unread messages in the room list's accent circle at a %ipx base font size, %ipx wide, the digits %ipx from its top and bottom",
        (size, diameter, inset) => {
            document.documentElement.style.fontSize = `${size}px`;
            render(
                <>
                    <Notification isNotification={true} symbol="3" />
                    <RoomListCounter count={3} />
                </>,
            );
            const box = rect(badge());
            const count = badge().firstElementChild!;
            const baseline = baselineOf(count);

            expect(box.height).toBeCloseTo(diameter, 1);
            expect(box.width).toBeCloseTo(box.height, 5);
            expect(box.height).toBeCloseTo(rect(roomListCounter()).height, 5);
            expect(box.bottom - baseline).toBeCloseTo(inset, 1);
            expect(baseline - capHeightOf(count) - box.top).toBeCloseTo(inset, 1);

            const style = getComputedStyle(badge());
            const roomList = getComputedStyle(roomListCounter());
            expect(style.backgroundColor).toBe("rgb(36, 129, 204)");
            expect(style.backgroundColor).toBe(roomList.backgroundColor);
            expect(style.color).toBe(roomList.color);
            expect(getComputedStyle(count).font).toBe(roomList.font);
            expect(getComputedStyle(count).fontWeight).toBe("600");
        },
    );

    it("makes a longer count a pill padded evenly on every side", () => {
        render(<Notification isNotification={true} badgeType="badge_3char" symbol="128" />);
        const style = getComputedStyle(badge());

        expect(new Set([style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]).size).toBe(1);
        expect(rect(badge()).height).toBeCloseTo(20, 1);
        expect(rect(badge()).width).toBeGreaterThan(rect(badge()).height);
        expect(style.borderRadius).toBe("9999px");
    });

    it("takes the size a place with less room sets, with the digits still a whole number of pixels from every side", () => {
        render(
            <div style={{ "--notification-badge-size": "16px" } as React.CSSProperties}>
                <Notification isHighlight={true} symbol="!" />
            </div>,
        );
        const box = rect(badge());
        const count = badge().firstElementChild!;

        expect(box.height).toBe(16);
        expect(box.width).toBe(16);
        expect(box.bottom - baselineOf(count)).toBe(4);
    });

    it("keeps a counter that isn't for notifications gray, like a muted room's, with the page's color on it", () => {
        render(
            <div className="cpd-theme-dark">
                <Notification />
                <RoomListCounter count={3} muted={true} />
            </div>,
        );

        expect(getComputedStyle(badge()).backgroundColor).toBe(getComputedStyle(roomListCounter()).backgroundColor);
        expect(getComputedStyle(badge()).color).toBe(getComputedStyle(roomListCounter()).color);
        expect(getComputedStyle(roomListCounter()).color).toBe("rgb(16, 19, 23)");
    });

    it("puts white digits on the dark theme's deeper accent fill, as the room list's counter and @ do", () => {
        render(
            <div className="cpd-theme-dark">
                <Notification isNotification={true} symbol="3" />
                <RoomListCounter count={3} mention={true} />
            </div>,
        );
        const style = getComputedStyle(badge());
        const mention = screen.getByTestId("room-list").querySelector<HTMLElement>("[data-badge]")!;

        // Telegram for macOS's night accent is #2ea6ff; white on it would be 2.6:1, on #0183d3 4.1:1
        expect(style.backgroundColor).toBe("rgb(1, 131, 211)");
        expect(style.color).toBe("rgb(255, 255, 255)");
        for (const roomList of [roomListCounter(), mention]) {
            expect(getComputedStyle(roomList).backgroundColor).toBe(style.backgroundColor);
            expect(getComputedStyle(roomList).color).toBe(style.color);
        }
        expect(getComputedStyle(mention.querySelector("svg")!).fill).toBe("rgb(255, 255, 255)");
    });

    it("keeps the dot in the dark theme's accent itself, as nothing is drawn on it", () => {
        render(
            <div className="cpd-theme-dark">
                <Dot />
            </div>,
        );

        expect(getComputedStyle(badge()).backgroundColor).toBe("rgb(46, 166, 255)");
    });

    it("marks unread messages with an 8px accent dot", () => {
        render(<Dot />);

        expect(rect(badge()).width).toBe(8);
        expect(rect(badge()).height).toBe(8);
        expect(getComputedStyle(badge()).backgroundColor).toBe("rgb(36, 129, 204)");
    });

    it("draws the knock icon 2px inside a 20px circle", () => {
        render(<Knocked />);
        const box = rect(badge());
        const icon = rect(screen.getByLabelText("Request to join sent"));

        expect(box.height).toBeCloseTo(20, 1);
        expect(box.width).toBeCloseTo(box.height, 5);
        expect([icon.top - box.top, icon.left - box.left, box.bottom - icon.bottom, box.right - icon.right]).toEqual([
            2, 2, 2, 2,
        ]);
    });
});
