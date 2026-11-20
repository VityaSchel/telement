/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "../../../../telement/tokens.css";

import { fireEvent, render, screen } from "@test-utils";
import type { EventLayout } from "../../EventPresentation";
import {
    EventTileView,
    type EventTileViewClassNames,
    type EventTileViewLine,
    type EventTileViewProps,
    type EventTileViewRootState,
} from "./index";
import styles from "./EventTileView.module.css";
import { MockViewModel } from "../../../../core/viewmodel";
import { ReactionsRowView, type ReactionsRowViewSnapshot } from "../reactions/ReactionsRow";
import reactionStyles from "../reactions/ReactionsRow/ReactionsRow.module.css";
import { ImageBodyView, ImageBodyViewState, type ImageBodyViewSnapshot } from "../body/MImageBodyView";
import imageBodyStyles from "../body/MImageBodyView/ImageBodyView.module.css";
import { VideoBodyView, VideoBodyViewState, type VideoBodyViewSnapshot } from "../body/MVideoBodyView";
import videoBodyStyles from "../body/MVideoBodyView/VideoBodyView.module.css";

const renderState: EventTileViewProps["root"] = {
    id: "event-line-1",
    ariaLive: "off",
    scrollToken: "event-1",
    permalink: "https://example.org/event-1",
    eventId: "$event-1",
    shape: "Room",
    state: {
        isOwnEvent: true,
        hasReply: true,
    },
};

function createProps(overrides: Partial<EventTileViewProps> = {}): EventTileViewProps {
    return {
        root: renderState,
        classNames: {
            root: "custom-root",
            line: "custom-line",
            slotContextMenu: "custom-context-menu",
        },
        slots: {
            body: <span data-testid="body">Body</span>,
            contextMenu: <span data-testid="context-menu">Context menu</span>,
        },
        ...overrides,
    };
}

/**
 * Styling hooks consumed by the web application's EventTile PCSS.
 *
 * Keep these names in this test until the application styling is migrated to
 * shared-component selectors. The shared shell must preserve them alongside
 * its own module classes.
 */
const applicationStylingClasses = {
    root: "mx_EventTile",
    line: "mx_EventTile_line",
    slotTimestamp: "mx_MessageTimestamp",
} satisfies Partial<EventTileViewClassNames>;

const applicationSlotClassNames: Record<string, keyof typeof applicationStylingClasses> = {
    timestamp: "slotTimestamp",
};

const slotClasses: Record<string, string> = {
    avatar: styles.slotAvatar,
    sender: styles.slotSender,
    body: styles.slotBody,
    contextMenu: styles.slotContextMenu,
    replyChain: styles.slotReplyChain,
    actionBar: styles.slotActionBar,
    timestamp: styles.slotTimestamp,
    padlock: styles.slotPadlock,
    footer: styles.slotFooter,
    threadInfo: styles.slotThreadInfo,
    receipt: styles.slotReceipt,
    roomAvatar: styles.slotAvatar,
    notificationRoomLabel: styles.slotNotificationRoomLabel,
    notificationBadge: styles.slotNotificationBadge,
};

function createStylingContractSlots(): EventTileViewProps["slots"] {
    const slot = (name: string): React.ReactElement => <span data-testid={`styling-contract-${name}`}>{name}</span>;

    return {
        avatar: slot("avatar"),
        sender: slot("sender"),
        body: slot("body"),
        timestamp: slot("timestamp"),
        padlock: slot("padlock"),
        replyChain: slot("replyChain"),
        actionBar: slot("actionBar"),
        footer: slot("footer"),
        threadInfo: slot("threadInfo"),
        receipt: slot("receipt"),
        roomAvatar: slot("room-avatar"),
        notificationRoomLabel: slot("notificationRoomLabel"),
        notificationBadge: slot("notificationBadge"),
        contextMenu: slot("contextMenu"),
    };
}

const rootStateMatrix = [
    { name: "informational", state: { info: true }, hook: "stateInfo" },
    { name: "bubble container", state: { bubbleContainer: true }, hook: "stateBubbleContainer" },
    { name: "left-aligned bubble", state: { leftAlignedBubble: true }, hook: "stateLeftAlignedBubble" },
    { name: "aligned between bubbles", state: { alignedBetweenBubbles: true }, hook: "stateAlignedBetweenBubbles" },
    { name: "no bubble", state: { noBubble: true }, hook: "stateNoBubble" },
    { name: "no sender", state: { noSender: true }, hook: "stateNoSender" },
    { name: "encryption failure", state: { encryptionFailure: true }, hook: "stateEncryptionFailure" },
    { name: "emote", state: { emote: true }, hook: "stateEmote" },
    { name: "reply chain", state: { hasReply: true }, hook: "stateHasReply" },
    { name: "editing", state: { editing: true }, hook: "stateEditing" },
    { name: "continuation", state: { continuation: true }, hook: "stateContinuation" },
    { name: "contextual", state: { contextual: true }, hook: "stateContextual" },
    { name: "action bar focused", state: { actionBarFocused: true }, hook: "stateActionBarFocused" },
    { name: "preview clamped", state: { previewClamped: true }, hook: "statePreviewClamped" },
    { name: "twelve-hour timestamp", state: { twelveHourTimestamp: true }, hook: "stateTwelveHourTimestamp" },
] satisfies ReadonlyArray<{
    name: string;
    state: Partial<EventTileViewRootState>;
    hook: keyof typeof styles;
}>;

const lineStateMatrix = [
    { name: "media", state: { media: true }, hook: "lineMedia" },
    { name: "emote", state: { emote: true }, hook: "lineEmote" },
    { name: "timestamp over media", state: { timestampOverMedia: true }, hook: "lineTimestampOverMedia" },
] satisfies ReadonlyArray<{
    name: string;
    state: EventTileViewLine;
    hook: keyof typeof styles;
}>;

const groupLineSlotOrder = [
    "styling-contract-contextMenu",
    "event-tile-slot-timestamp",
    "event-tile-slot-padlock",
    "event-tile-slot-replyChain",
    "event-tile-slot-body",
    "event-tile-slot-actionBar",
];

const groupRootSlotOrder = [
    "event-tile-slot-sender",
    "event-tile-slot-avatar",
    "event-tile-line",
    "event-tile-slot-footer",
    "event-tile-slot-threadInfo",
    "event-tile-slot-receipt",
];

/** In bubbles a message's reactions are at the bottom of its bubble, so they end the line. */
const bubbleLineSlotOrder = [...groupLineSlotOrder, "event-tile-slot-footer"];

/** In bubbles an informational row's time follows its text, at the end of its last line. */
const bubbleInfoLineSlotOrder = [
    "styling-contract-contextMenu",
    "event-tile-slot-padlock",
    "event-tile-slot-replyChain",
    "event-tile-slot-body",
    "event-tile-slot-timestamp",
    "event-tile-slot-actionBar",
];

/** In bubbles a message's avatar sits beside the bottom of its bubble, so it follows the line. */
const bubbleMessageRootSlotOrder = [
    "event-tile-slot-sender",
    "event-tile-line",
    "event-tile-slot-avatar",
    "event-tile-slot-threadInfo",
    "event-tile-slot-receipt",
];

/** A message drawn without a bubble keeps its reactions under it. */
const noBubbleMessageRootSlotOrder = [
    "event-tile-slot-sender",
    "event-tile-line",
    "event-tile-slot-avatar",
    "event-tile-slot-footer",
    "event-tile-slot-threadInfo",
    "event-tile-slot-receipt",
];

const ircLineSlotOrder = [
    "styling-contract-contextMenu",
    "event-tile-slot-replyChain",
    "event-tile-slot-body",
    "event-tile-slot-actionBar",
    "event-tile-slot-footer",
    "event-tile-slot-threadInfo",
];

const ircRootSlotOrder = [
    "event-tile-slot-timestamp",
    "event-tile-slot-padlock",
    "event-tile-slot-avatar",
    "event-tile-slot-sender",
    "event-tile-line",
    "event-tile-slot-receipt",
];

const shellPlacementMatrix = [
    { name: "informational", rootState: { info: true }, lineState: {}, layout: "group" },
    { name: "informational in bubble layout", rootState: { info: true }, lineState: {}, layout: "bubble" },
    { name: "bubble container in group layout", rootState: { bubbleContainer: true }, lineState: {}, layout: "group" },
    {
        name: "bubble container in bubble layout",
        rootState: { bubbleContainer: true },
        lineState: {},
        layout: "bubble",
    },
    { name: "bubble container in IRC layout", rootState: { bubbleContainer: true }, lineState: {}, layout: "irc" },
    { name: "left-aligned bubble", rootState: { leftAlignedBubble: true }, lineState: {}, layout: "bubble" },
    { name: "aligned between bubbles", rootState: { alignedBetweenBubbles: true }, lineState: {}, layout: "bubble" },
    { name: "no bubble", rootState: { noBubble: true }, lineState: {}, layout: "bubble" },
    { name: "no sender", rootState: { noSender: true }, lineState: {}, layout: "bubble" },
    {
        name: "encryption failure with reply",
        rootState: { encryptionFailure: true, hasReply: true },
        lineState: {},
        layout: "bubble",
    },
    { name: "editing continuation", rootState: { editing: true, continuation: true }, lineState: {}, layout: "bubble" },
    { name: "media line", rootState: {}, lineState: { media: true }, layout: "group" },
    { name: "emote line", rootState: {}, lineState: { emote: true }, layout: "bubble" },
    { name: "other-event bubble alignment", rootState: {}, lineState: {}, layout: "bubble", isOwnEvent: false },
] satisfies ReadonlyArray<{
    name: string;
    rootState: Partial<EventTileViewRootState>;
    lineState: EventTileViewLine;
    layout: EventLayout;
    isOwnEvent?: boolean;
}>;

