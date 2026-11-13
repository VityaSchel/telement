/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { logger } from "matrix-js-sdk/src/logger";

import { FileDownloader } from "../../utils/FileDownloader";

/** The parts of the File System Access API that saving uses, which TypeScript's DOM types leave out. */
interface WritableFile {
    write(data: Blob): Promise<void>;
    close(): Promise<void>;
    abort(): Promise<void>;
}

interface PickedFile {
    createWritable(): Promise<WritableFile>;
    /** Chromium only: deletes the file, which the save dialog has already created empty. */
    remove?(): Promise<void>;
}

interface SaveFilePickerWindow {
    showSaveFilePicker?(options: { suggestedName: string }): Promise<PickedFile>;
}

function isCancelled(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

async function download(fileName: string, loadFile: () => Promise<Blob>): Promise<void> {
    await new FileDownloader().download({ blob: await loadFile(), name: fileName });
}

/**
 * Asks the user where to save a file, then saves it there.
 *
 * Chromium browsers and Telement Desktop open the system's save dialog through the File System Access API. Other
 * browsers download the file as usual, which may show their own save dialog. The dialog opens before the file is
 * loaded: browsers only allow it while the click that asked for it is being handled, and a cancelled dialog then
 * costs no download.
 *
 * @param fileName - The name the dialog suggests.
 * @param loadFile - Loads the file's contents.
 * @returns Whether the file was saved, or `false` when the user cancelled the dialog.
 * @throws When the file could not be loaded or written.
 */
export async function saveFileAs(fileName: string, loadFile: () => Promise<Blob>): Promise<boolean> {
    const pickerWindow = window as unknown as SaveFilePickerWindow;
    if (!pickerWindow.showSaveFilePicker) {
        await download(fileName, loadFile);
        return true;
    }

    let picked: PickedFile;
    try {
        picked = await pickerWindow.showSaveFilePicker({ suggestedName: fileName });
    } catch (error) {
        if (isCancelled(error)) return false;
        // The dialog is refused when the click is too long ago or the page is embedded, so download instead.
        logger.warn("Could not open the save dialog, downloading instead", error);
        await download(fileName, loadFile);
        return true;
    }

    try {
        const file = await loadFile();
        const writable = await picked.createWritable();
        try {
            await writable.write(file);
            await writable.close();
        } catch (error) {
            await writable.abort().catch(() => {});
            throw error;
        }
    } catch (error) {
        await picked.remove?.().catch(() => {});
        throw error;
    }
    return true;
}
