/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useMemo, useState } from "react";
import { fn } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
    FailedMessageMarkView,
    type FailedMessageMarkViewActions,
    type FailedMessageMarkViewSnapshot,
} from "./FailedMessageMarkView";
import { useMockedViewModel } from "../../../../core/viewmodel/useMockedViewModel";
import { withViewDocs } from "../../../../../.storybook/withViewDocs";

type FailedMessageMarkViewProps = FailedMessageMarkViewSnapshot & Omit<FailedMessageMarkViewActions, "setMenuOpen">;

const FailedMessageMarkViewWrapperImpl = ({
    menuOpen: initiallyOpen,
    resend,
    delete: remove,
}: FailedMessageMarkViewProps): JSX.Element => {
    const [menuOpen, setMenuOpen] = useState(initiallyOpen);
    const snapshot = useMemo(() => ({ menuOpen }), [menuOpen]);
    const actions = useMemo(() => ({ setMenuOpen, resend, delete: remove }), [resend, remove]);
    const vm = useMockedViewModel(snapshot, actions);

    // At the end of a message's last line, with room above it for the menu
    return (
        <div style={{ display: "flex", justifyContent: "flex-end", paddingBlockStart: "96px", inlineSize: "240px" }}>
            <FailedMessageMarkView vm={vm} />
        </div>
    );
};

const FailedMessageMarkViewWrapper = withViewDocs(FailedMessageMarkViewWrapperImpl, FailedMessageMarkView);

const meta = {
    title: "Telement/Timeline Meta/FailedMessageMarkView",
    component: FailedMessageMarkViewWrapper,
    tags: ["autodocs"],
    args: {
        menuOpen: false,
        resend: fn(),
        delete: fn(),
    },
} satisfies Meta<typeof FailedMessageMarkViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MenuOpen: Story = { args: { menuOpen: true } };
