/*
Copyright 2024 New Vector Ltd.
Copyright 2024 The Matrix.org Foundation C.I.C.
Copyright 2023 Suguru Hirahara

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { test, expect } from "../../element-web-test";

test.use({
    locale: "en-GB",
    timezoneId: "Europe/London",
});

test.describe("Preferences user settings tab", () => {
    test.use({
        displayName: "Bob",
        uut: async ({ app, user }, use) => {
            const locator = await app.settings.openUserSettings("Preferences");
            await use(locator);
        },
    });

    test("should be rendered properly", { tag: "@screenshot" }, async ({ app, page, user, axe }) => {
        await page.setViewportSize({ width: 1024, height: 4000 });
        const tab = await app.settings.openUserSettings("Preferences");
        // Assert that the top heading is rendered
        await expect(tab.getByRole("heading", { name: "Preferences" })).toBeVisible();
        await expect(tab).toMatchScreenshot("Preferences-user-settings-tab-should-be-rendered-properly-1.png", {
            // masked due to daylight saving time making the text content vary
            mask: [tab.getByRole("button", { name: /^Time zone/ })],
        });

        await expect(axe).toHaveNoViolations();
    });

    test(
        "should be able to find and change the app language",
        { tag: ["@no-firefox", "@no-webkit"] },
        async ({ uut, page, user }) => {
            const languageRow = uut.getByRole("button", { name: /^Application language/ });
            await languageRow.scrollIntoViewIfNeeded();
            // Check the default value
            await expect(languageRow).toContainText("English");
            // Open the menu of languages, the current one checked
            await languageRow.click();
            const menu = page.getByRole("menu", { name: "Application language" });
            await expect(menu.getByRole("menuitemradio", { name: "English", exact: true })).toBeChecked();
            // Find a language by its name in English
            const search = menu.getByRole("textbox", { name: "Search" });
            await expect(search).toBeFocused();
            await search.fill("german");
            await expect(menu.getByRole("menuitemradio")).toHaveText(["Deutsch"]);
            // Escape empties the search, then closes the menu without choosing
            await search.press("Escape");
            await expect(search).toHaveValue("");
            await search.press("Escape");
            await expect(menu).toBeHidden();
            await expect(languageRow).toContainText("English");
        },
    );

    test("should be able to change the timezone", async ({ uut, page, user }) => {
        const timezoneRow = uut.getByRole("button", { name: /^Time zone/ });
        await timezoneRow.scrollIntoViewIfNeeded();
        // Check the default value
        await expect(timezoneRow).toContainText("Browser default");
        // Find a different value in the menu and choose it
        await timezoneRow.click();
        const menu = page.getByRole("menu", { name: "Time zone" });
        await menu.getByRole("textbox", { name: "Search" }).fill("abidjan");
        await expect(menu.getByRole("menuitemradio")).toHaveText(["Africa/Abidjan"]);
        await page.keyboard.press("Enter");
        // Check the new value
        await expect(menu).toBeHidden();
        await expect(timezoneRow).toContainText("Africa/Abidjan");
    });
});
