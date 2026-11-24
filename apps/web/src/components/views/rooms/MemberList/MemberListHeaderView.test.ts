/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.
Copyright 2021 Šimon Brandner <simon.bra.ag@gmail.com>

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { RoomMember, User, RoomEvent, RoomStateEvent, type RoomState } from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";

import { shouldShowComponent } from "../../../../customisations/helpers/UIComponents";
import defaultDispatcher from "../../../../dispatcher/dispatcher";
import { type Rendered, renderMemberList } from "./__mocks__";

vi.mock("../../../../customisations/helpers/UIComponents", () => ({
    shouldShowComponent: vi.fn(),
}));

vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(1500);
vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(1500);

describe("Does not render invite button in memberlist header", () => {
    it("when user is not a member", async () => {
        await renderMemberList(true, (room) => room.updateMyMembership(KnownMembership.Leave));
        expect(screen.queryByRole("button", { name: "Invite" })).toBeNull();
    });

    it("when UI customisation hides invites", async () => {
        vi.mocked(shouldShowComponent).mockReturnValue(false);
        const { client, memberListRoom } = await renderMemberList(true);
        // Needs this specific event...
        act(() => {
            client.emit(RoomEvent.MyMembership, memberListRoom, KnownMembership.Join, KnownMembership.Invite);
        });
        await waitFor(() => expect(screen.queryByRole("button", { name: "Invite" })).toBeNull());
    });
});

