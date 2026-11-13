/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";
import { type MediaEventContent } from "matrix-js-sdk/src/types";
import mime from "mime";

import { _t } from "../../languageHandler";
import Modal from "../../Modal";
import ErrorDialog from "../../components/views/dialogs/ErrorDialog";
import { MediaEventHelper } from "../../utils/MediaEventHelper";
import { ModuleApi } from "../../modules/Api";
import { saveFileAs } from "./saveFileAs";

/** Extensions for types whose first extension in the `mime` package is not the one people expect. */
const PREFERRED_EXTENSIONS: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "video/quicktime": "mov",
};

/**
 * The name "Save as…" suggests for a message's file. Pictures, videos and sounds named without an extension, such as
 * voice messages and stickers, get one from their type, so that other apps can open the saved file.
 *
 * @param fileName - The message's file name.
 * @param mimetype - The file's type, from the message.
 */
export function getSaveFileName(fileName: string, mimetype?: string): string {
    const type = mimetype?.split(";")[0].trim().toLowerCase();
    if (!type || !/^(image|video|audio)\//.test(type) || mime.getType(fileName)) return fileName;
    const extension = PREFERRED_EXTENSIONS[type] ?? mime.getExtension(type);
    return extension ? `${fileName}.${extension}` : fileName;
}

/**
 * Asks a module whether the user may save the file of a message.
 *
 * @returns The module's answer, or `undefined` when no module decides, in which case saving is allowed.
 */
export function checkMediaSavingAllowed(mxEvent: MatrixEvent): Promise<boolean> | undefined {
    const hints = ModuleApi.instance.customComponents.getHintsForMessage(mxEvent);
    if (!hints?.allowDownloadingMedia) return undefined;
    return hints.allowDownloadingMedia().catch((error) => {
        logger.error(`Failed to check media download permission for ${mxEvent.getId()}`, error);
        return false;
    });
}

/**
 * Asks the user where to save a file and saves it there, see {@link saveFileAs}. Shows an error dialog when the file
 * cannot be saved.
 *
 * @param fileName - The name the save dialog suggests.
 * @param loadFile - Loads the file's contents.
 */
export async function saveAs(fileName: string, loadFile: () => Promise<Blob>): Promise<void> {
    try {
        await saveFileAs(fileName, loadFile);
    } catch (error) {
        logger.error("Failed to save a file", error);
        Modal.createDialog(ErrorDialog, {
            title: _t("telement|media|save_as_failed_title"),
            description: `${_t("telement|media|save_as_failed_description")}\n\n${String(error)}`,
        });
    }
}

/**
 * Asks the user where to save the file of a message and saves it there, decrypted.
 *
 * @param mxEvent - A message carrying a file, see {@link MediaEventHelper.isEligible}.
 * @param mediaEventHelper - The message's media helper, whose already loaded file is reused.
 */
export function saveMediaAs(
    mxEvent: MatrixEvent,
    mediaEventHelper: MediaEventHelper = new MediaEventHelper(mxEvent),
): Promise<void> {
    const mimetype = mxEvent.getContent<MediaEventContent>().info?.mimetype;
    return saveAs(getSaveFileName(mediaEventHelper.fileName, mimetype), () => mediaEventHelper.sourceBlob.value);
}
