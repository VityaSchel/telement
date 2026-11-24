/*
Copyright 2024 New Vector Ltd.
Copyright 2021 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, type RenderResult, screen } from "test-utils-rtl";
import * as TestUtils from "test-utils";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import FontScalingPanel from "./FontScalingPanel";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";
import { OwnProfileStore } from "../../../stores/OwnProfileStore";
import { UPDATE_EVENT } from "../../../stores/AsyncStore";
import { FONT_SIZES } from "../../../viewmodels/telement/settings/FontSizeViewModel";

describe("FontScalingPanel", () => {
    let client: MatrixClient;

    const renderPanel = (): RenderResult =>
        render(<FontScalingPanel />, TestUtils.withClientContextRenderOptions(client));
    const slider = (): HTMLInputElement => screen.getByRole("slider", { name: "Font size" });

    beforeEach(() => {
        client = TestUtils.stubClient();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders the font scaling UI", () => {
        const { asFragment } = renderPanel();
        expect(asFragment()).toMatchSnapshot();
    });

    it("shows the size as a slider named Font size, without a group label saying it again", () => {
        renderPanel();

        expect(slider()).toHaveAttribute("aria-valuetext", expect.stringMatching(/^\d+ \(default\)$/));
        expect(screen.getAllByText("Font size")).toHaveLength(1);
        expect(screen.queryByRole("heading")).toBeNull();
        // No dropdown or menu of sizes
        expect(screen.queryByRole("button", { name: /Font size/ })).toBeNull();
        expect(screen.queryByRole("combobox")).toBeNull();
    });

    it("shows the sizes it is dragged over on the preview alone, and sets the one it is let go at", () => {
        const setValue = vi.spyOn(SettingsStore, "setValue").mockResolvedValue(undefined);
        const { container } = renderPanel();
        const preview = container.querySelector<HTMLElement>(".mx_FontScalingPanel_preview")!;
        const from = Number(slider().value);
        expect(preview.firstElementChild).toHaveStyle({ zoom: 1 });

        fireEvent.input(slider(), { target: { value: String(from + 1) } });
        expect(screen.getByText(String(FONT_SIZES[from + 1]))).toBeInTheDocument();
        expect(preview.firstElementChild).toHaveStyle({ zoom: FONT_SIZES[from + 1] / FONT_SIZES[from] });
        expect(setValue).not.toHaveBeenCalled();

        slider().dispatchEvent(new Event("change", { bubbles: true }));
        expect(setValue).toHaveBeenCalledExactlyOnceWith("fontSizeDelta", null, SettingLevel.DEVICE, 1);
    });

    it("shows the user's message from the first render, in the name the app already has, and then in the latest", async () => {
        await SettingsStore.setValue("layout", null, SettingLevel.DEVICE, "irc" as any);
        const displayName = vi.spyOn(OwnProfileStore.instance, "displayName", "get").mockReturnValue("Alice");
        renderPanel();

        // At once, without a spinner or the Matrix ID, or asking the server
        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.queryByText(client.getSafeUserId())).toBeNull();
        expect(screen.queryByLabelText("Loading…")).toBeNull();
        expect(client.getProfileInfo).not.toHaveBeenCalled();

        displayName.mockReturnValue("Alicia");
        act(() => void OwnProfileStore.instance.emit(UPDATE_EVENT));
        expect(screen.getByText("Alicia")).toBeInTheDocument();
        await SettingsStore.setValue("layout", null, SettingLevel.DEVICE, null as any);
    });
});
