/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../../telement/tokens.css";
import React from "react";
import { render, screen } from "@test-utils";
import { describe, it, expect } from "vitest";

import { PdfViewerView } from "./PdfViewerView";
import { I18nApi } from "../../../core/i18n/I18nApi";
import { I18nContext } from "../../../core/i18n/i18nContext";

const noop = (): void => {};

function renderToolbar(): void {
    render(
        <PdfViewerView
            status="ready"
            currentPage={1}
            pageCount={12}
            pageInput="1"
            onPageInputChange={noop}
            onPageInputFocus={noop}
            onPageInputBlur={noop}
            onPageInputCancel={noop}
            onPageSubmit={noop}
            onZoomIn={noop}
            onZoomOut={noop}
            zoomPercent={100}
        />,
        { wrapper: ({ children }) => <I18nContext.Provider value={new I18nApi()}>{children}</I18nContext.Provider> },
    );
}

describe("PdfViewerView geometry", () => {
    it("draws the zoom buttons as 36px controls with 24px icons in their middle, like the card header's", () => {
        renderToolbar();

        for (const testId of ["pdf-zoom-out", "pdf-zoom-in"]) {
            const button = screen.getByTestId(testId);
            const box = button.getBoundingClientRect();
            const icon = button.querySelector("svg")!.getBoundingClientRect();
            expect([box.width, box.height]).toEqual([36, 36]);
            expect([icon.width, icon.height]).toEqual([24, 24]);
            expect([icon.left - box.left, icon.top - box.top]).toEqual([6, 6]);
        }
    });

    it("makes the page number a 36px field, as tall as the zoom buttons", () => {
        renderToolbar();

        const field = screen.getByRole("textbox", { name: "Page number" }).getBoundingClientRect();
        const zoomIn = screen.getByTestId("pdf-zoom-in").getBoundingClientRect();
        expect(field.height).toBe(36);
        expect(field.top + field.height / 2).toBe(zoomIn.top + zoomIn.height / 2);
    });

    it("puts the page field and the zoom buttons on the card's 12px content edge, like the card header's", () => {
        renderToolbar();

        const viewer = screen.getByTestId("document-viewer").getBoundingClientRect();
        const field = screen.getByRole("textbox", { name: "Page number" }).getBoundingClientRect();
        const zoomIn = screen.getByTestId("pdf-zoom-in").getBoundingClientRect();
        expect([field.left - viewer.left, viewer.right - zoomIn.right]).toEqual([12, 12]);
    });
});
