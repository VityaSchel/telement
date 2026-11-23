/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import { composeStories } from "@storybook/react-vite";
import { fireEvent, render, screen } from "@test-utils";
import { describe, it, expect, vi } from "vitest";

import { FileBodyView, FileBodyViewState, type FileBodyViewActions, type FileBodyViewSnapshot } from "./FileBodyView";
import { MockViewModel } from "../../../../../core/viewmodel/MockViewModel";
import { I18nApi } from "../../../../../index";
import { I18nContext } from "../../../../../core/i18n/i18nContext";
import * as stories from "./FileBodyView.stories";

const renderWithI18n = (ui: React.ReactElement): ReturnType<typeof render> =>
    render(ui, {
        wrapper: ({ children }) => <I18nContext.Provider value={new I18nApi()}>{children}</I18nContext.Provider>,
    });

const { Default, Export, Invalid, AudioInfo, VideoInfo, LongFilenameInfo, OpenableInfo, OpenableLongFilenameInfo } =
    composeStories(stories);

const defaultSnapshot: FileBodyViewSnapshot = {
    state: FileBodyViewState.UNENCRYPTED,
    showInfo: true,
};

class TestViewModel extends MockViewModel<FileBodyViewSnapshot> implements FileBodyViewActions {
    public onInfoClick?: () => void;
    public onOpenClick?: () => void;

    public constructor(snapshot: FileBodyViewSnapshot, actions: FileBodyViewActions = {}) {
        super(snapshot);
        this.onInfoClick = actions.onInfoClick;
        this.onOpenClick = actions.onOpenClick;
    }
}

