/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, type RenderResult, screen, waitFor, within } from "test-utils-rtl";
import {
    getMockClientWithEventEmitter,
    mockClientMethodsServer,
    mockClientMethodsUser,
    mockPlatformPeg,
} from "test-utils";
import userEvent from "@testing-library/user-event";

import PreferencesUserSettingsTab from "./PreferencesUserSettingsTab";
import SettingsStore from "../../../../../settings/SettingsStore";
import MatrixClientBackedController from "../../../../../settings/controllers/MatrixClientBackedController";
import PlatformPeg from "../../../../../PlatformPeg";
import { getAllLanguagesWithLabels } from "../../../../../i18n/utils";

vi.mock("../../../../../i18n/utils", { spy: true });

describe("PreferencesUserSettingsTab", () => {
    beforeEach(() => {
        mockPlatformPeg();
    });

    const renderTab = (): RenderResult => {
        return render(<PreferencesUserSettingsTab />);
    };

    it("should render", () => {
        MatrixClientBackedController.matrixClient = getMockClientWithEventEmitter({
            ...mockClientMethodsServer(),
            ...mockClientMethodsUser(),
        });
        const { asFragment } = renderTab();
        expect(asFragment()).toMatchSnapshot();
    });

    it("should reload when changing language", async () => {
        const reloadStub = vi.fn();
        PlatformPeg.get()!.reload = reloadStub;

        renderTab();
        const languageRow = await screen.findByRole("button", { name: /^Application language/ });
        expect(languageRow).toBeInTheDocument();

        await userEvent.click(languageRow);

        const germanOption = await screen.findByRole("menuitemradio", { name: "Deutsch" });
        await userEvent.click(germanOption);
        expect(reloadStub).toHaveBeenCalled();
    });

    it("finds a language by its own name and by its name in the user's language", async () => {
        // Enough for the menu to have a search pill; the tests otherwise offer three
        const codes = "ar bg cs cy da de el en eo es et fi fr ga gl he hu id it ja ko lt".split(" ");
        const name = (code: string, inLanguage: string): string =>
            new Intl.DisplayNames([inLanguage], { type: "language", style: "short" }).of(code)!;
        vi.mocked(getAllLanguagesWithLabels).mockResolvedValueOnce(
            codes.map((value) => ({ value, label: name(value, "en"), labelInTargetLanguage: name(value, value) })),
        );
        renderTab();
        const languageRow = await screen.findByRole("button", { name: /^Application language/ });
        await waitFor(() => expect(languageRow).toHaveTextContent("Application languageEnglish"));
        await userEvent.click(languageRow);
        const search = screen.getByRole("textbox", { name: "Search" });

        await userEvent.type(search, "german");
        expect(screen.getAllByRole("menuitemradio").map((option) => option.textContent)).toEqual(["Deutsch"]);
        await userEvent.clear(search);
        await userEvent.type(search, "cestina");
        expect(screen.getAllByRole("menuitemradio").map((option) => option.textContent)).toEqual(["čeština"]);
    });

    it("shows the language and the time zone as value rows, the label at the start and the value at the end", async () => {
        renderTab();

        const language = await screen.findByRole("button", { name: /^Application language/ });
        await waitFor(() => expect(language).toHaveTextContent("Application languageEnglish"));
        expect(screen.getByRole("button", { name: /^Set timezone/ })).toHaveTextContent(/^Set timezoneBrowser default/);
        expect(document.querySelector(".mx_Dropdown")).toBeNull();
    });

    it("puts the language's reload hint under its card, as the help of its group", async () => {
        renderTab();
        const language = await screen.findByRole("button", { name: /^Application language/ });
        const hint = screen.getByText("The app will reload after selecting another language");

        expect(hint.closest(".mx_SettingsSubsection_description")).not.toBeNull();
        expect(language.closest(".mx_SettingsSubsection_content")).not.toContainElement(hint);
    });

    it("leaves showing all rooms in Home to the Sidebar tab, where the other spaces to show are", () => {
        renderTab();

        expect(screen.queryByRole("heading", { name: "Spaces" })).not.toBeInTheDocument();
        expect(screen.queryByRole("switch", { name: "Show all rooms in Home" })).not.toBeInTheDocument();
    });

    it("should search and select a user timezone", async () => {
        renderTab();

        expect(await screen.findByText(/Browser default/)).toBeInTheDocument();
        const timezoneRow = await screen.findByRole("button", { name: /^Set timezone/ });
        await userEvent.click(timezoneRow);

        // The menu lists the browser's default first, then every time zone
        const options = screen.getAllByRole("menuitemradio");
        expect(options[0]).toHaveTextContent(/Browser default/);
        expect(options[0]).toHaveAttribute("aria-checked", "true");
        // A search pill filters them, as the dropdown did
        await userEvent.type(screen.getByRole("textbox", { name: "Search" }), "europe paris");
        expect(screen.getAllByRole("menuitemradio")).toHaveLength(1);
        await userEvent.keyboard("{Enter}");

        await waitFor(() => expect(timezoneRow).toHaveTextContent("Set timezoneEurope/Paris"));
    });

    it("should not show spell check setting if unsupported", async () => {
        PlatformPeg.get()!.supportsSpellCheckSettings = vi.fn().mockReturnValue(false);

        renderTab();
        expect(screen.queryByRole("switch", { name: "Allow spell check" })).not.toBeInTheDocument();
    });

    it("should enable spell check", async () => {
        const spellCheckEnableFn = vi.fn();
        PlatformPeg.get()!.supportsSpellCheckSettings = vi.fn().mockReturnValue(true);
        PlatformPeg.get()!.getSpellCheckEnabled = vi.fn().mockReturnValue(false);
        PlatformPeg.get()!.setSpellCheckEnabled = spellCheckEnableFn;

        renderTab();
        const toggle = await screen.findByRole("switch", { name: "Allow spell check" });
        expect(toggle).not.toBeDisabled();

        await userEvent.click(toggle);

        expect(spellCheckEnableFn).toHaveBeenCalledWith(true);
    });

    describe("groups", () => {
        const group = (heading: string): HTMLElement =>
            screen.getByRole("heading", { name: heading }).closest<HTMLElement>(".mx_SettingsSubsection")!;

        it("puts the desktop app's toggles under Start-up and window behaviour, shown when any of them can be set", () => {
            const original = SettingsStore.canSetValue;
            vi.spyOn(SettingsStore, "canSetValue").mockImplementation((setting, roomId, level) =>
                setting === "Electron.warnBeforeExit" ? true : original(setting, roomId, level),
            );
            renderTab();

            expect(
                within(group("Start-up and window behaviour")).getByRole("switch", { name: "Warn before quitting" }),
            ).toBeInTheDocument();
            vi.mocked(SettingsStore.canSetValue).mockRestore();
        });

        it("puts sending with Ctrl + Enter under Keyboard shortcuts rather than Composer", () => {
            renderTab();

            expect(
                within(group("Keyboard shortcuts")).getByRole("switch", { name: /Enter to send a message/ }),
            ).toBeInTheDocument();
            expect(within(group("Composer")).queryByRole("switch", { name: /Enter to send a message/ })).toBeNull();
        });

        it("calls the last group Advanced, and leaves privacy to the Security & privacy tab", () => {
            renderTab();

            expect(
                within(group("Advanced")).getByRole("switch", { name: /Prompt before sending invites/ }),
            ).toBeVisible();
            for (const moved of ["Presence", "Moderation and safety", "Show media in timeline", "General"]) {
                expect(screen.queryByRole("heading", { name: moved })).toBeNull();
            }
            for (const moved of ["Send read receipts", "Publish timezone on public profile"]) {
                expect(screen.queryByRole("switch", { name: moved })).toBeNull();
            }
        });
    });

    describe("bundled url previews only", () => {
        const LABEL = "Only show bundled previews in encrypted rooms";

        beforeEach(() => {
            MatrixClientBackedController.matrixClient = getMockClientWithEventEmitter({
                ...mockClientMethodsServer(),
                ...mockClientMethodsUser(),
            });
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        // The setting only makes sense alongside the bundle lab flag, so it stays hidden until
        // that flag is on rather than showing a control that cannot do anything.
        it("is not offered when the bundle feature is disabled", () => {
            renderTab();
            expect(screen.queryByText(LABEL)).not.toBeInTheDocument();
        });

        it("is offered when the bundle feature is enabled", () => {
            const original = SettingsStore.getValue;
            vi.spyOn(SettingsStore, "getValue").mockImplementation((setting, ...rest) =>
                setting === "feature_msc4095_url_preview_bundle" ? true : original(setting, ...rest),
            );

            renderTab();
            expect(screen.getByText(LABEL)).toBeInTheDocument();
        });
    });
});
