/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX } from "react";
import classNames from "classnames";

import { useEventPresentation } from "../../EventPresentation";
import type { EventTileViewClassNames, EventTileViewProps, EventTileViewSlots } from "./EventTileView.types";
import styles from "./EventTileView.module.css";

type EventTileSlotName = keyof EventTileViewSlots;

/**
 * Renders the common EventTile root and event-line structure.
 *
 * Rendering-mode branches own the timeline-specific slot placement. The
 * application supplies render-ready content; this component owns the shared
 * structure, slot boundaries, placement classes, and root behavior.
 */
export function EventTileView({
    root,
    line: lineState,
    slots,
    classNames: classNameOverrides,
    refs,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    onClick,
    onContextMenu,
    onMouseDown,
    onDoubleClick,
    onPermalinkClick,
    onPermalinkContextMenu,
}: Readonly<EventTileViewProps>): JSX.Element {
    const Root = root.as ?? "li";
    const { layout, density } = useEventPresentation();
    const isRenderableSlot = (content: React.ReactNode): boolean =>
        content !== null && content !== undefined && typeof content !== "boolean";

    const renderSlot = (slotName: EventTileSlotName, content: React.ReactNode = slots[slotName]): React.ReactNode => {
        if (!isRenderableSlot(content)) return null;
        // The application context menu is portalled; its wrapper would become an empty flex item.
        if (slotName === "contextMenu") return <React.Fragment key={slotName}>{content}</React.Fragment>;

        const slotConfig: Record<EventTileSlotName, { style: string; className: keyof EventTileViewClassNames }> = {
            avatar: { style: styles.slotAvatar, className: "slotAvatar" },
            sender: { style: styles.slotSender, className: "slotSender" },
            body: { style: styles.slotBody, className: "slotBody" },
            timestamp: { style: styles.slotTimestamp, className: "slotTimestamp" },
            status: { style: styles.slotStatus, className: "slotStatus" },
            pin: { style: styles.slotPin, className: "slotPin" },
            padlock: { style: styles.slotPadlock, className: "slotPadlock" },
            replyChain: { style: styles.slotReplyChain, className: "slotReplyChain" },
            actionBar: { style: styles.slotActionBar, className: "slotActionBar" },
            footer: { style: styles.slotFooter, className: "slotFooter" },
            threadInfo: { style: styles.slotThreadInfo, className: "slotThreadInfo" },
            receipt: { style: styles.slotReceipt, className: "slotReceipt" },
            roomAvatar: { style: styles.slotAvatar, className: "slotAvatar" },
            notificationRoomLabel: { style: styles.slotNotificationRoomLabel, className: "slotNotificationRoomLabel" },
            notificationBadge: { style: styles.slotNotificationBadge, className: "slotNotificationBadge" },
            contextMenu: { style: styles.slotContextMenu, className: "slotContextMenu" },
        };

        const { style, className } = slotConfig[slotName];

        return (
            <div
                key={slotName}
                data-testid={`event-tile-slot-${slotName}`}
                className={classNames(style, classNameOverrides?.[className])}
            >
                {content}
            </div>
        );
    };

    const renderSlots = (...slotNames: EventTileSlotName[]): React.ReactNode =>
        slotNames.map((slotName) => renderSlot(slotName));

    const hasReceiptSlot = isRenderableSlot(slots.receipt);
    // The status of your own message follows its time, so it shows only where the time does
    const hasStatusSlot = isRenderableSlot(slots.status) && isRenderableSlot(slots.timestamp);
    // So does the pin of a pinned message, which precedes the time
    const hasPinSlot = isRenderableSlot(slots.pin) && isRenderableSlot(slots.timestamp);
    const timestampOverMedia = !!lineState?.timestampOverMedia;
    // In bubbles a message's avatar sits beside the bottom of its bubble, so it follows the line. Informational and
    // full-width rows keep it before their content.
    const avatarFollowsLine =
        layout === "bubble" && !root.state.info && !root.state.bubbleContainer && !root.state.leftAlignedBubble;
    // Reactions sit at the bottom of the bubble, before the time, as in Telegram. Messages drawn without a bubble, such
    // as an emote or a picture without a caption, keep them under the message.
    const footerInLine = avatarFollowsLine && !root.state.noBubble && !timestampOverMedia;
    // In bubbles an informational row ends its text with its time, as a bubble ends its last line, so the time follows
    // the text. Elsewhere the time is drawn at the end of the message's last line, or in the bubble's corner after its
    // reactions, so it ends the line: Tab reaches it after the message's links and reactions, as they are drawn.
    const timestampEndsText = layout === "bubble" && !!root.state.info;

    const lineClassName = classNames(styles.line, classNameOverrides?.line, {
        [styles.lineMedia]: lineState?.media,
        [styles.lineEmote]: lineState?.emote,
        [styles.lineTimestampOverMedia]: timestampOverMedia,
    });

    // The status sits in the time's slot, after the time, and the pin before it, so that they go wherever the time goes:
    // the bubble's corner, the badge over a picture or the end of an emote's line.
    const renderTimestamp = (): React.ReactNode =>
        renderSlot(
            "timestamp",
            hasStatusSlot || hasPinSlot ? (
                <>
                    {hasPinSlot && renderSlot("pin")}
                    {slots.timestamp}
                    {hasStatusSlot && renderSlot("status")}
                </>
            ) : (
                slots.timestamp
            ),
        );

    // A timestamp drawn over the media sits inside the body slot, so that it follows the media's own size.
    const renderBody = (): React.ReactNode =>
        timestampOverMedia
            ? renderSlot(
                  "body",
                  <>
                      {slots.body}
                      {renderTimestamp()}
                  </>,
              )
            : renderSlot("body");
    const renderLineTimestamp = (): React.ReactNode => (timestampOverMedia ? null : renderTimestamp());

    const renderRoot = (
        children: React.ReactNode,
        rootClickHandler: React.MouseEventHandler<HTMLElement> | undefined,
        rootTabIndex?: number,
        rootContextMenuHandler?: React.MouseEventHandler<HTMLElement>,
    ): JSX.Element => (
        <Root
            ref={refs?.root}
            className={classNames(styles.root, classNameOverrides?.root, {
                [styles.stateOwnEvent]: root.state.isOwnEvent,
                [styles.hasReceiptSlot]: hasReceiptSlot,
                [styles.hasStatusSlot]: hasStatusSlot,
                [styles.hasPinSlot]: hasPinSlot,
                [styles.stateInfo]: root.state?.info,
                [styles.stateBubbleContainer]: root.state?.bubbleContainer,
                [styles.stateLeftAlignedBubble]: root.state?.leftAlignedBubble,
                [styles.stateAlignedBetweenBubbles]: root.state?.alignedBetweenBubbles,
                [styles.stateNoBubble]: root.state?.noBubble,
                [styles.stateNoSender]: root.state?.noSender,
                [styles.stateEncryptionFailure]: root.state?.encryptionFailure,
                [styles.stateEmote]: root.state?.emote,
                [styles.stateHasReply]: root.state?.hasReply,
                [styles.stateHighlighted]: root.state?.highlighted,
                [styles.stateSelected]: root.state?.selected,
                [styles.stateJumpedTo]: root.state?.jumpedTo,
                [styles.stateKeyboardTarget]: root.state?.keyboardTarget,
                [styles.stateEditing]: root.state?.editing,
                [styles.stateContinuation]: root.state?.continuation,
                [styles.stateLastInSection]: root.state?.lastInSection,
                [styles.stateContextual]: root.state?.contextual,
                [styles.stateActionBarFocused]: root.state?.actionBarFocused,
                [styles.statePreviewClamped]: root.state?.previewClamped,
                [styles.stateTwelveHourTimestamp]: root.state?.twelveHourTimestamp,
                [styles.densityCompact]: density === "compact",
                [styles.layoutGroup]: layout === "group",
                [styles.layoutBubble]: layout === "bubble",
                [styles.layoutIrc]: layout === "irc",
                [styles.shapeThread]: root.shape === "Thread",
                [styles.shapeThreadsList]: root.shape === "ThreadsList",
                [styles.shapeCard]: root.shape === "Card",
                [styles.shapeSearch]: root.shape === "Search",
                [styles.shapeFile]: root.shape === "File",
                [styles.shapeNotification]: root.shape === "Notification",
            })}
            aria-live={root.ariaLive}
            aria-atomic={true}
            data-scroll-tokens={root.scrollToken}
            data-event-id={root.eventId}
            data-testid="event-tile"
            tabIndex={rootTabIndex}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onFocus={onFocus}
            onBlur={onBlur}
            onClick={rootClickHandler}
            onContextMenu={rootContextMenuHandler}
            onMouseDown={onMouseDown}
            onDoubleClick={onDoubleClick}
        >
            {children}
        </Root>
    );

    // Thread view: sender details, line content, then footer. The whole row opens the context menu.
    if (root.shape === "Thread") {
        return renderRoot(
            <>
                <div className={classNames(styles.senderDetails, classNameOverrides?.senderDetails)}>
                    {!avatarFollowsLine && renderSlot("avatar")}
                    {renderSlot("sender")}
                </div>
                <div id={root.id} data-testid="event-tile-line" className={lineClassName}>
                    {renderSlots("contextMenu", "replyChain")}
                    {renderBody()}
                    {renderSlot("actionBar")}
                    {footerInLine && renderSlot("footer")}
                    {renderLineTimestamp()}
                    {renderSlot("receipt")}
                </div>
                {avatarFollowsLine && renderSlot("avatar")}
                {!footerInLine && renderSlot("footer")}
            </>,
            undefined,
            undefined,
            onContextMenu,
        );
    }

    // Notification view: metadata, room avatar, and preview content.
    if (root.shape === "Notification") {
        return renderRoot(
            <>
                <div className={classNames(styles.details, classNameOverrides?.details)}>
                    {renderSlots("sender", "notificationRoomLabel", "timestamp", "notificationBadge")}
                </div>
                {slots.roomAvatar ? renderSlot("roomAvatar") : renderSlot("avatar")}
                <div id={root.id} data-testid="event-tile-line" className={lineClassName}>
                    {renderSlots("body", "threadInfo")}
                </div>
                {renderSlot("receipt")}
            </>,
            onClick,
            -1,
        );
    }

    // ThreadsList view: metadata, avatar, preview content, and action bar.
    if (root.shape === "ThreadsList") {
        return renderRoot(
            <>
                <div className={classNames(styles.details, classNameOverrides?.details)}>
                    {renderSlots("sender", "notificationRoomLabel", "timestamp", "notificationBadge")}
                </div>
                {renderSlot("avatar")}
                <div id={root.id} data-testid="event-tile-line" className={lineClassName}>
                    {renderSlots("contextMenu", "body", "threadInfo")}
                </div>
                {renderSlot("actionBar")}
                {renderSlot("receipt")}
            </>,
            onClick,
            -1,
            onContextMenu,
        );
    }

    // File view: permalink-wrapped sender details followed by the file body.
    if (root.shape === "File") {
        return renderRoot(
            <>
                <a
                    className={classNames(styles.senderDetailsLink, classNameOverrides?.senderDetailsLink)}
                    href={root.permalink ?? "#"}
                    onClick={onPermalinkClick}
                >
                    <div
                        className={classNames(styles.senderDetails, classNameOverrides?.senderDetails)}
                        onContextMenu={onPermalinkContextMenu}
                    >
                        {renderSlots("avatar", "sender", "timestamp")}
                    </div>
                </a>
                <div id={root.id} data-testid="event-tile-line" className={lineClassName} onContextMenu={onContextMenu}>
                    {renderSlots("contextMenu", "body")}
                </div>
            </>,
            undefined,
        );
    }

    // Default shape: Card, Pinned, Room, Search

    // IRC layout: the leading metadata slots precede the line content. The whole row opens the context menu.
    if (layout === "irc") {
        return renderRoot(
            <>
                {renderSlots("timestamp", "padlock", "avatar", "sender")}
                <div id={root.id} data-testid="event-tile-line" className={lineClassName}>
                    {renderSlots("contextMenu", "replyChain", "body", "actionBar", "footer", "threadInfo")}
                </div>
                {renderSlot("receipt")}
            </>,
            undefined,
            -1,
            onContextMenu,
        );
    }

    // Group and bubble layouts: sender details precede the line content. The whole row opens the context menu.
    return renderRoot(
        <>
            {renderSlot("sender")}
            {!avatarFollowsLine && renderSlot("avatar")}
            <div id={root.id} data-testid="event-tile-line" className={lineClassName}>
                {renderSlot("contextMenu")}
                {renderSlots("padlock", "replyChain")}
                {renderBody()}
                {timestampEndsText && renderLineTimestamp()}
                {renderSlot("actionBar")}
                {footerInLine && renderSlot("footer")}
                {!timestampEndsText && renderLineTimestamp()}
            </div>
            {avatarFollowsLine && renderSlot("avatar")}
            {!footerInLine && renderSlot("footer")}
            {renderSlots("threadInfo", "receipt")}
        </>,
        undefined,
        -1,
        onContextMenu,
    );
}
