/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../../telement/tokens.css";
import React, { type ReactNode } from "react";
import { render, screen } from "@test-utils";
import { describe, it, expect } from "vitest";

import { DocumentViewerView, type DocumentViewerStatus } from "./DocumentViewerView";
import { I18nApi } from "../../../core/i18n/I18nApi";
import { I18nContext } from "../../../core/i18n/i18nContext";

/** The viewer in a right panel card as wide as the default panel. */
function renderCard(status: DocumentViewerStatus, toolbar?: ReactNode): HTMLElement {
    render(
        <div style={{ width: 351, height: 240 }}>
            <DocumentViewerView status={status} toolbar={toolbar} />
        </div>,
        { wrapper: ({ children }) => <I18nContext.Provider value={new I18nApi()}>{children}</I18nContext.Provider> },
    );
    return screen.getByTestId("document-viewer");
}

describe("DocumentViewerView geometry", () => {
    it("puts the toolbar's controls on the card's 12px content edge, like the card header's", () => {
        const viewer = renderCard(
            "ready",
            <>
                <button style={{ width: 80, height: 36 }}>Page</button>
                <button style={{ width: 120, height: 36 }}>Zoom</button>
            </>,
        ).getBoundingClientRect();

        const first = screen.getByRole("button", { name: "Page" }).getBoundingClientRect();
        const last = screen.getByRole("button", { name: "Zoom" }).getBoundingClientRect();
        expect([first.left - viewer.left, viewer.right - last.right]).toEqual([12, 12]);
    });

    it.each(["loading", "error"] as const)("keeps the %s message between the card's 12px content edges", (status) => {
        renderCard(status);

        const message = screen.getByRole(status === "loading" ? "status" : "alert");
        const style = getComputedStyle(message);
        expect([style.paddingInlineStart, style.paddingInlineEnd, style.paddingBlockStart]).toEqual([
            "12px",
            "12px",
            "24px",
        ]);
    });
});
