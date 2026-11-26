/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import { render, screen, within } from "@test-utils";
import userEvent from "@testing-library/user-event";
import InfoIcon from "@vector-im/compound-design-tokens/assets/web/icons/info";
import { vi, describe, it, afterEach, expect } from "vitest";

import { SpaceMenuView } from "./SpaceMenuView";
import { defaultSnapshot, MockedViewModel } from "../test-utils";

describe("<SpaceMenuView />", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should match snapshot", () => {
        const vm = new MockedViewModel(defaultSnapshot);
        const { asFragment } = render(<SpaceMenuView vm={vm} />);

        expect(asFragment()).toMatchSnapshot();
    });

    it("should display the menu when button is clicked", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel(defaultSnapshot);
        render(<SpaceMenuView vm={vm} />);

        const button = screen.getByRole("button", { name: "Open space menu" });
        await user.click(button);

        expect(screen.getByRole("menuitem", { name: "Space home" })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Space info" })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Invite" })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Preferences" })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Space settings" })).toBeInTheDocument();
    });

    it("starts the menu with its first item, without a title row repeating the space's name it opens from", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel(defaultSnapshot);
        render(<SpaceMenuView vm={vm} />);

        await user.click(screen.getByRole("button", { name: "Open space menu" }));

        const menu = screen.getByRole("menu");
        expect(within(menu).queryByRole("heading")).not.toBeInTheDocument();
        expect(menu).not.toHaveTextContent(defaultSnapshot.title);
        expect(within(menu).getAllByRole("menuitem")[0]).toHaveAccessibleName("Space home");
    });

    it("should hide invite option when canInviteInSpace is false", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel({ ...defaultSnapshot, canInviteInSpace: false });
        render(<SpaceMenuView vm={vm} />);

        const button = screen.getByRole("button", { name: "Open space menu" });
        await user.click(button);

        expect(screen.queryByRole("menuitem", { name: "Invite" })).not.toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Space home" })).toBeInTheDocument();
    });

    it("should hide space settings option when canAccessSpaceSettings is false", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel({ ...defaultSnapshot, canAccessSpaceSettings: false });
        render(<SpaceMenuView vm={vm} />);

        const button = screen.getByRole("button", { name: "Open space menu" });
        await user.click(button);

        expect(screen.queryByRole("menuitem", { name: "Space settings" })).not.toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Space home" })).toBeInTheDocument();
    });

    it("should call openSpaceHome when Home is clicked", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel(defaultSnapshot);
        render(<SpaceMenuView vm={vm} />);

        await user.click(screen.getByRole("button", { name: "Open space menu" }));
        await user.click(screen.getByRole("menuitem", { name: "Space home" }));

        expect(vm.openSpaceHome).toHaveBeenCalledTimes(1);
    });

    it("lists Space info right under Space home, with the info icon", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel(defaultSnapshot);
        render(<SpaceMenuView vm={vm} />);

        await user.click(screen.getByRole("button", { name: "Open space menu" }));

        const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
        expect(items.slice(0, 2).map((item) => item.textContent)).toEqual(["Space home", "Space info"]);
        const { container: infoIcon } = render(<InfoIcon />);
        expect(items[1].querySelector("svg path")?.getAttribute("d")).toBe(
            infoIcon.querySelector("path")?.getAttribute("d"),
        );
    });

    it("should call openSpaceInfo when Space info is clicked", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel(defaultSnapshot);
        render(<SpaceMenuView vm={vm} />);

        await user.click(screen.getByRole("button", { name: "Open space menu" }));
        await user.click(screen.getByRole("menuitem", { name: "Space info" }));

        expect(vm.openSpaceInfo).toHaveBeenCalledTimes(1);
        expect(vm.openSpaceHome).not.toHaveBeenCalled();
    });

    it("should call inviteInSpace when Invite is clicked", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel(defaultSnapshot);
        render(<SpaceMenuView vm={vm} />);

        await user.click(screen.getByRole("button", { name: "Open space menu" }));
        await user.click(screen.getByRole("menuitem", { name: "Invite" }));

        expect(vm.inviteInSpace).toHaveBeenCalledTimes(1);
    });

    it("should call openSpacePreferences when Preferences is clicked", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel(defaultSnapshot);
        render(<SpaceMenuView vm={vm} />);

        await user.click(screen.getByRole("button", { name: "Open space menu" }));
        await user.click(screen.getByRole("menuitem", { name: "Preferences" }));

        expect(vm.openSpacePreferences).toHaveBeenCalledTimes(1);
    });

    it("should call openSpaceSettings when Space settings is clicked", async () => {
        const user = userEvent.setup();

        const vm = new MockedViewModel(defaultSnapshot);
        render(<SpaceMenuView vm={vm} />);

        await user.click(screen.getByRole("button", { name: "Open space menu" }));
        await user.click(screen.getByRole("menuitem", { name: "Space settings" }));

        expect(vm.openSpaceSettings).toHaveBeenCalledTimes(1);
    });
});
