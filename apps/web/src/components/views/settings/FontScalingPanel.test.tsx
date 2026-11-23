/*
Copyright 2024 New Vector Ltd.
Copyright 2021 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import * as TestUtils from "test-utils";

import FontScalingPanel from "./FontScalingPanel";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";

describe("FontScalingPanel", () => {
    it("renders the font scaling UI", () => {
        TestUtils.stubClient();
        const { asFragment } = render(<FontScalingPanel />);
        expect(asFragment()).toMatchSnapshot();
    });

    it("shows the size as a value row named Font size, without a group label saying it again", () => {
        TestUtils.stubClient();
        render(<FontScalingPanel />);

        expect(screen.getByRole("button", { name: /^Font size/ })).toHaveTextContent(/^Font size\d+ \(default\)$/);
        expect(screen.getAllByText("Font size")).toHaveLength(1);
        expect(screen.queryByRole("heading")).toBeNull();
    });

    it("sets the size chosen in the row's menu", async () => {
        TestUtils.stubClient();
        const setValue = vi.spyOn(SettingsStore, "setValue").mockResolvedValue(undefined);
        render(<FontScalingPanel />);

        await userEvent.click(screen.getByRole("button", { name: /^Font size/ }));
        const options = screen.getAllByRole("menuitemradio");
        const larger = options[options.findIndex((option) => option.getAttribute("aria-checked") === "true") + 1];
        await userEvent.click(larger);

        expect(setValue).toHaveBeenCalledWith("fontSizeDelta", null, SettingLevel.DEVICE, 1);
        expect(screen.getByRole("button", { name: /^Font size/ })).toHaveTextContent(larger.textContent!);
    });
});
