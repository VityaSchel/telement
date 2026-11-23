/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { EventStatus, type MatrixClient, type MatrixEvent } from "matrix-js-sdk/src/matrix";
import {
    BaseViewModel,
    type FailedMessageMarkViewActions,
    type FailedMessageMarkViewSnapshot,
} from "@element-hq/web-shared-components";

import Resend from "../../../Resend";
import { canCancel } from "../../../utils/EventUtils";

/** Props for {@link FailedMessageMarkViewModel}. */
export interface FailedMessageMarkViewModelProps {
    /** The message that failed to send, or whose edit or removal did. */
    mxEvent: MatrixEvent;
    /** The client that sends it. */
    client: MatrixClient;
}

/**
 * The red mark of a message that failed to send, and its menu: Resend sends again what failed, Delete takes it out
 * of the queue. What failed is the message's removal, its edit or the message itself, as for the message menu's Retry
 * and Cancel.
 */
export class FailedMessageMarkViewModel
    extends BaseViewModel<FailedMessageMarkViewSnapshot, FailedMessageMarkViewModelProps>
    implements FailedMessageMarkViewActions
{
    public constructor(props: FailedMessageMarkViewModelProps) {
        super(props, { menuOpen: false });
    }

    /** The message's removal, its edit and the message itself, in the order the message menu tries them. */
    private get pendingEvents(): MatrixEvent[] {
        const { mxEvent } = this.props;
        return [mxEvent.localRedactionEvent(), mxEvent.replacingEvent(), mxEvent].filter(
            (event): event is MatrixEvent => !!event,
        );
    }

    /** Follows the tile to another event. */
    public setEvent(mxEvent: MatrixEvent): void {
        this.props = { ...this.props, mxEvent };
    }

    public setMenuOpen = (menuOpen: boolean): void => {
        this.snapshot.merge({ menuOpen });
    };

    public resend = (): void => {
        const failed = this.pendingEvents.find((event) => event.status === EventStatus.NOT_SENT);
        if (failed) void Resend.resend(this.props.client, failed);
    };

    public delete = (): void => {
        const cancellable = this.pendingEvents.find((event) => canCancel(event.status));
        if (cancellable) Resend.removeFromQueue(this.props.client, cancellable);
    };
}
