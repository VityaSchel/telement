/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { fireEvent, getByRole, render, type RenderResult, screen, waitFor } from "test-utils-rtl";
import { mkStubRoom, withClientContextRenderOptions, stubClient } from "test-utils";
import {
    type MatrixClient,
    EventType,
    MatrixEvent,
    Room,
    RoomMember,
    type ISendEventResponse,
} from "matrix-js-sdk/src/matrix";
import { KnownMembership, type RoomPowerLevelsEventContent } from "matrix-js-sdk/src/types";
import userEvent from "@testing-library/user-event";

import RolesRoomSettingsTab from "./RolesRoomSettingsTab";
import { MatrixClientPeg } from "../../../../../MatrixClientPeg";
import SdkConfig from "../../../../../SdkConfig";
import { ElementCallEventType, ElementCallMemberEventType } from "../../../../../call-types";

describe("RolesRoomSettingsTab", () => {
    const userId = "@alice:server.org";
    const roomId = "!room:example.com";
    let cli: MatrixClient;
    let room: Room;

    const renderTab = async (propRoom: Room = room): Promise<RenderResult> => {
        const renderResult = render(<RolesRoomSettingsTab room={propRoom} />, withClientContextRenderOptions(cli));
        // Wait for the tab to be ready
        await waitFor(() => expect(screen.getByText("Permissions")).toBeInTheDocument());
        return renderResult;
    };

    beforeEach(() => {
        stubClient();
        cli = MatrixClientPeg.safeGet();
        room = mkStubRoom(roomId, "test room", cli);
    });

    /** A member of the room at a power level, as the tab reads it. */
    const member = (powerLevel: number): RoomMember =>
        ({ powerLevel, name: "Alice", getMxcAvatarUrl: () => undefined }) as unknown as RoomMember;

    /** The value row of a power level (PowerLevelRow), a button unless it can't be changed. */
    const powerRow = (label: string): HTMLElement =>
        screen.queryByRole("button", { name: new RegExp(`^${label} `) }) ??
        screen.getByText(label, { selector: "span" }).closest<HTMLElement>("[aria-disabled]")!;

    /** The value a power level's row shows. */
    const valueOf = (label: string): string | null => powerRow(label).lastElementChild!.textContent;

    /** Chooses a level in a power level's menu. */
    const chooseLevel = async (label: string, level: string): Promise<void> => {
        await userEvent.click(powerRow(label));
        await userEvent.click(screen.getByRole("menuitemradio", { name: level }));
    };

    /** The levels a power level's menu offers. */
    const optionsOf = async (label: string): Promise<(string | null)[]> => {
        await userEvent.click(powerRow(label));
        const options = screen.getAllByRole("menuitemradio").map((option) => option.textContent);
        await userEvent.keyboard("{Escape}");
        return options;
    };

    it("should allow an Admin to demote themselves but not others", async () => {
        vi.mocked(cli.getRoom).mockReturnValue(room);
        // @ts-ignore - mocked doesn't support overloads properly
        vi.mocked(room.currentState.getStateEvents).mockImplementation((type, key) => {
            if (key === undefined) return [] as MatrixEvent[];
            if (type === "m.room.power_levels") {
                return new MatrixEvent({
                    sender: "@sender:server",
                    room_id: roomId,
                    type: "m.room.power_levels",
                    state_key: "",
                    content: {
                        users: {
                            [cli.getUserId()!]: 100,
                            "@admin:server": 100,
                        },
                    },
                });
            }
            return null;
        });
        vi.mocked(room.currentState.mayClientSendStateEvent).mockReturnValue(true);
        const { container } = await renderTab();

        expect(container.querySelector(`[placeholder="${cli.getUserId()}"]`)).not.toBeDisabled();
        expect(container.querySelector(`[placeholder="@admin:server"]`)).toBeDisabled();
    });

    describe("Element Call", () => {
        const setGroupCallsEnabled = (val: boolean): void => {
            SdkConfig.put({ element_call: { disable: !val } });
        };

        afterEach(() => {
            SdkConfig.reset();
        });

        const START_CALLS = "Start Element Call calls";
        const JOIN_CALLS = "Join Element Call calls";

        describe("Element Call enabled", () => {
            beforeEach(() => {
                setGroupCallsEnabled(true);
                vi.mocked(room.getMember).mockReturnValue(member(100));
            });

            describe("Join Element calls", () => {
                it("defaults to moderator for joining calls", async () => {
                    await renderTab();
                    expect(valueOf(JOIN_CALLS)).toBe("Moderator");
                });

                it("can change joining calls power level", async () => {
                    await renderTab();

                    await chooseLevel(JOIN_CALLS, "Default");

                    expect(valueOf(JOIN_CALLS)).toBe("Default");
                    expect(cli.sendStateEvent).toHaveBeenCalledWith(roomId, EventType.RoomPowerLevels, {
                        events: {
                            [ElementCallMemberEventType.name]: 0,
                        },
                    });
                });
            });

            describe("Start Element calls", () => {
                it("defaults to moderator for starting calls", async () => {
                    await renderTab();
                    expect(valueOf(START_CALLS)).toBe("Moderator");
                });

                it("can change starting calls power level", async () => {
                    await renderTab();

                    await chooseLevel(START_CALLS, "Default");

                    expect(valueOf(START_CALLS)).toBe("Default");
                    expect(cli.sendStateEvent).toHaveBeenCalledWith(roomId, EventType.RoomPowerLevels, {
                        events: {
                            [ElementCallEventType.name]: 0,
                        },
                    });
                });
            });
        });

        it("hides when group calls disabled", async () => {
            setGroupCallsEnabled(false);

            await renderTab();

            expect(screen.queryByText(START_CALLS)).toBeNull();
            expect(screen.queryByText(JOIN_CALLS)).toBeNull();
        });
    });

    describe("Banned users", () => {
        it("should not render banned section when no banned users", async () => {
            const room = new Room(roomId, cli, userId);
            await renderTab(room);

            expect(screen.queryByText("Banned users")).not.toBeInTheDocument();
        });

        it("renders banned users", async () => {
            const bannedMember = new RoomMember(roomId, "@bob:server.org");
            bannedMember.setMembershipEvent(
                new MatrixEvent({
                    type: EventType.RoomMember,
                    content: {
                        membership: KnownMembership.Ban,
                        reason: "just testing",
                    },
                    sender: userId,
                }),
            );
            const room = new Room(roomId, cli, userId);
            vi.spyOn(room, "getMembersWithMembership").mockReturnValue([bannedMember]);
            await renderTab(room);

            expect(screen.getByText("Banned users").parentElement).toMatchSnapshot();
        });

        it("uses banners display name when available", async () => {
            const bannedMember = new RoomMember(roomId, "@bob:server.org");
            const senderMember = new RoomMember(roomId, "@alice:server.org");
            senderMember.name = "Alice";
            bannedMember.setMembershipEvent(
                new MatrixEvent({
                    type: EventType.RoomMember,
                    content: {
                        membership: KnownMembership.Ban,
                        reason: "just testing",
                    },
                    sender: userId,
                }),
            );
            const room = new Room(roomId, cli, userId);
            vi.spyOn(room, "getMembersWithMembership").mockReturnValue([bannedMember]);
            vi.spyOn(room, "getMember").mockReturnValue(senderMember);
            await renderTab(room);

            expect(screen.getByTitle("Banned by Alice")).toBeInTheDocument();
        });
    });

    it("should roll back a permission's power level change on error", async () => {
        const deferred = Promise.withResolvers<ISendEventResponse>();
        vi.mocked(cli.sendStateEvent).mockReturnValue(deferred.promise);
        vi.mocked(cli.getRoom).mockReturnValue(room);
        vi.mocked(room.currentState.mayClientSendStateEvent).mockReturnValue(true);
        vi.mocked(room.getMember).mockReturnValue(member(100));
        await renderTab();

        await chooseLevel("Remove users", "Default");
        expect(valueOf("Remove users")).toBe("Default");

        deferred.reject("Error");
        await waitFor(() => expect(valueOf("Remove users")).toBe("Moderator"));
    });

    it("should roll back power level change on error", async () => {
        const deferred = Promise.withResolvers<ISendEventResponse>();
        vi.mocked(cli.sendStateEvent).mockReturnValue(deferred.promise);
        vi.mocked(cli.getRoom).mockReturnValue(room);
        // @ts-ignore - mocked doesn't support overloads properly
        vi.mocked(room.currentState.getStateEvents).mockImplementation((type, key) => {
            if (key === undefined) return [] as MatrixEvent[];
            if (type === "m.room.power_levels") {
                return new MatrixEvent({
                    sender: "@sender:server",
                    room_id: roomId,
                    type: "m.room.power_levels",
                    state_key: "",
                    content: {
                        users: {
                            [cli.getUserId()!]: 100,
                            // needs at least one remaning admin in the room if we want to demote our user
                            // otherwise another modal will be displayed
                            ["@admin:server"]: 100,
                        },
                    },
                });
            }
            return null;
        });
        vi.mocked(room.currentState.mayClientSendStateEvent).mockReturnValue(true);
        vi.mocked(room.getMember).mockReturnValue({ powerLevel: 100 } as any);
        const { container } = await renderTab();

        const selector = container.querySelector(`[placeholder="${cli.getUserId()}"]`)!;
        fireEvent.change(selector, { target: { value: "50" } });
        expect(selector).toHaveValue("50");

        // Get the apply button of the privileged user section and click on it
        const privilegedUsersSection = screen.getByRole("group", { name: "Privileged Users" });
        const applyButton = getByRole(privilegedUsersSection, "button", { name: "Apply" });
        await userEvent.click(applyButton);

        deferred.reject("Error");
        await waitFor(() => expect(selector).toHaveValue("100"));
    });

    it("should allow changing events power levels", async () => {
        vi.mocked(cli.sendStateEvent).mockResolvedValue({ event_id: "$eventId" });
        vi.mocked(cli.getRoom).mockReturnValue(room);
        vi.mocked(room.currentState.mayClientSendStateEvent).mockReturnValue(true);
        vi.mocked(room.getMember).mockReturnValue(member(100));
        await renderTab();

        await chooseLevel("Change topic", "Default");

        expect(cli.sendStateEvent).toHaveBeenCalledWith(
            room.roomId,
            "m.room.power_levels",
            expect.objectContaining({
                events: expect.objectContaining({
                    "m.room.topic": 0,
                }),
            }),
        );
    });

    it("should not modify the power levels event when rendering or changing a power level", async () => {
        const plEvent = new MatrixEvent({
            sender: "@sender:server",
            room_id: roomId,
            type: EventType.RoomPowerLevels,
            state_key: "",
            content: {
                users: { [cli.getUserId()!]: 100 },
                events: { [EventType.RoomTopic]: 50 },
                notifications: { room: 50 },
                state_default: 50,
                events_default: 0,
            },
        });
        // Copy the content before rendering: the component would otherwise have mutated the very
        // object we are comparing against, and the assertions would pass for the wrong reason.
        const powerLevels = (): RoomPowerLevelsEventContent => plEvent.getContent<RoomPowerLevelsEventContent>();
        const originalContent = structuredClone(powerLevels());

        vi.mocked(cli.sendStateEvent).mockResolvedValue({ event_id: "$eventId" });
        vi.mocked(cli.getRoom).mockReturnValue(room);
        // @ts-ignore - mocked doesn't support overloads properly
        vi.mocked(room.currentState.getStateEvents).mockImplementation((type, key) => {
            if (key === undefined) return [] as MatrixEvent[];
            if (type === EventType.RoomPowerLevels) return plEvent;
            return null;
        });
        vi.mocked(room.currentState.mayClientSendStateEvent).mockReturnValue(true);
        vi.mocked(room.getMember).mockReturnValue(member(100));

        await renderTab();
        expect(powerLevels()).toEqual(originalContent);

        await chooseLevel("Change topic", "Default");
        expect(powerLevels()).toEqual(originalContent);

        // Only the level the user actually changed is sent, rather than every default we displayed
        expect(cli.sendStateEvent).toHaveBeenCalledWith(roomId, EventType.RoomPowerLevels, {
            ...originalContent,
            events: { [EventType.RoomTopic]: 0 },
        });
    });

    it("should allow changing top level power levels", async () => {
        vi.mocked(cli.sendStateEvent).mockResolvedValue({ event_id: "$eventId" });
        vi.mocked(cli.getRoom).mockReturnValue(room);
        vi.mocked(room.currentState.mayClientSendStateEvent).mockReturnValue(true);
        vi.mocked(room.getMember).mockReturnValue(member(100));
        await renderTab();

        await chooseLevel("Remove users", "Default");

        expect(cli.sendStateEvent).toHaveBeenCalledWith(
            room.roomId,
            "m.room.power_levels",
            expect.objectContaining({
                kick: 0,
            }),
        );
    });

    describe("permission power levels", () => {
        const mockPowerLevels = (content: object, myLevel: number): void => {
            vi.mocked(cli.getRoom).mockReturnValue(room);
            // @ts-ignore - mocked doesn't support overloads properly
            vi.mocked(room.currentState.getStateEvents).mockImplementation((type, key) => {
                if (key === undefined) return [] as MatrixEvent[];
                if (type === "m.room.power_levels") {
                    return new MatrixEvent({
                        sender: "@sender:server",
                        room_id: roomId,
                        type: "m.room.power_levels",
                        state_key: "",
                        content,
                    });
                }
                return null;
            });
            vi.mocked(room.currentState.mayClientSendStateEvent).mockReturnValue(true);
            vi.mocked(room.getMember).mockReturnValue(member(myLevel));
        };

        it("does not offer a moderator power levels above their own", async () => {
            mockPowerLevels(
                { users: { [cli.getUserId()!]: 50 }, state_default: 50, events: { [EventType.RoomTopic]: 50 } },
                50,
            );
            await renderTab();

            expect(await optionsOf("Change settings")).toEqual(["Default", "Moderator", "Custom…"]);
            expect(await optionsOf("Change topic")).toEqual(["Default", "Moderator", "Custom…"]);
        });

        it("offers an admin every power level", async () => {
            mockPowerLevels(
                { users: { [cli.getUserId()!]: 100 }, state_default: 50, events: { [EventType.RoomTopic]: 50 } },
                100,
            );
            await renderTab();

            expect(await optionsOf("Change settings")).toEqual(["Default", "Moderator", "Admin", "Custom…"]);
        });

        it("keeps showing a level above the user's own when it is already set", async () => {
            mockPowerLevels({ users: { [cli.getUserId()!]: 50 }, state_default: 100 }, 50);
            await renderTab();

            // A level above the user's own can't be changed: its row shows it without a menu
            expect(valueOf("Change settings")).toBe("Admin");
            expect(powerRow("Change settings")).toHaveAttribute("aria-disabled", "true");
        });
    });
});
