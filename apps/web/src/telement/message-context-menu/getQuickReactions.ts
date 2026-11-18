/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import * as recent from "../../emojipicker/recent";

/** How many reactions the message menu offers before the full picker, as Telegram does */
const QUICK_REACTION_COUNT = 6;

/** Telegram's default reactions, which fill the row until the user has used enough emoji of their own */
const TELEGRAM_REACTIONS = ["👍", "❤️", "🔥", "🥰", "👏", "😁"];

/**
 * The reactions the message menu offers: the emoji the user has used most, from the emoji picker's history, then
 * Telegram's defaults.
 */
export function getQuickReactions(): string[] {
    const reactions = new Set([...recent.get(QUICK_REACTION_COUNT), ...TELEGRAM_REACTIONS]);
    return [...reactions].slice(0, QUICK_REACTION_COUNT);
}
