/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { vi, describe, it, expect, beforeEach, afterEach, type MockedObject } from "vitest";
import React from "react";
import { act, render, screen, waitFor } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { EventType, MatrixEvent, type MatrixClient, MsgType, RoomMember } from "matrix-js-sdk/src/matrix";
import { type VerificationRequest } from "matrix-js-sdk/src/crypto-api";
import { stubClient, wrapInMatrixClientContext, mkRoom, wrapInSdkContext, TestSDKContext } from "test-utils";

import _RightPanel from "./RightPanel";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import ResizeNotifier from "../../utils/ResizeNotifier";
import { Action } from "../../dispatcher/actions";
import dis from "../../dispatcher/dispatcher";
import DMRoomMap from "../../utils/DMRoomMap";
import SettingsStore from "../../settings/SettingsStore";
import { SettingLevel } from "../../settings/SettingLevel";
import { RightPanelPhases } from "../../stores/right-panel/RightPanelStorePhases";
import RightPanelStore from "../../stores/right-panel/RightPanelStore";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import { WidgetLayoutStore } from "../../stores/widgets/WidgetLayoutStore";
import { RoomPermalinkCreator } from "../../utils/permalinks/Permalinks";
import Modal from "../../Modal";
import QuestionDialog from "../views/dialogs/QuestionDialog";

// A profile asks the server for much, which these tests are not about
vi.mock("../views/right_panel/UserInfo", () => ({ default: () => <button>Profile</button> }));

const RightPanelBase = wrapInMatrixClientContext(_RightPanel);

