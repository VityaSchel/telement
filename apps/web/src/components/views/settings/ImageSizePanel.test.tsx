/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "test-utils-rtl";

import ImageSizePanel from "./ImageSizePanel";

describe("<ImageSizePanel />", () => {
    it("stretches the sizes across their group's card, so that they can share its width", () => {
        render(<ImageSizePanel />);

        expect(screen.getByRole("radio", { name: "Default" }).closest(".mx_SettingsSubsection_content")).toHaveClass(
            "mx_SettingsSubsection_contentStretch",
        );
    });
});
