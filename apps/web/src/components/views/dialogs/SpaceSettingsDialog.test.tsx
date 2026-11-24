/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen } from "test-utils-rtl";
import { type MatrixClient, type Room } from "matrix-js-sdk/src/matrix";
import { LockIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import { createTestClient, mkStubRoom } from "test-utils";

import SpaceSettingsDialog from "./SpaceSettingsDialog";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { MatrixClientPeg } from "../../../MatrixClientPeg";

describe("<SpaceSettingsDialog />", () => {
    let client: MatrixClient;
    let space: Room;

    beforeEach(() => {
        client = createTestClient();
        vi.mocked(client.isVersionSupported).mockResolvedValue(true);
        MatrixClientPeg.get = vi.fn().mockReturnValue(client);
        MatrixClientPeg.safeGet = vi.fn().mockReturnValue(client);
        space = mkStubRoom("!studio:server", "Studio", client);
        vi.mocked(space.isSpaceRoom).mockReturnValue(true);
        // Without a picture, so that the avatar shows the space's letter
        space.getMxcAvatarUrl = () => null;
    });

    const renderDialog = (): void => {
        render(
            <MatrixClientContext.Provider value={client}>
                <SpaceSettingsDialog matrixClient={client} space={space} onFinished={vi.fn()} />
            </MatrixClientContext.Provider>,
        );
    };

    it("titles itself as the room settings do: the space's name in the strong part, then the tab's name", () => {
        renderDialog();
        const title = screen.getByRole("heading", { level: 1 });

        expect(title).toHaveClass("mx_RoomSettingsDialog_title");
        expect(title.querySelector(".mx_RoomSettingsDialog_title_strong")).toHaveTextContent("Studio:");
        expect(screen.getByRole("dialog")).toHaveAccessibleName("Studio: General");

        fireEvent.click(screen.getByRole("tab", { name: /Security & privacy/i }));
        expect(title).toHaveTextContent(/^Studio: Security & privacy$/i);
    });

    it("marks the Security & privacy tab with the lock, as the room and user settings do", () => {
        renderDialog();
        const lock = new DOMParser().parseFromString(renderToStaticMarkup(<LockIcon />), "image/svg+xml");

        expect(screen.getByRole("tab", { name: /Security & privacy/i }).querySelector("svg path")).toHaveAttribute(
            "d",
            lock.querySelector("path")!.getAttribute("d")!,
        );
    });

    describe("General tab", () => {
        it("doesn't repeat the tab's name as a heading, nor open with an intro that says nothing", () => {
            renderDialog();

            expect(screen.queryByRole("heading", { name: "General" })).toBeNull();
            expect(screen.queryByText("Edit settings relating to your space.")).toBeNull();
        });

        it("keeps Cancel and Save disabled until something changes, Cancel as an outline button", () => {
            renderDialog();
            const cancel = screen.getByRole("button", { name: "Cancel" });
            const save = screen.getByRole("button", { name: /Save changes/i });

            expect(cancel).toHaveClass("mx_AccessibleButton_kind_primary_outline");
            expect(cancel).toHaveAttribute("aria-disabled", "true");
            expect(save).toHaveAttribute("aria-disabled", "true");

            fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Studio 2" } });
            expect(cancel).not.toHaveAttribute("aria-disabled", "true");
            expect(save).not.toHaveAttribute("aria-disabled", "true");

            fireEvent.click(cancel);
            expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Studio");
            expect(save).toHaveAttribute("aria-disabled", "true");
        });

        it("edits the avatar as the room's profile does: the space's letter, square, with the camera badge", () => {
            renderDialog();
            const avatar = screen.getByRole("group", { name: "Avatar" });

            expect(avatar).toHaveClass("mx_AvatarSetting_avatar");
            expect(avatar.querySelector("[data-type='square']")).toHaveTextContent("S");
            expect(screen.getByRole("button", { name: "Open avatar menu" })).toHaveClass(
                "mx_AvatarSetting_uploadButton",
            );
            expect(screen.queryByRole("button", { name: "Upload avatar" })).toBeNull();
        });

        it("shows the photo before the name and the description, as the room's profile does", () => {
            renderDialog();
            const avatar = screen.getByRole("group", { name: "Avatar" });

            expect(avatar.matches(".mx_RoomProfileSettings_profile > :first-child")).toBe(true);
            expect(
                screen
                    .getByRole("textbox", { name: "Name" })
                    .closest(".mx_RoomProfileSettings_profile > .mx_RoomProfileSettings_profile_controls:last-child"),
            ).not.toBeNull();
        });
    });
});
