/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { type Page } from "@playwright/test";
import { rejectToast } from "@element-hq/element-web-playwright-common";

import { expect, test } from "../../../element-web-test";
import { createFillerRooms, getRoomList, sortAlphabetically } from "./utils";

/**
 * The unread-activity toast ("Unread messages") appears at the bottom of the room list when a room with a
 * notification count (the green decoration) is scrolled below the visible area. Clicking it scrolls that
 * room into view. Rooms with only an unread-activity dot (white/black) must not trigger it.
 */
test.describe("Room list unread activity toast", () => {
    test.use({
        displayName: "Alice",
        botCreateOpts: {
            displayName: "BotBob",
            autoAcceptInvites: true,
        },
    });

    const getToast = (page: Page) => page.getByRole("button", { name: "Unread messages" });

    test.describe("flat list", () => {
        test.beforeEach(async ({ page, app, user }) => {
            // Toasts are displayed above the room list; dismiss the unrelated ones.
            await rejectToast(page, "Verify this device");
            await rejectToast(page, "Notifications");
            // Focus the user menu so room rows are not decorated by hover.
            await page.getByRole("button", { name: "User menu" }).focus();
        });

        test("shows a toast for a notifying room below the fold and scrolls to it on click", async ({
            page,
            app,
            bot,
        }) => {
            const roomList = getRoomList(page);

            // A room with a real notification count, named so it sorts to the very bottom under A-Z.
            const targetId = await app.client.createRoom({ name: "zzz unread room" });
            await app.client.inviteUser(targetId, bot.credentials!.userId);
            await bot.joinRoom(targetId);

            // Enough filler rooms to push the target well below the visible area.
            await createFillerRooms(app, 20);

            await sortAlphabetically(page);

            // The bot notifies the target room, producing a green notification count.
            await bot.sendMessage(targetId, "Hello from the bottom!");

            const targetRow = roomList.getByRole("option", { name: "Open room zzz unread room" });

            // The toast appears because the notifying room is below the fold, and the room itself is offscreen.
            await expect(getToast(page)).toBeVisible();
            await expect(targetRow).not.toBeInViewport();

            // Clicking the toast scrolls the notifying room into view…
            await getToast(page).click();
            await expect(targetRow).toBeInViewport();

            // …and the toast goes away once there is nothing left unread below the fold.
            await expect(getToast(page)).not.toBeVisible();
        });

        test("does not show a toast when the only unread room below the fold has an activity dot", async ({
            page,
            app,
            bot,
        }) => {
            const roomList = getRoomList(page);

            // Another room to park on, so the activity room stays unread (focused rooms are marked read).
            const otherRoomId = await app.client.createRoom({ name: "aaa other room" });

            // The target's unread state will only ever be an activity dot, never a notification count: set it
            // to "@mentions & keywords" so a plain (non-mention) message produces activity rather than a count.
            const targetId = await app.client.createRoom({ name: "zzz activity room" });
            await app.client.inviteUser(targetId, bot.credentials!.userId);
            await bot.joinRoom(targetId);

            await app.viewRoomById(targetId);
            await app.settings.openRoomSettings("Notifications");
            await page.getByText("@mentions and replies only").click();
            await app.settings.closeDialog();

            // Enable showing activity (dots) in the room list, so the activity dot is actually rendered.
            await app.settings.openUserSettings("Notifications");
            await page
                .getByRole("switch", { name: "Show all activity in the room list (dots or number of unread messages)" })
                .check();
            await app.settings.closeDialog();

            // Park on the other room so the target stays unread, then send a plain (non-mention) message.
            await app.viewRoomById(otherRoomId);
            await bot.sendMessage(targetId, "just activity, no mention");

            // The target shows an unread-activity dot: a decoration with no count (no digits).
            const targetRow = roomList.getByRole("option", { name: "Open room zzz activity room" });
            const decoration = targetRow.getByTestId("notification-decoration");
            await expect(decoration).toBeVisible();
            await expect(decoration).not.toHaveText(/\d/);

            // Push the activity-dot room below the fold with filler rooms and A-Z sorting.
            await createFillerRooms(app, 20);
            await sortAlphabetically(page);

            // The list has settled (a top filler room is visible) but the activity dot must not raise the toast.
            await expect(roomList.getByRole("option", { name: "Open room room 00" })).toBeVisible();
            await expect(targetRow).not.toBeInViewport();
            await expect(getToast(page)).not.toBeVisible();
        });
    });
});
