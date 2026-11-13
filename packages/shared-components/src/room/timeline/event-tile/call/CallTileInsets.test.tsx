/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../../../telement/tokens.css";
import React from "react";
import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@test-utils";
import { describe, it, expect } from "vitest";

import * as dmOngoingStories from "./ongoing/dm/DmOngoingCallTileView.stories";
import * as roomOngoingStories from "./ongoing/room/RoomOngoingCallTileView.stories";
import * as dmTombstoneStories from "./tombstone/dm/DmTombstoneCallTileView.stories";
import tileContainerStyles from "./ongoing/components/TileContainer/TileContainer.module.css";
import callIconStyles from "./ongoing/components/CallIcon/CallIcon.module.css";
import tombstoneStyles from "./tombstone/common.module.css";

const { IncomingVoiceCall } = composeStories(dmOngoingStories);
const { RoomCallJoined } = composeStories(roomOngoingStories);
const { VoiceEnded } = composeStories(dmTombstoneStories);

/** Where `inner` sits inside `outer`: its distance from each of `outer`'s edges. */
function insets(outer: Element, inner: Element): { top: number; end: number; bottom: number; start: number } {
    const o = outer.getBoundingClientRect();
    const i = inner.getBoundingClientRect();
    return { top: i.top - o.top, end: o.right - i.right, bottom: o.bottom - i.bottom, start: i.left - o.left };
}

function inTimeline(tile: React.ReactNode, cardRadius?: string): React.JSX.Element {
    return <div style={{ width: 600, ["--MBody-border-radius" as string]: cardRadius }}>{tile}</div>;
}

describe("Call tile insets", () => {
    it("puts an ongoing call's icon and join button 12px from every edge of a 60px card", () => {
        const { container } = render(inTimeline(<IncomingVoiceCall />));
        const card = container.querySelector(`.${tileContainerStyles.container}`)!;
        const icon = container.querySelector(`.${callIconStyles.container}`)!;

        expect(card.getBoundingClientRect().height).toBe(60);
        expect(insets(card, icon)).toEqual({ top: 12, end: expect.any(Number), bottom: 12, start: 12 });
        expect(insets(card, screen.getByRole("button", { name: "Join" }))).toMatchObject({
            top: 12,
            end: 12,
            bottom: 12,
        });
        expect(getComputedStyle(card).marginBlock).toBe("8px");
    });

    it("keeps a room call's icon 12px from the start, centered on its two lines", () => {
        const { container } = render(inTimeline(<RoomCallJoined />));
        const card = container.querySelector(`.${tileContainerStyles.container}`)!;
        const icon = insets(card, container.querySelector(`.${callIconStyles.container}`)!);

        expect(icon.start).toBe(12);
        expect(icon.top).toBe(icon.bottom);
    });

    it("rounds the call icon concentrically with the card, 12px inside it", () => {
        const { container } = render(inTimeline(<IncomingVoiceCall />, "12px"));

        expect(getComputedStyle(container.querySelector(`.${callIconStyles.container}`)!).borderRadius).toBe("4px");
    });

    it("puts an ended call's icon 12px from the top, the bottom and the start of a 44px row", () => {
        const { container } = render(inTimeline(<VoiceEnded />));
        const card = container.querySelector(`.${tombstoneStyles.container}`)!;

        expect(card.getBoundingClientRect().height).toBe(44);
        expect(insets(card, card.querySelector("svg")!)).toMatchObject({ top: 12, bottom: 12, start: 12 });
        expect(getComputedStyle(card).marginBlock).toBe("8px");
    });

    it.each([
        ["the timeline's card radius", "12px", "12px"],
        ["8px outside the timeline", undefined, "8px"],
    ])("rounds both call cards by %s", (_name, cardRadius, expected) => {
        const { container } = render(
            inTimeline(
                <>
                    <IncomingVoiceCall />
                    <VoiceEnded />
                </>,
                cardRadius,
            ),
        );

        expect(getComputedStyle(container.querySelector(`.${tileContainerStyles.container}`)!).borderRadius).toBe(
            expected,
        );
        expect(getComputedStyle(container.querySelector(`.${tombstoneStyles.container}`)!).borderRadius).toBe(expected);
    });
});
