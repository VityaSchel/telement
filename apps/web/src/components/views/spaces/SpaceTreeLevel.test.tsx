/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { vi, describe, it, expect, afterEach } from "vitest";
import React, { type ComponentProps } from "react";
import { fireEvent, getByTestId, render } from "test-utils-rtl";
import { clientAndSDKContextRenderOptions, mkRoom, stubClient } from "test-utils";

import DMRoomMap from "../../../utils/DMRoomMap";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import { SpaceItem, SpaceButton } from "./SpaceTreeLevel";
import { MetaSpace, type SpaceKey } from "../../../stores/spaces";
import { StaticNotificationState } from "../../../stores/notifications/StaticNotificationState";
import { NotificationLevel } from "../../../stores/notifications/NotificationLevel";
import { SDKContextClass } from "../../../contexts/SDKContextClass";

vi.mock("../../../stores/spaces/SpaceStore", async () => {
    const EventEmitter = (await vi.importActual("events")).EventEmitter as typeof import("events").EventEmitter;
    class MockSpaceStore extends EventEmitter {
        activeSpace: SpaceKey = "!space1";
        setActiveSpace = vi.fn();
        getChildSpaces = vi.fn();
        getNotificationState = vi.fn();
        start = vi.fn();
    }

    return { default: MockSpaceStore };
});

