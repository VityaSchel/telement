/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/**
 * Where a jump of the timeline came from: the message to go back to, such as the reply whose quote was clicked, or the
 * place the timeline was read at, as when a pinned message or a search result is opened.
 */
export type TimelineJumpOrigin = { eventId: string } | "readingPosition";

/** How many places back the timeline remembers: enough for a chain of quotes, without growing for ever. */
const MAX_RETURNS = 10;

/**
 * The places a room's timeline can go back to, as Telegram's jump to bottom button does: after a reply's quote, a pin or
 * a search result jumps the timeline, the button first returns to where the jump came from, then to the bottom. Each
 * jump adds a place and each return takes the last one.
 */
export class TimelineReturns {
    private readonly returns: string[] = [];

    /**
     * @param onChange - Called when the timeline gains its first place to return to or loses its last.
     */
    public constructor(private readonly onChange: (canReturn: boolean) => void) {}

    /** Whether the timeline has a place to return to. */
    public get canReturn(): boolean {
        return this.returns.length > 0;
    }

    /**
     * Remembers where a jump to `targetEventId` came from.
     *
     * @param readingPosition - The message the timeline is read at, if it isn't at the bottom, where jump to bottom goes
     *     anyway.
     */
    public recordJump(
        targetEventId: string,
        origin: TimelineJumpOrigin,
        readingPosition: () => string | undefined,
    ): void {
        const eventId = origin === "readingPosition" ? readingPosition() : origin.eventId;
        if (!eventId || eventId === targetEventId || eventId === this.returns.at(-1)) return;

        const couldReturn = this.canReturn;
        this.returns.push(eventId);
        if (this.returns.length > MAX_RETURNS) this.returns.shift();
        if (!couldReturn) this.onChange(true);
    }

    /** Takes the last place the timeline jumped from, to return to it. */
    public pop(): string | undefined {
        const eventId = this.returns.pop();
        if (eventId && !this.canReturn) this.onChange(false);
        return eventId;
    }

    /** Forgets every place, as when the timeline reaches its bottom or another room opens. */
    public clear(): void {
        if (!this.canReturn) return;
        this.returns.length = 0;
        this.onChange(false);
    }
}
