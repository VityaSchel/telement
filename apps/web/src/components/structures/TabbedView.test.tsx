/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, describe, it, expect, vi } from "vitest";
import React from "react";
import { act, fireEvent, render, screen } from "test-utils-rtl";
import { SettingsSolidIcon, VisibilityOnIcon, LabsIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import TabbedView, { Tab, TabLocation } from "./TabbedView";
import { type NonEmptyArray } from "../../@types/common";
import { _t } from "../../languageHandler";
import UIStore, { UI_EVENTS } from "../../stores/UIStore";

describe("<TabbedView />", () => {
    const generalTab = new Tab("GENERAL", "common|general", <SettingsSolidIcon />, <div>general</div>);
    const labsTab = new Tab("LABS", "common|labs", <LabsIcon />, <div>labs</div>);
    const appearanceTab = new Tab("APPEARANCE", "common|appearance", <VisibilityOnIcon />, <div>appearance</div>);
    const defaultProps = {
        tabLocation: TabLocation.LEFT,
        tabs: [generalTab, labsTab, appearanceTab] as NonEmptyArray<Tab<any>>,
        onChange: () => {},
    };
    const getComponent = (
        props: {
            activeTabId: "GENERAL" | "LABS" | "APPEARANCE";
            onChange?: () => any;
            tabs?: NonEmptyArray<Tab<any>>;
        } = {
            activeTabId: "GENERAL",
        },
    ): React.ReactElement => <TabbedView {...defaultProps} {...props} />;

    const getTabTestId = (tab: Tab<string>): string => `settings-tab-${tab.id}`;
    const getActiveTab = (container: HTMLElement): Element | undefined =>
        container.getElementsByClassName("mx_TabbedView_tabLabel_active")[0];
    const getActiveTabBody = (container: HTMLElement): Element | undefined =>
        container.getElementsByClassName("mx_TabbedView_tabPanel")[0];

    describe("with something above the tabs", () => {
        afterEach(() => {
            UIStore.destroy();
        });

        const renderTabsHeader = (iconsOnly: boolean): React.ReactElement =>
            iconsOnly ? <button aria-label="Search settings" /> : <input aria-label="Search settings" />;

        it("puts it before their list", () => {
            const { container } = render(
                <TabbedView {...defaultProps} activeTabId="GENERAL" renderTabsHeader={renderTabsHeader} />,
            );

            const header = container.querySelector(".mx_TabbedView_tabsHeader")!;
            expect(header).toContainElement(screen.getByRole("textbox", { name: "Search settings" }));
            expect(header.nextElementSibling).toHaveAttribute("role", "tablist");
        });

        it.each([
            { width: 1025, responsive: true, role: "textbox" },
            // At the width the stylesheet hides the tabs' labels from
            { width: 1024, responsive: true, role: "button" },
            { width: 800, responsive: true, role: "button" },
            // Tabs that keep their labels in narrow windows
            { width: 800, responsive: false, role: "textbox" },
        ])(
            "draws it as a $role in a $width px wide window, where responsive is $responsive",
            ({ width, responsive, role }) => {
                UIStore.instance.windowWidth = width;
                render(
                    <TabbedView
                        {...defaultProps}
                        activeTabId="GENERAL"
                        responsive={responsive}
                        renderTabsHeader={renderTabsHeader}
                    />,
                );

                expect(screen.getByRole(role, { name: "Search settings" })).toBeInTheDocument();
            },
        );

        it("follows the window as it gets narrower and wider", () => {
            UIStore.instance.windowWidth = 1280;
            render(
                <TabbedView {...defaultProps} activeTabId="GENERAL" responsive renderTabsHeader={renderTabsHeader} />,
            );
            const resize = (width: number): void =>
                act(() => {
                    UIStore.instance.windowWidth = width;
                    UIStore.instance.emit(UI_EVENTS.Resize);
                });

            resize(900);
            expect(screen.getByRole("button", { name: "Search settings" })).toBeInTheDocument();
            resize(1280);
            expect(screen.getByRole("textbox", { name: "Search settings" })).toBeInTheDocument();
        });
    });

    it("renders tabs", () => {
        const { container } = render(getComponent());
        expect(container).toMatchSnapshot();
    });

    it("renders activeTabId tab as active when valid", () => {
        const { container } = render(getComponent({ activeTabId: appearanceTab.id }));
        expect(getActiveTab(container)?.textContent).toEqual(_t(appearanceTab.label));
        expect(getActiveTabBody(container)?.textContent).toEqual("appearance");
    });

    it("asks a dialog's focus lock to focus the active tab", () => {
        const { getByTestId, rerender } = render(getComponent({ activeTabId: labsTab.id }));

        expect(getByTestId(getTabTestId(labsTab))).toHaveAttribute("data-autofocus", "true");
        expect(getByTestId(getTabTestId(generalTab))).not.toHaveAttribute("data-autofocus");
        expect(getByTestId(getTabTestId(appearanceTab))).not.toHaveAttribute("data-autofocus");

        rerender(getComponent({ activeTabId: appearanceTab.id }));

        expect(getByTestId(getTabTestId(appearanceTab))).toHaveAttribute("data-autofocus", "true");
        expect(getByTestId(getTabTestId(labsTab))).not.toHaveAttribute("data-autofocus");
    });

    it("calls onchange on on tab click", () => {
        const onChange = vi.fn();
        const { getByTestId } = render(getComponent({ activeTabId: "GENERAL", onChange }));

        act(() => {
            fireEvent.click(getByTestId(getTabTestId(appearanceTab)));
        });

        expect(onChange).toHaveBeenCalledWith(appearanceTab.id);
    });

    it("keeps same tab active when order of tabs changes", () => {
        // start with middle tab active
        const { container, rerender } = render(getComponent({ activeTabId: labsTab.id }));

        expect(getActiveTab(container)?.textContent).toEqual(_t(labsTab.label));

        rerender(getComponent({ tabs: [labsTab, generalTab, appearanceTab], activeTabId: labsTab.id }));

        // labs tab still active
        expect(getActiveTab(container)?.textContent).toEqual(_t(labsTab.label));
    });
});
