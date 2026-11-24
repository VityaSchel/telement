/*
 * Copyright 2024 New Vector Ltd.
 * Copyright 2024 The Matrix.org Foundation C.I.C.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, type RenderResult, screen, waitFor } from "test-utils-rtl";
import { stubClient } from "test-utils";

import { LayoutSwitcher } from "./LayoutSwitcher";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";
import { Layout } from "../../../settings/enums/Layout";
import { OwnProfileStore } from "../../../stores/OwnProfileStore";
import { UPDATE_EVENT } from "../../../stores/AsyncStore";

describe("<LayoutSwitcher />", () => {
    const matrixClient = stubClient();
    const displayName = vi.spyOn(OwnProfileStore.instance, "displayName", "get");

    function renderLayoutSwitcher(): RenderResult {
        return render(
            <MatrixClientContext.Provider value={matrixClient}>
                <LayoutSwitcher />
            </MatrixClientContext.Provider>,
        );
    }

    beforeEach(async () => {
        await SettingsStore.setValue("layout", null, SettingLevel.DEVICE, Layout.Group);
        displayName.mockReturnValue("Alice");
    });

    it("should render", async () => {
        const { asFragment } = renderLayoutSwitcher();
        expect(asFragment()).toMatchSnapshot();
    });

    it("should show the previews from the first render, in the name the app already has, and then in the latest", () => {
        renderLayoutSwitcher();

        // At once, without a spinner or the Matrix ID, or asking the server
        expect(screen.getAllByText("Alice")).toHaveLength(3);
        expect(screen.queryByText(matrixClient.getSafeUserId())).toBeNull();
        expect(screen.queryByLabelText("Loading…")).toBeNull();
        expect(matrixClient.getProfileInfo).not.toHaveBeenCalled();

        displayName.mockReturnValue("Alicia");
        act(() => void OwnProfileStore.instance.emit(UPDATE_EVENT));
        expect(screen.getAllByText("Alicia")).toHaveLength(3);
    });

    it("should show each preview as a message on its own, the last of its run", async () => {
        const { container } = renderLayoutSwitcher();
        const previews = container.querySelectorAll('[data-testid="event-tile"]');

        expect(previews).toHaveLength(3);
        for (const preview of previews) {
            expect(preview.className).toMatch(/stateLastInSection/);
        }
    });

    describe("layout selection", () => {
        it("should stretch the layout cards across their group's card", async () => {
            renderLayoutSwitcher();
            expect(screen.getByRole("radio", { name: "Modern" }).closest(".mx_SettingsSubsection_content")).toHaveClass(
                "mx_SettingsSubsection_contentStretch",
            );
        });

        it("should display the modern layout", async () => {
            renderLayoutSwitcher();
            expect(screen.getByRole("radio", { name: "Modern" })).toBeChecked();
        });

        it("should change the layout when selected", async () => {
            renderLayoutSwitcher();
            act(() => screen.getByRole("radio", { name: "Message bubbles" }).click());

            expect(screen.getByRole("radio", { name: "Message bubbles" })).toBeChecked();
            await waitFor(() => expect(SettingsStore.getValue("layout")).toBe(Layout.Bubble));
        });
    });

    describe("compact layout", () => {
        beforeEach(async () => {
            await SettingsStore.setValue("useCompactLayout", null, SettingLevel.DEVICE, false);
        });

        it("should be enabled", async () => {
            await SettingsStore.setValue("useCompactLayout", null, SettingLevel.DEVICE, true);
            renderLayoutSwitcher();

            expect(screen.getByRole("switch", { name: "Show compact text and messages" })).toBeChecked();
        });

        it("should change the setting when toggled", async () => {
            renderLayoutSwitcher();
            act(() => screen.getByRole("switch", { name: "Show compact text and messages" }).click());

            await waitFor(() => expect(SettingsStore.getValue("useCompactLayout")).toBe(true));
        });

        it("should be disabled when the modern layout is not enabled", async () => {
            await SettingsStore.setValue("layout", null, SettingLevel.DEVICE, Layout.Bubble);
            renderLayoutSwitcher();
            expect(screen.getByRole("switch", { name: "Show compact text and messages" })).toBeDisabled();
        });

        it("should say why it is disabled only while it is", async () => {
            const hint = "Modern layout must be selected to use this feature.";
            await SettingsStore.setValue("layout", null, SettingLevel.DEVICE, Layout.Bubble);
            const { unmount } = renderLayoutSwitcher();
            expect(screen.getByText(hint)).toBeInTheDocument();
            unmount();

            await SettingsStore.setValue("layout", null, SettingLevel.DEVICE, Layout.Group);
            renderLayoutSwitcher();
            expect(screen.getByRole("switch", { name: "Show compact text and messages" })).toBeEnabled();
            expect(screen.queryByText(hint)).toBeNull();
        });

        it("should keep layout previews at the default density", async () => {
            await SettingsStore.setValue("useCompactLayout", null, SettingLevel.DEVICE, true);
            const { container } = renderLayoutSwitcher();

            const groupPreviewSender = container.querySelector(
                '[data-testid="event-tile-slot-sender"] [data-event-layout="group"]',
            );
            expect(groupPreviewSender).toHaveAttribute("data-event-density", "default");
        });
    });
});
