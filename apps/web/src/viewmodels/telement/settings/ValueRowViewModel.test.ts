/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, describe, expect, it, vi } from "vitest";

import { ValueRowViewModel, type ValueRowViewModelProps } from "./ValueRowViewModel";

describe("ValueRowViewModel", () => {
    let vm: ValueRowViewModel;

    const props = (overrides: Partial<ValueRowViewModelProps> = {}): ValueRowViewModelProps => ({
        label: "Send messages",
        options: [
            { key: "0", label: "Default" },
            { key: "50", label: "Moderator" },
        ],
        selectedKey: "0",
        onSelect: vi.fn(),
        ...overrides,
    });

    afterEach(() => vm.dispose());

    it("shows the chosen option's label as the value, or the value it is given", () => {
        vm = new ValueRowViewModel(props());
        expect(vm.getSnapshot()).toMatchObject({ label: "Send messages", value: "Default", disabled: false });

        vm.dispose();
        vm = new ValueRowViewModel(props({ selectedKey: undefined, value: "75", customLabel: "Custom…" }));
        expect(vm.getSnapshot()).toMatchObject({ value: "75", selectedKey: undefined, customLabel: "Custom…" });
    });

    it("shows a choice at once and applies it", async () => {
        const onSelect = vi.fn();
        vm = new ValueRowViewModel(props({ onSelect }));

        const applied = vm.select("50");

        expect(vm.getSnapshot()).toMatchObject({ selectedKey: "50", value: "Moderator" });
        await applied;
        expect(onSelect).toHaveBeenCalledWith("50");
    });

    it("puts the previous value back when applying a choice fails", async () => {
        vm = new ValueRowViewModel(props({ onSelect: vi.fn().mockRejectedValue(new Error("Forbidden")) }));

        await vm.select("50");

        expect(vm.getSnapshot()).toMatchObject({ selectedKey: "0", value: "Default" });
    });

    it("ignores the current choice and keys it doesn't offer", async () => {
        const onSelect = vi.fn();
        vm = new ValueRowViewModel(props({ onSelect }));

        await vm.select("0");
        await vm.select("100");

        expect(onSelect).not.toHaveBeenCalled();
    });

    it("types a value of one's own, starting from the current one, and applies it", async () => {
        const onCustom = vi.fn();
        vm = new ValueRowViewModel(props({ customLabel: "Custom…", customValue: "0", onCustom }));

        vm.startCustom();
        expect(vm.getSnapshot().customValue).toBe("0");
        vm.setCustomValue("75");
        await vm.commitCustom();

        expect(onCustom).toHaveBeenCalledWith("75");
        expect(vm.getSnapshot()).toMatchObject({ customValue: undefined, selectedKey: undefined, value: "75" });
    });

    it("puts the previous value back when a typed one fails, and leaves it when the typing is cancelled", async () => {
        vm = new ValueRowViewModel(
            props({ customLabel: "Custom…", onCustom: vi.fn().mockRejectedValue(new Error("Not a number")) }),
        );

        vm.startCustom();
        vm.setCustomValue("abc");
        await vm.commitCustom();
        expect(vm.getSnapshot()).toMatchObject({ customValue: undefined, selectedKey: "0", value: "Default" });

        vm.startCustom();
        vm.cancelCustom();
        expect(vm.getSnapshot()).toMatchObject({ customValue: undefined, value: "Default" });
    });

    it("follows the component's props, keeping a choice it applied until the component's value changes", async () => {
        vm = new ValueRowViewModel(props());
        await vm.select("50");

        // The component re-renders before the server has the change
        vm.setProps(props());
        expect(vm.getSnapshot().value).toBe("Moderator");

        // The server's answer
        vm.setProps(props({ selectedKey: "50" }));
        expect(vm.getSnapshot()).toMatchObject({ selectedKey: "50", value: "Moderator" });

        vm.setProps(props({ selectedKey: "0", label: "Invite users", disabled: true }));
        expect(vm.getSnapshot()).toMatchObject({ value: "Default", label: "Invite users", disabled: true });
    });

    it("keeps its options while the component passes equal ones, so the view doesn't render again", () => {
        vm = new ValueRowViewModel(props());
        const listener = vi.fn();
        vm.subscribe(listener);
        const { options } = vm.getSnapshot();

        vm.setProps(props());

        expect(vm.getSnapshot().options).toBe(options);
        expect(listener).not.toHaveBeenCalled();
    });
});
