/*
Copyright 2024 New Vector Ltd.
Copyright 2021 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "test-utils-rtl";
import * as TestUtils from "test-utils";

import FontScalingPanel from "./FontScalingPanel";

describe("FontScalingPanel", () => {
    it("renders the font scaling UI", () => {
        TestUtils.stubClient();
        const { asFragment } = render(<FontScalingPanel />);
        expect(asFragment()).toMatchSnapshot();
    });

    it("names the dropdown after its group's label rather than repeating it as a floated label", () => {
        TestUtils.stubClient();
        render(<FontScalingPanel />);

        expect(screen.getByRole("combobox", { name: "Font size" })).toBeInTheDocument();
        expect(screen.getAllByText("Font size")).toHaveLength(1);
    });
});
