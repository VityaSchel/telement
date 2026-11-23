/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/**
 * For tests: loads photos before avatars show them, so that the avatars show the photos from their first render, as
 * they do once the browser has them, rather than their letters for as long as the photos take to load.
 *
 * @param urls - The photos' addresses
 */
export async function loadAvatarPhotos(...urls: string[]): Promise<void> {
    await Promise.all(
        urls.map(
            (url) =>
                new Promise<void>((resolve, reject) => {
                    const photo = new Image();
                    photo.addEventListener("load", () => resolve());
                    photo.addEventListener("error", () => reject(new Error(`Couldn't load ${url}`)));
                    photo.src = url;
                }),
        ),
    );
}
