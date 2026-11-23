/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

// @vitest-environment happy-dom

import { EventType, MatrixEvent } from "matrix-js-sdk/src/matrix";
import { FileBodyViewInfoIcon, FileBodyViewState } from "@element-hq/web-shared-components";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { type MediaEventHelper } from "../../utils/MediaEventHelper";
import { FileBodyViewModel } from "./FileBodyViewModel";
import { openDocumentViewer } from "../../utils/documentViewer";
import { saveMediaAs } from "../../telement/media/saveMediaAs";

vi.mock("../../telement/media/saveMediaAs", () => ({ saveMediaAs: vi.fn().mockResolvedValue(undefined) }));

vi.mock("../../utils/documentViewer", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../utils/documentViewer")>()),
    openDocumentViewer: vi.fn(),
}));

vi.mock("../../customisations/Media", () => ({
    mediaFromContent: vi.fn((content: { file?: unknown; url?: string }) => ({
        isEncrypted: !!content.file,
        srcHttp: content.url ?? null,
    })),
}));

describe("FileBodyViewModel", () => {
    const mkMediaEvent = (
        content: Partial<{
            body: string;
            msgtype: string;
            url: string;
            file: Record<string, unknown>;
            info: Record<string, unknown>;
        }>,
    ): MatrixEvent =>
        new MatrixEvent({
            room_id: "!room:server",
            sender: "@user:server",
            type: EventType.RoomMessage,
            content: {
                body: "alt",
                msgtype: "m.file",
                url: "https://server/file",
                ...content,
            },
        });

    const mkMediaEventHelper = ({
        encrypted,
        blob = new Blob(["content"], { type: "text/plain" }),
        fileName = "file.txt",
    }: {
        encrypted: boolean;
        blob?: Blob;
        fileName?: string;
    }): MediaEventHelper =>
        ({
            media: { isEncrypted: encrypted },
            sourceBlob: { value: Promise.resolve(blob) },
            fileName,
        }) as unknown as MediaEventHelper;

    const createVm = (overrides: Partial<ConstructorParameters<typeof FileBodyViewModel>[0]> = {}): FileBodyViewModel =>
        new FileBodyViewModel({
            mxEvent: mkMediaEvent({}),
            mediaEventHelper: mkMediaEventHelper({ encrypted: false }),
            forExport: false,
            documentPreviewsEnabled: false,
            ...overrides,
        });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows the file's info row with no download control under it, as the message menu saves the file", () => {
        const vm = createVm();

        expect(vm.getSnapshot()).toEqual({
            state: FileBodyViewState.UNENCRYPTED,
            showInfo: true,
            infoLabel: "alt",
            infoTooltip: "alt",
            infoIcon: FileBodyViewInfoIcon.ATTACHMENT,
            downloadLabel: "Save as…",
            showOpen: false,
            openLabel: undefined,
            showInlineDownload: false,
        });
    });

    it("shows an encrypted file's info row", () => {
        const vm = createVm({
            mediaEventHelper: mkMediaEventHelper({ encrypted: true }),
            mxEvent: mkMediaEvent({ body: "my-file.pdf", file: { url: "mxc://server/file" } }),
        });

        expect(vm.getSnapshot()).toMatchObject({
            state: FileBodyViewState.ENCRYPTED,
            showInfo: true,
            infoLabel: "my-file.pdf",
        });
    });

    it.each([
        { msgtype: "m.file", expectedIcon: FileBodyViewInfoIcon.ATTACHMENT },
        { msgtype: "m.audio", expectedIcon: FileBodyViewInfoIcon.AUDIO },
        { msgtype: "m.video", expectedIcon: FileBodyViewInfoIcon.VIDEO },
    ])("shows generic placeholder info for $msgtype", ({ msgtype, expectedIcon }) => {
        const vm = createVm({ mxEvent: mkMediaEvent({ msgtype }) });

        expect(vm.getSnapshot()).toMatchObject({
            state: FileBodyViewState.UNENCRYPTED,
            showInfo: true,
            infoLabel: "alt",
            infoIcon: expectedIcon,
        });
    });

    it("shows export snapshot with export href", () => {
        const vm = createVm({
            forExport: true,
            mxEvent: mkMediaEvent({ url: "https://server/export-file" }),
        });

        expect(vm.getSnapshot()).toMatchObject({
            state: FileBodyViewState.EXPORT,
            showInfo: true,
            infoLabel: "alt",
            infoHref: "https://server/export-file",
        });
    });

    it.each([false, true])(
        "asks where to save the file on info click, as the message menu's Save as… does (encrypted: %s)",
        async (encrypted) => {
            const mxEvent = mkMediaEvent({});
            const mediaEventHelper = mkMediaEventHelper({ encrypted, fileName: "placeholder.txt" });
            const vm = createVm({ mxEvent, mediaEventHelper });

            await vm.onInfoClick();

            expect(saveMediaAs).toHaveBeenCalledWith(mxEvent, mediaEventHelper);
        },
    );

    it("doesn't save from an export, or without a media helper to fetch the file", async () => {
        await createVm({ forExport: true }).onInfoClick();
        await createVm({ mediaEventHelper: undefined }).onInfoClick();

        expect(saveMediaAs).not.toHaveBeenCalled();
    });

    it("returns INVALID snapshot when content URL is missing", () => {
        const vm = createVm({ mxEvent: mkMediaEvent({ url: undefined }) });

        expect(vm.getSnapshot()).toMatchObject({
            state: FileBodyViewState.INVALID,
            showInfo: true,
            infoLabel: "alt",
            infoIcon: FileBodyViewInfoIcon.ATTACHMENT,
        });
    });

    it("follows a new event", () => {
        const vm = createVm();

        vm.setProps({ mxEvent: mkMediaEvent({ body: "new.txt" }) });

        expect(vm.getSnapshot()).toMatchObject({ state: FileBodyViewState.UNENCRYPTED, infoLabel: "new.txt" });
    });

    it("keeps the encrypted state when the media helper is unknown", () => {
        const vm = createVm({
            mediaEventHelper: undefined,
            mxEvent: mkMediaEvent({ file: { url: "mxc://server/file" } }),
        });

        expect(vm.getSnapshot().state).toBe(FileBodyViewState.UNENCRYPTED);
    });

    describe("open in viewer", () => {
        const pdf = { info: { mimetype: "application/pdf" } };

        /** The lab flag is read by the view and handed in, so a test just sets it directly. */
        const createPdfVm = (
            overrides: Partial<ConstructorParameters<typeof FileBodyViewModel>[0]> = {},
        ): FileBodyViewModel => createVm({ documentPreviewsEnabled: true, ...overrides });

        it("does not offer the viewer while the lab is off", () => {
            const vm = createPdfVm({
                documentPreviewsEnabled: false,
                mxEvent: mkMediaEvent(pdf),
            });

            expect(vm.getSnapshot().showOpen).toBe(false);
            expect(vm.getSnapshot().showInlineDownload).toBe(false);
        });

        it("offers the viewer for a PDF shown as a file in the timeline", () => {
            const vm = createPdfVm({
                mxEvent: mkMediaEvent(pdf),
            });

            expect(vm.getSnapshot()).toMatchObject({ showOpen: true, openLabel: "Open PDF" });
        });

        it("offers the viewer for an encrypted PDF, which decrypts on open", () => {
            const vm = createPdfVm({
                mxEvent: mkMediaEvent({ ...pdf, file: { url: "mxc://server/file" } }),
                mediaEventHelper: mkMediaEventHelper({ encrypted: true }),
            });

            expect(vm.getSnapshot()).toMatchObject({
                state: FileBodyViewState.ENCRYPTED,
                showOpen: true,
            });
        });

        it.each([
            ["a non-PDF mimetype", { info: { mimetype: "text/plain" } }],
            ["no mimetype at all", {}],
        ])("does not offer the viewer for %s", (_label, content) => {
            const vm = createPdfVm({
                mxEvent: mkMediaEvent(content),
            });

            expect(vm.getSnapshot().showOpen).toBe(false);
        });

        it("does not offer the viewer in an export", () => {
            const vm = createPdfVm({ mxEvent: mkMediaEvent(pdf), forExport: true });

            expect(vm.getSnapshot().showOpen).toBeUndefined();
        });

        it("does not offer the viewer without a media helper to fetch the bytes", () => {
            const vm = createPdfVm({ mxEvent: mkMediaEvent(pdf), mediaEventHelper: undefined });

            expect(vm.getSnapshot().showOpen).toBe(false);
        });

        it("opens the viewer for its own event on click", () => {
            const mxEvent = mkMediaEvent(pdf);
            const vm = createPdfVm({ mxEvent });

            vm.onOpenClick();

            expect(openDocumentViewer).toHaveBeenCalledWith(mxEvent);
        });

        describe("for Markdown", () => {
            const markdown = { body: "README.md", info: { mimetype: "text/markdown" } };

            it("offers the Markdown viewer while the lab is on", () => {
                const vm = createVm({
                    documentPreviewsEnabled: true,
                    mxEvent: mkMediaEvent(markdown),
                });

                expect(vm.getSnapshot()).toMatchObject({ showOpen: true, openLabel: "Open Markdown" });
            });

            it("does not offer the Markdown viewer while the lab is off", () => {
                const vm = createVm({
                    documentPreviewsEnabled: false,
                    mxEvent: mkMediaEvent(markdown),
                });

                expect(vm.getSnapshot().showOpen).toBe(false);
            });

            it("opens the Markdown viewer for its own event on click", () => {
                const mxEvent = mkMediaEvent(markdown);
                const vm = createVm({
                    documentPreviewsEnabled: true,
                    mxEvent,
                });

                vm.onOpenClick();

                expect(openDocumentViewer).toHaveBeenCalledWith(mxEvent);
            });
        });
    });
});
