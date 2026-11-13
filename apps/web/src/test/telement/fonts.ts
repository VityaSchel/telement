/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// The files that @fontsource's stylesheets load, which vitest leaves out as it doesn't process stylesheets
const interUrl = new URL("../../../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2", import.meta.url);
const firaCodeUrl = new URL(
    "../../../node_modules/@fontsource/fira-code/files/fira-code-latin-400-normal.woff2",
    import.meta.url,
);

async function loadFont(family: string, url: URL): Promise<() => void> {
    const font = await new FontFace(family, `url(${url})`).load();
    document.fonts.add(font);
    return () => {
        document.fonts.delete(font);
    };
}

/**
 * Loads Inter, the app's body font, for tests that measure text to the pixel rather than in a system fallback font.
 * @returns A function that removes the font again.
 */
export function loadInter(): Promise<() => void> {
    return loadFont("Inter", interUrl);
}

/**
 * Loads Fira Code, the app's code font, for tests that measure code to the pixel.
 * @returns A function that removes the font again.
 */
export function loadFiraCode(): Promise<() => void> {
    return loadFont("Fira Code", firaCodeUrl);
}
