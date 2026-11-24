/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";

import ImageSizePanel from "./ImageSizePanel";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";
import { ImageSize } from "../../../settings/enums/ImageSize";

describe("<ImageSizePanel />", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("stretches the sizes across their group's card, so that they can share its width", () => {
        render(<ImageSizePanel />);

        expect(screen.getByRole("radio", { name: "Default" }).closest(".mx_SettingsSubsection_content")).toHaveClass(
            "mx_SettingsSubsection_contentStretch",
        );
    });

    it("draws each size as a card that is its label, headed by the radio, over its drawing", () => {
        render(<ImageSizePanel />);

        for (const name of ["Default", "Large"]) {
            const card = screen.getByRole("radio", { name }).closest("label")!;
            expect(card).toHaveClass("mx_ImageSizePanel_choice");
            expect(card.firstElementChild).toHaveClass("mx_ImageSizePanel_header");
            expect(card.lastElementChild).toHaveClass("mx_ImageSizePanel_size");
        }
    });

    it("sets the size of the card that is clicked, on its drawing too", async () => {
        const setValue = vi.spyOn(SettingsStore, "setValue").mockResolvedValue(undefined);
        render(<ImageSizePanel />);
        const large = screen.getByRole("radio", { name: "Large" });

        await userEvent.click(large.closest("label")!.querySelector(".mx_ImageSizePanel_size")!);

        expect(large).toBeChecked();
        expect(screen.getByRole("radio", { name: "Default" })).not.toBeChecked();
        expect(setValue).toHaveBeenCalledWith("Images.size", null, SettingLevel.ACCOUNT, ImageSize.Large);
    });
});
