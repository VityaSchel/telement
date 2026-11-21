/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "test-utils-rtl";

import BetaCard from "./BetaCard";
import SettingsStore from "../../../settings/SettingsStore";
import { type FeatureSettingKey } from "../../../settings/Settings.tsx";

vi.mock("../../../settings/SettingsStore");

describe("<BetaCard />", () => {
    const featureId = "featureId" as FeatureSettingKey;

    beforeEach(() => {
        vi.mocked(SettingsStore).getBetaInfo.mockReturnValue({
            title: "title" as TranslationKey,
            caption: () => "caption",
        });
    });

    it("offers to join the beta when it is disabled", () => {
        vi.mocked(SettingsStore).getValue.mockReturnValue(false);
        render(<BetaCard featureId={featureId} />);
        expect(screen.getByRole("button", { name: "Join the beta" })).toBeInTheDocument();
    });

    it("offers to leave the beta when it is enabled", () => {
        vi.mocked(SettingsStore).getValue.mockReturnValue(true);
        render(<BetaCard featureId={featureId} />);
        expect(screen.getByRole("button", { name: "Leave the beta" })).toBeInTheDocument();
    });

    it("draws the dark illustration after the light one, for dark themes to swap them, loading it only when shown", () => {
        vi.mocked(SettingsStore).getBetaInfo.mockReturnValue({
            title: "title" as TranslationKey,
            caption: () => "caption",
            image: "light.png",
            darkImage: "dark.png",
        });
        const { container } = render(<BetaCard featureId={featureId} />);
        const images = [...container.querySelectorAll(".mx_BetaCard_columns_image_wrapper > img")];

        expect(
            images.map((image) => [image.className, image.getAttribute("src"), image.getAttribute("loading")]),
        ).toEqual([
            ["mx_BetaCard_columns_image", "light.png", null],
            ["mx_BetaCard_columns_image mx_BetaCard_columns_image_dark", "dark.png", "lazy"],
        ]);
    });

    it("draws only the light illustration when a beta has no dark one", () => {
        vi.mocked(SettingsStore).getBetaInfo.mockReturnValue({
            title: "title" as TranslationKey,
            caption: () => "caption",
            image: "light.png",
        });
        const { container } = render(<BetaCard featureId={featureId} />);

        expect(container.querySelectorAll(".mx_BetaCard_columns_image_wrapper > img")).toHaveLength(1);
    });

    it("leaves out the illustration's column when a beta has no illustration, so the description takes its room", () => {
        const { container } = render(<BetaCard featureId={featureId} />);

        expect(container.querySelector(".mx_BetaCard_columns_image_wrapper")).toBeNull();
        expect(container.querySelector(".mx_BetaCard_columns_image")).toBeNull();
    });
});
