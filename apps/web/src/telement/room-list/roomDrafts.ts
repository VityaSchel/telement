/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { TypedEventEmitter } from "matrix-js-sdk/src/matrix";

import { EDITOR_STATE_STORAGE_PREFIX } from "../../components/views/rooms/SendMessageComposer";
import { WYSIWYG_EDITOR_STATE_STORAGE_PREFIX } from "../../components/views/rooms/MessageComposer";

/** Emits a room's ID when the room's draft may have changed */
const emitter = new TypedEventEmitter<string, Record<string, () => void>>();
// Every room row in view listens for its own room
emitter.setMaxListeners(0);

let listeningToOtherTabs = false;

/** The local storage keys of a room's drafts in its main timeline. Thread drafts have the thread's ID after these. */
function draftKeys(roomId: string): string[] {
    return [EDITOR_STATE_STORAGE_PREFIX + roomId, WYSIWYG_EDITOR_STATE_STORAGE_PREFIX + roomId];
}

/** Another tab saved or cleared a draft. */
function onStorage(event: StorageEvent): void {
    if (event.storageArea !== localStorage || !event.key) return;
    for (const prefix of [EDITOR_STATE_STORAGE_PREFIX, WYSIWYG_EDITOR_STATE_STORAGE_PREFIX]) {
        if (event.key.startsWith(prefix)) emitter.emit(event.key.slice(prefix.length));
    }
}

/**
 * Tells the room list that a composer saved or cleared the draft of a room, which only the composers write.
 */
export function notifyDraftChanged(roomId: string): void {
    emitter.emit(roomId);
}

/**
 * Calls the listener whenever the draft of the room may have changed, in this tab or another. Returns a function that
 * stops it.
 */
export function onDraftChanged(roomId: string, listener: () => void): () => void {
    if (!listeningToOtherTabs) {
        window.addEventListener("storage", onStorage);
        listeningToOtherTabs = true;
    }
    emitter.on(roomId, listener);
    return () => emitter.off(roomId, listener);
}

/** The text of a draft saved by either composer, or undefined when it can't be read. */
function draftText(json: string): string | undefined {
    try {
        const draft = JSON.parse(json);
        if (Array.isArray(draft.parts)) {
            return draft.parts.map((part: { text?: string }) => part.text ?? "").join("");
        }
        // The rich text composer saves Markdown in its plain text mode
        if (typeof draft.content === "string") {
            if (!draft.isRichText) return draft.content;
            return new DOMParser().parseFromString(draft.content, "text/html").body.textContent ?? "";
        }
    } catch {
        // A draft that doesn't parse is not shown
    }
    return undefined;
}

/**
 * The draft of the room's main timeline as one line of plain text, or undefined when there is none. A draft that only
 * holds a reply, without text, doesn't count.
 */
export function getDraftPreview(roomId: string): string | undefined {
    for (const key of draftKeys(roomId)) {
        const json = localStorage.getItem(key);
        const text = json ? draftText(json)?.replace(/\s+/g, " ").trim() : undefined;
        if (text) return text;
    }
    return undefined;
}
