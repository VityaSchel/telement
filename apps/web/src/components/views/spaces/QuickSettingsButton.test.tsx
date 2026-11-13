/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";

import QuickSettingsButton from "./QuickSettingsButton";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";

describe("QuickSettingsButton", () => {
    it("opens the settings dialog directly", async () => {
        const dispatchSpy = vi.spyOn(defaultDispatcher, "dispatch");
        render(<QuickSettingsButton isPanelCollapsed={true} />);

        await userEvent.click(screen.getByRole("button", { name: "Settings" }));

        expect(dispatchSpy).toHaveBeenCalledWith({ action: Action.ViewUserSettings });
    });

    it("shows its label when the panel is expanded", () => {
        const { asFragment } = render(<QuickSettingsButton isPanelCollapsed={false} />);

        expect(screen.getByText("Settings")).toBeInTheDocument();
        expect(asFragment()).toMatchSnapshot();
    });
});
