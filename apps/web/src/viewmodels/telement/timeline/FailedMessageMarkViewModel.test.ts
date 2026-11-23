/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { EventStatus, type MatrixClient, MatrixEvent } from "matrix-js-sdk/src/matrix";

import Resend from "../../../Resend";
import { FailedMessageMarkViewModel } from "./FailedMessageMarkViewModel";

describe("FailedMessageMarkViewModel", () => {
    const client = {} as MatrixClient;
    const message = (status: EventStatus | null, eventId = "$message"): MatrixEvent => {
        const event = new MatrixEvent({ type: "m.room.message", event_id: eventId, content: { body: "Hi" } });
        event.setStatus(status);
        return event;
    };

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("opens and closes its menu", () => {
        const vm = new FailedMessageMarkViewModel({ mxEvent: message(EventStatus.NOT_SENT), client });
        expect(vm.getSnapshot()).toEqual({ menuOpen: false });

        vm.setMenuOpen(true);
        expect(vm.getSnapshot()).toEqual({ menuOpen: true });

        vm.setMenuOpen(false);
        expect(vm.getSnapshot()).toEqual({ menuOpen: false });
    });

    it("sends a message that failed again, or takes it out of the queue", () => {
        const resend = vi.spyOn(Resend, "resend").mockResolvedValue();
        const removeFromQueue = vi.spyOn(Resend, "removeFromQueue").mockImplementation(() => {});
        const mxEvent = message(EventStatus.NOT_SENT);
        const vm = new FailedMessageMarkViewModel({ mxEvent, client });

        vm.resend();
        vm.delete();

        expect(resend).toHaveBeenCalledWith(client, mxEvent);
        expect(removeFromQueue).toHaveBeenCalledWith(client, mxEvent);
    });

    it("acts on the edit that failed rather than on the message it edits", () => {
        const resend = vi.spyOn(Resend, "resend").mockResolvedValue();
        const removeFromQueue = vi.spyOn(Resend, "removeFromQueue").mockImplementation(() => {});
        const mxEvent = message(null);
        const edit = message(EventStatus.NOT_SENT, "$edit");
        vi.spyOn(mxEvent, "replacingEvent").mockReturnValue(edit);
        const vm = new FailedMessageMarkViewModel({ mxEvent, client });

        vm.resend();
        vm.delete();

        expect(resend).toHaveBeenCalledWith(client, edit);
        expect(removeFromQueue).toHaveBeenCalledWith(client, edit);
    });

    it("follows the tile to another message", () => {
        const resend = vi.spyOn(Resend, "resend").mockResolvedValue();
        const vm = new FailedMessageMarkViewModel({ mxEvent: message(EventStatus.NOT_SENT), client });
        const other = message(EventStatus.NOT_SENT, "$other");

        vm.setEvent(other);
        vm.resend();

        expect(resend).toHaveBeenCalledWith(client, other);
    });

    it("does nothing once nothing is left to send", () => {
        const resend = vi.spyOn(Resend, "resend").mockResolvedValue();
        const removeFromQueue = vi.spyOn(Resend, "removeFromQueue").mockImplementation(() => {});
        const vm = new FailedMessageMarkViewModel({ mxEvent: message(null), client });

        vm.resend();
        vm.delete();

        expect(resend).not.toHaveBeenCalled();
        expect(removeFromQueue).not.toHaveBeenCalled();
    });
});
