/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { type MatrixClient, type Room } from "matrix-js-sdk/src/matrix";

import { _t } from "../../../languageHandler";
import { type RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { PollHistory } from "../polls/pollHistory/PollHistory";
import BaseDialog from "./BaseDialog";

type PollHistoryDialogProps = {
    room: Room;
    matrixClient: MatrixClient;
    permalinkCreator: RoomPermalinkCreator;
    onFinished(this: void): void;
};

export const PollHistoryDialog: React.FC<PollHistoryDialogProps> = ({
    room,
    matrixClient,
    permalinkCreator,
    onFinished,
}) => {
    // Telement: titled like every dialog, on the close button's line, rather than by the list's own larger heading
    return (
        <BaseDialog className="mx_PollHistoryDialog" title={_t("right_panel|polls_button")} onFinished={onFinished}>
            <PollHistory
                room={room}
                matrixClient={matrixClient}
                permalinkCreator={permalinkCreator}
                onFinished={onFinished}
                showListHeading={false}
            />
        </BaseDialog>
    );
};