describe("EventTileView", () => {
    it("renders the common root and line structure", () => {
        const { container, getByTestId } = render(<EventTileView {...createProps()} />);
        const root = container.firstElementChild;
        const line = getByTestId("body").closest(".custom-line");
        const contextMenu = getByTestId("context-menu");

        expect(root).toHaveClass("custom-root");
        expect(root).toHaveAttribute("aria-live", "off");
        expect(root).toHaveAttribute("aria-atomic", "true");
        expect(root).toHaveAttribute("data-scroll-tokens", "event-1");
        expect(root).toHaveAttribute("data-event-id", "$event-1");
        expect(root).toHaveClass(styles.layoutGroup);
        expect(root).toHaveClass(styles.stateOwnEvent);
        expect(line).toHaveClass("custom-line");
        expect(line).toHaveAttribute("id", "event-line-1");
        expect(getByTestId("context-menu")).toBeInTheDocument();
        expect(contextMenu.parentElement).toBe(line);
        expect(contextMenu).not.toHaveAttribute("data-testid", "event-tile-slot-contextMenu");
    });

    it("renders the card shape with the room slot structure", () => {
        const { container, getByTestId } = render(
            <EventTileView
                {...createProps({
                    root: { ...renderState, shape: "Card" },
                    slots: createStylingContractSlots(),
                })}
            />,
        );

        expect(container.firstElementChild).toHaveClass(styles.shapeCard);
        expect(getByTestId("styling-contract-body").closest(`#${renderState.id}`)).toBeInTheDocument();
    });

    it("exposes the Search shape styling hook", () => {
        const { container } = render(
            <EventTileView
                {...createProps({
                    root: { ...renderState, shape: "Search" },
                    slots: createStylingContractSlots(),
                })}
            />,
        );

        expect(container.firstElementChild).toHaveClass(styles.shapeSearch);
    });

    it("exposes shell state through application-neutral state classes", () => {
        const { container } = render(
            <EventTileView
                {...createProps({
                    root: {
                        ...renderState,
                        state: {
                            ...renderState.state,
                            highlighted: true,
                            selected: true,
                            editing: true,
                            continuation: true,
                            lastInSection: true,
                        },
                    },
                })}
            />,
        );
        const root = container.firstElementChild!;

        expect(root).toHaveClass(styles.stateHighlighted);
        expect(root).toHaveClass(styles.stateSelected);
        expect(root).toHaveClass(styles.stateEditing);
        expect(root).toHaveClass(styles.stateContinuation);
        expect(root).toHaveClass(styles.stateLastInSection);
    });

    it.each(rootStateMatrix)("maps the $name root state to its semantic shell hook", ({ state, hook }) => {
        const { container } = render(
            <EventTileView
                {...createProps({
                    root: {
                        ...renderState,
                        state: { ...renderState.state, ...state },
                    },
                })}
            />,
        );

        expect(container.firstElementChild).toHaveClass(styles[hook]);
    });

    it("maps presentation density to a shell hook instead of event state", () => {
        const { container } = render(<EventTileView {...createProps()} />, {
            presentation: { layout: "group", density: "compact" },
        });

        expect(container.firstElementChild).toHaveClass(styles.densityCompact);
        expect(container.firstElementChild).not.toHaveClass("stateCompact");
    });

    it.each(lineStateMatrix)("maps the $name line state to its semantic shell hook", ({ state, hook }) => {
        const { getByTestId } = render(
            <EventTileView {...createProps({ line: state, slots: createStylingContractSlots() })} />,
        );

        expect(getByTestId("styling-contract-body").closest(`.${styles.line}`)).toHaveClass(styles[hook]);
    });

    it.each(shellPlacementMatrix)(
        "keeps $name slots contained and ordered by the shell",
        ({ rootState, lineState, layout, isOwnEvent = renderState.state.isOwnEvent }) => {
            const { container } = render(
                <EventTileView
                    {...createProps({
                        root: {
                            ...renderState,
                            state: { ...renderState.state, ...rootState, isOwnEvent },
                        },
                        line: lineState,
                        slots: createStylingContractSlots(),
                    })}
                />,
                { presentation: { layout } },
            );
            const root = container.firstElementChild;
            const line = root?.querySelector(`#${renderState.id}`);

            if (!root || !line) {
                throw new Error("Expected EventTile root and line to be present");
            }

            const isBubbleMessage =
                layout === "bubble" &&
                !["info", "bubbleContainer", "leftAlignedBubble"].some((state) => state in rootState);
            const hasBubble = isBubbleMessage && !("noBubble" in rootState);
            const lineSlotOrder =
                layout === "irc"
                    ? ircLineSlotOrder
                    : hasBubble
                      ? bubbleLineSlotOrder
                      : layout === "bubble" && "info" in rootState
                        ? bubbleInfoLineSlotOrder
                        : groupLineSlotOrder;
            const rootSlotOrder =
                layout === "irc"
                    ? ircRootSlotOrder
                    : hasBubble
                      ? bubbleMessageRootSlotOrder
                      : isBubbleMessage
                        ? noBubbleMessageRootSlotOrder
                        : groupRootSlotOrder;

            expect(Array.from(line.children).map((child) => child.getAttribute("data-testid"))).toEqual(lineSlotOrder);
            expect(Array.from(root.children).map((child) => child.getAttribute("data-testid") ?? child.id)).toEqual(
                rootSlotOrder,
            );

            const containedLineSlots =
                layout === "irc"
                    ? ["replyChain", "body", "actionBar", "footer", "threadInfo"]
                    : ["timestamp", "padlock", "replyChain", "body", "actionBar"];
            for (const slotName of containedLineSlots) {
                expect(root.querySelector(`[data-testid="event-tile-slot-${slotName}"]`)?.parentElement).toBe(line);
            }
        },
    );

    it("preserves the application styling contract across rendering modes", () => {
        const group = render(
            <EventTileView
                {...createProps({
                    classNames: applicationStylingClasses,
                    slots: createStylingContractSlots(),
                })}
            />,
        );
        const groupRoot = group.container.firstElementChild!;

        expect(groupRoot).toHaveClass(applicationStylingClasses.root);
        expect(
            group.getByTestId("styling-contract-body").closest(`.${applicationStylingClasses.line}`),
        ).toBeInTheDocument();

        for (const slot of ["timestamp"]) {
            expect(
                group.getByTestId(`styling-contract-${slot}`).closest('[data-testid^="event-tile-slot-"]'),
            ).toHaveClass(applicationStylingClasses[applicationSlotClassNames[slot]]);
            expect(
                group.getByTestId(`styling-contract-${slot}`).closest('[data-testid^="event-tile-slot-"]'),
            ).toHaveClass(slotClasses[slot]);
            expect(
                group.getByTestId(`styling-contract-${slot}`).closest('[data-testid^="event-tile-slot-"]'),
            ).toHaveAttribute("data-testid", `event-tile-slot-${slot}`);
        }

        const preview = render(
            <EventTileView
                {...createProps({
                    classNames: applicationStylingClasses,
                    root: { ...renderState, shape: "Notification" },
                    slots: createStylingContractSlots(),
                })}
            />,
        );
        expect(preview.getByTestId("styling-contract-notificationRoomLabel").parentElement).toHaveClass(
            slotClasses.notificationRoomLabel,
        );
        expect(preview.getByTestId("styling-contract-notificationBadge").parentElement).toHaveClass(
            slotClasses.notificationBadge,
        );
        expect(preview.getByTestId("styling-contract-room-avatar").parentElement).toHaveClass(slotClasses.avatar);
    });

    it("renders multiple slot children inside one wrapper boundary", () => {
        const { getByTestId } = render(
            <EventTileView
                {...createProps({
                    slots: {
                        body: (
                            <>
                                <span data-testid="fragment-child-one">One</span>
                                <span data-testid="fragment-child-two">Two</span>
                            </>
                        ),
                    },
                })}
            />,
        );

        const firstChild = getByTestId("fragment-child-one");
        const secondChild = getByTestId("fragment-child-two");
        const wrapper = firstChild.closest('[data-testid="event-tile-slot-body"]');

        expect(wrapper).not.toBeNull();
        expect(secondChild.parentElement).toBe(wrapper);
        expect(wrapper).toHaveClass(styles.slotBody);
        expect(wrapper?.children).toHaveLength(2);
    });

    it.each([undefined, null, false] as const)("does not render a wrapper for an empty %s slot", (content) => {
        const { container } = render(
            <EventTileView
                {...createProps({
                    slots: {
                        body: <span data-testid="body">Body</span>,
                        avatar: content,
                    },
                })}
            />,
        );

        expect(container.querySelector('[data-testid="event-tile-slot-avatar"]')).not.toBeInTheDocument();
    });

    it("derives receipt gutter styling from receipt slot presence", () => {
        const withReceipt = render(
            <EventTileView
                {...createProps({
                    slots: {
                        body: <span data-testid="body">Body</span>,
                        receipt: <span data-testid="receipt">Receipt</span>,
                    },
                })}
            />,
        );
        const withoutReceipt = render(<EventTileView {...createProps()} />);

        expect(withReceipt.container.querySelector("li")).toHaveClass(styles.hasReceiptSlot);
        expect(withoutReceipt.container.querySelector("li")).not.toHaveClass(styles.hasReceiptSlot);
    });

    it.each(["group", "bubble"] as const)("renders the %s thread layout in its slot order", (layout) => {
        const { container, getByTestId } = render(
            <EventTileView
                {...createProps({
                    classNames: {
                        senderDetails: "legacy-sender-details",
                    },
                    root: {
                        ...renderState,
                        shape: "Thread",
                    },
                    slots: {
                        avatar: <span data-testid="avatar">Avatar</span>,
                        sender: <span data-testid="sender">Sender</span>,
                        replyChain: <span data-testid="reply-chain">Reply chain</span>,
                        body: <span data-testid="body">Body</span>,
                        actionBar: <span data-testid="action-bar">Action bar</span>,
                        timestamp: <span data-testid="timestamp">Timestamp</span>,
                        receipt: <span data-testid="receipt">Receipt</span>,
                        footer: <span data-testid="footer">Footer</span>,
                    },
                })}
            />,
            { presentation: { layout } },
        );
        const root = container.firstElementChild!;
        const senderDetails = getByTestId("sender").parentElement?.parentElement;
        const line = getByTestId("body").parentElement?.parentElement;

        if (!senderDetails || !line) {
            throw new Error("Expected EventTile thread layout elements to be present");
        }

        expect(senderDetails).toHaveClass("legacy-sender-details");
        expect(senderDetails).toBe(root.firstElementChild);
        // In bubbles the avatar sits beside the bottom of the bubble, as in the room
        if (layout === "bubble") {
            expect(getByTestId("avatar").parentElement?.previousElementSibling).toBe(line);
        } else {
            expect(senderDetails).toContainElement(getByTestId("avatar"));
        }
        expect(line).toContainElement(getByTestId("reply-chain"));
        expect(line).toContainElement(getByTestId("action-bar"));
        expect(line).toContainElement(getByTestId("timestamp"));
        expect(line).toContainElement(getByTestId("receipt"));
        // In bubbles the reactions are inside the bubble, as in the room
        expect(getByTestId("footer").parentElement?.parentElement).toBe(layout === "bubble" ? line : root);

        expect(Array.from(line.children).map((child) => child.getAttribute("data-testid"))).toEqual([
            "event-tile-slot-replyChain",
            "event-tile-slot-body",
            "event-tile-slot-actionBar",
            ...(layout === "bubble" ? ["event-tile-slot-footer"] : []),
            "event-tile-slot-timestamp",
            "event-tile-slot-receipt",
        ]);
    });

    it.each(["Notification", "ThreadsList"] as const)("renders the %s preview layout", (shape) => {
        const { container, getByTestId, queryByTestId } = render(
            <EventTileView
                {...createProps({
                    classNames: {
                        details: "legacy-details",
                        slotAvatar: "legacy-avatar",
                        slotActionBar: "legacy-thread-action-bar",
                    },
                    root: {
                        ...renderState,
                        shape,
                    },
                    slots: {
                        sender: <span data-testid="sender">Sender</span>,
                        notificationRoomLabel:
                            shape === "Notification" ? <span data-testid="room-label">Room</span> : undefined,
                        timestamp: <span data-testid="timestamp">Timestamp</span>,
                        notificationBadge: <span data-testid="badge">Badge</span>,
                        roomAvatar: <span data-testid="room-avatar">Room avatar</span>,
                        avatar: <span data-testid="avatar">Avatar</span>,
                        body: <span data-testid="body">Body</span>,
                        threadInfo: <span data-testid="thread-info">Thread info</span>,
                        actionBar: <span data-testid="action-bar">Action bar</span>,
                        receipt: <span data-testid="receipt">Receipt</span>,
                    },
                })}
            />,
        );
        const root = container.firstElementChild!;
        const details = getByTestId("sender").parentElement?.parentElement;
        const line = getByTestId("body").parentElement?.parentElement;

        if (!details || !line) {
            throw new Error(`Expected EventTile ${shape} layout elements to be present`);
        }

        expect(root).toHaveAttribute("tabindex", "-1");
        expect(root).toHaveClass(shape === "Notification" ? styles.shapeNotification : styles.shapeThreadsList);
        expect(details).toContainElement(getByTestId("timestamp"));
        expect(details).toHaveClass("legacy-details");
        expect(details).toContainElement(getByTestId("badge"));
        expect(line).toContainElement(getByTestId("thread-info"));
        expect(getByTestId("receipt").parentElement?.parentElement).toBe(root);

        if (shape === "Notification") {
            const avatar = getByTestId("room-avatar").parentElement!;
            expect(avatar.parentElement).toBe(root);
            expect(avatar).toHaveClass("legacy-avatar");
            expect(queryByTestId("action-bar")).not.toBeInTheDocument();
        } else {
            const avatar = getByTestId("avatar").parentElement!;
            const actionBar = getByTestId("action-bar").parentElement!;
            expect(avatar.parentElement).toBe(root);
            expect(actionBar.parentElement).toBe(root);
            expect(actionBar).toHaveClass("legacy-thread-action-bar");
            expect(queryByTestId("room-avatar")).not.toBeInTheDocument();
        }
    });

    it("renders the file layout with permalink interactions", () => {
        const onPermalinkClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
        });
        const onPermalinkContextMenu = vi.fn();
        const { container, getByTestId } = render(
            <EventTileView
                {...createProps({
                    root: { ...renderState, shape: "File" },
                    classNames: {
                        senderDetails: "legacy-sender-details",
                        senderDetailsLink: "legacy-sender-details-link",
                    },
                    onPermalinkClick,
                    onPermalinkContextMenu,
                    slots: {
                        avatar: <span data-testid="avatar">Avatar</span>,
                        sender: <span data-testid="sender">Sender</span>,
                        timestamp: <span data-testid="timestamp">Timestamp</span>,
                        body: <span data-testid="body">Body</span>,
                    },
                })}
            />,
        );
        const root = container.firstElementChild!;
        const link = getByTestId("sender").closest("a");
        const senderDetails = getByTestId("sender").closest(".legacy-sender-details");

        expect(root).toHaveClass(styles.shapeFile);

        if (!link) {
            throw new Error("Expected sender details link");
        }
        if (!senderDetails) {
            throw new Error("Expected sender details container");
        }

        expect(link).toHaveAttribute("href", renderState.permalink);
        expect(link).toHaveClass("legacy-sender-details-link");
        expect(senderDetails).toHaveClass("legacy-sender-details");
        expect(senderDetails).toContainElement(getByTestId("timestamp"));
        expect(getByTestId("body").closest("#event-line-1")).toBe(root.lastElementChild);

        fireEvent.click(link);
        fireEvent.contextMenu(senderDetails);
        expect(onPermalinkClick).toHaveBeenCalledOnce();
        expect(onPermalinkContextMenu).toHaveBeenCalledOnce();
    });

    it("falls back to a safe file permalink", () => {
        const { getByTestId } = render(
            <EventTileView
                {...createProps({
                    root: { ...renderState, permalink: undefined, shape: "File" },
                })}
            />,
        );

        expect(getByTestId("body").closest("#event-line-1")?.previousElementSibling).toHaveAttribute("href", "#");
    });

    it.each(["group", "irc"] as const)("renders the %s timeline layout", (layout) => {
        const { container, getByTestId } = render(
            <EventTileView
                {...createProps({
                    root: renderState,
                    slots: {
                        sender: <span data-testid="sender">Sender</span>,
                        avatar: <span data-testid="avatar">Avatar</span>,
                        timestamp: <span data-testid="timestamp">Timestamp</span>,
                        padlock: <span data-testid="padlock">Padlock</span>,
                        replyChain: <span data-testid="reply-chain">Reply chain</span>,
                        body: <span data-testid="body">Body</span>,
                        actionBar: <span data-testid="action-bar">Action bar</span>,
                        footer: <span data-testid="footer">Footer</span>,
                        threadInfo: <span data-testid="thread-info">Thread info</span>,
                        receipt: <span data-testid="receipt">Receipt</span>,
                        contextMenu: <span data-testid="context-menu">Context menu</span>,
                    },
                })}
            />,
            { presentation: { layout } },
        );
        const root = container.firstElementChild!;
        const line = getByTestId("body").parentElement?.parentElement;

        if (!line) {
            throw new Error(`Expected EventTile ${layout} layout line to be present`);
        }

        expect(root).toHaveAttribute("tabindex", "-1");
        expect(root).toHaveClass(layout === "irc" ? styles.layoutIrc : styles.layoutGroup);
        expect(line).toContainElement(getByTestId("reply-chain"));
        expect(line).toContainElement(getByTestId("action-bar"));

        const expectedRootSlotOrder = layout === "irc" ? ircRootSlotOrder : groupRootSlotOrder;
        expect(Array.from(root.children).map((child) => child.getAttribute("data-testid") ?? child.id)).toEqual(
            expectedRootSlotOrder,
        );

        if (layout === "irc") {
            expect(getByTestId("padlock").parentElement?.parentElement).toBe(root);
            expect(getByTestId("footer").parentElement?.parentElement).toBe(line);
            expect(getByTestId("thread-info").parentElement?.parentElement).toBe(line);
        } else {
            expect(getByTestId("timestamp").parentElement?.parentElement).toBe(line);
            expect(getByTestId("padlock").parentElement?.parentElement).toBe(line);
            expect(getByTestId("footer").parentElement?.parentElement).toBe(root);
            expect(getByTestId("thread-info").parentElement?.parentElement).toBe(root);
        }

        expect(getByTestId("receipt").parentElement?.parentElement).toBe(root);
    });

    it("forwards root and line interactions", () => {
        const onClick = vi.fn();
        const onContextMenu = vi.fn();
        const { container, getByTestId } = render(<EventTileView {...createProps({ onClick, onContextMenu })} />);

        fireEvent.click(container.firstElementChild!);
        fireEvent.contextMenu(getByTestId("body").parentElement!);

        expect(onClick).not.toHaveBeenCalled();
        expect(onContextMenu).toHaveBeenCalledOnce();

        const { container: previewContainer } = render(
            <EventTileView
                {...createProps({
                    root: { ...renderState, shape: "Notification" },
                    onClick,
                })}
            />,
        );
        fireEvent.click(previewContainer.firstElementChild!);
        expect(onClick).toHaveBeenCalledOnce();
    });

    it.each(["group", "bubble", "irc"] as const)(
        "opens the context menu from anywhere on the %s layout row",
        (layout) => {
            const onContextMenu = vi.fn();
            render(<EventTileView {...createProps({ onContextMenu, slots: createStylingContractSlots() })} />, {
                presentation: { layout },
            });

            for (const slotName of ["avatar", "sender", "timestamp", "replyChain", "body", "footer", "receipt"]) {
                fireEvent.contextMenu(screen.getByTestId(`styling-contract-${slotName}`));
            }

            expect(onContextMenu).toHaveBeenCalledTimes(7);
        },
    );

    it("opens the context menu from anywhere on a thread row", () => {
        const onContextMenu = vi.fn();
        render(
            <EventTileView
                {...createProps({
                    root: { ...renderState, shape: "Thread" },
                    onContextMenu,
                    slots: createStylingContractSlots(),
                })}
            />,
        );

        for (const slotName of ["avatar", "sender", "body", "footer"]) {
            fireEvent.contextMenu(screen.getByTestId(`styling-contract-${slotName}`));
        }

        expect(onContextMenu).toHaveBeenCalledTimes(4);
    });

    it.each(["group", "bubble"] as const)(
        "draws the %s layout timestamp inside the body slot when it goes over the media",
        (layout) => {
            const { getByTestId } = render(
                <EventTileView
                    {...createProps({
                        line: { media: true, timestampOverMedia: true },
                        slots: createStylingContractSlots(),
                    })}
                />,
                { presentation: { layout } },
            );
            const bodySlot = getByTestId("event-tile-slot-body");
            const line = bodySlot.parentElement!;

            expect(line).toHaveClass(styles.lineTimestampOverMedia);
            expect(getByTestId("event-tile-slot-timestamp").parentElement).toBe(bodySlot);
            expect(Array.from(bodySlot.children).map((child) => child.getAttribute("data-testid"))).toEqual([
                "styling-contract-body",
                "event-tile-slot-timestamp",
            ]);
            expect(Array.from(line.children).map((child) => child.getAttribute("data-testid"))).toEqual([
                "styling-contract-contextMenu",
                "event-tile-slot-padlock",
                "event-tile-slot-replyChain",
                "event-tile-slot-body",
                "event-tile-slot-actionBar",
            ]);
        },
    );

    it("draws a thread timestamp inside the body slot when it goes over the media", () => {
        const { getByTestId } = render(
            <EventTileView
                {...createProps({
                    root: { ...renderState, shape: "Thread" },
                    line: { media: true, timestampOverMedia: true },
                    slots: createStylingContractSlots(),
                })}
            />,
        );

        expect(getByTestId("event-tile-slot-timestamp").parentElement).toBe(getByTestId("event-tile-slot-body"));
    });

    it("does not attach a context menu handler to preview lines", () => {
        const onContextMenu = vi.fn();
        const { getByTestId } = render(
            <EventTileView
                {...createProps({
                    root: { ...renderState, shape: "Notification" },
                    onContextMenu,
                })}
            />,
        );

        fireEvent.contextMenu(getByTestId("body").parentElement!);
        expect(onContextMenu).not.toHaveBeenCalled();
    });

    it("forwards the root ref and supports a custom root element", () => {
        const rootRef = createRef<HTMLElement>();
        const { container } = render(
            <EventTileView {...createProps({ root: { ...renderState, as: "article" }, refs: { root: rootRef } })} />,
        );

        expect(container.firstElementChild?.tagName).toBe("ARTICLE");
        expect(rootRef.current).toBe(container.firstElementChild);
    });
});

