/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { render } from "test-utils-rtl";
import React from "react";
import { KnownMembership } from "matrix-js-sdk/src/types";
import { describe, it, expect } from "vitest";
import { mkRoomMember } from "test-utils";

import FacePile from "./FacePile";
import { CurrentRightPanelPhaseContext } from "../../../contexts/CurrentRightPanelPhaseContext";
import { RightPanelPhases } from "../../../stores/right-panel/RightPanelStorePhases";

describe("<FacePile />", () => {
    it("renders with a tooltip", () => {
        const member = mkRoomMember("123", "456", KnownMembership.Join);

        const { asFragment } = render(
            <FacePile members={[member]} size="36px" overflow={false} tooltipLabel="tooltip" />,
        );

        expect(asFragment()).toMatchSnapshot();
    });

    it.each([
        [RightPanelPhases.MemberList, true],
        [RightPanelPhases.MemberInfo, true],
        [RightPanelPhases.ThreePidMemberInfo, true],
        [RightPanelPhases.EncryptionPanel, true],
        [RightPanelPhases.RoomSummary, false],
    ])("marks the member list open while the right panel shows %s: %s", (currentPhase, toggled) => {
        const member = mkRoomMember("123", "456", KnownMembership.Join);

        const { container } = render(
            <CurrentRightPanelPhaseContext.Provider value={{ currentPhase, isPanelOpen: true }}>
                <FacePile members={[member]} size="36px" overflow={false} tooltipLabel="People" />
            </CurrentRightPanelPhaseContext.Provider>,
        );

        expect(container.querySelector(".mx_FacePile")!.classList.contains("mx_FacePile_toggled")).toBe(toggled);
    });
});
