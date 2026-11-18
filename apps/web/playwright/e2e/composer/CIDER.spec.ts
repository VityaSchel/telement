/*
Copyright 2024 New Vector Ltd.
Copyright 2022, 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { rejectToastIfExists } from "@element-hq/element-web-playwright-common";

import { test, expect } from "../../element-web-test";
import { SettingLevel } from "../../../src/settings/SettingLevel";
import { getSampleFilePath } from "../../sample-files";

const CtrlOrMeta = process.platform === "darwin" ? "Meta" : "Control";

test.describe("Composer", () => {
    test.use({
        displayName: "Janet",
        botCreateOpts: {
            displayName: "Bob",
        },
        lockLeftPanelWidth: false,
    });

    test.use({
        room: async ({ app, user }, use) => {
            const roomId = await app.client.createRoom({ name: "Composing Room" });
            await app.viewRoomByName("Composing Room");
            await use({ roomId });
        },
    });

    test.beforeEach(async ({ app, room /* trigger room fixture */ }) => {
        await rejectToastIfExists(app.page, "Notifications");
    });

    test.describe("CIDER", () => {
        test("sends a message when you click send or press Enter", async ({ page }) => {
            const composer = page.getByRole("textbox", { name: "Write a message…" });

            // Type a message
            await composer.pressSequentially("my message 0");
            // It has not been sent yet
            await expect(
                page.getByTestId("event-tile-slot-body").filter({ hasText: "my message 0" }),
            ).not.toBeVisible();

            // Click send
            await page.getByRole("button", { name: "Send message" }).click();
            // It has been sent
            await expect(page.locator(".mx_EventTile").last().getByTestId("event-tile-slot-body")).toBeVisible();

            // Type another and press Enter afterward
            await composer.pressSequentially("my message 1");
            await composer.press("Enter");
            // It was sent
            await expect(page.locator(".mx_EventTile").last().getByTestId("event-tile-slot-body")).toBeVisible();
        });

        test("can write formatted text", async ({ page }) => {
            const composer = page.getByRole("textbox", { name: "Write a message…" });

            await composer.pressSequentially("my bold");
            await composer.press(`${CtrlOrMeta}+KeyB`);
            await composer.pressSequentially(" message");
            await page.getByRole("button", { name: "Send message" }).click();
            // Note: both "bold" and "message" are bold, which is probably surprising
            await expect(
                page.getByTestId("event-tile-slot-body").locator("strong", { hasText: "bold message" }),
            ).toBeVisible();
        });

        test("should allow user to input emoji via graphical picker", async ({ page, app }) => {
            await app.getComposer(false).getByRole("button", { name: "Emoji" }).click();

            await page.getByLabel("Emoji picker").getByRole("button", { name: "😇" }).click();

            await page.locator(".mx_ContextualMenu_background").click(); // Close emoji picker
            await page.getByRole("textbox", { name: "Write a message…" }).press("Enter"); // Send message

            await expect(page.getByTestId("event-tile-slot-body").filter({ hasText: "😇" })).toBeVisible();
        });

        test("renders in narrow viewports", { tag: "@screenshot" }, async ({ page, bot, app }) => {
            // Shrink the viewport
            await page.setViewportSize({ width: 500, height: 1080 });
            // Shrinking the viewport will collapse the left-panel, so manually expand it.
            await app.resizeLeftPanel(150);
            // Now take the screenshot
            await expect(app.getComposer()).toMatchScreenshot("narrow.png");
        });

        test.describe("render emoji picker with larger viewport height", async () => {
            test.use({ viewport: { width: 1280, height: 720 } });
            test("render emoji picker", { tag: "@screenshot" }, async ({ page, app }) => {
                await app.getComposer(false).getByRole("button", { name: "Emoji" }).click();
                // Mask the background of the screenshot to avoid failing the test just because some
                // other component have changed its rendering.
                await expect(page.getByLabel("Emoji picker")).toMatchScreenshot("emoji-picker.png", {
                    css: `
                        .mx_ContextualMenu_background {
                            background-color: magenta !important;
                        }
                    `,
                });
            });
        });

        test.describe("render emoji picker with small viewport height", async () => {
            test.use({ viewport: { width: 1280, height: 360 } });
            test("render emoji picker", { tag: "@screenshot" }, async ({ page, app }) => {
                await app.getComposer(false).getByRole("button", { name: "Emoji" }).click();
                // Mask the background of the screenshot to avoid failing the test just because some
                // other component have changed its rendering.
                await expect(page.getByLabel("Emoji picker")).toMatchScreenshot("emoji-picker-small.png", {
                    css: `
                        .mx_ContextualMenu_background {
                            background-color: magenta !important;
                        }
                    `,
                });
            });
        });

        test("should have focus lock in emoji picker", async ({ page, app }) => {
            const emojiButton = app.getComposer(false).getByRole("button", { name: "Emoji" });

            // Open emoji picker by clicking the button
            await emojiButton.click();

            // Wait for emoji picker to be visible
            const emojiPicker = page.getByLabel("Emoji picker");
            await expect(emojiPicker).toBeVisible();

            // The selected category has focus, and the search field waits for the user
            await expect(emojiPicker.getByRole("tab", { selected: true })).toBeFocused();
            await expect(emojiPicker.getByRole("textbox", { name: "Search" })).not.toBeFocused();

            // Try to tab multiple times - focus should stay within emoji picker
            await page.keyboard.press("Tab");
            await page.keyboard.press("Tab");
            await page.keyboard.press("Tab");
            await page.keyboard.press("Tab");
            await page.keyboard.press("Tab");

            // Verify we're still within the emoji picker (not back to composer)
            const focusStillInPicker = await emojiPicker.evaluate((el) => el.contains(document.activeElement));
            expect(focusStillInPicker).toBe(true);

            // Close with Escape key
            await page.keyboard.press("Escape");

            // Verify emoji picker is closed
            await expect(emojiPicker).not.toBeVisible();

            // Verify focus returns to emoji button
            await expect(emojiButton).toBeFocused();
        });

        test("keeps its buttons next to the last line of text, with 20px icons on 36px targets", async ({ app }) => {
            const composer = app.getComposer(false);
            const field = composer.getByRole("textbox", { name: "Write a message…" });
            await field.pressSequentially("one line");
            const buttons = ["Attachment", "Emoji", "Send message"].map((name) =>
                composer.getByRole("button", { name }),
            );
            for (const button of buttons) {
                expect(await button.boundingBox()).toMatchObject({ width: 36, height: 36 });
                expect(await button.locator("svg").boundingBox()).toMatchObject({ width: 20, height: 20 });
            }

            // How far each button sits from the bottom and from the middle of the text field
            const measure = async (): Promise<{ fromBottom: number; fromMiddle: number }[]> => {
                const fieldBox = (await field.boundingBox())!;
                return Promise.all(
                    buttons.map(async (button) => {
                        const box = (await button.boundingBox())!;
                        return {
                            fromBottom: fieldBox.y + fieldBox.height - (box.y + box.height),
                            fromMiddle: fieldBox.y + fieldBox.height / 2 - (box.y + box.height / 2),
                        };
                    }),
                );
            };

            // One line: the buttons sit in the middle of the field
            const oneLine = await measure();
            for (const { fromMiddle } of oneLine) {
                expect(Math.abs(fromMiddle)).toBeLessThanOrEqual(1);
            }
            const oneLineHeight = (await field.boundingBox())!.height;

            await field.press("Shift+Enter");
            await field.pressSequentially("two lines");
            await field.press("Shift+Enter");
            await field.pressSequentially("three lines");
            await expect.poll(async () => (await field.boundingBox())!.height).toBeGreaterThan(oneLineHeight + 30);

            // Three lines: the buttons stay next to the last one, as in Telegram
            const threeLines = await measure();
            threeLines.forEach(({ fromBottom }, index) => {
                expect(fromBottom).toBeCloseTo(oneLine[index].fromBottom, 0);
            });
        });

        test.describe("when Control+Enter is required to send", () => {
            test.beforeEach(async ({ app }) => {
                await app.settings.setValue("MessageComposerInput.ctrlEnterToSend", null, SettingLevel.ACCOUNT, true);
            });

            test("only sends when you press Control+Enter", async ({ page }) => {
                const composer = page.getByRole("textbox", { name: "Write a message…" });
                // Type a message and press Enter
                await composer.pressSequentially("my message 3");
                await composer.press("Enter");
                // It has not been sent yet
                await expect(
                    page.getByTestId("event-tile-slot-body").filter({ hasText: "my message 3" }),
                ).not.toBeVisible();

                // Press Control+Enter
                await composer.press(`${CtrlOrMeta}+Enter`);
                // It was sent
                await expect(page.locator(".mx_EventTile").last().getByTestId("event-tile-slot-body")).toBeVisible();
            });
        });

        test("can send mention", { tag: "@screenshot" }, async ({ page, bot, app }) => {
            // Set up a private room so we have another user to mention
            await app.client.createRoom({
                is_direct: true,
                invite: [bot.credentials!.userId],
            });
            await app.viewRoomByName("Bob");

            const composer = page.getByRole("textbox", { name: "Write a message…" });
            await composer.click();
            await composer.pressSequentially("@bob");

            // Note that we include the user ID here as the room tile is also an 'option' role
            // with text 'Bob'
            await page.getByRole("option", { name: `Bob ${bot.credentials!.userId}` }).click();
            await expect(composer.getByText("Bob")).toBeVisible();
            await expect(composer).toMatchScreenshot("mention.png");
            await composer.press("Enter");
            await expect(page.locator(".mx_EventTile").last().getByTestId("event-tile-slot-body")).toContainText("Bob");
        });

        test("renders emoji autocomplete", { tag: "@screenshot" }, async ({ page }) => {
            const composer = page.getByRole("textbox", { name: "Write a message…" });

            // Type ":+1" to trigger emoji autocomplete
            await composer.pressSequentially(":+1");

            // Wait for autocomplete to appear
            const autocomplete = page.locator("#mx_Autocomplete");
            await expect(autocomplete).toBeVisible();

            // Take a screenshot of the autocomplete
            await expect(autocomplete).toMatchScreenshot("emoji-autocomplete.png");
        });

        test("can paste a file", async ({ page, bot, app }) => {
            await app.composerDragAndPasteFile("room", getSampleFilePath("riot.png"), "image/png");
            await expect(page.locator(".mx_ImageBody")).toBeVisible();
        });
    });
});
