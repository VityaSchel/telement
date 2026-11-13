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
});
