/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { act, render, screen, waitFor } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { type Capabilities } from "matrix-js-sdk/src/matrix";
import {
    getMockClientWithEventEmitter,
    mockClientMethodsCrypto,
    mockClientMethodsRooms,
    mockClientMethodsServer,
    mockClientMethodsUser,
    mockPlatformPeg,
    TestSDKContext,
} from "test-utils";
import { makeDelegatedAuthMetadata } from "test-utils/auth.ts";
import type { I18nApi } from "@element-hq/web-shared-components";

import QuickSettingsButton from "./QuickSettingsButton";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import Modal from "../../../Modal";
import { type ModuleApi } from "../../../modules/Api";
import SettingsStore from "../../../settings/SettingsStore";
import UserSettingsDialog from "../dialogs/UserSettingsDialog";

describe("QuickSettingsButton", () => {
    afterEach(() => {
        Modal.forceCloseAllModals();
        vi.restoreAllMocks();
    });

    it("opens the settings dialog directly", async () => {
        const dispatchSpy = vi.spyOn(defaultDispatcher, "dispatch");
        render(<QuickSettingsButton isPanelCollapsed={true} />);

        await userEvent.click(screen.getByRole("button", { name: "Settings" }));

        expect(dispatchSpy).toHaveBeenCalledWith({ action: Action.ViewUserSettings });
    });

    it("shows its label when the panel is expanded", () => {
        const { asFragment } = render(<QuickSettingsButton isPanelCollapsed={false} />);

        expect(screen.getByText("Settings")).toBeInTheDocument();
        expect(asFragment()).toMatchSnapshot();
    });

    it("moves focus into the settings dialog it opens and gets it back when the dialog closes", async () => {
        // The Account tab enables its avatar button once the server's capabilities arrive, which replaces the
        // button's element. Focus resting on it would fall out of the dialog without any event.
        const capabilities = Promise.withResolvers<Capabilities>();
        const client = getMockClientWithEventEmitter({
            ...mockClientMethodsUser("@alice:server.org"),
            ...mockClientMethodsServer(),
            ...mockClientMethodsCrypto(),
            ...mockClientMethodsRooms(),
            getCapabilities: vi.fn().mockReturnValue(capabilities.promise),
            getIgnoredUsers: vi.fn().mockResolvedValue([]),
            getPushers: vi.fn().mockResolvedValue([]),
            getProfileInfo: vi.fn().mockResolvedValue({}),
            getMediaConfig: vi.fn().mockResolvedValue({}),
            getAuthMetadata: vi.fn().mockResolvedValue(makeDelegatedAuthMetadata()),
            getSyncState: vi.fn().mockReturnValue("SYNCING"),
        });
        mockPlatformPeg({
            supportsSpellCheckSettings: vi.fn().mockReturnValue(false),
            getAppVersion: vi.fn().mockResolvedValue("1"),
        });
        vi.spyOn(SettingsStore, "getValue").mockReturnValue(false);
        const sdkContext = new TestSDKContext();
        sdkContext._client = client;
        const { mxSdkContext, mxModuleApi } = window;
        window.mxSdkContext = sdkContext;
        window.mxModuleApi = { i18n: {} as I18nApi } as ModuleApi;

        // Opens the dialog the way MatrixChat does
        const dispatcherRef = defaultDispatcher.register((payload) => {
            if (payload.action !== Action.ViewUserSettings) return;
            Modal.createDialog(UserSettingsDialog, { sdkContext }, undefined, false, true);
        });

        try {
            render(<QuickSettingsButton isPanelCollapsed={true} />);
            const settingsButton = screen.getByRole("button", { name: "Settings" });
            await userEvent.click(settingsButton);

            const dialog = await screen.findByRole("dialog");
            await waitFor(() => expect(screen.getByRole("tab", { name: "Account" })).toHaveFocus());

            await act(async () => capabilities.resolve({ "m.set_avatar_url": { enabled: true } }));
            await screen.findByRole("button", { name: "Open avatar menu" });
            expect(dialog).toContainElement(document.activeElement as HTMLElement);

            await userEvent.keyboard("{Escape}");
            await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
            await waitFor(() => expect(settingsButton).toHaveFocus());
        } finally {
            defaultDispatcher.unregister(dispatcherRef);
            window.mxSdkContext = mxSdkContext;
            window.mxModuleApi = mxModuleApi;
        }
    });
});
