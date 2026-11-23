/*
 * Copyright 2024 New Vector Ltd.
 * Copyright 2024 The Matrix.org Foundation C.I.C.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

// @vitest-environment happy-dom

import React, { type ComponentProps } from "react";
import { vi, describe, it, expect } from "vitest";
import { render, screen, waitFor } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { type Room, type RoomMember } from "matrix-js-sdk/src/matrix";
import { stubClient } from "test-utils";

import { PowerLevelSelector } from "./PowerLevelSelector";
import MatrixClientContext from "../../../contexts/MatrixClientContext";

describe("PowerLevelSelector", () => {
    const matrixClient = stubClient();

    const currentUser = matrixClient.getUserId()!;
    const userLevels = {
        [currentUser]: 100,
        "@alice:server.org": 50,
        "@bob:server.org": 0,
    };

    // Alice has a display name; the others are known by their Matrix ID only
    const room = {
        isSpaceRoom: () => false,
        getMember: (userId: string) =>
            userId === "@alice:server.org"
                ? ({ userId, name: "Alice", getMxcAvatarUrl: () => undefined } as unknown as RoomMember)
                : null,
    } as unknown as Room;

    const renderPLS = (props: Partial<ComponentProps<typeof PowerLevelSelector>>) =>
        render(
            <MatrixClientContext.Provider value={matrixClient}>
                <PowerLevelSelector
                    room={room}
                    userLevels={userLevels}
                    canChangeLevels={true}
                    currentUserLevel={userLevels[currentUser]}
                    title="title"
                    // filter nothing by default
                    filter={() => true}
                    onClick={vi.fn()}
                    {...props}
                >
                    empty label
                </PowerLevelSelector>
            </MatrixClientContext.Provider>,
        );

    /** A user's row: a button opening the menu of levels, or the level alone when it can't be changed. */
    const rowOf = (userId: string): HTMLElement =>
        screen.getAllByText(userId, { selector: "span" })[0].closest<HTMLElement>("button, [aria-disabled]")!;

    const chooseLevel = async (userId: string, level: string): Promise<void> => {
        await userEvent.click(rowOf(userId));
        await userEvent.click(screen.getByRole("menuitemradio", { name: level }));
    };

    it("should render", () => {
        renderPLS({});
        expect(screen.getByRole("group")).toMatchSnapshot();
    });

    it("draws each user as a row with their name over their Matrix ID, and their role at its end", () => {
        renderPLS({});

        const alice = rowOf("@alice:server.org");
        expect(alice).toHaveTextContent("Alice@alice:server.orgModerator");
        // Without a display name, the Matrix ID is the row's only line
        expect(screen.getAllByText("@bob:server.org")).toHaveLength(1);
        expect(rowOf("@bob:server.org")).toHaveTextContent(/@bob:server.orgDefault$/);
        expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
    });

    it("should display only the current user", async () => {
        // Display only the current user
        renderPLS({ filter: (user) => user === currentUser });

        expect(screen.getAllByRole("button")).toHaveLength(1);
        expect(rowOf(currentUser)).toHaveTextContent("Admin");
    });

    it("applies a level as soon as it is chosen, after asking before the user demotes themselves", async () => {
        const onClick = vi.fn();
        renderPLS({ onClick });

        await chooseLevel(currentUser, "Moderator");
        await userEvent.click(await screen.findByRole("button", { name: "Demote" }));

        await waitFor(() => expect(onClick).toHaveBeenCalledWith(50, currentUser));
        expect(rowOf(currentUser)).toHaveTextContent("Moderator");
    });

    it("keeps the level when the user doesn't confirm demoting themselves", async () => {
        const onClick = vi.fn();
        renderPLS({ onClick });

        await chooseLevel(currentUser, "Moderator");
        await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));

        await waitFor(() => expect(rowOf(currentUser)).toHaveTextContent("Admin"));
        expect(onClick).not.toHaveBeenCalled();
    });

    it("asks before promoting someone to the user's own level", async () => {
        const onClick = vi.fn();
        renderPLS({ onClick });

        await chooseLevel("@bob:server.org", "Admin");
        expect(await screen.findByText(/You will not be able to undo this change/)).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Continue" }));

        await waitFor(() => expect(onClick).toHaveBeenCalledWith(100, "@bob:server.org"));
    });

    it("applies a lower level to someone else without asking", async () => {
        const onClick = vi.fn();
        renderPLS({ onClick });

        await chooseLevel("@alice:server.org", "Default");

        await waitFor(() => expect(onClick).toHaveBeenCalledWith(0, "@alice:server.org"));
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("puts the level back when applying it fails", async () => {
        const onClick = vi.fn().mockRejectedValue(new Error("Forbidden"));
        renderPLS({ onClick });

        await chooseLevel("@alice:server.org", "Default");

        await waitFor(() => expect(rowOf("@alice:server.org")).toHaveTextContent("Moderator"));
    });

    it("should not be able to change the power level if `canChangeLevels` is false", async () => {
        renderPLS({ canChangeLevels: false });

        expect(screen.queryAllByRole("button")).toHaveLength(0);
        expect(rowOf(currentUser)).toHaveAttribute("aria-disabled", "true");
    });

    it("should be able to change only the level of someone with a lower level", async () => {
        const userLevels = {
            [currentUser]: 50,
            "@alice:server.org": 100,
        };
        renderPLS({ userLevels, currentUserLevel: 50 });

        expect(rowOf(currentUser).tagName).toBe("BUTTON");
        expect(rowOf("@alice:server.org")).toHaveAttribute("aria-disabled", "true");
    });

    it("should display the children if there is no user to display", async () => {
        // No user to display
        renderPLS({ filter: () => false });

        expect(screen.getByText("empty label")).toBeInTheDocument();
    });
});
