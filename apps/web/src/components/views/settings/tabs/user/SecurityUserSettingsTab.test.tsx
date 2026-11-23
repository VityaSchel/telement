/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "test-utils-rtl";
import {
    getMockClientWithEventEmitter,
    mockClientMethodsServer,
    mockClientMethodsUser,
    mockClientMethodsCrypto,
    mockClientMethodsDevice,
    mockPlatformPeg,
    stubClient,
    TestSDKContext,
} from "test-utils";
import React, { act } from "react";
import userEvent from "@testing-library/user-event";

import SecurityUserSettingsTab from "./SecurityUserSettingsTab";
import MatrixClientContext from "../../../../../contexts/MatrixClientContext";
import { SDKContext } from "../../../../../contexts/SDKContext";
import defaultDispatcher from "../../../../../dispatcher/dispatcher";
import { UIFeature } from "../../../../../settings/UIFeature";
import SettingsStore from "../../../../../settings/SettingsStore";
import { SettingLevel } from "../../../../../settings/SettingLevel";
import { type SettingKey } from "../../../../../settings/Settings.tsx";
import MatrixClientBackedController from "../../../../../settings/controllers/MatrixClientBackedController";
import { MatrixClientPeg } from "../../../../../MatrixClientPeg";

describe("<SecurityUserSettingsTab />", () => {
    const getIgnoredUsers = vi.fn();
    const setIgnoredUsers = vi.fn();

    const userId = "@alice:server.org";
    const deviceId = "alices-device";
    const mockClient = getMockClientWithEventEmitter({
        ...mockClientMethodsUser(userId),
        ...mockClientMethodsServer(),
        ...mockClientMethodsDevice(deviceId),
        ...mockClientMethodsCrypto(),
        getRooms: vi.fn().mockReturnValue([]),
        getPushers: vi.fn().mockReturnValue([]),
        getIgnoredUsers,
        setIgnoredUsers,
    });

    const sdkContext = new TestSDKContext();
    sdkContext._client = mockClient;

    const getComponent = () => (
        <MatrixClientContext.Provider value={mockClient}>
            <SDKContext.Provider value={sdkContext}>
                <SecurityUserSettingsTab />
            </SDKContext.Provider>
        </MatrixClientContext.Provider>
    );

    beforeEach(() => {
        mockPlatformPeg();
        vi.clearAllMocks();
    });

    it("renders security section", () => {
        const { container } = render(getComponent());

        expect(container).toMatchSnapshot();
    });

    it("renders ignored users", () => {
        getIgnoredUsers.mockReturnValue(["@bob:example.org"]);
        const { getByRole } = render(getComponent());
        const ignoredUsers = getByRole("list", { name: "Ignored users" });

        expect(ignoredUsers).toMatchSnapshot();
    });

    it("allows unignoring a user", async () => {
        getIgnoredUsers.mockReturnValue(["@bob:example.org"]);
        const { getByText, getByRole } = render(getComponent());
        await userEvent.click(getByRole("button", { name: "Unignore" }));
        expect(setIgnoredUsers).toHaveBeenCalledWith([]);
        await act(() => {
            getIgnoredUsers.mockReturnValue([]);
            defaultDispatcher.dispatch(
                {
                    action: "ignore_state_changed",
                },
                true,
            );
        });
        expect(getByText("You have no ignored users.")).toBeVisible();
    });

    it("does not render the discovery settings if 3pid features are disabled", async () => {
        const original = SettingsStore.getValue;
        vi.spyOn(SettingsStore, "getValue").mockImplementation((key, ...rest) =>
            key === UIFeature.ThirdPartyID ? false : original(key, ...rest),
        );

        render(getComponent());

        expect(screen.getByRole("heading", { name: "Privacy" })).toBeInTheDocument();
        expect(screen.queryByTestId("discoverySection")).toBeNull();
        vi.mocked(SettingsStore.getValue).mockRestore();
    });

    it("gathers what you share and what others can show you under Privacy, moved here from Preferences", () => {
        render(getComponent());
        const privacy = screen.getByRole("group", { name: "Privacy" });
        const group = (heading: string): HTMLElement =>
            within(privacy).getByRole("heading", { name: heading }).closest<HTMLElement>(".mx_SettingsSubsection")!;

        for (const toggle of [
            "Send read receipts",
            "Send typing notifications",
            "Publish timezone on public profile",
        ]) {
            expect(within(group("Presence")).getByRole("switch", { name: toggle })).toBeInTheDocument();
        }
        for (const toggle of ["Hide avatars of room and inviter", "Allow users to invite you to rooms"]) {
            expect(within(group("Moderation and safety")).getByRole("switch", { name: toggle })).toBeInTheDocument();
        }
        expect(
            within(group("Show media in timeline")).getByRole("radiogroup", { name: "Show media in timeline" }),
        ).toBeInTheDocument();
    });

    it("puts Privacy first, then message search, the ignored users and the integration manager last", () => {
        const { container } = render(getComponent());
        const headings = [
            ...container.querySelectorAll(".mx_SettingsTab_sections h2, .mx_SettingsTab_sections h3"),
        ].map((heading) => heading.textContent);

        expect(headings.indexOf("Privacy")).toBe(0);
        expect(headings.indexOf("Message search")).toBeGreaterThan(headings.indexOf("Show media in timeline"));
        expect(headings.indexOf("Ignored users")).toBeGreaterThan(headings.indexOf("Message search"));
        expect(container.querySelector(".mx_SettingsTab_sections")!.lastElementChild).toBe(
            screen.getByTestId("mx_SetIntegrationManager"),
        );
        expect(screen.queryByRole("heading", { name: "Encryption" })).toBeNull();
        expect(screen.queryByRole("switch", { name: /Record the client name/ })).toBeNull();
    });

    describe("send read receipts", () => {
        beforeEach(() => {
            stubClient();
            vi.spyOn(SettingsStore, "setValue");
            vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false } as MediaQueryList);
        });

        afterEach(() => {
            vi.resetAllMocks();
        });

        const getToggle = () =>
            render(
                <MatrixClientContext.Provider value={MatrixClientPeg.safeGet()}>
                    <SecurityUserSettingsTab />
                </MatrixClientContext.Provider>,
            ).getByRole("switch", { name: "Send read receipts" });

        const mockIsVersionSupported = (val: boolean) => {
            const client = MatrixClientPeg.safeGet();
            vi.spyOn(client, "doesServerSupportUnstableFeature").mockResolvedValue(false);
            vi.spyOn(client, "isVersionSupported").mockImplementation(async (version: string) => {
                if (version === "v1.4") return val;
                return false;
            });
            MatrixClientBackedController.matrixClient = client;
        };

        const mockGetValue = (val: boolean) => {
            const copyOfGetValueAt = SettingsStore.getValueAt;

            SettingsStore.getValueAt = (
                level: SettingLevel,
                name: SettingKey,
                roomId?: string,
                isExplicit?: boolean,
            ) => {
                if (name === "sendReadReceipts") return val;
                return copyOfGetValueAt(level, name, roomId, isExplicit);
            };
        };

        const expectSetValueToHaveBeenCalled = (
            name: string,
            roomId: string | null,
            level: SettingLevel,
            value: boolean,
        ) => expect(SettingsStore.setValue).toHaveBeenCalledWith(name, roomId, level, value);

        describe("with server support", () => {
            beforeEach(() => {
                mockIsVersionSupported(true);
            });

            it("can be enabled", async () => {
                mockGetValue(false);
                const toggle = getToggle();

                await waitFor(() => expect(toggle).not.toBeDisabled());
                fireEvent.click(toggle);
                expectSetValueToHaveBeenCalled("sendReadReceipts", null, SettingLevel.ACCOUNT, true);
            });

            it("can be disabled", async () => {
                mockGetValue(true);
                const toggle = getToggle();

                await waitFor(() => expect(toggle).not.toBeDisabled());
                fireEvent.click(toggle);
                expectSetValueToHaveBeenCalled("sendReadReceipts", null, SettingLevel.ACCOUNT, false);
            });
        });

        describe("without server support", () => {
            beforeEach(() => {
                mockIsVersionSupported(false);
            });

            it("is forcibly enabled", async () => {
                const toggle = getToggle();
                await waitFor(() => {
                    expect(toggle).toBeChecked();
                    expect(toggle).toBeDisabled();
                });
            });

            it("cannot be disabled", async () => {
                mockGetValue(true);
                const toggle = getToggle();

                await waitFor(() => expect(toggle).toBeDisabled());
                console.log(toggle.innerHTML);
                fireEvent.click(toggle);
                expect(SettingsStore.setValue).not.toHaveBeenCalled();
            });
        });
    });
});
