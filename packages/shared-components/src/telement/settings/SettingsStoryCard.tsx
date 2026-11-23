/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type ReactNode } from "react";

/**
 * A settings card on the settings pane for the stories and tests of the settings rows, drawn as the app draws one
 * (settingsGroupCard in its _common.pcss): 12px corners, its content 12 × 16 inside and 16px apart, and a row at its
 * top or bottom 4px from its edge.
 */
export function SettingsStoryCard({ children }: { children: ReactNode }): JSX.Element {
    return (
        <div style={{ padding: 16, backgroundColor: "var(--cpd-color-gray-300)" }}>
            <style>
                {`
                    [data-testid="card"]:has(> [data-settings-row]:first-child) { padding-top: 4px !important; }
                    [data-testid="card"]:has(> [data-settings-row]:last-child) { padding-bottom: 4px !important; }
                `}
            </style>
            <div
                data-testid="card"
                style={{
                    display: "grid",
                    gap: 16,
                    width: 480,
                    boxSizing: "border-box",
                    padding: "12px 16px",
                    borderRadius: 12,
                    backgroundColor: "var(--cpd-color-bg-canvas-default)",
                }}
            >
                {children}
            </div>
        </div>
    );
}
