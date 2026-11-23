/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";

import { PowerLevelRow, powerLevelRowProps } from "./PowerLevelRow";

describe("powerLevelRowProps", () => {
    const labels = (props: ReturnType<typeof powerLevelRowProps>): string[] =>
        props.options.map((option) => option.label);

    it("offers the roles up to the user's own level, then a level of one's own", () => {
        const props = powerLevelRowProps({ label: "Remove users", value: 50, maxValue: 50, onChange: vi.fn() });

        expect(labels(props)).toEqual(["Default", "Moderator"]);
        expect(props).toMatchObject({ selectedKey: "50", value: "Moderator", customLabel: "Custom…" });
    });

    it("keeps offering a level above the user's own while it is the current one", () => {
        const props = powerLevelRowProps({ label: "Change settings", value: 100, maxValue: 50, onChange: vi.fn() });

        expect(labels(props)).toEqual(["Default", "Moderator", "Admin"]);
    });

    it("names the room's default level Default", () => {
        const props = powerLevelRowProps({ label: "Default role", value: 10, usersDefault: 10, onChange: vi.fn() });

        expect(props.options).toContainEqual({ key: "10", label: "Default" });
        expect(props.value).toBe("Default");
    });

    it("shows a level that isn't a role as its number, with no option chosen", () => {
        const props = powerLevelRowProps({ label: "Remove users", value: 75, onChange: vi.fn() });

        expect(props).toMatchObject({ selectedKey: undefined, value: "75", customValue: "75" });
    });

    it("applies a role or a typed level as a number, and refuses what isn't one", async () => {
        const onChange = vi.fn();
        const props = powerLevelRowProps({ label: "Remove users", value: 50, onChange });

        await props.onSelect("100");
        await props.onCustom!("75");

        expect(onChange.mock.calls).toEqual([[100], [75]]);
        await expect(props.onCustom!("seventy")).rejects.toThrow();
        expect(onChange).toHaveBeenCalledTimes(2);
    });
});

describe("PowerLevelRow", () => {
    it("turns its value into a field for a level of one's own, applied when the field is left", async () => {
        const onChange = vi.fn();
        render(<PowerLevelRow label="Remove users" value={50} onChange={onChange} />);

        await userEvent.click(screen.getByRole("button", { name: /^Remove users/ }));
        await userEvent.click(screen.getByRole("menuitemradio", { name: "Custom…" }));
        const field = await screen.findByRole("spinbutton", { name: "Remove users" });
        await waitFor(() => expect(field).toHaveFocus());

        await userEvent.clear(field);
        await userEvent.type(field, "75{Enter}");

        expect(onChange).toHaveBeenCalledWith(75);
        expect(await screen.findByRole("button", { name: /^Remove users/ })).toHaveTextContent("Remove users75");
    });
});
