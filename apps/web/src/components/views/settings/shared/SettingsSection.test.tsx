/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "test-utils-rtl";

import { SettingsSection } from "./SettingsSection";

describe("<SettingsSection />", () => {
    it("puts a new-style section's content on its card and its subheading under it, as help under a group", () => {
        const { container } = render(
            <SettingsSection legacy={false} heading="Key storage" subHeading="Lets you view your chat history.">
                <button>Allow key storage</button>
            </SettingsSection>,
        );
        const [heading, content, help] = [...container.firstElementChild!.children];

        expect(heading).toBe(screen.getByRole("heading", { name: "Key storage" }));
        expect(content).toHaveClass("mx_SettingsSection_content");
        expect(content).toContainElement(screen.getByRole("button", { name: "Allow key storage" }));
        expect(help).toHaveClass("mx_SettingsSection_help");
        expect(help).toHaveTextContent("Lets you view your chat history.");
    });

    it("makes a legacy section a group named by its heading, which names it even where it isn't drawn", () => {
        render(
            <SettingsSection heading="Personal info">
                <div>Email addresses</div>
            </SettingsSection>,
        );

        expect(screen.getByRole("group", { name: "Personal info" })).toHaveClass("mx_SettingsSection");
    });

    it("makes no group of a section without a heading, or of a new-style section that is one card", () => {
        render(
            <>
                <SettingsSection>
                    <div>Profile</div>
                </SettingsSection>
                <SettingsSection legacy={false} heading="Key storage">
                    <div>Allow key storage</div>
                </SettingsSection>
            </>,
        );

        expect(screen.queryByRole("group")).toBeNull();
    });

    it("keeps a legacy section's children in its subsections, its subheading under them", () => {
        const { container } = render(
            <SettingsSection heading="Privacy" subHeading="How others can find you.">
                <div>How to find you</div>
            </SettingsSection>,
        );
        const [, content, help] = [...container.firstElementChild!.children];

        expect(content).toHaveClass("mx_SettingsSection_subSections");
        expect(help).toHaveClass("mx_SettingsSection_help");
    });
});