describe("EventTileView add-reaction control", () => {
    const renderWithReactions = (): HTMLElement => {
        const vm = new MockViewModel<ReactionsRowViewSnapshot>({
            ariaLabel: "Reactions",
            isVisible: true,
            showAddReactionButton: true,
            addReactionButtonLabel: "Add reaction",
            // addReactionButtonVisible is deliberately unset. Every story forces it
            // true, which is why none of them exercised the reveal rule.
        });
        const { container } = render(
            <EventTileView
                {...createProps({
                    root: { ...renderState, state: { ...renderState.state, hasReply: false } },
                    slots: {
                        body: <span data-testid="body">Body</span>,
                        footer: (
                            <ReactionsRowView vm={vm}>
                                <button type="button">Reaction</button>
                            </ReactionsRowView>
                        ),
                    },
                })}
            />,
        );

        return container.querySelector<HTMLElement>(`.${reactionStyles.addReactionButton}`)!;
    };

    it("stays hidden while the event is not hovered", () => {
        expect(getComputedStyle(renderWithReactions()).visibility).toBe("hidden");
    });

    it("is revealed by hovering the event body, not only the reactions row", async () => {
        // The control sits below the message, so requiring a hover of its own row
        // means the reader has to find it before it appears.
        const addReactionButton = renderWithReactions();

        await userEvent.hover(screen.getByTestId("body"));

        expect(getComputedStyle(addReactionButton).visibility).toBe("visible");
    });
});

