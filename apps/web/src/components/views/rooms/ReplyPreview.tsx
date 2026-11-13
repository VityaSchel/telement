/*
Copyright 2024 New Vector Ltd.
Copyright 2017-2021 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useEffect, type JSX } from "react";
import classNames from "classnames";
import { type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { CloseIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import { ReplyTileView, useCreateAutoDisposedViewModel } from "@element-hq/web-shared-components";

import dis from "../../../dispatcher/dispatcher";
import { _t } from "../../../languageHandler";
import { type RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import RoomContext, { type TimelineRenderingType } from "../../../contexts/RoomContext";
import AccessibleButton from "../elements/AccessibleButton";
import { useMatrixClientContext } from "../../../contexts/MatrixClientContext";
import { ReplyTileViewModel } from "../../../viewmodels/room/timeline/event-tile/ReplyTileViewModel";
import { useUserStatus } from "../../../hooks/useUserStatus";
import { getUserNameColorClass } from "../../../utils/FormattingUtils";

function cancelQuoting(context: TimelineRenderingType): void {
    dis.dispatch({
        action: "reply_to_event",
        event: null,
        context,
    });
}

interface IProps {
    permalinkCreator?: RoomPermalinkCreator;
    replyToEvent?: MatrixEvent;
}

interface ReplyTileProps {
    mxEvent: MatrixEvent;
    permalinkCreator?: RoomPermalinkCreator;
}

function ReplyTile({ mxEvent, permalinkCreator }: ReplyTileProps): JSX.Element {
    const cli = useMatrixClientContext();
    const userStatus = useUserStatus(mxEvent.getSender() ?? mxEvent.sender?.userId);
    const vm = useCreateAutoDisposedViewModel(
        () =>
            new ReplyTileViewModel({
                mxEvent,
                permalinkCreator,
                cli,
                userStatus,
            }),
    );

    useEffect(() => {
        vm.setProps({
            mxEvent,
            permalinkCreator,
            cli,
            userStatus,
        });
    }, [cli, mxEvent, permalinkCreator, userStatus, vm]);

    return <ReplyTileView vm={vm} excerpt />;
}

export default class ReplyPreview extends React.Component<IProps> {
    public static contextType = RoomContext;
    declare public context: React.ContextType<typeof RoomContext>;

    public render(): JSX.Element | null {
        const { replyToEvent } = this.props;
        if (!replyToEvent) return null;

        // As the quote's sender row: a member who shares their name with another is told apart by their Matrix ID.
        const sender = replyToEvent.sender;
        const senderId = replyToEvent.getSender() ?? "";
        const name = (
            <>
                <bdi>{sender?.rawDisplayName || senderId}</bdi>
                {sender?.disambiguate ? (
                    <>
                        {" "}
                        <bdi className="mx_ReplyPreview_mxid">{senderId}</bdi>
                    </>
                ) : null}
            </>
        );

        return (
            <div className="mx_ReplyPreview">
                <div className={classNames("mx_ReplyPreview_section", getUserNameColorClass(senderId))}>
                    <div className="mx_ReplyPreview_header">
                        <span className="mx_ReplyPreview_title">{_t("telement|composer|reply_to", { name })}</span>
                        <AccessibleButton
                            className="mx_ReplyPreview_header_cancel"
                            aria-label={_t("telement|composer|cancel_reply")}
                            onClick={() => cancelQuoting(this.context.timelineRenderingType)}
                        >
                            <CloseIcon />
                        </AccessibleButton>
                    </div>
                    <ReplyTile mxEvent={replyToEvent} permalinkCreator={this.props.permalinkCreator} />
                </div>
            </div>
        );
    }
}
