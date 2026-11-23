/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import classNames from "classnames";
import { type Room } from "matrix-js-sdk/src/matrix";
import { UnreadMentionsButtonView, useCreateAutoDisposedViewModel } from "@element-hq/web-shared-components";

import { UnreadMentionsButtonViewModel } from "../../viewmodels/telement/room/UnreadMentionsButtonViewModel";

interface UnreadMentionsButtonProps {
    /** The room whose timeline it is over. */
    room: Room;
    /** Whether the jump to bottom button shows, which it stands above. */
    stacked: boolean;
}

/** The room timeline's unread mentions button, in its bottom end corner (_UnreadMentionsButton.pcss). */
export function UnreadMentionsButton({ room, stacked }: Readonly<UnreadMentionsButtonProps>): JSX.Element {
    const vm = useCreateAutoDisposedViewModel(() => new UnreadMentionsButtonViewModel({ room }));
    return (
        <UnreadMentionsButtonView
            vm={vm}
            className={classNames("mx_UnreadMentionsButton", { mx_UnreadMentionsButton_stacked: stacked })}
        />
    );
}
