/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { vi, describe, it, expect, beforeEach, afterEach, type MockedObject } from "vitest";
import React, { type RefObject } from "react";
import { act, cleanup, fireEvent, render } from "test-utils-rtl";
import {
    HistoryVisibility,
    MatrixError,
    type MatrixClient,
    Preset,
    RoomType,
    Visibility,
} from "matrix-js-sdk/src/matrix";
import userEvent from "@testing-library/user-event";
import {
    getMockClientWithEventEmitter,
    mockClientMethodsRooms,
    mockClientMethodsServer,
    mockClientMethodsUser,
    withClientContextRenderOptions,
} from "test-utils";

import * as createRoomModule from "../../../createRoom";
import SpaceCreateMenu, { createSpace } from "./SpaceCreateMenu";
import { UIFeature } from "../../../settings/UIFeature";
import SettingsStore from "../../../settings/SettingsStore";
import UIStore, { UI_EVENTS } from "../../../stores/UIStore";

describe("<SpaceCreateMenu />", () => {
    let client: MockedObject<MatrixClient>;
    const anchor: RefObject<HTMLElement | null> = { current: null };

    beforeEach(() => {
        client = getMockClientWithEventEmitter({
            ...mockClientMethodsUser(),
            ...mockClientMethodsServer(),
            ...mockClientMethodsRooms(),
            createRoom: vi.fn(),
            getRoomIdForAlias: vi.fn().mockImplementation(async () => {
                throw new MatrixError({ errcode: "M_NOT_FOUND", error: "Test says no alias found" }, 404);
            }),
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("should render", async () => {
        const { asFragment } = render(
            <SpaceCreateMenu anchor={anchor} onFinished={vi.fn()} />,
            withClientContextRenderOptions(client),
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("closes on Escape or a click outside, as the other menus do, at either step", async () => {
        const onFinished = vi.fn();
        const { getByRole, getByText, queryByRole } = render(
            <SpaceCreateMenu anchor={anchor} onFinished={onFinished} />,
            withClientContextRenderOptions(client),
        );
        const background = document.querySelector(".mx_ContextualMenu_background")!;
        expect(queryByRole("button", { name: "Close dialog" })).toBeNull();

        fireEvent.keyDown(getByText("Public"), { key: "Escape" });
        expect(onFinished).toHaveBeenCalledTimes(1);
        await userEvent.click(background);
        expect(onFinished).toHaveBeenCalledTimes(2);

        await userEvent.click(getByText("Public"));
        fireEvent.keyDown(getByRole("textbox", { name: "Name" }), { key: "Escape" });
        expect(onFinished).toHaveBeenCalledTimes(3);
        await userEvent.click(background);
        expect(onFinished).toHaveBeenCalledTimes(4);
    });

    it("opens beside the button of the space panel that opened it, and follows it as the window resizes", () => {
        const panel = document.createElement("nav");
        panel.className = "mx_SpacePanel";
        const button = panel.appendChild(document.createElement("div"));
        vi.spyOn(panel, "getBoundingClientRect").mockReturnValue({ top: 32, right: 68 } as DOMRect);
        const buttonBox = vi.spyOn(button, "getBoundingClientRect").mockReturnValue({ top: 200 } as DOMRect);

        render(<SpaceCreateMenu anchor={{ current: button }} onFinished={vi.fn()} />, {
            ...withClientContextRenderOptions(client),
        });
        const { style } = document.querySelector<HTMLElement>(".mx_SpaceCreateMenu_wrapper")!;
        const placement = (): string[] =>
            ["--space-panel-end", "--space-panel-top", "--space-panel-button-top"].map((name) =>
                style.getPropertyValue(name),
            );
        expect(placement()).toEqual(["68px", "32px", "200px"]);
        // Its stylesheet places it by these, so that a taller step isn't placed by the height of the step before
        expect([style.left, style.top, style.right, style.bottom]).toEqual(["", "", "", ""]);

        buttonBox.mockReturnValue({ top: 120 } as DOMRect);
        act(() => {
            UIStore.instance.emit(UI_EVENTS.Resize, UI_EVENTS.Resize, []);
        });
        expect(placement()).toEqual(["68px", "32px", "120px"]);
    });

    it("should be able to create a public space", async () => {
        const onFinished = vi.fn();
        client.createRoom.mockResolvedValue({ room_id: "!room:id" });
        const { getByText, getByLabelText } = render(
            <SpaceCreateMenu anchor={anchor} onFinished={onFinished} />,
            withClientContextRenderOptions(client),
        );
        await userEvent.click(getByText("Public"));
        await userEvent.type(getByLabelText("Name"), "My Name");
        await userEvent.type(getByLabelText("Address"), "foobar");
        await userEvent.type(getByLabelText("Description"), "A description");
        await userEvent.click(getByText("Create"));
        expect(onFinished).toHaveBeenCalledTimes(1);
        expect(client.createRoom).toHaveBeenCalledWith({
            creation_content: { type: "m.space" },
            initial_state: [
                { content: { guest_access: "can_join" }, state_key: "", type: "m.room.guest_access" },
                { content: { history_visibility: "world_readable" }, type: "m.room.history_visibility" },
            ],
            name: "My Name",
            power_level_content_override: {
                events_default: 100,
                invite: 0,
            },
            preset: "public_chat",
            room_alias_name: "my-namefoobar",
            topic: "A description",
            visibility: "private",
        });
    });

    it("should be prompted to automatically create a private space when configured", async () => {
        const realGetValue = SettingsStore.getValue;
        vi.spyOn(SettingsStore, "getValue").mockImplementation((name, roomId) => {
            if (name === UIFeature.AllowCreatingPublicSpaces) {
                return false;
            }
            return realGetValue(name, roomId);
        });
        const onFinished = vi.fn();
        client.createRoom.mockResolvedValue({ room_id: "!room:id" });
        const { getByText, getByLabelText } = render(
            <SpaceCreateMenu anchor={anchor} onFinished={onFinished} />,
            withClientContextRenderOptions(client),
        );
        await userEvent.type(getByLabelText("Name"), "My Name");
        await userEvent.type(getByLabelText("Description"), "A description");
        await userEvent.click(getByText("Create"));
        expect(onFinished).toHaveBeenCalledTimes(1);
        expect(client.createRoom).toHaveBeenCalledWith({
            creation_content: { type: "m.space" },
            initial_state: [
                { content: { guest_access: "can_join" }, state_key: "", type: "m.room.guest_access" },
                { content: { history_visibility: "invited" }, type: "m.room.history_visibility" },
            ],
            name: "My Name",
            power_level_content_override: {
                events_default: 100,
                invite: 50,
            },
            room_alias_name: undefined,
            preset: "private_chat",
            topic: "A description",
            visibility: "private",
        });
    });

    it("should pass name and topic at the top level when creating a space", async () => {
        const createRoomSpy = vi.spyOn(createRoomModule, "default").mockResolvedValue("!room:id");
        client.doesServerSupportUnstableFeature.mockResolvedValue(false);

        await createSpace(client, "My Name", true, "#my-namefoobar:server", "A description");

        expect(createRoomSpy).toHaveBeenCalledWith(client, {
            name: "My Name",
            topic: "A description",
            createOpts: {
                preset: Preset.PublicChat,
                visibility: Visibility.Private,
                power_level_content_override: {
                    events_default: 100,
                    invite: 0,
                },
                room_alias_name: "my-namefoobar",
            },
            avatar: undefined,
            roomType: RoomType.Space,
            historyVisibility: HistoryVisibility.WorldReadable,
            spinner: false,
            encryption: false,
            andView: true,
            inlineErrors: true,
        });

        expect(createRoomSpy.mock.calls[0][1]?.createOpts).not.toHaveProperty("name");
        expect(createRoomSpy.mock.calls[0][1]?.createOpts).not.toHaveProperty("topic");
    });
});
