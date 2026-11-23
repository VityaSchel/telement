/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type ChangeEventHandler, useCallback, useState } from "react";
import { Root, InlineSpinner, SettingsToggleInput } from "@vector-im/compound-web";

import { _t } from "../../../languageHandler";
import SdkConfig from "../../../SdkConfig";
import Markdown from "../../../Markdown";
import BaseDialog from "./BaseDialog";
import DialogButtons from "../elements/DialogButtons";
import Field from "../elements/Field";
import { MatrixClientPeg } from "../../../MatrixClientPeg";

interface IProps {
    roomId: string;
    onFinished(this: void, leave: boolean): void;
}

/*
 * A dialog for reporting a room.
 */

export const ReportRoomDialog: React.FC<IProps> = function ({ roomId, onFinished }) {
    const [error, setErr] = useState<string>();
    const [busy, setBusy] = useState(false);
    const [reason, setReason] = useState("");
    const [leaveRoom, setLeaveRoom] = useState(false);
    const client = MatrixClientPeg.safeGet();

    const onReasonChange = useCallback<ChangeEventHandler<HTMLTextAreaElement>>((e) => setReason(e.target.value), []);
    const onLeaveRoomChanged = useCallback<ChangeEventHandler<HTMLInputElement>>(
        (e) => setLeaveRoom(e.target.checked),
        [setLeaveRoom],
    );
    const onCancel = useCallback(() => onFinished(false), [onFinished]);
    const onSubmit = useCallback(async () => {
        setBusy(true);
        try {
            await client.reportRoom(roomId, reason);
            onFinished(leaveRoom);
        } catch (ex) {
            setBusy(false);
            if (ex instanceof Error) {
                setErr(ex.message);
            } else {
                setErr("Unknown error");
            }
        }
    }, [roomId, reason, client, leaveRoom, onFinished]);

    const adminMessageMD = SdkConfig.getObject("report_event")?.get("admin_message_md", "adminMessageMD");
    let adminMessage: JSX.Element | undefined;
    if (adminMessageMD) {
        const html = new Markdown(adminMessageMD).toHTML({ externalLinks: true });
        adminMessage = <p dangerouslySetInnerHTML={{ __html: html }} />;
    }

    return (
        <BaseDialog
            className="mx_ReportRoomDialog"
            onFinished={onCancel}
            title={_t("action|report_room")}
            contentId="mx_ReportEventDialog"
        >
            <Root id="mx_ReportEventDialog" onSubmit={onSubmit}>
                {/* Telement: Report message's field, its label on its top border, with the help under it */}
                <Field
                    id="mx_ReportRoomDialog_reason"
                    element="textarea"
                    label={_t("report_room|reason_label")}
                    placeholder=""
                    usePlaceholderAsHint
                    rows={5}
                    onChange={onReasonChange}
                    value={reason}
                    disabled={busy}
                    aria-describedby="mx_ReportRoomDialog_help"
                />
                <p className="mx_ReportRoomDialog_help" id="mx_ReportRoomDialog_help">
                    {_t("report_room|description")}
                </p>
                {error ? <div className="error">{error}</div> : null}
                {adminMessage}
                {busy ? <InlineSpinner /> : null}
                <SettingsToggleInput
                    name="leave-room"
                    className="mx_ReportRoomDialog_leaveRoom"
                    label={_t("room_list|more_options|leave_room")}
                    checked={leaveRoom}
                    onChange={onLeaveRoomChanged}
                />
                <DialogButtons
                    primaryButton={_t("action|send_report")}
                    onPrimaryButtonClick={onSubmit}
                    focus={true}
                    onCancel={onCancel}
                    primaryButtonClass="danger"
                    primaryDisabled={busy || !reason}
                />
            </Root>
        </BaseDialog>
    );
};
