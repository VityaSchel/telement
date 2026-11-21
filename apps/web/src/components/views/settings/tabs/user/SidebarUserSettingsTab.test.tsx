/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { fireEvent, render, screen } from "test-utils-rtl";
import { flushPromises } from "test-utils";

import SidebarUserSettingsTab from "./SidebarUserSettingsTab";
import SettingsStore from "../../../../../settings/SettingsStore";
import { MetaSpace } from "../../../../../stores/spaces";
import { SettingLevel } from "../../../../../settings/SettingLevel";
import SdkConfig from "../../../../../SdkConfig";

describe("<SidebarUserSettingsTab />", () => {
    beforeEach(() => {
        vi.spyOn(SettingsStore, "getValue").mockRestore();
        vi.spyOn(SettingsStore, "setValue").mockResolvedValue(undefined);
    });

    it("renders sidebar settings with guest spa url", () => {
        const spy = vi.spyOn(SdkConfig, "get").mockReturnValue({ guest_spa_url: "https://somewhere.org" });
        const originalGetValue = SettingsStore.getValue;
        const spySettingsStore = vi.spyOn(SettingsStore, "getValue").mockImplementation((setting) => {
            return setting === "feature_video_rooms" ? true : originalGetValue(setting);
        });
        const { container } = render(<SidebarUserSettingsTab />);
        expect(container).toMatchSnapshot();
        spySettingsStore.mockRestore();
        spy.mockRestore();
    });
    it("renders sidebar settings without guest spa url", () => {
        const originalGetValue = SettingsStore.getValue;
        const spySettingsStore = vi.spyOn(SettingsStore, "getValue").mockImplementation((setting) => {
            return setting === "feature_video_rooms" ? true : originalGetValue(setting);
        });
        const { container } = render(<SidebarUserSettingsTab />);
        expect(container).toMatchSnapshot();
        spySettingsStore.mockRestore();
    });

    it("shows every space as a switch, described by what it shows, like every other on/off setting", () => {
        vi.spyOn(SettingsStore, "getValue").mockImplementation((settingName) => {
            if (settingName === "Spaces.enabledMetaSpaces") return { [MetaSpace.Home]: true };
            return settingName === "feature_video_rooms";
        });
        render(<SidebarUserSettingsTab />);

        expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
        expect(screen.getAllByRole("switch")).toHaveLength(4);
        const home = screen.getByRole("switch", { name: "Home" });
        expect(home).toBeChecked();
        expect(home).toBeDisabled();
        expect(home).toHaveAccessibleDescription("Home is useful for getting an overview of everything.");
        expect(screen.getByRole("switch", { name: "Show all rooms" })).toHaveAccessibleDescription(
            "Show all your rooms in Home, even if they're in a space.",
        );
    });

    it("starts the label of each space's switch with the space's icon, as the space bar draws it", () => {
        vi.spyOn(SettingsStore, "getValue").mockImplementation((settingName) => {
            if (settingName === "Spaces.enabledMetaSpaces") return { [MetaSpace.Home]: true };
            return settingName === "feature_video_rooms";
        });
        render(<SidebarUserSettingsTab />);

        for (const name of ["Home", "Rooms outside of a space", "Video rooms and conferences"]) {
            const label = screen.getByText(name, { selector: "label" });
            expect(label.firstElementChild?.tagName).toBe("svg");
            expect(label.firstElementChild).toHaveClass("mx_SidebarUserSettingsTab_icon");
        }
        expect(screen.getByText("Show all rooms", { selector: "label" }).querySelector("svg")).toBeNull();
    });

    it("toggles all rooms in home setting", async () => {
        vi.spyOn(SettingsStore, "getValue").mockImplementation((settingName) => {
            if (settingName === "Spaces.enabledMetaSpaces") {
                return {
                    [MetaSpace.Home]: true,
                    [MetaSpace.Orphans]: true,
                };
            }
            return false;
        });
        render(<SidebarUserSettingsTab />);

        fireEvent.click(screen.getByTestId("mx_SidebarUserSettingsTab_homeAllRoomsToggle"));

        await flushPromises();
        expect(SettingsStore.setValue).toHaveBeenCalledWith("Spaces.allRoomsInHome", null, SettingLevel.ACCOUNT, true);
    });

    it("disables all rooms in home setting when home space is disabled", () => {
        vi.spyOn(SettingsStore, "getValue").mockImplementation((settingName) => {
            if (settingName === "Spaces.enabledMetaSpaces") {
                return {
                    [MetaSpace.Home]: false,
                    [MetaSpace.Orphans]: true,
                };
            }
            return false;
        });
        render(<SidebarUserSettingsTab />);

        expect(screen.getByTestId("mx_SidebarUserSettingsTab_homeAllRoomsToggle")).toBeDisabled();
    });
});