describe("MemberListHeaderView", () => {
    let rendered: Rendered;

    beforeEach(async function () {
        vi.mocked(shouldShowComponent).mockReturnValue(true);
        rendered = await renderMemberList(true);
    });

    it("Shows the correct member count in the card's title, and nowhere else", async () => {
        expect(await screen.findByRole("heading", { name: "People (6)" })).toBeVisible();
        expect(screen.queryByText("6 Members")).not.toBeInTheDocument();
    });

    it("Updates the member count as people join and are invited", async () => {
        const { memberListRoom } = rendered;
        memberListRoom.currentState.getJoinedMemberCount = vi.fn().mockReturnValue(7);
        memberListRoom.currentState.getInvitedMemberCount = vi.fn().mockReturnValue(1);
        act(() => {
            memberListRoom.emit(RoomEvent.Summary, {
                "m.heroes": [],
                "m.joined_member_count": 7,
                "m.invited_member_count": 1,
            });
        });

        expect(await screen.findByRole("heading", { name: "People (8)" })).toBeVisible();
    });

    it("Does not show search box when there's less than 20 members", async () => {
        expect(screen.queryByPlaceholderText("Search room members")).toBeNull();
    });

    it("Shows search box when there's more than 20 members", async () => {
        const { memberListRoom, client, reRender } = rendered;
        // Memberlist already has 6 members, add 14 more to make the total 20
        for (let i = 0; i < 14; ++i) {
            const newMember = new RoomMember(memberListRoom.roomId, `@new${i}:localhost`);
            newMember.membership = KnownMembership.Join;
            newMember.powerLevel = 0;
            newMember.user = User.createUser(newMember.userId, client);
            newMember.user.currentlyActive = true;
            newMember.user.presence = "online";
            newMember.user.lastPresenceTs = 1000;
            newMember.user.lastActiveAgo = 10;
            memberListRoom.currentState.members[newMember.userId] = newMember;
        }
        await reRender();
        await waitFor(() => expect(screen.queryByPlaceholderText("Search room members")).toBeVisible());
    });

    describe("search field", () => {
        const field = (): HTMLElement => screen.getByRole("searchbox", { name: "Search room members" });
        const names = (): (string | null)[] =>
            screen.queryAllByRole("option").map((option) => option.getAttribute("aria-label"));

        beforeEach(async () => {
            rendered.root.unmount();
            // 21 people: 7 admins, 7 moderators and 7 others
            rendered = await renderMemberList(true, undefined, 7);
        });

        it("lists those it finds, counted as the list's, while the title keeps counting everyone", async () => {
            await userEvent.type(field(), "admin");

            await waitFor(() => expect(names()).toHaveLength(7));
            expect(screen.getAllByRole("option")[6]).toHaveAttribute("aria-posinset", "7");
            expect(screen.getAllByRole("option")[6]).toHaveAttribute("aria-setsize", "7");
            expect(screen.getByRole("heading", { name: "People (21)" })).toBeInTheDocument();
        });

        it("says when it finds no one", async () => {
            await userEvent.type(field(), "nobody");

            expect(await screen.findByRole("status")).toHaveTextContent("No matches");
            expect(names()).toEqual([]);
        });

        it("empties on Escape, and leaves the key to the panel, which closes, once it is empty", async () => {
            const onKeyDown = vi.fn();
            document.body.addEventListener("keydown", onKeyDown);
            await userEvent.type(field(), "admin");
            await waitFor(() => expect(names()).toHaveLength(7));
            onKeyDown.mockClear();

            await userEvent.keyboard("{Escape}");
            expect(field()).toHaveValue("");
            expect(onKeyDown).not.toHaveBeenCalled();
            await waitFor(() => expect(names()).toHaveLength(21));

            await userEvent.keyboard("{Escape}");
            expect(onKeyDown).toHaveBeenCalledTimes(1);
            document.body.removeEventListener("keydown", onKeyDown);
        });

        it("is in the card's second header with the invite button, over the list that scrolls", () => {
            const header = field().closest("header")!;

            expect(header).toHaveClass("mx_BaseCard_controls");
            expect(header).toContainElement(screen.getByRole("button", { name: "Invite" }));
            expect(header.parentElement).toHaveClass("mx_BaseCard");
            expect(header.nextElementSibling).toBe(screen.getByRole("listbox", { name: "Member list" }));
        });
    });

    describe("Invite button functionality", () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("Renders disabled invite button when current user is a member but does not have rights to invite", async () => {
            const { memberListRoom, reRender } = rendered;
            vi.spyOn(memberListRoom, "getMyMembership").mockReturnValue(KnownMembership.Join);
            vi.spyOn(memberListRoom, "canInvite").mockReturnValue(false);
            await reRender();
            await waitFor(() =>
                expect(screen.getByRole("button", { name: "Invite" })).toHaveAttribute("aria-disabled", "true"),
            );
        });

        it("Renders enabled invite button when current user is a member and has rights to invite", async () => {
            const { memberListRoom, reRender } = rendered;
            vi.spyOn(memberListRoom, "getMyMembership").mockReturnValue(KnownMembership.Join);
            vi.spyOn(memberListRoom, "canInvite").mockReturnValue(true);
            await reRender();
            await waitFor(() =>
                expect(screen.getByRole("button", { name: "Invite" })).not.toHaveAttribute("aria-disabled", "true"),
            );
        });

        it("Updates the invite button when a power level change grants invite rights", async () => {
            const { memberListRoom, client, reRender } = rendered;
            vi.spyOn(memberListRoom, "getMyMembership").mockReturnValue(KnownMembership.Join);
            vi.spyOn(memberListRoom, "canInvite").mockReturnValue(false);
            await reRender();
            await waitFor(() =>
                expect(screen.getByRole("button", { name: "Invite" })).toHaveAttribute("aria-disabled", "true"),
            );

            // Grant the right to invite, and announce it the way a power level change does
            vi.spyOn(memberListRoom, "canInvite").mockReturnValue(true);
            act(() => {
                client.emit(RoomStateEvent.Update, { roomId: memberListRoom.roomId } as RoomState);
            });

            await waitFor(() =>
                expect(screen.getByRole("button", { name: "Invite" })).not.toHaveAttribute("aria-disabled", "true"),
            );
        });

        it("Opens room inviter on button click", async () => {
            const { memberListRoom, reRender } = rendered;
            vi.spyOn(defaultDispatcher, "dispatch").mockImplementation(() => {});
            vi.spyOn(memberListRoom, "canInvite").mockReturnValue(true);
            await reRender();

            await waitFor(() => expect(screen.getByRole("button", { name: "Invite" })).not.toBeDisabled());
            fireEvent.click(screen.getByRole("button", { name: "Invite" }));
            expect(defaultDispatcher.dispatch).toHaveBeenCalledWith({
                action: "view_invite",
                roomId: memberListRoom.roomId,
            });
        });
    });
});
