/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../../../telement/tokens.css";
import React from "react";
import { render, screen } from "@test-utils";
import { composeStories } from "@storybook/react-vite";
import { describe, it, expect } from "vitest";

import * as stories from "./NotificationDecoration.stories";

const {
    NoNotification,
    UnsentMessage,
    VideoCall,
    VoiceCall,
    Invited,
    Mention,
    MentionWithCount,
    NotificationWithCount,
    ActivityIndicator,
    Muted,
} = composeStories(stories);

describe("<NotificationDecoration />", () => {
    describe("snapshots", () => {
        it("renders NoNotification story", () => {
            const { container } = render(<NoNotification />);
            expect(container).toMatchSnapshot();
        });

        it("renders UnsentMessage story", () => {
            const { container } = render(<UnsentMessage />);
            expect(container).toMatchSnapshot();
        });

        it("renders VideoCall story", () => {
            const { container } = render(<VideoCall />);
            expect(container).toMatchSnapshot();
        });

        it("renders VoiceCall story", () => {
            const { container } = render(<VoiceCall />);
            expect(container).toMatchSnapshot();
        });

        it("renders Invited story", () => {
            const { container } = render(<Invited />);
            expect(container).toMatchSnapshot();
        });

        it("renders Mention story", () => {
            const { container } = render(<Mention />);
            expect(container).toMatchSnapshot();
        });

        it("renders MentionWithCount story", () => {
            const { container } = render(<MentionWithCount />);
            expect(container).toMatchSnapshot();
        });

        it("renders NotificationWithCount story", () => {
            const { container } = render(<NotificationWithCount />);
            expect(container).toMatchSnapshot();
        });

        it("renders ActivityIndicator story", () => {
            const { container } = render(<ActivityIndicator />);
            expect(container).toMatchSnapshot();
        });

        it("renders Muted story", () => {
            const { container } = render(<Muted />);
            expect(container).toMatchSnapshot();
        });
    });

    /** The colour a token resolves to in the current theme. */
    function colourOf(token: string): string {
        const probe = document.createElement("div");
        probe.style.color = `var(${token})`;
        document.body.append(probe);
        const colour = getComputedStyle(probe).color;
        probe.remove();
        return colour;
    }

    it("should show the unread counter of a muted room in grey, like Telegram", () => {
        render(<Muted />);
        const counter = screen.getByText("3");
        expect(getComputedStyle(counter).backgroundColor).toBe(colourOf("--cpd-color-icon-secondary"));
    });

    it("should show the unread counter of a room that isn't muted in the accent colour", () => {
        render(<NotificationWithCount />);
        const counter = screen.getByText("3");
        expect(getComputedStyle(counter).backgroundColor).toBe(colourOf("--cpd-color-icon-accent-primary"));
    });

    it("should keep the @ in the accent color and the counter gray in a muted room", () => {
        render(<Muted isMention={true} isNotification={false} />);
        const counter = screen.getByText("3");
        const mention = counter.previousElementSibling!;
        expect(getComputedStyle(mention).backgroundColor).toBe(colourOf("--cpd-color-icon-accent-primary"));
        expect(getComputedStyle(counter).backgroundColor).toBe(colourOf("--cpd-color-icon-secondary"));
    });

    it("should show the @ as a badge of the counter's size and shape, like Telegram", () => {
        render(<MentionWithCount />);
        const counter = screen.getByText("5");
        const mention = counter.previousElementSibling as HTMLElement;
        const icon = mention.querySelector("svg")!;

        // About 20px and 14px: the counter is its digits' cap height padded by 6px
        expect(mention.getBoundingClientRect().height).toBeCloseTo(counter.getBoundingClientRect().height, 5);
        expect(mention.getBoundingClientRect().width).toBeCloseTo(20, 0);
        expect(getComputedStyle(mention).borderRadius).toBe("9999px");
        expect(icon.getBoundingClientRect().width).toBeCloseTo(14, 0);
        expect(getComputedStyle(icon).fill).toBe(colourOf("--cpd-color-icon-on-solid-primary"));
        expect(icon.getBoundingClientRect().left - mention.getBoundingClientRect().left).toBe(3);
        expect(icon.getBoundingClientRect().top - mention.getBoundingClientRect().top).toBe(3);
    });

    it("should show only the @ badge for a mention without a count, not an empty counter after it", () => {
        render(<Mention />);
        const decoration = screen.getByTestId("notification-decoration");

        expect(decoration.childElementCount).toBe(1);
        expect(decoration.firstElementChild!.querySelector("svg")).not.toBeNull();
    });

    it("should show nothing for a muted room without unread messages, as its bell is next to the room name", () => {
        render(<Muted hasAnyNotificationOrActivity={false} isNotification={false} count={0} />);
        expect(screen.queryByTestId("notification-decoration")).toBeNull();
    });

    it("should show a bell after the grey activity dot of a muted room, as in a muted thread's row", () => {
        render(<Muted isNotification={false} isActivityNotification={true} hasUnreadCount={false} count={0} />);
        const bell = screen.getByTestId("muted-activity-icon");
        expect(bell).toBeVisible();
        expect(bell).toHaveAttribute("fill", "var(--cpd-color-icon-tertiary)");
        expect(screen.getByTestId("notification-decoration").lastElementChild).toBe(bell);
        expect(screen.getByTestId("notification-decoration").childElementCount).toBe(2);
    });

    it.each([
        ["the counter of a muted room", <Muted key="muted" />],
        ["the activity dot of a room that isn't muted", <ActivityIndicator key="activity" />],
    ])("should not show a bell with %s", (_, story) => {
        render(story);
        expect(screen.queryByTestId("muted-activity-icon")).toBeNull();
    });
});
