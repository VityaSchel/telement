/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "test-utils-rtl";

import { KeyStoragePanel } from "./KeyStoragePanel";
import SdkConfig from "../../../../SdkConfig";

vi.mock("../../../viewmodels/settings/encryption/KeyStoragePanelViewModel", () => ({
    useKeyStoragePanelViewModel: vi
        .fn()
        .mockReturnValue({ setEnabled: vi.fn(), isEnabled: true, loading: false, busy: false }),
}));

describe("<KeyStoragePanel />", () => {
    it("links to the key storage help as a link that leaves the app, like the other settings links", () => {
        render(<KeyStoragePanel onKeyStorageDisableClick={vi.fn()} />);
        const link = screen.getByRole("link", { name: "Learn more" });

        expect(link).toHaveAttribute("href", SdkConfig.get("help_key_storage_url"));
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveClass("mx_ExternalLink");
        expect(link.querySelector(".mx_ExternalLink_icon")).not.toBeNull();
    });
});
