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

            const lineSlotOrder = layout === "irc" ? ircLineSlotOrder : groupLineSlotOrder;
            const rootSlotOrder = layout === "irc" ? ircRootSlotOrder : groupRootSlotOrder;

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

    it.each(["group", "bubble"] as const)("renders the %s thread layout in the original slot order", (layout) => {
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
        const senderDetails = getByTestId("avatar").parentElement?.parentElement;
        const line = getByTestId("body").parentElement?.parentElement;

        if (!senderDetails || !line) {
            throw new Error("Expected EventTile thread layout elements to be present");
        }

        expect(senderDetails).toContainElement(getByTestId("sender"));
        expect(senderDetails).toHaveClass("legacy-sender-details");
        expect(senderDetails).toBe(root.firstElementChild);
        expect(line).toContainElement(getByTestId("reply-chain"));
        expect(line).toContainElement(getByTestId("action-bar"));
        expect(line).toContainElement(getByTestId("timestamp"));
        expect(line).toContainElement(getByTestId("receipt"));
        expect(getByTestId("footer").parentElement?.parentElement).toBe(root);

        expect(Array.from(line.children).map((child) => child.getAttribute("data-testid"))).toEqual([
            "event-tile-slot-replyChain",
            "event-tile-slot-body",
            "event-tile-slot-actionBar",
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

    const renderAddReactionButton = (isOwnEvent: boolean): HTMLElement => {
        const vm = new MockViewModel<ReactionsRowViewSnapshot>(reactionsSnapshot);
        const { getByRole } = render(
            <EventTileView
                {...createProps({
                    root: { ...renderState, state: { ...renderState.state, hasReply: false, isOwnEvent } },
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

    it("moves the add-reaction control ahead of the reactions in an own-message bubble", () => {
        // The footer is right-aligned for own messages, so an add-reaction control
        // left at the end of the row reserves space between the reactions and the
        // bubble edge even while it is hidden.
        expect(getComputedStyle(renderAddReactionButton(true)).order).toBe("-1");
    });

    it("keeps the add-reaction control after the reactions in another user's bubble", () => {
        expect(getComputedStyle(renderAddReactionButton(false)).order).toBe("0");
    });
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
        expect(document.elementFromPoint(right + 20, top + height / 2)).toBe(tile);
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
});