describe("SpaceButton", () => {
    const cli = stubClient();
    const space = mkRoom(cli, "!1:example.org");
    DMRoomMap.makeShared(cli);

    const dispatchSpy = vi.spyOn(defaultDispatcher, "dispatch");

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("real space", () => {
        it("activates the space on click", () => {
            const { container } = render(
                <SpaceButton
                    space={space}
                    selected={false}
                    label="My space"
                    data-testid="create-space-button"
                    size="32px"
                />,
                clientAndSDKContextRenderOptions(cli, SDKContextClass.instance),
            );

            expect(SDKContextClass.instance.spaceStore.setActiveSpace).not.toHaveBeenCalled();
            fireEvent.click(getByTestId(container, "create-space-button"));
            expect(SDKContextClass.instance.spaceStore.setActiveSpace).toHaveBeenCalledWith("!1:example.org");
        });

        it("navigates to the space home on click if already active", () => {
            const { container } = render(
                <SpaceButton
                    space={space}
                    selected={true}
                    label="My space"
                    data-testid="create-space-button"
                    size="32px"
                />,
            );

            expect(dispatchSpy).not.toHaveBeenCalled();
            fireEvent.click(getByTestId(container, "create-space-button"));
            expect(dispatchSpy).toHaveBeenCalledWith({ action: Action.ViewRoom, room_id: "!1:example.org" });
        });
    });

    describe("metaspace", () => {
        it("activates the metaspace on click", () => {
            const { container } = render(
                <SpaceButton
                    spaceKey={MetaSpace.Home}
                    selected={false}
                    label="Home"
                    data-testid="create-space-button"
                    size="32px"
                />,
                clientAndSDKContextRenderOptions(cli, SDKContextClass.instance),
            );

            expect(SDKContextClass.instance.spaceStore.setActiveSpace).not.toHaveBeenCalled();
            fireEvent.click(getByTestId(container, "create-space-button"));
            expect(SDKContextClass.instance.spaceStore.setActiveSpace).toHaveBeenCalledWith(MetaSpace.Home);
        });

        it("does nothing on click if already active", () => {
            const { container } = render(
                <SpaceButton
                    spaceKey={MetaSpace.Home}
                    selected={true}
                    label="Home"
                    data-testid="create-space-button"
                    size="32px"
                />,
                clientAndSDKContextRenderOptions(cli, SDKContextClass.instance),
            );

            fireEvent.click(getByTestId(container, "create-space-button"));
            expect(dispatchSpy).not.toHaveBeenCalled();
            // Re-activating the metaspace is a no-op
            expect(SDKContextClass.instance.spaceStore.setActiveSpace).toHaveBeenCalledWith(MetaSpace.Home);
        });

        it("should render notificationState if one is provided", () => {
            const notificationState = new StaticNotificationState(null, 8, NotificationLevel.Notification);

            const { container, asFragment } = render(
                <SpaceButton
                    spaceKey={MetaSpace.Home}
                    selected={true}
                    label="Home"
                    data-testid="create-space-button"
                    notificationState={notificationState}
                    size="32px"
                />,
            );

            expect(getByTestId(container, "notification-badge")).toHaveTextContent("8");
            expect(asFragment()).toMatchSnapshot();
        });
    });

    describe("opening on press, like Telegram", () => {
        const press = { button: 0, pointerType: "mouse" };

        function renderSpaceButton(
            selected: boolean,
            props: Partial<ComponentProps<typeof SpaceButton>> = {},
        ): HTMLElement {
            const { container } = render(
                <SpaceButton
                    space={space}
                    selected={selected}
                    label="My space"
                    data-testid="space-button"
                    size="32px"
                    {...props}
                />,
                clientAndSDKContextRenderOptions(cli, SDKContextClass.instance),
            );
            return getByTestId(container, "space-button");
        }

        it("activates the space as the primary mouse button goes down, and not again on the click", () => {
            const button = renderSpaceButton(false);

            fireEvent.pointerDown(button, press);
            expect(SDKContextClass.instance.spaceStore.setActiveSpace).toHaveBeenCalledTimes(1);
            expect(SDKContextClass.instance.spaceStore.setActiveSpace).toHaveBeenCalledWith("!1:example.org");
            fireEvent.click(button, { detail: 1 });
            expect(SDKContextClass.instance.spaceStore.setActiveSpace).toHaveBeenCalledTimes(1);
        });

        it("navigates to the space home as the button goes down if already active", () => {
            const button = renderSpaceButton(true);

            fireEvent.pointerDown(button, press);
            expect(dispatchSpy).toHaveBeenCalledWith({ action: Action.ViewRoom, room_id: "!1:example.org" });
            fireEvent.click(button, { detail: 1 });
            expect(dispatchSpy).toHaveBeenCalledTimes(1);
        });

        it("activates the space on the click when a modifier key is held, as before", () => {
            const button = renderSpaceButton(false);

            fireEvent.pointerDown(button, { ...press, shiftKey: true });
            expect(SDKContextClass.instance.spaceStore.setActiveSpace).not.toHaveBeenCalled();
            fireEvent.click(button, { detail: 1, shiftKey: true });
            expect(SDKContextClass.instance.spaceStore.setActiveSpace).toHaveBeenCalledTimes(1);
        });

        it("leaves a press on the space's badge to the badge", () => {
            const notificationState = new StaticNotificationState(null, 8, NotificationLevel.Notification);
            renderSpaceButton(false, { notificationState });

            fireEvent.pointerDown(document.querySelector(".mx_SpacePanel_notificationBadge")!, press);
            expect(SDKContextClass.instance.spaceStore.setActiveSpace).not.toHaveBeenCalled();
        });

        it("activates the space from the keyboard", () => {
            const button = renderSpaceButton(false);

            fireEvent.keyDown(button, { key: "Enter", code: "Enter" });
            expect(SDKContextClass.instance.spaceStore.setActiveSpace).toHaveBeenCalledTimes(1);
        });

        it("keeps a button with an action of its own, such as creating a space, acting on the click", () => {
            const onClick = vi.fn();
            const button = renderSpaceButton(false, { onClick, space: undefined, spaceKey: undefined });

            fireEvent.pointerDown(button, press);
            expect(onClick).not.toHaveBeenCalled();
            fireEvent.click(button, { detail: 1 });
            expect(onClick).toHaveBeenCalledTimes(1);
        });
    });
});

describe("SpaceItem", () => {
    const cli = stubClient();
    const space = mkRoom(cli, "!1:example.org");
    space.name = "Root Space";
    const subspace = mkRoom(cli, "!2:example.org");
    subspace.name = "Subspace";

    it("should render a space with subspaces", () => {
        vi.mocked(SDKContextClass.instance.spaceStore.getChildSpaces).mockImplementation((spaceId) =>
            spaceId === space.roomId ? [subspace] : [],
        );

        const { asFragment, queryByText, getByLabelText } = render(
            <SpaceItem space={space} activeSpaces={[]} />,
            clientAndSDKContextRenderOptions(cli, SDKContextClass.instance),
        );

        expect(queryByText("Root Space")).toBeVisible();
        expect(queryByText("Subspace")).toBeNull();
        expect(asFragment()).toMatchSnapshot();

        fireEvent.click(getByLabelText("Expand"));
        expect(queryByText("Root Space")).toBeVisible();
        expect(queryByText("Subspace")).toBeVisible();
        expect(asFragment()).toMatchSnapshot();
    });
});
