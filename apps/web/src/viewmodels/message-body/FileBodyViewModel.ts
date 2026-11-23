/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { MsgType, type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { type MediaEventContent } from "matrix-js-sdk/src/types";
import {
    BaseViewModel,
    FileBodyViewState,
    FileBodyViewInfoIcon,
    type FileBodyViewSnapshot,
    type FileBodyViewModel as FileBodyViewModelInterface,
} from "@element-hq/web-shared-components";

import { _t } from "../../languageHandler";
import { mediaFromContent } from "../../customisations/Media";
import { presentableTextForFile } from "../../utils/FileUtils";
import { type MediaEventHelper } from "../../utils/MediaEventHelper";
import { documentViewerForEvent, openDocumentViewer } from "../../utils/documentViewer";
import { saveMediaAs } from "../../telement/media/saveMediaAs";

export interface FileBodyViewModelProps {
    mxEvent: MatrixEvent;
    mediaEventHelper?: MediaEventHelper;
    forExport?: boolean;
    /** Whether the document previews lab is on. Read by the view, so this model needs no settings access. */
    documentPreviewsEnabled: boolean;
}

export class FileBodyViewModel
    extends BaseViewModel<FileBodyViewSnapshot, FileBodyViewModelProps>
    implements FileBodyViewModelInterface
{
    public constructor(props: FileBodyViewModelProps) {
        super(props, FileBodyViewModel.computeSnapshot(props));
    }

    private static getInfoIcon(content: MediaEventContent): FileBodyViewInfoIcon {
        if (content.msgtype === MsgType.Audio) {
            return FileBodyViewInfoIcon.AUDIO;
        } else if (content.msgtype === MsgType.Video) {
            return FileBodyViewInfoIcon.VIDEO;
        }
        return FileBodyViewInfoIcon.ATTACHMENT;
    }

    private static computeSnapshot(props: FileBodyViewModelProps): FileBodyViewSnapshot {
        const content = props.mxEvent.getContent<MediaEventContent>();
        const media = mediaFromContent(content);
        const isEncrypted = props.mediaEventHelper?.media.isEncrypted === true;

        const info = {
            showInfo: true,
            infoLabel: presentableTextForFile(content, _t("common|attachment"), true, true),
            infoTooltip: presentableTextForFile(content, _t("common|attachment"), true),
            infoIcon: FileBodyViewModel.getInfoIcon(content),
        };

        if (props.forExport) {
            return { state: FileBodyViewState.EXPORT, ...info, infoHref: content.file?.url || content.url };
        }

        if (!isEncrypted && !media.srcHttp) {
            return { state: FileBodyViewState.INVALID, ...info, infoHref: content.file?.url || content.url };
        }

        // Offer a viewer for the file. Needs the media helper, since opening has to fetch the bytes.
        const viewer =
            props.mediaEventHelper && props.documentPreviewsEnabled ? documentViewerForEvent(props.mxEvent) : undefined;
        return {
            state: isEncrypted ? FileBodyViewState.ENCRYPTED : FileBodyViewState.UNENCRYPTED,
            ...info,
            // Telement: the download control in the info row is "Save as…", as the message menu says
            downloadLabel: _t("telement|media|save_as"),
            showOpen: !!viewer,
            openLabel: viewer?.openLabel(),
            // Once the row carries an action for opening, downloading needs to be an action too rather than
            // staying hidden behind a click on the file name.
            showInlineDownload: !!viewer,
        };
    }

    /** Telement: asks where to save the file, as the message menu's "Save as…" does, and saves it there. */
    public onInfoClick = async (): Promise<void> => {
        if (this.props.forExport || !this.props.mediaEventHelper) return;

        await saveMediaAs(this.props.mxEvent, this.props.mediaEventHelper);
    };

    public onOpenClick = (): void => openDocumentViewer(this.props.mxEvent);

    public setProps(newProps: Partial<FileBodyViewModelProps>): void {
        this.props = { ...this.props, ...newProps };
        this.snapshot.set(FileBodyViewModel.computeSnapshot(this.props));
    }
}
