/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/** A read receipt as the timeline shows it: who read, and when. */
interface ReceiptLike {
    /** The reader's user ID. */
    userId: string;
    /** When they read, in milliseconds since the Unix epoch. */
    ts: number;
}

/** A message the timeline shows, in timeline order. */
export interface SeenByEvent {
    /** The message's event ID. */
    eventId: string;
    /** Whether the user sent it. */
    isOwn: boolean;
}

/**
 * Who has read each of the user's own messages, for its read checks and the "Seen by" item of its menu: everyone
 * whose read receipt the timeline shows on the message or on a later one, as Telegram counts a message read once the
 * reader has read past it. Each list is most recent first and is shared by the messages it is the same for.
 *
 * @param events - the messages the timeline shows, oldest first
 * @param receiptsByEvent - the receipts the timeline shows on each of those messages, other than the user's own
 * @param receiptsAfter - the receipts on messages after the newest one shown, other than the user's own: their readers
 *     have read every message shown
 */
export function getSeenByOwnEvents<T extends ReceiptLike>(
    events: readonly SeenByEvent[],
    receiptsByEvent: ReadonlyMap<string, readonly T[]>,
    receiptsAfter: readonly T[] = [],
): Map<string, T[]> {
    const seenBy = new Map<string, T[]>();
    // A reader's latest receipt is the first one met going back from the newest message
    const readers = new Map<string, T>();
    let current: T[] = [];
    let changed = false;
    const addReaders = (receipts: readonly T[]): void => {
        for (const receipt of receipts) {
            if (readers.has(receipt.userId)) continue;
            readers.set(receipt.userId, receipt);
            changed = true;
        }
    };

    addReaders(receiptsAfter);
    for (let i = events.length - 1; i >= 0; i--) {
        const { eventId, isOwn } = events[i];
        addReaders(receiptsByEvent.get(eventId) ?? []);

        if (!isOwn) continue;
        if (changed) {
            current = [...readers.values()].sort((a, b) => b.ts - a.ts);
            changed = false;
        }
        seenBy.set(eventId, current);
    }

    return seenBy;
}
