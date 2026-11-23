/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { fn } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { DialogFooterButton, DialogFooterView } from "./DialogFooterView";

const meta = {
    title: "Telement/Core/DialogFooterView",
    component: DialogFooterView,
    tags: ["autodocs"],
    decorators: [
        // A 400px dialog's body: its content on the 24px edges and its 30px corners
        (Story) => (
            <div
                data-testid="dialog"
                style={{
                    width: 400,
                    boxSizing: "border-box",
                    padding: "var(--cpd-space-4x) var(--cpd-space-6x) var(--cpd-space-6x)",
                    borderRadius: 30,
                    background: "var(--cpd-color-bg-canvas-default)",
                    outline: "1px solid var(--cpd-color-border-interactive-secondary)",
                }}
            >
                <p style={{ margin: 0, font: "var(--cpd-font-body-md-regular)" }} data-testid="content">
                    You are the only person here. If you leave, no one will be able to join in the future, including
                    you.
                </p>
                <div style={{ marginTop: "var(--cpd-space-6x)" }}>
                    <Story />
                </div>
            </div>
        ),
    ],
    args: {
        children: [
            <DialogFooterButton key="cancel" onClick={fn()}>
                Cancel
            </DialogFooterButton>,
            <DialogFooterButton key="action" onClick={fn()}>
                Leave
            </DialogFooterButton>,
        ],
    },
} satisfies Meta<typeof DialogFooterView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Destructive: Story = {
    args: {
        children: [
            <DialogFooterButton key="cancel" onClick={fn()}>
                Cancel
            </DialogFooterButton>,
            <DialogFooterButton key="action" destructive onClick={fn()}>
                Leave
            </DialogFooterButton>,
        ],
    },
};

export const DisabledAction: Story = {
    args: {
        children: [
            <DialogFooterButton key="cancel" onClick={fn()}>
                Cancel
            </DialogFooterButton>,
            <DialogFooterButton key="action" disabled>
                Create poll
            </DialogFooterButton>,
        ],
    },
};

export const AloneOk: Story = {
    args: {
        children: <DialogFooterButton onClick={fn()}>OK</DialogFooterButton>,
    },
};

export const WithStart: Story = {
    args: {
        start: (
            <label style={{ font: "var(--cpd-font-body-md-regular)" }}>
                <input type="checkbox" /> Remember my choice
            </label>
        ),
    },
};

export const WithStartButton: Story = {
    args: {
        start: (
            <DialogFooterButton destructive onClick={fn()}>
                Remove
            </DialogFooterButton>
        ),
        children: [
            <DialogFooterButton key="cancel" onClick={fn()}>
                Cancel
            </DialogFooterButton>,
            <DialogFooterButton key="action" type="submit" onClick={fn()}>
                Save
            </DialogFooterButton>,
        ],
    },
};

export const Wrapping: Story = {
    args: {
        children: [
            <DialogFooterButton key="check" onClick={fn()}>
                Check your recovery key
            </DialogFooterButton>,
            <DialogFooterButton key="generate" onClick={fn()}>
                Generate new recovery key
            </DialogFooterButton>,
            <DialogFooterButton key="action" destructive onClick={fn()}>
                Continue to remove this device
            </DialogFooterButton>,
        ],
    },
};
