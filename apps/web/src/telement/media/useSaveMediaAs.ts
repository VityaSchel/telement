/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { useCallback, useEffect, useMemo, useState } from "react";
import { type MatrixEvent, parseErrorResponse } from "matrix-js-sdk/src/matrix";

import { _t } from "../../languageHandler";
import { MediaEventHelper } from "../../utils/MediaEventHelper";
import { checkMediaSavingAllowed, saveAs, saveMediaAs } from "./saveMediaAs";

/** What {@link useSaveMediaAs} returns. */
export interface UseSaveMediaAsResult {
    /** Asks where to save the file and saves it there. */
    saveAs: () => Promise<void>;
    /** Whether the file is being saved. */
    saving: boolean;
    /** Whether the user may save the file. */
    canSave: boolean;
}

async function fetchBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) throw parseErrorResponse(response, await response.text());
    return response.blob();
}

/**
 * "Save as…" for the file shown in a lightbox: the message's file, decrypted, or the file at `url` when there is no
 * message, such as an avatar.
 *
 * @param url - Address of the file, used when there is no message.
 * @param fileName - Name suggested for the file when there is no message.
 * @param mxEvent - The message whose file is shown.
 */
export function useSaveMediaAs(url: string, fileName?: string, mxEvent?: MatrixEvent): UseSaveMediaAsResult {
    const [saving, setSaving] = useState(false);
    const [canSave, setCanSave] = useState(true);
    const mediaEventHelper = useMemo(() => (mxEvent ? new MediaEventHelper(mxEvent) : undefined), [mxEvent]);

    useEffect(() => {
        if (!mxEvent) return;
        const check = checkMediaSavingAllowed(mxEvent);
        setCanSave(!check);
        let current = true;
        void check?.then((allowed) => {
            if (current) setCanSave(allowed);
        });
        return () => {
            current = false;
        };
    }, [mxEvent]);

    const save = useCallback(async (): Promise<void> => {
        if (saving) return;
        setSaving(true);
        try {
            if (mxEvent && mediaEventHelper) {
                await saveMediaAs(mxEvent, mediaEventHelper);
            } else {
                await saveAs(fileName ?? _t("common|image"), () => fetchBlob(url));
            }
        } finally {
            setSaving(false);
        }
    }, [fileName, mediaEventHelper, mxEvent, saving, url]);

    return { saveAs: save, saving, canSave };
}