describe("RightPanel", () => {
    const resizeNotifier = new ResizeNotifier();

    let cli: MockedObject<MatrixClient>;
    let context: TestSDKContext;
    let RightPanel: React.ComponentType<React.ComponentProps<typeof RightPanelBase>>;
    beforeEach(() => {
        stubClient();
        cli = vi.mocked(MatrixClientPeg.safeGet());
        DMRoomMap.makeShared(cli);
        context = new TestSDKContext();
        context._client = cli;
        RightPanel = wrapInSdkContext(RightPanelBase, context);
    });

    afterEach(async () => {
        const roomChanged = new Promise<void>((resolve) => {
            const ref = dis.register((payload) => {
                if (payload.action === Action.ActiveRoomChanged) {
                    dis.unregister(ref);
                    resolve();
                }
            });
        });
        dis.fire(Action.ViewHomePage); // Stop viewing any rooms
        await roomChanged;

        dis.fire(Action.OnLoggedOut, true); // Shut down the stores
        vi.restoreAllMocks();
        SettingsStore.reset();
    });

    const spinUpStores = async () => {
        // Selectively spin up the stores we need
        WidgetLayoutStore.instance.useUnitTestClient(cli);
        // @ts-ignore
        // This is private but it's the only way to selectively enable stores
        await WidgetLayoutStore.instance.onReady();

        // Make sure we start with a clean store
        RightPanelStore.instance.reset();
        RightPanelStore.instance.useUnitTestClient(cli);
        // @ts-ignore
        await RightPanelStore.instance.onReady();
    };

    const waitForRpsUpdate = () => new Promise<void>((resolve) => RightPanelStore.instance.once(UPDATE_EVENT, resolve));

    it("renders info from only one room during room changes", async () => {
        const r1 = mkRoom(cli, "r1");
        const r2 = mkRoom(cli, "r2");

        cli.getRoom.mockImplementation((roomId) => {
            if (roomId === "r1") return r1;
            if (roomId === "r2") return r2;
            return null;
        });

        // Set up right panel state
        const realGetValue = SettingsStore.getValue;
        vi.spyOn(SettingsStore, "getValue").mockImplementation((name, roomId) => {
            if (name !== "RightPanel.phases") return realGetValue(name, roomId);
            if (roomId === "r1") {
                return {
                    history: [{ phase: RightPanelPhases.MemberList }],
                    isOpen: true,
                };
            }
            if (roomId === "r2") {
                return {
                    history: [{ phase: RightPanelPhases.RoomSummary }],
                    isOpen: true,
                };
            }
            return null;
        });

        await spinUpStores();

        // Run initial render with room 1, and also running lifecycle methods
        const { container, rerender } = render(
            <RightPanel
                room={r1}
                resizeNotifier={resizeNotifier}
                permalinkCreator={new RoomPermalinkCreator(r1, r1.roomId)}
            />,
        );
        // Wait for RPS room 1 updates to fire
        const rpsUpdated = waitForRpsUpdate();
        dis.dispatch({
            action: Action.ViewRoom,
            room_id: "r1",
        });
        await rpsUpdated;
        await waitFor(() => expect(screen.queryByTestId("spinner")).not.toBeInTheDocument());

        // room one will be in the MemberList phase - confirm this is rendered
        expect(container.getElementsByClassName("mx_MemberListView")).toHaveLength(1);

        // wait for RPS room 2 updates to fire, then rerender
        const _rpsUpdated = waitForRpsUpdate();
        dis.dispatch({
            action: Action.ViewRoom,
            room_id: "r2",
        });
        await _rpsUpdated;
        rerender(
            <RightPanel
                room={r2}
                resizeNotifier={resizeNotifier}
                permalinkCreator={new RoomPermalinkCreator(r2, r2.roomId)}
            />,
        );

        // After all that setup, now to the interesting part...
        // We want to verify that as we change to room 2, we should always have
        // the correct right panel state for whichever room we are showing, so we
        // confirm we do not have the MemberList class on the page and that we have
        // the expected room title
        expect(container.getElementsByClassName("mx_MemberListView")).toHaveLength(0);
        expect(screen.getByRole("heading", { name: "r2" })).toBeInTheDocument();
    });

    it("renders the document viewer card, named after the file, for a PDF", async () => {
        const room = mkRoom(cli, "r1");
        cli.getRoom.mockImplementation((roomId) => (roomId === "r1" ? room : null));

        const pdfEvent = new MatrixEvent({
            room_id: "r1",
            sender: "@user:example.org",
            event_id: "$pdf",
            type: EventType.RoomMessage,
            content: {
                body: "spec.pdf",
                msgtype: MsgType.File,
                url: "mxc://example.org/spec",
                info: { mimetype: "application/pdf" },
            },
        });

        // The card is only valid while the lab is on, so the store would otherwise drop it.
        await SettingsStore.setValue("feature_pdf_viewer", null, SettingLevel.DEVICE, true);

        await spinUpStores();

        render(
            <RightPanel
                room={room}
                resizeNotifier={resizeNotifier}
                permalinkCreator={new RoomPermalinkCreator(room, room.roomId)}
            />,
        );

        const rpsUpdated = waitForRpsUpdate();
        dis.dispatch({ action: Action.ViewRoom, room_id: "r1" });
        await rpsUpdated;

        RightPanelStore.instance.setCard(
            { phase: RightPanelPhases.DocumentViewer, state: { documentViewerEvent: pdfEvent } },
            true,
            "r1",
        );

        // The viewer itself is code split, so the card header is what proves the phase was wired up
        // to DocumentViewerCard with the right event.
        await waitFor(() => expect(screen.getByRole("heading", { name: "spec.pdf" })).toBeInTheDocument());
    });

    it("renders the document viewer card, named after the file, for a Markdown file", async () => {
        const room = mkRoom(cli, "r1");
        cli.getRoom.mockImplementation((roomId) => (roomId === "r1" ? room : null));

        const markdownEvent = new MatrixEvent({
            room_id: "r1",
            sender: "@user:example.org",
            event_id: "$markdown",
            type: EventType.RoomMessage,
            content: {
                body: "README.md",
                msgtype: MsgType.File,
                url: "mxc://example.org/readme",
                info: { mimetype: "text/markdown" },
            },
        });

        // The card is only valid while the lab is on, so the store would otherwise drop it.
        await SettingsStore.setValue("feature_pdf_viewer", null, SettingLevel.DEVICE, true);

        await spinUpStores();

        render(
            <RightPanel
                room={room}
                resizeNotifier={resizeNotifier}
                permalinkCreator={new RoomPermalinkCreator(room, room.roomId)}
            />,
        );

        const rpsUpdated = waitForRpsUpdate();
        dis.dispatch({ action: Action.ViewRoom, room_id: "r1" });
        await rpsUpdated;

        RightPanelStore.instance.setCard(
            { phase: RightPanelPhases.DocumentViewer, state: { documentViewerEvent: markdownEvent } },
            true,
            "r1",
        );

        // As above: the header proves the card picked up this event.
        await waitFor(() => expect(screen.getByRole("heading", { name: "README.md" })).toBeInTheDocument());
    });

    describe("panes (Telement)", () => {
        const ROOM_ID = "r1";
        let outside: HTMLButtonElement;

        /** The panel as the room view shows it, beside the room header's button of the open pane and a composer. */
        const renderPanel = async (): Promise<void> => {
            const room = mkRoom(cli, ROOM_ID);
            cli.getRoom.mockImplementation((roomId) => (roomId === ROOM_ID ? room : null));
            await spinUpStores();
            RightPanelStore.instance.setCard({ phase: RightPanelPhases.RoomSummary }, true, ROOM_ID);

            render(
                <>
                    <button aria-label="Info" aria-controls="mx_RightPanel" aria-expanded="true" />
                    <button aria-label="Outside" />
                    <RightPanel
                        room={room}
                        resizeNotifier={resizeNotifier}
                        permalinkCreator={new RoomPermalinkCreator(room, room.roomId)}
                    />
                </>,
            );
            const rpsUpdated = waitForRpsUpdate();
            dis.dispatch({ action: Action.ViewRoom, room_id: ROOM_ID });
            await rpsUpdated;
            outside = screen.getByRole("button", { name: "Outside" });
        };

        const row = (name: string): HTMLElement => screen.getByRole("menuitem", { name });
        const isOpen = (): boolean => RightPanelStore.instance.isOpenForRoom(ROOM_ID);

        it("have no back or close button", async () => {
            await renderPanel();
            await userEvent.click(row("Extensions"));

            expect(screen.getByRole("heading", { name: "Extensions" })).toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Room info" })).not.toBeInTheDocument();
        });

        it("move the focus, which went with the row that opened it, to a page's title", async () => {
            await renderPanel();
            act(() => row("Extensions").focus());
            await userEvent.keyboard("{Enter}");

            const title = screen.getByRole("heading", { name: "Extensions" });
            expect(title).toHaveFocus();
            // Not a Tab stop
            expect(title).toHaveAttribute("tabindex", "-1");
        });

        it("leave the focus alone while it is elsewhere", async () => {
            await renderPanel();
            act(() => outside.focus());
            act(() => RightPanelStore.instance.pushCard({ phase: RightPanelPhases.Extensions }, true, ROOM_ID));

            expect(screen.getByRole("heading", { name: "Extensions" })).toBeInTheDocument();
            expect(outside).toHaveFocus();
        });

        it("close on Escape inside them, rather than go back, and give the focus back to their button", async () => {
            await renderPanel();
            await userEvent.click(row("Extensions"));
            await userEvent.keyboard("{Escape}");

            expect(isOpen()).toBe(false);
            expect(RightPanelStore.instance.currentCardForRoom(ROOM_ID).phase).toBe(RightPanelPhases.Extensions);
            expect(screen.getByRole("button", { name: "Info" })).toHaveFocus();
        });

        it("keep Escape inside them from what holds them", async () => {
            await renderPanel();
            const onKeyDown = vi.fn();
            document.body.addEventListener("keydown", onKeyDown);
            act(() => row("Extensions").focus());
            await userEvent.keyboard("{Escape}");
            document.body.removeEventListener("keydown", onKeyDown);

            expect(onKeyDown).not.toHaveBeenCalled();
        });

        it("close on Escape elsewhere that nothing there took", async () => {
            await renderPanel();
            act(() => outside.focus());
            await userEvent.keyboard("{Escape}");

            expect(isOpen()).toBe(false);
            expect(outside).toHaveFocus();
        });

        it.each([
            ["something else took", (ev: KeyboardEvent) => ev.preventDefault()],
            ["didn't get past something else", (ev: KeyboardEvent) => ev.stopPropagation()],
        ])("stay open on Escape that %s", async (_, take) => {
            await renderPanel();
            outside.addEventListener("keydown", take);
            act(() => outside.focus());
            await userEvent.keyboard("{Escape}");

            expect(isOpen()).toBe(true);
        });

        it("stay open on Escape with a modifier, and on Escape in a dialog", async () => {
            await renderPanel();
            act(() => outside.focus());
            await userEvent.keyboard("{Shift>}{Escape}{/Shift}");
            expect(isOpen()).toBe(true);

            Modal.createDialog(QuestionDialog, { title: "Sure?" });
            act(() => outside.focus());
            await userEvent.keyboard("{Escape}");
            expect(isOpen()).toBe(true);
            await act(async () => Modal.closeCurrentModal());
        });

        it("cancel a verification on Escape inside it, and leave it alone on Escape elsewhere", async () => {
            await renderPanel();
            const verificationRequest = { pending: true, cancel: vi.fn() } as unknown as VerificationRequest;
            act(() =>
                RightPanelStore.instance.setCards(
                    [
                        {
                            phase: RightPanelPhases.EncryptionPanel,
                            state: { member: new RoomMember(ROOM_ID, "@bob:example.org"), verificationRequest },
                        },
                    ],
                    true,
                    ROOM_ID,
                ),
            );
            act(() => outside.focus());
            await userEvent.keyboard("{Escape}");
            expect(verificationRequest.cancel).not.toHaveBeenCalled();

            act(() => screen.getByRole("button", { name: "Profile" }).focus());
            await userEvent.keyboard("{Escape}");
            expect(verificationRequest.cancel).toHaveBeenCalledTimes(1);
            expect(isOpen()).toBe(true);
        });

        it("close a user's page, which has no room, by going home", async () => {
            // The room left for the page, which the clean-up above waits to leave
            mkRoom(cli, ROOM_ID);
            await spinUpStores();
            const rpsUpdated = waitForRpsUpdate();
            dis.dispatch({ action: Action.ViewRoom, room_id: ROOM_ID });
            await rpsUpdated;

            const dispatch = vi.spyOn(dis, "dispatch").mockImplementation(() => {});
            const member = new RoomMember("", "@bob:example.org");
            render(
                <RightPanel
                    overwriteCard={{ phase: RightPanelPhases.MemberInfo, state: { member } }}
                    resizeNotifier={resizeNotifier}
                />,
            );
            await userEvent.keyboard("{Escape}");

            expect(dispatch).toHaveBeenCalledWith({ action: Action.ViewHomePage });
            dispatch.mockRestore();
        });
    });
});
