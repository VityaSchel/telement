/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type IContent, MsgType } from "matrix-js-sdk/src/matrix";

/**
 * Content key marking an `m.video` as a round video note while MSC4546 is unstable.
 * @see https://github.com/matrix-org/matrix-spec-proposals/pull/4546
 */
export const VIDEO_NOTE_UNSTABLE_KEY = "org.interferolog.circle";

/**
 * Content key MSC4546 will use once it is accepted.
 */
export const VIDEO_NOTE_STABLE_KEY = "m.circle";

/**
 * Whether the content is a round video note as defined by MSC4546.
 */
export function isVideoNote(content: IContent): boolean {
    return (
        content.msgtype === MsgType.Video &&
        (content[VIDEO_NOTE_UNSTABLE_KEY] === true || content[VIDEO_NOTE_STABLE_KEY] === true)
    );
}
