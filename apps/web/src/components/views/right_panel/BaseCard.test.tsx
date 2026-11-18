/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "test-utils-rtl";
import { clientAndSDKContextRenderOptions } from "test-utils";

import BaseCard from "./BaseCard";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../../../stores/right-panel/RightPanelStorePhases";
import { SDKContextClass } from "../../../contexts/SDKContextClass";

vi.mock("../../../stores/right-panel/RightPanelStore", () => ({
    default: {
        instance: {
            popCard: vi.fn(),
            roomPhaseHistory: [],
        },
    },
}));

describe("<BaseCard />", () => {
    it("should close when clicking X button", async () => {
        const { asFragment } = render(
            <BaseCard header="Heading text">
                <div>Content</div>
            </BaseCard>,
            clientAndSDKContextRenderOptions(SDKContextClass.instance.client!, SDKContextClass.instance),
        );

        expect(screen.getByRole("heading")).toHaveTextContent("Heading text");
        expect(asFragment()).toMatchSnapshot();

        fireEvent.click(screen.getByTestId("base-card-close-button"));
        expect(RightPanelStore.instance.popCard).toHaveBeenCalled();
    });

    it("draws the back and close buttons in Compound's secondary kind, filled circles before they are hovered", () => {
        Object.assign(RightPanelStore.instance, {
            roomPhaseHistory: [{ phase: RightPanelPhases.RoomSummary }, { phase: RightPanelPhases.MemberInfo }],
        });
        try {
            render(
                <BaseCard header="Heading text">
                    <div>Content</div>
                </BaseCard>,
                clientAndSDKContextRenderOptions(SDKContextClass.instance.client!, SDKContextClass.instance),
            );

            expect(screen.getByTestId("base-card-back-button")).toHaveAttribute("data-kind", "secondary");
            expect(screen.getByTestId("base-card-close-button")).toHaveAttribute("data-kind", "secondary");
        } finally {
            Object.assign(RightPanelStore.instance, { roomPhaseHistory: [] });
        }
    });
});
