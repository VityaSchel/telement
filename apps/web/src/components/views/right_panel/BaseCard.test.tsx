/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "test-utils-rtl";

import BaseCard from "./BaseCard";

describe("<BaseCard />", () => {
    it("is titled in its header, which has no back or close button", () => {
        const { asFragment } = render(
            <BaseCard header="Heading text">
                <div>Content</div>
            </BaseCard>,
        );

        expect(screen.getByRole("heading")).toHaveTextContent("Heading text");
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        expect(asFragment()).toMatchSnapshot();
    });
});
