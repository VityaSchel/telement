/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";

import { getMediaDownloadParts } from "./getMediaDownloadParts";

const message = (content: Record<string, unknown>): MatrixEvent =>
    new MatrixEvent({ type: "m.room.message", content: { msgtype: "m.image", body: "picture", ...content } });

describe("getMediaDownloadParts", () => {
    it("is the file of an unencrypted message, whose thumbnail the browser loads itself", () => {
        const parts = getMediaDownloadParts(
            message({ url: "mxc://server/picture", info: { size: 100, thumbnail_url: "mxc://server/thumbnail" } }),
        );

        expect(parts).toEqual([{ mxc: "mxc://server/picture", size: 100 }]);
    });

    it("adds the thumbnail of an encrypted picture, which is downloaded and decrypted too", () => {
        const parts = getMediaDownloadParts(
            message({
                file: { url: "mxc://server/picture" },
                info: { size: 100, thumbnail_file: { url: "mxc://server/thumbnail" }, thumbnail_info: { size: 10 } },
            }),
        );

        expect(parts).toEqual([
            { mxc: "mxc://server/picture", size: 100 },
            { mxc: "mxc://server/thumbnail", size: 10 },
        ]);
    });

    it("is nothing for a message without a file", () => {
        expect(getMediaDownloadParts(message({}))).toEqual([]);
    });
});
