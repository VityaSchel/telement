/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { mkMessage, stubClient } from "test-utils";

import ReportEventDialog from "./ReportEventDialog";

vi.mock("react-focus-lock");

const ROOM_ID = "!room:example.org";
const SENDER = "@spammer:example.org";

describe("ReportEventDialog", () => {
    let client: MatrixClient;
    const onFinished = vi.fn();
    const mxEvent = mkMessage({ room: ROOM_ID, user: SENDER, msg: "Buy now!", event: true });

    beforeEach(() => {
        client = stubClient();
        client.reportEvent = vi.fn().mockResolvedValue({});
        vi.mocked(client.setIgnoredUsers).mockResolvedValue({});
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("asks for the reason in a field with its label on its top border, as Report room does", () => {
        render(<ReportEventDialog mxEvent={mxEvent} onFinished={onFinished} />);
        const reason = screen.getByRole("textbox", { name: "Reason" });

        expect(reason.closest(".mx_Field")).toHaveClass("mx_Field_textarea", "mx_Field_labelAlwaysTopLeft");
        expect(reason).toHaveAttribute("placeholder", "");
    });

    it("offers to ignore the sender as a switch row with its description under the label, like Report room's", () => {
        render(<ReportEventDialog mxEvent={mxEvent} onFinished={onFinished} />);
        const ignore = screen.getByRole("switch", { name: "Ignore user" });

        expect(ignore).not.toBeChecked();
        expect(ignore.closest(".mx_ReportEventDialog_ignoreUser")).toHaveTextContent(
            "Ignore userCheck if you want to hide all current and future messages from this user.",
        );
        expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("reports the message and ignores its sender when the switch is on", async () => {
        render(<ReportEventDialog mxEvent={mxEvent} onFinished={onFinished} />);

        await userEvent.type(screen.getByRole("textbox", { name: "Reason" }), "Spam");
        await userEvent.click(screen.getByRole("switch", { name: "Ignore user" }));
        await userEvent.click(screen.getByRole("button", { name: "Send report" }));

        expect(client.reportEvent).toHaveBeenCalledWith(ROOM_ID, mxEvent.getId(), -100, "Spam");
        expect(client.setIgnoredUsers).toHaveBeenCalledWith([SENDER]);
        expect(onFinished).toHaveBeenCalledWith(true);
    });
});
