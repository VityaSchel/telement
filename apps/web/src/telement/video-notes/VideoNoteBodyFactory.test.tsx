/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "test-utils-rtl";
import { EventType, MatrixEvent } from "matrix-js-sdk/src/matrix";

import { type Media, mediaFromContent } from "../../customisations/Media";
import SettingsStore from "../../settings/SettingsStore";
import { useMediaVisible } from "../../hooks/useMediaVisible";
import { VideoNoteBodyFactory } from "./VideoNoteBodyFactory";

vi.mock("../../customisations/Media", () => ({
    mediaFromContent: vi.fn(),
}));

vi.mock("../../hooks/useMediaVisible", () => ({
    useMediaVisible: vi.fn(),
}));

describe("VideoNoteBodyFactory", () => {
    const event = new MatrixEvent({
        type: EventType.RoomMessage,
        room_id: "!room:server",
        event_id: "$note:server",
        sender: "@alice:server",
        content: {
            "msgtype": "m.video",
            "body": "Video message.mp4",
            "url": "mxc://server/note",
            "org.interferolog.circle": true,
            "info": { w: 512, h: 512, duration: 7000, mimetype: "video/mp4" },
        },
    });

    beforeEach(() => {
        vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
        vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
        vi.spyOn(SettingsStore, "unwatchSetting").mockImplementation(vi.fn());
        vi.mocked(mediaFromContent).mockReturnValue({
            isEncrypted: false,
            srcHttp: "https://server/note.mp4",
            hasThumbnail: true,
            thumbnailHttp: "https://server/note.jpg",
        } as unknown as Media);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders the note as a circle with a play button", () => {
        vi.mocked(useMediaVisible).mockReturnValue([true, vi.fn()]);

        const { container, getByRole } = render(<VideoNoteBodyFactory mxEvent={event} />);

        expect(container.querySelector("video")).toHaveAttribute("src", "https://server/note.mp4");
        expect(getByRole("button", { name: "Play video message" })).toBeInTheDocument();
    });

    it("reveals hidden media through the preview button", () => {
        const setMediaVisible = vi.fn();
        vi.mocked(useMediaVisible).mockReturnValue([false, setMediaVisible]);

        const { getByRole } = render(<VideoNoteBodyFactory mxEvent={event} />);
        fireEvent.click(getByRole("button", { name: "Show video" }));

        expect(setMediaVisible).toHaveBeenCalledWith(true);
    });
});
