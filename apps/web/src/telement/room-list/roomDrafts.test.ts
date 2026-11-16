/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import { getDraftPreview, notifyDraftChanged, onDraftChanged } from "./roomDrafts";

const ROOM_ID = "!room:example.org";

describe("roomDrafts", () => {
    afterEach(() => {
        localStorage.clear();
    });

    describe("getDraftPreview", () => {
        it("joins the basic composer's parts into one line", () => {
            localStorage.setItem(
                `mx_cider_state_${ROOM_ID}`,
                JSON.stringify({
                    parts: [
                        { type: "plain", text: "Hello " },
                        { type: "user-pill", text: "Alice", resourceId: "@alice:example.org" },
                        { type: "newline", text: "\n" },
                        { type: "plain", text: "  see you  " },
                    ],
                }),
            );

            expect(getDraftPreview(ROOM_ID)).toBe("Hello Alice see you");
        });

        it("takes the text of the rich text composer's HTML", () => {
            localStorage.setItem(
                `mx_wysiwyg_state_${ROOM_ID}`,
                JSON.stringify({ content: "<p><strong>Bold</strong> &amp; plain</p><p>next</p>", isRichText: true }),
            );

            expect(getDraftPreview(ROOM_ID)).toBe("Bold & plainnext");
        });

        it("keeps the Markdown of the rich text composer's plain text mode", () => {
            localStorage.setItem(
                `mx_wysiwyg_state_${ROOM_ID}`,
                JSON.stringify({ content: "**Bold** <b>", isRichText: false }),
            );

            expect(getDraftPreview(ROOM_ID)).toBe("**Bold** <b>");
        });

        it("ignores a draft that only holds a reply", () => {
            localStorage.setItem(`mx_cider_state_${ROOM_ID}`, JSON.stringify({ parts: [], replyEventId: "$event" }));

            expect(getDraftPreview(ROOM_ID)).toBeUndefined();
        });

        it("ignores thread drafts and drafts that don't parse", () => {
            localStorage.setItem(
                `mx_cider_state_${ROOM_ID}_$thread`,
                JSON.stringify({ parts: [{ type: "plain", text: "In a thread" }] }),
            );
            localStorage.setItem(`mx_wysiwyg_state_${ROOM_ID}`, "{");

            expect(getDraftPreview(ROOM_ID)).toBeUndefined();
        });
    });

    describe("onDraftChanged", () => {
        it("calls the room's listeners until they stop", () => {
            const listener = vi.fn();
            const otherRoomListener = vi.fn();
            const stop = onDraftChanged(ROOM_ID, listener);
            const stopOther = onDraftChanged("!other:example.org", otherRoomListener);

            notifyDraftChanged(ROOM_ID);
            stop();
            notifyDraftChanged(ROOM_ID);
            stopOther();

            expect(listener).toHaveBeenCalledTimes(1);
            expect(otherRoomListener).not.toHaveBeenCalled();
        });

        it("hears drafts that another tab saves", () => {
            const listener = vi.fn();
            const stop = onDraftChanged(ROOM_ID, listener);

            window.dispatchEvent(
                new StorageEvent("storage", { key: `mx_wysiwyg_state_${ROOM_ID}`, storageArea: localStorage }),
            );
            window.dispatchEvent(new StorageEvent("storage", { key: "mx_other_setting", storageArea: localStorage }));
            stop();

            expect(listener).toHaveBeenCalledTimes(1);
        });
    });
});