describe("FileBodyView", () => {
    it.each([
        ["default", Default],
        ["export", Export],
        ["invalid", Invalid],
        ["long-filename-info", LongFilenameInfo],
        ["audio-info", AudioInfo],
        ["video-info", VideoInfo],
        ["openable-info", OpenableInfo],
        ["openable-long-filename-info", OpenableLongFilenameInfo],
    ])("matches snapshot for %s story", (_name, Story) => {
        const { container } = renderWithI18n(<Story />);
        expect(container).toMatchSnapshot();
    });

    it("renders info row in info-only mode", () => {
        const vm = new TestViewModel(defaultSnapshot);

        renderWithI18n(<FileBodyView vm={vm} />);

        expect(screen.getByRole("button", { name: "Attachment" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
    });

    it("renders info row in info-only mode using label and tooltip", () => {
        const vm = new TestViewModel({
            ...defaultSnapshot,
            infoLabel: "spec.pdf",
            infoTooltip: "spec.pdf (22 KB)",
        });

        renderWithI18n(<FileBodyView vm={vm} />);

        expect(screen.getByRole("button", { name: "spec.pdf" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Attachment" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
    });

    it("uses href in export mode", () => {
        const vm = new TestViewModel({
            state: FileBodyViewState.EXPORT,
            showInfo: true,
            infoHref: "https://example.org/export.pdf",
        });

        renderWithI18n(<FileBodyView vm={vm} />);

        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", "https://example.org/export.pdf");
    });

    it("renders safely when href is missing in EXPORT mode", () => {
        const vm = new TestViewModel({ state: FileBodyViewState.EXPORT, showInfo: true });

        const { container } = renderWithI18n(<FileBodyView vm={vm} />);

        expect(screen.getByRole("button", { name: "Attachment" })).toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
        expect(container.querySelector("a")).toBeInTheDocument();
    });

    it("uses label as fallback tooltip content", () => {
        const vm = new TestViewModel({
            ...defaultSnapshot,
            infoLabel: "spec.pdf",
        });

        renderWithI18n(<FileBodyView vm={vm} />);

        expect(screen.getByRole("button", { name: "spec.pdf" })).toBeInTheDocument();
    });

    it("invokes onInfoClick when info row is clicked", () => {
        const onInfoClick = vi.fn();
        const vm = new TestViewModel(defaultSnapshot, { onInfoClick });

        renderWithI18n(<FileBodyView vm={vm} />);

        fireEvent.click(screen.getByRole("button", { name: "Attachment" }));
        expect(onInfoClick).toHaveBeenCalledTimes(1);
    });

    it.each([FileBodyViewState.UNENCRYPTED, FileBodyViewState.ENCRYPTED])(
        "puts no download control under the info row in %s mode, as the message menu saves the file",
        (state) => {
            const { container } = renderWithI18n(
                <FileBodyView vm={new TestViewModel({ ...defaultSnapshot, state })} />,
            );

            expect(screen.getAllByRole("button")).toEqual([screen.getByRole("button", { name: "Attachment" })]);
            expect(screen.queryByRole("link")).toBeNull();
            expect(container.querySelector("iframe")).toBeNull();
        },
    );

    it.each([FileBodyViewState.UNENCRYPTED, FileBodyViewState.ENCRYPTED])("hides info row in %s mode", (state) => {
        const vm = new TestViewModel({ ...defaultSnapshot, state, showInfo: false });

        renderWithI18n(<FileBodyView vm={vm} />);

        expect(screen.queryByRole("button", { name: "Attachment" })).not.toBeInTheDocument();
    });

    it("shows message in invalid mode", () => {
        const vm = new TestViewModel({
            state: FileBodyViewState.INVALID,
        });

        renderWithI18n(<FileBodyView vm={vm} />);

        expect(screen.queryByRole("button", { name: "Attachment" })).not.toBeInTheDocument();
        expect(screen.getByText("Invalid file")).toBeInTheDocument();
    });

    it("applies extra class names to the root element", () => {
        const vm = new TestViewModel(defaultSnapshot);

        const { container } = renderWithI18n(<FileBodyView vm={vm} className="custom-file-body another-class" />);
        expect(container.firstElementChild).toHaveClass("custom-file-body", "another-class");
    });

    describe("info row actions", () => {
        const openableSnapshot: FileBodyViewSnapshot = {
            ...defaultSnapshot,
            infoLabel: "spec.pdf",
            showOpen: true,
            openLabel: "Open PDF",
            showInlineDownload: true,
        };

        it("renders no action icons by default", () => {
            const vm = new TestViewModel(defaultSnapshot);

            renderWithI18n(<FileBodyView vm={vm} />);

            expect(screen.queryByRole("button", { name: "Open PDF" })).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
        });

        it("renders the open and download icons inside the info row", () => {
            const vm = new TestViewModel(openableSnapshot);

            const { container } = renderWithI18n(<FileBodyView vm={vm} />);

            // Both actions have to sit in the same pill as the file name, not below it.
            const infoRow = container.querySelector('[data-type="info"]')!;
            expect(infoRow).toContainElement(screen.getByRole("button", { name: "Open PDF" }));
            expect(infoRow).toContainElement(screen.getByRole("button", { name: "Download" }));
            expect(infoRow).toContainElement(screen.getByRole("button", { name: "spec.pdf" }));
        });

        it("invokes onOpenClick from the open icon", () => {
            const onOpenClick = vi.fn();
            const vm = new TestViewModel(openableSnapshot, { onOpenClick });

            renderWithI18n(<FileBodyView vm={vm} />);
            fireEvent.click(screen.getByRole("button", { name: "Open PDF" }));

            expect(onOpenClick).toHaveBeenCalledTimes(1);
        });

        it("downloads from the download icon, as clicking the file name does", () => {
            const onInfoClick = vi.fn();
            const vm = new TestViewModel(openableSnapshot, { onInfoClick });

            renderWithI18n(<FileBodyView vm={vm} />);
            fireEvent.click(screen.getByRole("button", { name: "Download" }));

            expect(onInfoClick).toHaveBeenCalledTimes(1);
        });

        it("names the download icon with the given label", () => {
            const vm = new TestViewModel({ ...openableSnapshot, downloadLabel: "Save as…" });

            renderWithI18n(<FileBodyView vm={vm} />);

            expect(screen.getByRole("button", { name: "Save as…" })).toBeInTheDocument();
        });

        it("omits the open icon when no label is given for it", () => {
            const vm = new TestViewModel({ ...openableSnapshot, openLabel: undefined });

            renderWithI18n(<FileBodyView vm={vm} />);

            expect(screen.queryByRole("button", { name: "Open PDF" })).not.toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
        });
    });
});
