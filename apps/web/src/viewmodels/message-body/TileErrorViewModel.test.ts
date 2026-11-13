/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

// @vitest-environment happy-dom

import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import Modal from "../../Modal";
import ViewSource from "../../components/structures/ViewSource";
import { TileErrorViewModel } from "./TileErrorViewModel";

describe("TileErrorViewModel", () => {
    const createEvent = (type = "m.room.message"): MatrixEvent =>
        new MatrixEvent({
            content: {},
            event_id: `$${type}`,
            origin_server_ts: Date.now(),
            room_id: "!room:example.org",
            sender: "@alice:example.org",
            type,
        });

    const createVm = (
        overrides: Partial<ConstructorParameters<typeof TileErrorViewModel>[0]> = {},
    ): TileErrorViewModel => {
        const mxEvent = overrides.mxEvent ?? createEvent();

        return new TileErrorViewModel({
            developerMode: true,
            mxEvent,
            ...overrides,
        });
    };

    beforeEach(() => {
        vi.spyOn(Modal, "createDialog").mockImplementation(() => ({ close: vi.fn() }) as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("computes the initial snapshot from app state", () => {
        const vm = createVm();

        expect(vm.getSnapshot()).toEqual({
            message: "Can't load this message",
            eventType: "m.room.message",
            viewSourceCtaLabel: "View source",
        });
    });

    it("hides optional actions when unavailable", () => {
        const vm = createVm({ developerMode: false });

        expect(vm.getSnapshot().viewSourceCtaLabel).toBeUndefined();
    });

    it("guards setters against unchanged values", () => {
        const mxEvent = createEvent();
        const vm = createVm({ developerMode: true, mxEvent });
        const listener = vi.fn();
        vm.subscribe(listener);

        vm.setDeveloperMode(true);

        expect(listener).not.toHaveBeenCalled();
    });

    it("opens the view source dialog with the current event", () => {
        const mxEvent = createEvent("m.room.redaction");
        const vm = createVm({ mxEvent });

        vm.onViewSourceClick({} as any);

        expect(Modal.createDialog).toHaveBeenCalledWith(
            ViewSource,
            {
                mxEvent,
            },
            "mx_Dialog_viewsource",
        );
    });

    it("does not open view source when developer mode is disabled", () => {
        const vm = createVm({ developerMode: false });

        vm.onViewSourceClick({} as any);

        expect(vi.mocked(Modal.createDialog)).not.toHaveBeenCalled();
    });
});
