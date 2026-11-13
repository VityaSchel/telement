/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useState } from "react";
import { fn } from "storybook/test";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchFieldView, type SearchFieldViewProps } from "./SearchFieldView";

const SearchFieldViewWrapper = ({ value: initialValue, onChange, ...props }: SearchFieldViewProps): JSX.Element => {
    const [value, setValue] = useState(initialValue);
    return (
        <div style={{ width: 320 }}>
            <SearchFieldView
                {...props}
                value={value}
                onChange={(newValue) => {
                    setValue(newValue);
                    onChange(newValue);
                }}
            />
        </div>
    );
};

const meta = {
    title: "Telement/Core/SearchFieldView",
    component: SearchFieldViewWrapper,
    tags: ["autodocs"],
    args: {
        value: "",
        onChange: fn(),
    },
} satisfies Meta<typeof SearchFieldViewWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
    args: { value: "thumbs up" },
};

export const CustomPlaceholder: Story = {
    args: { placeholder: "Search KLIPY" },
};
