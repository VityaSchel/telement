/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { describe, it, beforeEach, expect } from "vitest";
import React from "react";
import { render, fireEvent } from "test-utils-rtl";

import MainSplit from "./MainSplit";
import { SDKContext } from "../../contexts/SDKContext.ts";
import { SDKContextClass } from "../../contexts/SDKContextClass";

describe("<MainSplit/>", () => {
    const children = (
        <div>
            Child<span>Foo</span>Bar
        </div>
    );
    const panel = <div>Right panel</div>;
    let sdkContext: SDKContextClass;

    beforeEach(() => {
        localStorage.clear();
        sdkContext = new SDKContextClass();
    });

    it("renders", () => {
        const { asFragment, container } = render(<MainSplit children={children} panel={panel} />);
        expect(asFragment()).toMatchSnapshot();
        // Assert it matches the default width of 320
        expect(container.querySelector<HTMLElement>(".mx_RightPanel_ResizeWrapper")!.style.width).toBe("320px");
    });

    it("respects defaultSize prop", () => {
        const { asFragment, container } = render(<MainSplit children={children} panel={panel} defaultSize={500} />);
        expect(asFragment()).toMatchSnapshot();
        // Assert it matches the default width of 350
        expect(container.querySelector<HTMLElement>(".mx_RightPanel_ResizeWrapper")!.style.width).toBe("500px");
    });

    it("prefers size stashed in LocalStorage to the defaultSize prop", () => {
        localStorage.setItem("mx_rhs_size_thread", "333");
        const { container } = render(
            <MainSplit children={children} panel={panel} sizeKey="thread" defaultSize={400} />,
        );
        expect(container.querySelector<HTMLElement>(".mx_RightPanel_ResizeWrapper")!.style.width).toBe("333px");
    });

    it("persists the size on resize stop", () => {
        const { container } = render(
            <MainSplit children={children} panel={panel} sizeKey="thread" defaultSize={400} />,
            { wrapper: ({ children }) => <SDKContext.Provider value={sdkContext}>{children}</SDKContext.Provider> },
        );

        const handle = container.querySelector(".mx_ResizeHandle--horizontal")!;
        expect(handle).toBeInTheDocument();
        fireEvent.mouseDown(handle);
        fireEvent.resize(handle, { clientX: 0 });
        fireEvent.mouseUp(handle);

        expect(localStorage.getItem("mx_rhs_size_thread")).toBe("400");
    });
});
