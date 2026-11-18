/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type KeyboardEvent, type Ref, useMemo } from "react";
import { EventType, type MatrixEvent, RelationType, type Relations } from "matrix-js-sdk/src/matrix";
import { ChevronDownIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { MatrixClientPeg } from "../../MatrixClientPeg";
import dis from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import { type FocusComposerPayload } from "../../dispatcher/payloads/FocusComposerPayload";
import { type TimelineRenderingType } from "../../contexts/RoomContext";
import { _t } from "../../languageHandler";
import { getKeyBindingsManager } from "../../KeyBindingsManager";
import { KeyBindingAction } from "../../accessibility/KeyboardShortcuts";
import { MenuItem, MenuItemCheckbox } from "../../components/structures/ContextMenu";
import * as recent from "../../emojipicker/recent";
import { getQuickReactions } from "./getQuickReactions";

const MENU_ITEM = '[role^="menuitem"]';

interface Props {
    /** The message the reactions go to. */
    mxEvent: MatrixEvent;
    /** The message's reactions, which tell which of the offered ones are the user's own. */
    reactions?: Relations | null;
    /** Whether the user may remove their own reactions. */
    canSelfRedact: boolean;
    /** The timeline the message is in, whose composer takes focus after reacting. */
    timelineRenderingType: TimelineRenderingType;
    /** Opens the full reaction picker. */
    onShowAllReactions: () => void;
    /** Closes the message menu. */
    onFinished: () => void;
    /** The row, where the full reaction picker opens. */
    ref?: Ref<HTMLDivElement>;
}

/** The user's own reactions to the message, by key. */
function getOwnReactions(reactions: Relations | null | undefined, userId: string): Map<string, MatrixEvent> {
    const own = new Map<string, MatrixEvent>();
    for (const event of reactions?.getAnnotationsBySender()?.[userId] ?? []) {
        const key = event.getRelation()?.key;
        if (key && !event.isRedacted()) own.set(key, event);
    }
    return own;
}

/**
 * Telegram's quick reactions above the message menu: the six emoji the user reacts with most and a button that opens
 * the full reaction picker. Choosing an emoji adds the reaction, or removes the user's own, and closes the menu.
 */
export function MessageQuickReactions({
    mxEvent,
    reactions,
    canSelfRedact,
    timelineRenderingType,
    onShowAllReactions,
    onFinished,
    ref,
}: Props): JSX.Element {
    const keys = useMemo(() => getQuickReactions(), []);
    const client = MatrixClientPeg.safeGet();
    const ownReactions = getOwnReactions(reactions, client.getSafeUserId());

    const onReact = (key: string): void => {
        const ownReaction = ownReactions.get(key);
        if (ownReaction) {
            void client.redactEvent(mxEvent.getRoomId()!, ownReaction.getId()!);
        } else {
            void client.sendEvent(mxEvent.getRoomId()!, EventType.Reaction, {
                "m.relates_to": {
                    rel_type: RelationType.Annotation,
                    event_id: mxEvent.getId()!,
                    key,
                },
            });
            dis.dispatch({ action: "message_sent" });
            // Reacting here counts towards the emoji offered next time, as reacting from the picker does
            recent.add(key);
        }
        dis.dispatch<FocusComposerPayload>({ action: Action.FocusAComposer, context: timelineRenderingType });
        onFinished();
    };

    // The menu moves through its items with the up and down keys and closes on left and right. In the row, left and
    // right move along it in its reading direction, down goes to the menu's first item and up stays, as the row is
    // the top of the menu.
    const onKeyDown = (ev: KeyboardEvent<HTMLDivElement>): void => {
        const row = ev.currentTarget;
        const action = getKeyBindingsManager().getAccessibilityAction(ev);
        let target: HTMLElement | undefined;
        if (action === KeyBindingAction.ArrowLeft || action === KeyBindingAction.ArrowRight) {
            const items = [...row.querySelectorAll<HTMLElement>(MENU_ITEM)];
            const isRtl = getComputedStyle(row).direction === "rtl";
            const step = (action === KeyBindingAction.ArrowRight) !== isRtl ? 1 : -1;
            target = items[items.indexOf(document.activeElement as HTMLElement) + step];
        } else if (action === KeyBindingAction.ArrowDown) {
            const menuItems = row.closest('[role="menu"]')?.querySelectorAll<HTMLElement>(MENU_ITEM) ?? [];
            target = [...menuItems].find((item) => !row.contains(item));
        } else if (action !== KeyBindingAction.ArrowUp) {
            return;
        }
        ev.preventDefault();
        ev.stopPropagation();
        target?.focus();
    };

    return (
        <div
            ref={ref}
            className="mx_MessageQuickReactions"
            role="group"
            aria-label={_t("telement|timeline|context_menu|quick_reactions")}
            onKeyDown={onKeyDown}
        >
            {keys.map((key) => {
                const isOwn = ownReactions.has(key);
                return (
                    <MenuItemCheckbox
                        key={key}
                        className="mx_MessageQuickReactions_reaction"
                        active={isOwn}
                        disabled={isOwn && !canSelfRedact}
                        onClick={() => onReact(key)}
                    >
                        {key}
                    </MenuItemCheckbox>
                );
            })}
            <MenuItem
                className="mx_MessageQuickReactions_more"
                label={_t("action|react")}
                aria-haspopup={true}
                onClick={onShowAllReactions}
            >
                <ChevronDownIcon />
            </MenuItem>
        </div>
    );
}
