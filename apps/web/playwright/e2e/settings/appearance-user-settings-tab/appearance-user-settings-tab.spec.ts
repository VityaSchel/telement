/*
Copyright 2024,2025 New Vector Ltd.
Copyright 2023 Suguru Hirahara

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { rejectToast } from "@element-hq/element-web-playwright-common";

import { expect, test } from ".";

test.describe("Appearance user settings tab", () => {
    test.use({
        displayName: "Hanako",
    });

    test("should be rendered properly", { tag: "@screenshot" }, async ({ page, user, app, axe }) => {
        await rejectToast(page, "Verify this device");
        const tab = await app.settings.openUserSettings("Appearance");

        // Click "Show advanced" link button
        await tab.getByRole("button", { name: "Show advanced" }).click();

        // Assert that "Hide advanced" link button is rendered
        await expect(tab.getByRole("button", { name: "Hide advanced" })).toBeVisible();

        await expect(tab).toMatchScreenshot("appearance-tab.png");

        await expect(axe).toHaveNoViolations();
    });

    test(
        "should support changing font size by using the font size slider",
        { tag: "@screenshot" },
        async ({ page, app, user }) => {
            await rejectToast(page, "Verify this device");
            await app.settings.openUserSettings("Appearance");

            const tab = page.getByTestId("mx_AppearanceUserSettingsTab");
            const slider = tab.getByRole("slider", { name: "Font size" });
            await expect(slider).toHaveAttribute("aria-valuetext", "16 (default)");

            // Default browser font size is 16px, four steps above 12px
            for (let step = 0; step < 4; step++) await slider.press("ArrowLeft");
            await expect(slider).toHaveAttribute("aria-valuetext", "12");
            await expect(page.locator(":root")).toHaveCSS("font-size", "12px");

            await expect(page).toMatchScreenshot("window-12px.png", { includeDialogBackground: true });
        },
    );

    test("should support enabling system font", async ({ page, app, user }) => {
        await rejectToast(page, "Verify this device");
        await app.settings.openUserSettings("Appearance");
        const tab = page.getByTestId("mx_AppearanceUserSettingsTab");

        // Click "Show advanced" link button
        await tab.getByRole("button", { name: "Show advanced" }).click();

        await tab.getByRole("switch", { name: "Use bundled emoji font" }).click();
        await tab.getByRole("switch", { name: "Use a system font" }).click();

        // Assert that the font-family value was removed
        await expect(page.locator("body")).toHaveCSS("font-family", '""');
    });

    test(
        "should keep same font and emoji when switching theme",
        { tag: "@screenshot" },
        async ({ page, app, user, util }) => {
            await rejectToast(page, "Verify this device");
            await rejectToast(page, "Notifications");

            const roomId = await util.createAndDisplayRoom();

            await app.client.sendMessage(roomId, { body: "Message with 🦡", msgtype: "m.text" });

            await app.settings.openUserSettings("Appearance");
            const tab = page.getByTestId("mx_AppearanceUserSettingsTab");
            await tab.getByRole("button", { name: "Show advanced" }).click();
            await tab.getByRole("switch", { name: "Use bundled emoji font" }).click();
            await tab.getByRole("switch", { name: "Use a system font" }).click();

            await app.closeDialog();
            await expect(page).toMatchScreenshot("window-before-switch.png", {
                mask: [page.getByTestId("event-tile-slot-timestamp")],
            });

            // Switch to dark theme
            await app.settings.openUserSettings("Appearance");
            await util.getMatchSystemThemeSwitch().click();
            await util.getDarkTheme().click();

            await app.closeDialog();
            // Font and emoji should remain the same after theme switch
            await expect(page).toMatchScreenshot("window-after-switch.png", {
                mask: [page.getByTestId("event-tile-slot-timestamp")],
            });
        },
    );
});