describe("EventTileView bubble layout reactions", () => {
    const reactionsSnapshot: ReactionsRowViewSnapshot = {
        ariaLabel: "Reactions",
        isVisible: true,
        showAddReactionButton: true,
        addReactionButtonLabel: "Add reaction",
        addReactionButtonVisible: true,
    };

    const renderAddReactionButton = (isOwnEvent: boolean, line?: EventTileViewLine): HTMLElement => {
        const vm = new MockViewModel<ReactionsRowViewSnapshot>(reactionsSnapshot);
        const { getByRole } = render(
            <EventTileView
                {...createProps({
                    root: { ...renderState, state: { ...renderState.state, hasReply: false, isOwnEvent } },
                    line,
                    slots: {
                        body: <span data-testid="body">Body</span>,
                        footer: (
                            <ReactionsRowView vm={vm}>
                                <button type="button">Reaction</button>
                            </ReactionsRowView>
                        ),
                    },
                })}
            />,
            { presentation: { layout: "bubble" } },
        );

        return getByRole("button", { name: "Add reaction" });
    };

    it("moves the add-reaction control ahead of the reactions under your own picture", () => {
        // The reactions under a message without a bubble end where it does for your own messages, so an add-reaction
        // control left at the end of the row reserves space between the reactions and the picture's edge even while it
        // is hidden.
        expect(getComputedStyle(renderAddReactionButton(true, { media: true, timestampOverMedia: true })).order).toBe(
            "-1",
        );
    });

    it.each([true, false])(
        "keeps the add-reaction control after the reactions inside a bubble (own: %s)",
        (isOwnEvent) => {
            // In a bubble the reactions start at the bubble's start for everyone, as in Telegram
            const button = renderAddReactionButton(isOwnEvent);

            expect(button.closest(`.${styles.line}`)).not.toBeNull();
            expect(getComputedStyle(button).order).toBe("0");
        },
    );
});

