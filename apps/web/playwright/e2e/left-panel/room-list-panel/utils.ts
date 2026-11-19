/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { type Locator, type Page } from "@playwright/test";

import { type ElementAppPage } from "../../../pages/ElementAppPage";

/**
 * Get the room list
 * @param page
 */
export function getRoomList(page: Page): Locator {
    return page.getByTestId("room-list");
}

/**
 * Get the primary filters container
 * @param page
 */
export function getPrimaryFilters(page: Page): Locator {
    return page.getByTestId("primary-filters");
}

/**
 * Get the room options menu button in the room list header
 * @param page
 */
export function getRoomOptionsMenu(page: Page): Locator {
    return page.getByRole("button", { name: "Room options" });
}

/**
 * Get the filter list expand button in the room list header
 * @param page
 */
export function getFilterExpandButton(page: Page): Locator {
    return getPrimaryFilters(page).getByRole("button", { name: "Expand filter list" });
}

/**
 * Get the filter list collapse button in the room list header
 * @param page
 */
export function getFilterCollapseButton(page: Page): Locator {
    return getPrimaryFilters(page).getByRole("button", { name: "Collapse filter list" });
}

/**
 * Get the header section of the room list
 * @param page
 */
export function getHeaderSection(page: Page) {
    return page.getByTestId("room-list-header");
}

/**
 * Get the room list view
 * @param page
 */
export function getRoomListView(page: Page) {
    return page.getByRole("navigation", { name: "Room list" });
}

/**
 * Get the search section of the room list
 * @param page
 */
export function getSearchSection(page: Page) {
    return page.getByRole("search");
}

/**
 * Create `count` filler rooms whose names sort alphabetically before any room named "zzz …",
 * so that under A-Z sorting they fill the top of the list and push the "zzz …" room below the fold.
 */
export async function createFillerRooms(app: ElementAppPage, count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
        await app.client.createRoom({ name: `room ${String(i).padStart(2, "0")}` });
    }
}

/** Switch the room list to alphabetical sorting so room positions are deterministic. */
export async function sortAlphabetically(page: Page): Promise<void> {
    await getRoomOptionsMenu(page).click();
    await page.getByRole("menuitemradio", { name: "A-Z" }).click();
}
