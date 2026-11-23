/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { type ImageContent, type MediaEventContent } from "matrix-js-sdk/src/types";

import { type MediaDownloadPart } from "../../viewmodels/telement/media/MediaDownloadProgressViewModel";

/**
 * The files a message's media downloads before it can be shown: its file, and the thumbnail of an encrypted picture,
 * which is downloaded and decrypted too. The browser loads the thumbnail of an unencrypted picture itself.
 */
export function getMediaDownloadParts(mxEvent: MatrixEvent): MediaDownloadPart[] {
    const content = mxEvent.getContent<MediaEventContent>();
    const parts: MediaDownloadPart[] = [];
    const source = content.file?.url ?? content.url;
    if (source) parts.push({ mxc: source, size: content.info?.size });

    const info = (content as ImageContent).info;
    if (info?.thumbnail_file?.url) parts.push({ mxc: info.thumbnail_file.url, size: info.thumbnail_info?.size });
    return parts;
}
