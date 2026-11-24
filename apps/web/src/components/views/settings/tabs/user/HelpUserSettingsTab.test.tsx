/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "test-utils-rtl";
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
            getAccessToken: () => "token",
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
});
