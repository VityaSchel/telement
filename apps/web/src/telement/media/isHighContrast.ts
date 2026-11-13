/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/**
 * Whether the app shows a high contrast theme, which theme.ts marks with Compound's high contrast class on the body.
 * The image and video viewers use the dark theme whatever the app's theme, and its high contrast variant then.
 */
export function isHighContrast(): boolean {
    return (
        document.body.classList.contains("cpd-theme-light-hc") || document.body.classList.contains("cpd-theme-dark-hc")
    );
}
