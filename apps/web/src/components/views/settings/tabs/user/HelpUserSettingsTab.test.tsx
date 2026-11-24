/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { getMockClientWithEventEmitter, mockClientMethodsCrypto, mockPlatformPeg } from "test-utils";

import HelpUserSettingsTab from "./HelpUserSettingsTab";
import MatrixClientContext from "../../../../../contexts/MatrixClientContext";

describe("<HelpUserSettingsTab />", () => {
    beforeEach(() => {
        mockPlatformPeg({ getAppVersion: async () => "1.0.0", canSelfUpdate: async () => false });
    });

    function renderTab(): void {
        const client = getMockClientWithEventEmitter({
            ...mockClientMethodsCrypto(),
            getHomeserverUrl: () => "https://matrix.org",
            getIdentityServerUrl: () => undefined,
            getAccessToken: () => "syt_token",
        });
        render(<HelpUserSettingsTab />, {
            wrapper: ({ children }) => (
                <MatrixClientContext.Provider value={client}>{children}</MatrixClientContext.Provider>
            ),
        });
    }

    it("credits diff-dom, as its license requires, and tells where the texts of third parties' licenses are", () => {
        renderTab();

        const credit = screen.getAllByRole("listitem").find(({ textContent }) => textContent?.includes("diff-dom"))!;
        // External links hold their icon to the text with a word joiner
        expect(credit.textContent?.replaceAll("\u2060", "")).toBe(
            "The diff-dom library is © Johannes Wilm and other contributors used under the terms of LGPL 3.0. " +
                "Its license texts are in THIRD-PARTY-LICENSES, and those of other libraries, fonts and data in " +
                "THIRD-PARTY-NOTICES.txt, in the app's resources folder.",
        );
        expect(within(credit).getByRole("link", { name: /diff-dom/ })).toHaveAttribute(
            "href",
            "https://github.com/fiduswriter/diffDOM",
        );
        expect(within(credit).getByRole("link", { name: /LGPL 3\.0/ })).toHaveAttribute(
            "href",
            "https://www.gnu.org/licenses/lgpl-3.0.html",
        );
    });

    it("shows the access token under its row, with its warning and a copy button, while the row is expanded", async () => {
        renderTab();
        const row = screen.getByRole("button", { name: "Access Token", expanded: false });
        const warning = "Your access token gives full access to your account. Do not share it with anyone.";

        expect(screen.queryByText("syt_token")).toBeNull();
        expect(screen.queryByText(warning)).toBeNull();

        await userEvent.click(row);
        expect(row).toHaveAttribute("aria-expanded", "true");
        const details = document.getElementById(row.getAttribute("aria-controls")!)!;
        expect(row.nextElementSibling).toBe(details);
        expect(within(details).getByText(warning)).toBeVisible();
        expect(within(details).getByText("syt_token")).toBeVisible();
        await userEvent.click(within(details).getByRole("button", { name: "Copy" }));
        await expect(navigator.clipboard.readText()).resolves.toBe("syt_token");

        await userEvent.click(row);
        expect(screen.queryByText("syt_token")).toBeNull();
    });

    it("ends the Advanced card with the access token's row and a red Clear cache and reload row, one under the other", () => {
        renderTab();
        const token = screen.getByRole("button", { name: "Access Token" });
        const clear = screen.getByRole("button", { name: "Clear cache and reload" });
        const list = token.parentElement!;

        expect([...list.children]).toEqual([token, clear]);
        // A list of rows, which the card puts 4px from its edge (ValueRowList)
        expect(list).toHaveAttribute("data-settings-row");
        expect(list.parentElement).toHaveClass("mx_SettingsSubsection_content");
        expect(list.parentElement!.lastElementChild).toBe(list);
        expect([token, clear].map((row) => row.hasAttribute("data-settings-row"))).toEqual([true, true]);
        expect(clear.className).toMatch(/(^|\s)_critical_/);
    });
});
