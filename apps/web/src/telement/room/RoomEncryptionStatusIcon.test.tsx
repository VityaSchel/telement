/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "test-utils-rtl";

import { E2EStatus } from "../../utils/ShieldUtils";
import { RoomEncryptionStatusIcon } from "./RoomEncryptionStatusIcon";

describe("RoomEncryptionStatusIcon", () => {
    it("shows the lock for an unencrypted room in the secondary gray, as it is a status rather than an action", () => {
        render(<RoomEncryptionStatusIcon isRoomEncrypted={false} isDirectMessage={false} e2eStatus={null} />);

        expect(screen.getByLabelText("Messages in this room are not end-to-end encrypted")).toHaveAttribute(
            "color",
            "var(--cpd-color-icon-secondary)",
        );
    });

    it.each([
        [E2EStatus.Verified, "Verified"],
        [E2EStatus.Warning, "Untrusted"],
    ])("shows %s for a group room", (e2eStatus, label) => {
        render(<RoomEncryptionStatusIcon isRoomEncrypted={true} isDirectMessage={false} e2eStatus={e2eStatus} />);

        expect(screen.getByLabelText(label)).toBeInTheDocument();
    });

    it.each([
        ["a DM, whose header already shows verification", true, E2EStatus.Warning, true],
        ["a group room whose members are neither verified nor warned about", true, E2EStatus.Normal, false],
        ["a room whose encryption state is still loading", null, E2EStatus.Warning, false],
    ])("shows nothing for %s", (_name, isRoomEncrypted, e2eStatus, isDirectMessage) => {
        const { container } = render(
            <RoomEncryptionStatusIcon
                isRoomEncrypted={isRoomEncrypted}
                isDirectMessage={isDirectMessage}
                e2eStatus={e2eStatus}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
