/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React, { type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "test-utils-rtl";
import { type UploadButton } from "@element-hq/web-shared-components";
import { createTestClient, mkStubRoom, stubClient } from "test-utils";

import MatrixClientContext from "../../contexts/MatrixClientContext";
import { ScopedRoomContextProvider } from "../../contexts/ScopedRoomContext";
import { type RoomContextType, TimelineRenderingType } from "../../contexts/RoomContext";
import { RoomUploadContextProvider } from "../../viewmodels/room/RoomUploadViewModel";
import { AttachButton } from "./AttachButton";

// Radix places the menu with the browser's layout, which happy-dom doesn't have, so this checks what the paperclip asks
// of the shared button; UploadButton's own tests check that the menu follows it.
vi.mock("@element-hq/web-shared-components", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@element-hq/web-shared-components")>()),
    UploadButton: ({ menuAlign, menuClassName }: ComponentProps<typeof UploadButton>) => (
        <button data-menu-align={menuAlign} data-menu-class={menuClassName}>
            Attachment
        </button>
    ),
}));

describe("AttachButton", () => {
    stubClient();
    const client = createTestClient();

    it("opens its menu from the paperclip's start, over the timeline, with the class that lifts it off the composer", () => {
        const room = mkStubRoom("!room:server", "Room", client);
        const roomContext = {
            room,
            timelineRenderingType: TimelineRenderingType.Room,
        } satisfies Partial<RoomContextType> as RoomContextType;

        render(
            <MatrixClientContext.Provider value={client}>
                <ScopedRoomContextProvider {...roomContext}>
                    <RoomUploadContextProvider>
                        <AttachButton room={room} showPolls showLocation />
                    </RoomUploadContextProvider>
                </ScopedRoomContextProvider>
            </MatrixClientContext.Provider>,
        );

        const button = screen.getByRole("button", { name: "Attachment" });
        expect(button).toHaveAttribute("data-menu-align", "start");
        expect(button).toHaveAttribute("data-menu-class", "mx_TelementAttachMenu");
    });
});
