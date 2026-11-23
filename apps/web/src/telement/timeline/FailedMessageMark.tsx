/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useEffect } from "react";
import { type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { FailedMessageMarkView, useCreateAutoDisposedViewModel } from "@element-hq/web-shared-components";

import { MatrixClientPeg } from "../../MatrixClientPeg";
import { FailedMessageMarkViewModel } from "../../viewmodels/telement/timeline/FailedMessageMarkViewModel";

/** Props for {@link FailedMessageMark}. */
interface FailedMessageMarkProps {
    /** The message that failed to send, or whose edit or removal did. */
    mxEvent: MatrixEvent;
}

/** The red mark after the time of a message that failed to send, which opens Resend and Delete, as in Telegram. */
export function FailedMessageMark({ mxEvent }: Readonly<FailedMessageMarkProps>): JSX.Element {
    const vm = useCreateAutoDisposedViewModel(
        () => new FailedMessageMarkViewModel({ mxEvent, client: MatrixClientPeg.safeGet() }),
    );

    useEffect(() => {
        vm.setEvent(mxEvent);
    }, [vm, mxEvent]);

    return <FailedMessageMarkView vm={vm} />;
}