describe("EventTileView placement", () => {
    const timestamp = <span>23:59</span>;
    const textBody = (text: string): React.ReactElement => (
        <div className="mx_EventTile_content">
            <div className="mx_EventTile_body" dir="auto">
                {text}
            </div>
        </div>
    );

    interface PlacementTile {
        shape?: EventTileViewProps["root"]["shape"];
        state?: Partial<EventTileViewRootState>;
        line?: EventTileViewLine;
        slots: EventTileViewProps["slots"];
    }

    function renderTiles(layout: EventLayout, ...tiles: PlacementTile[]): void {
        render(
            <ol style={{ width: 400, margin: 0, padding: 0, listStyle: "none" }}>
                {tiles.map(({ shape = "Room", state, line, slots }, index) => (
                    <EventTileView
                        key={index}
                        root={{
                            ...renderState,
                            eventId: `$event-${index}`,
                            shape,
                            state: { isOwnEvent: false, hasReply: false, ...state },
                        }}
                        slots={{ timestamp, ...slots }}
                        line={line}
                    />
                ))}
            </ol>,
            { presentation: { layout } },
        );
    }

    function lastLineOf(element: Element): DOMRect {
        const range = document.createRange();
        range.selectNodeContents(element);
        return Array.from(range.getClientRects()).at(-1)!;
    }

    const timestampRect = (): DOMRect => screen.getByTestId("event-tile-slot-timestamp").getBoundingClientRect();

    it("lets the pointer in a bubble row's side margins reach the row", () => {
        renderTiles("bubble", { slots: { body: textBody("Hello") } });
        const tile = screen.getByTestId("event-tile");
        const { left, right, top, height } = tile.getBoundingClientRect();

        expect(document.elementFromPoint(left - 20, top + height / 2)).toBe(tile);
        // The end margin is as wide as your own bubble's tail reaches past the row
        expect(document.elementFromPoint(right + 10, top + height / 2)).toBe(tile);
    });

    it("keeps no column for read receipts at the end of a bubble row: your own bubble's tail ends at the content edge", () => {
        renderTiles("bubble", { state: { isOwnEvent: true, lastInSection: true }, slots: { body: textBody("Hello") } });
        const list = document.querySelector("ol")!.getBoundingClientRect();
        const line = screen.getByTestId("event-tile-line");
        const tail = parseFloat(getComputedStyle(line, "::after").width);

        expect(tail).toBe(6);
        expect(line.getBoundingClientRect().right + tail).toBe(list.right);
    });

    it.each(["bubble", "group"] as const)(
        "keeps the %s layout media timestamp on the picture when a wider reply is quoted above it",
        (layout) => {
            renderTiles(layout, {
                state: { hasReply: true },
                line: { media: true, timestampOverMedia: true },
                slots: {
                    replyChain: <div style={{ width: 180, height: 40 }} />,
                    body: <div data-testid="picture" style={{ width: 100, height: 75 }} />,
                },
            });
            const picture = screen.getByTestId("picture").getBoundingClientRect();
            const badge = timestampRect();

            expect(badge.left).toBeGreaterThanOrEqual(picture.left);
            expect(badge.right).toBeLessThanOrEqual(picture.right);
            expect(badge.bottom).toBeLessThanOrEqual(picture.bottom);
        },
    );

    it.each(["bubble", "group"] as const)(
        "grows a tiny %s layout picture so that its timestamp badge fits",
        (layout) => {
            const tinyPicture = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=";
            const vm = new MockViewModel<ImageBodyViewSnapshot>({
                state: ImageBodyViewState.READY,
                alt: "Tiny picture",
                src: tinyPicture,
                thumbnailSrc: tinyPicture,
                maxWidth: 1,
                maxHeight: 1,
                aspectRatio: "1 / 1",
            });
            renderTiles(layout, {
                line: { media: true, timestampOverMedia: true },
                slots: { body: <ImageBodyView vm={vm} /> },
            });
            const picture = document.querySelector(`.${imageBodyStyles.thumbnailContainer}`)!.getBoundingClientRect();
            const badge = timestampRect();

            expect(badge.left).toBeGreaterThanOrEqual(picture.left);
            expect(badge.right).toBeLessThanOrEqual(picture.right);
        },
    );

    it("puts a bubble's timestamp at the end of its last line when it fits", () => {
        renderTiles("bubble", { slots: { body: textBody("Hello") } });
        const lastLine = lastLineOf(document.querySelector(".mx_EventTile_body")!);
        const time = timestampRect();

        expect(time.left).toBeGreaterThanOrEqual(lastLine.right);
        expect(time.top).toBeLessThan(lastLine.bottom);
    });

    it.each([
        ["short", "مرحبا بكم في الغرفة"],
        ["wrapped", "هذه رسالة طويلة باللغة العربية تحتوي على نص كاف لكي تلتف على عدة أسطر داخل الفقاعة الضيقة"],
    ])("keeps %s right-to-left text in a bubble clear of the timestamp", (_name, text) => {
        renderTiles("bubble", { slots: { body: textBody(text) } });
        const range = document.createRange();
        range.selectNodeContents(document.querySelector(".mx_EventTile_body")!);
        const time = timestampRect();

        for (const line of Array.from(range.getClientRects())) {
            const overlaps =
                line.left < time.right && time.left < line.right && line.top < time.bottom && time.top < line.bottom;
            expect(overlaps).toBe(false);
        }
    });

    it.each(["Thread", "Card"] as const)("keeps %s read receipts clear of the message and its timestamp", (shape) => {
        renderTiles("group", {
            shape,
            state: { hasReply: false },
            slots: {
                body: textBody("A message long enough to fill the whole width of the line it sits on and wrap."),
                receipt: <span data-testid="receipt" style={{ display: "inline-block", width: 32, height: 16 }} />,
            },
        });
        const message = document.querySelector(".mx_EventTile_content")!.getBoundingClientRect();
        const receipt = screen.getByTestId("receipt").getBoundingClientRect();

        expect(receipt.left).toBeGreaterThanOrEqual(message.right);
        expect(receipt.right).toBeLessThanOrEqual(timestampRect().left);
    });

    describe("bubble geometry", () => {
        const picture = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=";
        const imageBody = (): React.ReactElement => (
            <ImageBodyView
                vm={
                    new MockViewModel<ImageBodyViewSnapshot>({
                        state: ImageBodyViewState.READY,
                        alt: "Office",
                        src: picture,
                        thumbnailSrc: picture,
                        maxWidth: 160,
                        maxHeight: 120,
                        aspectRatio: "4 / 3",
                    })
                }
            />
        );
        const videoBody = (): React.ReactElement => (
            <VideoBodyView
                vm={
                    new MockViewModel<VideoBodyViewSnapshot>({
                        state: VideoBodyViewState.READY,
                        playLabel: "Play video",
                        maxWidth: 160,
                        maxHeight: 90,
                        aspectRatio: "16 / 9",
                        durationLabel: "0:42",
                        playable: true,
                    })
                }
            />
        );
        const captionedImageBody = (): React.ReactElement => (
            <div className="mx_EventTile_content">
                {imageBody()}
                <div className="mx_EventTile_caption">
                    <div className="mx_EventTile_body">My desk</div>
                </div>
            </div>
        );
        const mediaLine = { media: true, timestampOverMedia: true };
        const radiusOf = (element: Element): string => getComputedStyle(element).borderRadius;
        const pictureFrames = (): Element[] =>
            Array.from(document.querySelectorAll(`.${imageBodyStyles.thumbnailContainer}`));
        const videoFrame = (): Element => document.querySelector(`.${videoBodyStyles.container}`)!;

        it("pads a text bubble 8px by 12px and puts its timestamp in the padding's corner", () => {
            renderTiles("bubble", { state: { lastInSection: true }, slots: { body: textBody("Hello") } });
            const line = screen.getByTestId("event-tile-line");
            const style = getComputedStyle(line);
            const box = line.getBoundingClientRect();
            const time = timestampRect();

            expect([style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]).toEqual([
                "8px",
                "12px",
                "8px",
                "12px",
            ]);
            expect(box.right - time.right).toBeCloseTo(12, 1);
            expect(box.bottom - time.bottom).toBeCloseTo(8, 1);
        });

        it("draws a selected row's band a gray step darker than another person's bubble, which stays visible in it", () => {
            renderTiles("bubble", { state: { selected: true }, slots: { body: textBody("Hello") } });
            const band = getComputedStyle(screen.getByTestId("event-tile"), "::before").backgroundColor;
            const darkerGray = document.createElement("div");
            darkerGray.style.backgroundColor = "var(--cpd-color-bg-subtle-primary)";
            document.body.append(darkerGray);

            expect(band).toBe(getComputedStyle(darkerGray).backgroundColor);
            expect(band).not.toBe(getComputedStyle(screen.getByTestId("event-tile-line")).backgroundColor);
            darkerGray.remove();
        });

        it("separates a quoted reply from the text below it by 4px", () => {
            renderTiles("bubble", {
                state: { hasReply: true },
                slots: {
                    replyChain: <div data-testid="quoted" style={{ height: 20 }} />,
                    body: textBody("Hello"),
                },
            });
            const quote = screen.getByTestId("quoted").getBoundingClientRect();
            const text = document.querySelector(".mx_EventTile_content")!.getBoundingClientRect();

            expect(text.top - quote.bottom).toBeCloseTo(4, 1);
        });

        it("keeps the sender's name level with the bubble's text", () => {
            renderTiles("bubble", {
                slots: { sender: <span data-testid="sender">Alice</span>, body: textBody("Hello") },
            });
            const text = lastLineOf(document.querySelector(".mx_EventTile_body")!);

            expect(screen.getByTestId("sender").getBoundingClientRect().left).toBeCloseTo(text.left, 1);
        });

        describe("in a run of one sender's messages", () => {
            /** A bubble's corners from its top start round to its bottom start. */
            const cornersOf = (element: Element): string[] => {
                const style = getComputedStyle(element);
                return [
                    style.borderStartStartRadius,
                    style.borderStartEndRadius,
                    style.borderEndEndRadius,
                    style.borderEndStartRadius,
                ];
            };
            const tailOf = (line: Element): CSSStyleDeclaration => getComputedStyle(line, "::after");
            const setDirection = (dir: "ltr" | "rtl"): void => document.querySelector("ol")!.setAttribute("dir", dir);

            function renderRun(isOwnEvent: boolean): HTMLElement[] {
                renderTiles(
                    "bubble",
                    { state: { isOwnEvent }, slots: { body: textBody("Morning!") } },
                    { state: { isOwnEvent, continuation: true }, slots: { body: textBody("The build is green") } },
                    {
                        state: { isOwnEvent, continuation: true, lastInSection: true },
                        slots: { body: textBody("Lunch?") },
                    },
                );
                return screen.getAllByTestId("event-tile-line");
            }

            it("rounds the corners where another person's bubbles meet to 4px, with a tail at the last one's bottom start", () => {
                const [first, middle, last] = renderRun(false);

                expect(cornersOf(first)).toEqual(["12px", "12px", "12px", "4px"]);
                expect(cornersOf(middle)).toEqual(["4px", "12px", "12px", "4px"]);
                expect(cornersOf(last)).toEqual(["4px", "12px", "12px", "0px"]);
                expect(tailOf(first).content).toBe("none");
                expect(tailOf(middle).content).toBe("none");
                expect([tailOf(last).left, tailOf(last).bottom]).toEqual(["-6px", "0px"]);
                expect([tailOf(last).width, tailOf(last).height]).toEqual(["6px", "16px"]);
                expect(tailOf(last).maskImage).toContain("svg");
                expect(tailOf(last).scale).toBe("none");
                expect(tailOf(last).backgroundColor).toBe(getComputedStyle(last).backgroundColor);
            });

            it("rounds the corners where your own bubbles meet to 4px, with a tail at the last one's bottom end", () => {
                const [first, middle, last] = renderRun(true);

                expect(cornersOf(first)).toEqual(["12px", "12px", "4px", "12px"]);
                expect(cornersOf(middle)).toEqual(["12px", "4px", "4px", "12px"]);
                expect(cornersOf(last)).toEqual(["12px", "4px", "0px", "12px"]);
                expect([tailOf(last).right, tailOf(last).bottom]).toEqual(["-6px", "0px"]);
                // The drawing points to the start, so it is mirrored to point away from the bubble's end
                expect(tailOf(last).scale).toBe("-1 1");
                expect(tailOf(last).backgroundColor).toBe(getComputedStyle(last).backgroundColor);
            });

            it.each([
                ["another person's", false, "right", "-1 1"],
                ["your own", true, "left", "none"],
            ])("mirrors the tail of %s last bubble in right-to-left text", (_name, isOwnEvent, side, scale) => {
                const last = renderRun(isOwnEvent).at(-1)!;
                setDirection("rtl");

                expect(tailOf(last).getPropertyValue(side)).toBe("-6px");
                expect(tailOf(last).scale).toBe(scale);
            });

            it("leaves no tail to see beside a picture, which has no bubble", () => {
                renderTiles("bubble", {
                    state: { lastInSection: true },
                    line: mediaLine,
                    slots: { body: imageBody() },
                });

                expect(tailOf(screen.getByTestId("event-tile-line")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
            });

            const avatar = (
                <span data-testid="avatar" style={{ display: "inline-block", width: 30, height: 30 }}>
                    A
                </span>
            );
            const LONG_TEXT = "A message long enough to wrap onto a second line in this narrow timeline, and a third.";

            it.each(["ltr", "rtl"] as const)(
                "puts the sender's avatar 8px outside the start of their last bubble, level with its bottom, in %s text",
                (dir) => {
                    renderTiles("bubble", {
                        state: { lastInSection: true },
                        slots: { avatar, body: textBody(LONG_TEXT), footer: <div style={{ height: 24 }} /> },
                    });
                    setDirection(dir);
                    const timeline = document.querySelector("ol")!.getBoundingClientRect();
                    const line = screen.getByTestId("event-tile-line").getBoundingClientRect();
                    const picture = screen.getByTestId("avatar").getBoundingClientRect();
                    const slot = screen.getByTestId("event-tile-slot-avatar");

                    expect([picture.width, picture.height]).toEqual([30, 30]);
                    expect(dir === "ltr" ? line.left - picture.right : picture.left - line.right).toBeCloseTo(8, 1);
                    // The bubble's bottom, not the row's, which ends under the reactions
                    expect(picture.bottom).toBeCloseTo(line.bottom, 1);
                    expect(picture.left).toBeGreaterThanOrEqual(timeline.left);
                    expect(picture.right).toBeLessThanOrEqual(timeline.right);
                    // No ring cut out of the bubble around it
                    expect(getComputedStyle(slot).borderTopWidth).toBe("0px");
                    expect(getComputedStyle(screen.getByTestId("avatar")).boxShadow).toBe("none");
                },
            );

            it("keeps no ring around the avatar of a selected message", () => {
                renderTiles("bubble", {
                    state: { lastInSection: true, selected: true },
                    slots: { avatar, body: textBody("Hello") },
                });

                expect(getComputedStyle(screen.getByTestId("event-tile-slot-avatar")).borderTopWidth).toBe("0px");
                expect(getComputedStyle(screen.getByTestId("avatar")).boxShadow).toBe("none");
            });
        });

        it.each([
            ["bubble", "12px"],
            ["group", "8px"],
            ["irc", "8px"],
        ] as const)("rounds %s layout pictures, captioned pictures and videos to %s", (layout, radius) => {
            renderTiles(
                layout,
                { line: mediaLine, slots: { body: imageBody() } },
                { line: { media: true }, slots: { body: captionedImageBody() } },
                { line: mediaLine, slots: { body: videoBody() } },
            );

            expect(pictureFrames().map(radiusOf)).toEqual([radius, radius]);
            expect(radiusOf(videoFrame())).toBe(radius);
        });

        it("leaves media quoted in a media bubble's reply chain at its own radius", () => {
            renderTiles("bubble", {
                state: { hasReply: true },
                line: mediaLine,
                slots: {
                    replyChain: (
                        <div
                            data-testid="quoted"
                            style={{ width: 40, height: 40, borderRadius: "var(--MBody-border-radius, 8px)" }}
                        />
                    ),
                    body: imageBody(),
                },
            });

            expect(radiusOf(screen.getByTestId("quoted"))).toBe("8px");
            expect(pictureFrames().map(radiusOf)).toEqual(["12px"]);
        });

        it("takes the radius of bubbles and of the media standing as one from --tl-radius-bubble", () => {
            document.documentElement.style.setProperty("--tl-radius-bubble", "20px");
            try {
                renderTiles(
                    "bubble",
                    { state: { lastInSection: true }, slots: { body: textBody("Hello") } },
                    { line: mediaLine, slots: { body: videoBody() } },
                );

                const line = getComputedStyle(screen.getAllByTestId("event-tile-line")[0]);

                // The fourth corner, by the sender's avatar, carries the tail
                expect([line.borderStartStartRadius, line.borderStartEndRadius, line.borderEndEndRadius]).toEqual([
                    "20px",
                    "20px",
                    "20px",
                ]);
                expect(radiusOf(videoFrame())).toBe("20px");
            } finally {
                document.documentElement.style.removeProperty("--tl-radius-bubble");
            }
        });

        it("draws the time and the length over a video as --tl-radius-control pills 8px in from its corners", () => {
            // Compound's pill radius is defined by compound-web, which this page doesn't load.
            document.documentElement.style.setProperty("--tl-radius-control", "99px");
            try {
                renderTiles("bubble", { line: mediaLine, slots: { body: videoBody() } });
                const frame = videoFrame().getBoundingClientRect();
                const time = screen.getByTestId("event-tile-slot-timestamp");
                const duration = document.querySelector(`.${videoBodyStyles.duration}`)!;
                const timeBox = time.getBoundingClientRect();
                const durationBox = duration.getBoundingClientRect();

                expect(radiusOf(time)).toBe("99px");
                expect(radiusOf(duration)).toBe("99px");
                expect(frame.right - timeBox.right).toBeCloseTo(8, 1);
                expect(frame.bottom - timeBox.bottom).toBeCloseTo(8, 1);
                expect(durationBox.left - frame.left).toBeCloseTo(8, 1);
                expect(durationBox.top - frame.top).toBeCloseTo(8, 1);
            } finally {
                document.documentElement.style.removeProperty("--tl-radius-control");
            }
        });
    });

    /** A reactions row of 24px chips, as ReactionsRowView lays it out in bubbles: with no add-reaction button. */
    const reactions = (count: number, chipWidth = 40): React.ReactElement => (
        <ReactionsRowView
            vm={
                new MockViewModel<ReactionsRowViewSnapshot>({
                    ariaLabel: "Reactions",
                    isVisible: true,
                    showAddReactionButton: false,
                    addReactionButtonLabel: "Add reaction",
                })
            }
        >
            {Array.from({ length: count }, (_, index) => (
                <span
                    key={index}
                    data-testid="chip"
                    style={{ display: "inline-block", width: chipWidth, height: 24 }}
                />
            ))}
        </ReactionsRowView>
    );
    const middle = (box: DOMRect): number => (box.top + box.bottom) / 2;
    const lineBox = (): DOMRect => screen.getByTestId("event-tile-line").getBoundingClientRect();
    const rowBox = (): DOMRect => screen.getByRole("toolbar", { name: "Reactions" }).getBoundingClientRect();
    const messageBox = (): DOMRect => document.querySelector(".mx_EventTile_content")!.getBoundingClientRect();
    const lastChipBox = (): DOMRect => screen.getAllByTestId("chip").at(-1)!.getBoundingClientRect();

    describe("reactions in the bubble layout", () => {
        const setDirection = (dir: "ltr" | "rtl"): void => document.querySelector("ol")!.setAttribute("dir", dir);

        it.each([
            ["another person's", false],
            ["your own", true],
        ])(
            "holds them at the bottom of %s bubble, 8px under the message, with the time ending their row",
            (_name, isOwnEvent) => {
                renderTiles("bubble", {
                    state: { isOwnEvent, lastInSection: true },
                    slots: { body: textBody("Lunch?"), footer: reactions(2) },
                });
                const line = lineBox();
                const row = rowBox();
                const time = timestampRect();

                expect(screen.getByTestId("event-tile-slot-footer").parentElement).toBe(
                    screen.getByTestId("event-tile-line"),
                );
                expect(row.top - messageBox().bottom).toBeCloseTo(8, 1);
                // They start at the bubble's start for everyone, as in Telegram
                expect(row.left - line.left).toBeCloseTo(12, 1);
                expect(line.bottom - row.bottom).toBeCloseTo(8, 1);
                expect(line.right - time.right).toBeCloseTo(12, 1);
                expect(middle(time)).toBeCloseTo(middle(row), 1);
                expect(time.left).toBeGreaterThanOrEqual(lastChipBox().right);
            },
        );

        it("makes the bubble as wide as its reactions and the time need when they are wider than the message", () => {
            renderTiles("bubble", { slots: { body: textBody("Ok"), footer: reactions(2) } });

            // An 8px gap after the last reaction and the time's 30px, then the bubble's padding
            expect(lineBox().right - lastChipBox().right).toBeCloseTo(8 + 30 + 12, 1);
            expect(lineBox().left).toBeCloseTo(rowBox().left - 12, 1);
        });

        it("drops the room the message's last line keeps for the time, which ends the reactions' row instead", () => {
            renderTiles(
                "bubble",
                { slots: { body: textBody("Hello") } },
                { slots: { body: textBody("Hello"), footer: reactions(1) } },
            );
            const [plain, reacted] = Array.from(document.querySelectorAll(".mx_EventTile_body"));

            expect(getComputedStyle(plain, "::after").float).toBe("right");
            expect(getComputedStyle(reacted, "::after").float).toBe("none");
        });

        // The bubble's content is 233.1px wide here: five 40px chips and their 4px gaps to a line
        it("ends the last line of reactions that wrap with the time when it fits there, as in Telegram", () => {
            renderTiles("bubble", { slots: { body: textBody("Lunch?"), footer: reactions(6) } });
            const chips = screen.getAllByTestId("chip").map((chip) => chip.getBoundingClientRect());
            const time = timestampRect();

            expect(chips.at(-1)!.top).toBeGreaterThan(chips[0].top);
            expect(middle(time)).toBeCloseTo(middle(chips.at(-1)!), 1);
            expect(time.left).toBeGreaterThanOrEqual(lastChipBox().right);
            expect(lineBox().bottom - time.bottom).toBeCloseTo(8, 1);
        });

        it("gives the time a line of its own under reactions that fill theirs", () => {
            // Four 52px chips and their gaps make a 220px line, with no room left for the time
            renderTiles("bubble", { slots: { body: textBody("Lunch?"), footer: reactions(4, 52) } });
            const chips = screen.getAllByTestId("chip").map((chip) => chip.getBoundingClientRect());
            const time = timestampRect();

            expect(chips.at(-1)!.top).toBe(chips[0].top);
            expect(time.top).toBeGreaterThanOrEqual(chips[0].bottom);
            expect(lineBox().bottom - time.bottom).toBeCloseTo(8, 1);
        });

        it("starts them at the bubble's start and ends their row with the time in right-to-left text", () => {
            renderTiles("bubble", { slots: { body: textBody("مرحبا"), footer: reactions(2) } });
            setDirection("rtl");
            const line = lineBox();
            const row = rowBox();
            const time = timestampRect();

            expect(line.right - row.right).toBeCloseTo(12, 1);
            expect(time.left - line.left).toBeCloseTo(12, 1);
            expect(time.right).toBeLessThanOrEqual(lastChipBox().left);
            expect(middle(time)).toBeCloseTo(middle(row), 1);
        });

        it("keeps a padlock beside the message, with the reactions under both", () => {
            renderTiles("bubble", {
                slots: {
                    padlock: <span data-testid="padlock" style={{ display: "inline-block", width: 14, height: 14 }} />,
                    body: textBody("From an unverified device"),
                    footer: reactions(1),
                },
            });
            const padlock = screen.getByTestId("event-tile-slot-padlock").getBoundingClientRect();
            const message = messageBox();

            expect(padlock.top).toBeCloseTo(message.top, 1);
            expect(padlock.right).toBeLessThanOrEqual(message.left);
            expect(rowBox().left - lineBox().left).toBeCloseTo(12, 1);
            expect(rowBox().top).toBeGreaterThanOrEqual(message.bottom);
        });

        it("keeps them 8px under a picture without a caption, which has no bubble", () => {
            renderTiles("bubble", {
                line: { media: true, timestampOverMedia: true },
                slots: { body: <div style={{ width: 160, height: 120 }} />, footer: reactions(1) },
            });

            expect(screen.getByTestId("event-tile-slot-footer").parentElement).toBe(screen.getByTestId("event-tile"));
            expect(rowBox().top - lineBox().bottom).toBeCloseTo(8, 1);
        });

        it("leaves the bubble as it was when the reactions row renders nothing, as after the last reaction is removed", () => {
            // The app keeps passing the footer once a message has had reactions, and the row then renders nothing
            const Nothing = (): null => null;
            renderTiles(
                "bubble",
                { slots: { body: textBody("Hello") } },
                { slots: { body: textBody("Hello"), footer: <Nothing /> } },
            );
            const [plain, emptied] = screen
                .getAllByTestId("event-tile-line")
                .map((line) => line.getBoundingClientRect());
            const [plainBody, emptiedBody] = Array.from(document.querySelectorAll(".mx_EventTile_body"));

            expect(emptied.height).toBe(plain.height);
            expect(emptied.width).toBe(plain.width);
            expect(getComputedStyle(emptiedBody, "::after").float).toBe(getComputedStyle(plainBody, "::after").float);
        });
    });

    describe("large emoji in the bubble layout", () => {
        /** A message of only emoji, which the app draws large and marks as such. */
        const emojiBody = (emoji: string): React.ReactElement => (
            <div className="mx_EventTile_content">
                <div
                    className="mx_EventTile_body mx_EventTile_bigEmoji"
                    dir="auto"
                    style={{ fontSize: 48, lineHeight: "57px" }}
                >
                    {emoji}
                </div>
            </div>
        );
        const BADGE = "rgba(0, 0, 0, 0.55)";
        const TRANSPARENT = "rgba(0, 0, 0, 0)";
        const line = (): HTMLElement => screen.getByTestId("event-tile-line");
        const time = (): HTMLElement => screen.getByTestId("event-tile-slot-timestamp");

        it.each([
            ["another person's", false],
            ["your own", true],
        ])(
            "draws %s emoji without a bubble, with the time as pictures' badge at the end of their line",
            (_name, isOwnEvent) => {
                renderTiles("bubble", {
                    state: { isOwnEvent, lastInSection: true },
                    slots: { body: emojiBody("👍") },
                });
                const style = getComputedStyle(line());
                const box = line().getBoundingClientRect();
                const badge = time().getBoundingClientRect();

                expect(style.backgroundColor).toBe(TRANSPARENT);
                expect(getComputedStyle(line(), "::after").backgroundColor).toBe(TRANSPARENT);
                expect([style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]).toEqual([
                    "0px",
                    "0px",
                    "0px",
                    "0px",
                ]);
                expect(getComputedStyle(time()).backgroundColor).toBe(BADGE);
                expect(badge.height).toBe(20);
                expect(badge.right).toBeCloseTo(box.right, 1);
                expect(badge.bottom).toBeCloseTo(box.bottom, 1);
                expect(badge.left).toBeGreaterThanOrEqual(
                    lastLineOf(document.querySelector(".mx_EventTile_body")!).right,
                );
            },
        );

        it("ends right-to-left emoji with the badge on the left", () => {
            renderTiles("bubble", { slots: { body: emojiBody("👍") } });
            document.querySelector("ol")!.setAttribute("dir", "rtl");

            expect(time().getBoundingClientRect().left).toBeCloseTo(line().getBoundingClientRect().left, 1);
        });

        it("puts the badge at the end of the reactions' row, 8px under the emoji", () => {
            renderTiles("bubble", { slots: { body: emojiBody("👍"), footer: reactions(1) } });
            const box = lineBox();
            const badge = time().getBoundingClientRect();
            const row = rowBox();

            // The emoji's box is the 48px emoji, without the leading of their 57px line
            expect(messageBox().top).toBeCloseTo(box.top - 4.5, 1);
            expect(row.top - (box.top + 48)).toBeCloseTo(8, 1);
            expect(row.left).toBeCloseTo(box.left, 1);
            expect(badge.right).toBeCloseTo(box.right, 1);
            expect(middle(badge)).toBeCloseTo(middle(row), 1);
        });

        it("ends your own emoji and their reactions where the row does, with the badge last", () => {
            renderTiles("bubble", {
                state: { isOwnEvent: true },
                slots: { body: emojiBody("👍"), footer: reactions(2) },
            });
            const box = lineBox();
            const emoji = lastLineOf(document.querySelector(".mx_EventTile_body")!);
            const chips = screen.getAllByTestId("chip").map((chip) => chip.getBoundingClientRect());
            const badge = time().getBoundingClientRect();

            // The reactions are wider than the emoji, which still end at the row's end
            expect(rowBox().width).toBeGreaterThan(emoji.width);
            expect(box.right - emoji.right).toBeLessThan(2);
            // The footer's 8px gap, less what the badge's medium digits are wider than the time's room
            expect(badge.left - chips.at(-1)!.right).toBeGreaterThan(6);
            expect(badge.left - chips.at(-1)!.right).toBeLessThanOrEqual(8);
        });

        it("keeps the bubble around emoji under a quoted reply", () => {
            renderTiles("bubble", {
                state: { hasReply: true },
                slots: { replyChain: <div style={{ height: 20 }} />, body: emojiBody("👍") },
            });

            expect(getComputedStyle(line()).backgroundColor).not.toBe(TRANSPARENT);
            expect(getComputedStyle(time()).backgroundColor).toBe(TRANSPARENT);
        });

        it("leaves emoji in the group layout with their plain time", () => {
            renderTiles("group", { slots: { body: emojiBody("👍") } });

            expect(getComputedStyle(time()).backgroundColor).toBe(TRANSPARENT);
        });
    });

    describe("the status of your own message", () => {
        const status = <span data-testid="status" style={{ display: "block", width: 16, height: 16 }} />;
        const statusRect = (): DOMRect => screen.getByTestId("status").getBoundingClientRect();
        const timeRect = (): DOMRect => screen.getByText("23:59").getBoundingClientRect();
        const own = { isOwnEvent: true, lastInSection: true };

        it("puts the status after the time, in the time's slot", () => {
            renderTiles("bubble", { state: own, slots: { body: textBody("Hello"), status } });
            const timestampSlot = screen.getByTestId("event-tile-slot-timestamp");

            expect(
                Array.from(timestampSlot.children).map(
                    (child) => child.getAttribute("data-testid") ?? child.textContent,
                ),
            ).toEqual(["23:59", "event-tile-slot-status"]);
            expect(screen.getByTestId("event-tile")).toHaveClass(styles.hasStatusSlot);
        });

        it("shows no status where the time is hidden", () => {
            renderTiles("bubble", { state: own, slots: { body: textBody("Hello"), timestamp: undefined, status } });

            expect(screen.queryByTestId("status")).not.toBeInTheDocument();
            expect(screen.getByTestId("event-tile")).not.toHaveClass(styles.hasStatusSlot);
        });

        it("draws the status 2px after the time, as tall as the time's line and centered on it", () => {
            renderTiles("bubble", { state: own, slots: { body: textBody("Hello"), status } });
            const slot = screen.getByTestId("event-tile-slot-status").getBoundingClientRect();
            const time = timeRect();

            expect(slot.left - time.right).toBe(2);
            expect(slot.height).toBe(time.height);
            expect(slot.top + slot.height / 2).toBe(time.top + time.height / 2);
            expect(statusRect().top + 8).toBe(time.top + time.height / 2);
        });

        it("ends the time and its status in the bubble's padding corner", () => {
            renderTiles("bubble", { state: own, slots: { body: textBody("Hello"), status } });
            const line = screen.getByTestId("event-tile-line").getBoundingClientRect();

            expect(line.right - statusRect().right).toBe(12);
        });

        it("keeps every last line of a text bubble clear of the time and the status after it", () => {
            // Messages a narrow letter longer each, so that one of them ends where only the time would fit beside it
            const tiles = Array.from({ length: 60 }, (_, index) => ({
                state: own,
                slots: { body: textBody(`ok ${"i".repeat(index)}`), status },
            }));
            renderTiles("bubble", ...tiles);

            for (const tile of screen.getAllByTestId("event-tile")) {
                const last = lastLineOf(tile.querySelector(".mx_EventTile_body")!);
                const time = tile
                    .querySelector("[data-testid='event-tile-slot-timestamp'] > span")!
                    .getBoundingClientRect();
                const checks = tile.querySelector("[data-testid='status']")!.getBoundingClientRect();
                const overlaps = (box: DOMRect): boolean =>
                    last.top < box.bottom && box.top < last.bottom && last.right > box.left;

                expect(overlaps(time) || overlaps(checks)).toBe(false);
            }
        });

        it("puts the status on the badge over a picture, after the time", () => {
            renderTiles("bubble", {
                state: own,
                line: { media: true, timestampOverMedia: true },
                slots: { body: <div data-testid="picture" style={{ width: 160, height: 120 }} />, status },
            });
            const badge = screen.getByTestId("event-tile-slot-timestamp");
            const box = badge.getBoundingClientRect();

            expect(badge.parentElement).toBe(screen.getByTestId("event-tile-slot-body"));
            expect(box.right - statusRect().right).toBe(8);
            expect(getComputedStyle(screen.getByTestId("event-tile-slot-status")).color).toBe("rgb(255, 255, 255)");
        });

        it("keeps a picture wide enough for its badge with the status", () => {
            renderTiles("bubble", {
                state: own,
                line: { media: true, timestampOverMedia: true },
                slots: { body: <div data-testid="picture" style={{ width: 1, height: 1 }} />, status },
            });
            const minWidth = getComputedStyle(screen.getByTestId("event-tile-line")).getPropertyValue(
                "--image-body-min-width",
            );
            const probe = document.createElement("div");
            probe.style.width = minWidth;
            document.body.append(probe);

            // The time's room, the status's 18px and the badge's padding and inset, 8px on each side
            expect(probe.getBoundingClientRect().width).toBe(30 + 18 + 32);
            probe.remove();
        });
    });

    describe("the pin of a pinned message", () => {
        const pin = <span data-testid="pin" style={{ display: "block", width: 12, height: 12 }} />;
        const status = <span data-testid="status" style={{ display: "block", width: 16, height: 16 }} />;
        const pinRect = (): DOMRect => screen.getByTestId("pin").getBoundingClientRect();
        const timeRect = (): DOMRect => screen.getByText("23:59").getBoundingClientRect();
        const slotOrder = (): Array<string | null> =>
            Array.from(screen.getByTestId("event-tile-slot-timestamp").children).map(
                (child) => child.getAttribute("data-testid") ?? child.textContent,
            );

        it("puts the pin before the time, in the time's slot", () => {
            renderTiles("bubble", { slots: { body: textBody("Hello"), pin } });

            expect(slotOrder()).toEqual(["event-tile-slot-pin", "23:59"]);
            expect(screen.getByTestId("event-tile")).toHaveClass(styles.hasPinSlot);
        });

        it("puts the pin before the time and the status after it", () => {
            renderTiles("bubble", { state: { isOwnEvent: true }, slots: { body: textBody("Hello"), pin, status } });

            expect(slotOrder()).toEqual(["event-tile-slot-pin", "23:59", "event-tile-slot-status"]);
        });

        it("shows no pin where the time is hidden", () => {
            renderTiles("bubble", { slots: { body: textBody("Hello"), timestamp: undefined, pin } });

            expect(screen.queryByTestId("pin")).not.toBeInTheDocument();
            expect(screen.getByTestId("event-tile")).not.toHaveClass(styles.hasPinSlot);
        });

        it.each(["ltr", "rtl"] as const)(
            "draws the pin 4px before the time in %s text, as tall as the time's line and centered on it",
            (dir) => {
                renderTiles("bubble", { slots: { body: textBody("Hello"), pin } });
                document.querySelector("ol")!.setAttribute("dir", dir);
                const slot = screen.getByTestId("event-tile-slot-pin").getBoundingClientRect();
                const time = timeRect();

                expect(dir === "ltr" ? time.left - slot.right : slot.left - time.right).toBe(4);
                expect(slot.height).toBe(time.height);
                expect(slot.top + slot.height / 2).toBe(time.top + time.height / 2);
                expect(pinRect().top + 6).toBe(time.top + time.height / 2);
            },
        );

        it("ends the time in the bubble's padding corner, with the pin before it", () => {
            renderTiles("bubble", { slots: { body: textBody("Hello"), pin } });
            const line = screen.getByTestId("event-tile-line").getBoundingClientRect();

            expect(line.right - timeRect().right).toBe(12);
            expect(pinRect().right).toBeLessThan(timeRect().left);
        });

        it("draws the pin in the time's secondary color", () => {
            renderTiles("bubble", { slots: { body: textBody("Hello"), pin } });
            const probe = document.createElement("span");
            probe.style.color = "var(--cpd-color-text-secondary)";
            screen.getByTestId("event-tile-line").append(probe);

            expect(getComputedStyle(screen.getByTestId("event-tile-slot-pin")).color).toBe(
                getComputedStyle(probe).color,
            );
        });

        it("keeps every last line of a text bubble clear of the pin and the time", () => {
            // Messages a narrow letter longer each, so that one of them ends where only the time would fit beside it
            const tiles = Array.from({ length: 60 }, (_, index) => ({
                slots: { body: textBody(`ok ${"i".repeat(index)}`), pin },
            }));
            renderTiles("bubble", ...tiles);

            for (const tile of screen.getAllByTestId("event-tile")) {
                const last = lastLineOf(tile.querySelector(".mx_EventTile_body")!);
                const mark = tile.querySelector("[data-testid='pin']")!.getBoundingClientRect();
                const overlaps = (box: DOMRect): boolean =>
                    last.top < box.bottom && box.top < last.bottom && last.right > box.left;

                expect(overlaps(mark)).toBe(false);
            }
        });

        it("puts the pin on the badge over a picture, before the time, in its white", () => {
            renderTiles("bubble", {
                line: { media: true, timestampOverMedia: true },
                slots: { body: <div style={{ width: 160, height: 120 }} />, pin },
            });
            const badge = screen.getByTestId("event-tile-slot-timestamp");

            expect(badge.parentElement).toBe(screen.getByTestId("event-tile-slot-body"));
            expect(pinRect().left - badge.getBoundingClientRect().left).toBe(8);
            expect(getComputedStyle(screen.getByTestId("event-tile-slot-pin")).color).toBe("rgb(255, 255, 255)");
        });

        it("keeps a picture wide enough for its badge with the pin", () => {
            renderTiles("bubble", {
                line: { media: true, timestampOverMedia: true },
                slots: { body: <div style={{ width: 1, height: 1 }} />, pin },
            });
            const minWidth = getComputedStyle(screen.getByTestId("event-tile-line")).getPropertyValue(
                "--image-body-min-width",
            );
            const probe = document.createElement("div");
            probe.style.width = minWidth;
            document.body.append(probe);

            // The time's room, the pin's 16px and the badge's padding and inset, 8px on each side
            expect(probe.getBoundingClientRect().width).toBe(30 + 16 + 32);
            probe.remove();
        });
    });
});
