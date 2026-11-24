/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { useState } from "react";
import { composeStories } from "@storybook/react-vite";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@test-utils";
import { describe, expect, it, vi } from "vitest";
// The layout assertions need the real spacing tokens, Compound's pill radius and Telement's radius tokens
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../tokens.css";

import * as stories from "./SearchFieldView.stories";
import * as buttonStories from "./SearchFieldButtonView.stories";
import { SearchFieldView, type SearchFieldViewProps } from "./SearchFieldView";
import { SearchFieldButtonView } from "./SearchFieldButtonView";

const { Default, WithValue, CustomPlaceholder } = composeStories(stories);
const { Default: DefaultButton, IconOnly: IconOnlyButton } = composeStories(buttonStories);

// The magnifier and the placeholder, which the field centers at rest and moves to its left edge
function getDecoration(field: HTMLElement): HTMLElement {
    return field.querySelector<HTMLElement>("[aria-hidden='true']")!;
}

function getField(): HTMLElement {
    return screen.getByRole("textbox", { name: "Search" }).parentElement!;
}

/** Distances from the field's left and right edges to the magnifier and the placeholder */
function getInsets(field: HTMLElement, decoration: HTMLElement): { left: number; right: number } {
    const fieldBox = field.getBoundingClientRect();
    const decorationBox = decoration.getBoundingClientRect();
    return { left: decorationBox.left - fieldBox.left, right: fieldBox.right - decorationBox.right };
}

function ControlledField({
    initialValue = "",
    onChange,
    ...props
}: Partial<SearchFieldViewProps> & { initialValue?: string }): React.JSX.Element {
    const [value, setValue] = useState(initialValue);
    return (
        <SearchFieldView
            {...props}
            value={value}
            onChange={(newValue) => {
                setValue(newValue);
                onChange?.(newValue);
            }}
        />
    );
}

describe("SearchFieldView", () => {
    it.each([
        ["empty", Default],
        ["with a value", WithValue],
        ["with a custom placeholder", CustomPlaceholder],
    ])("matches snapshot %s", (_name, Story) => {
        const { container } = render(<Story />);
        expect(container).toMatchSnapshot();
    });

    it("centers the magnifier and the placeholder at rest", () => {
        render(<Default />);
        const field = getField();

        const { left, right } = getInsets(field, getDecoration(field));
        expect(left).toBeCloseTo(right, 0);
        expect(left).toBeGreaterThan(100);
        expect(field.getBoundingClientRect().height).toBe(36);
    });

    it("moves the magnifier and the placeholder to the left edge when the user focuses the field", async () => {
        render(<Default />);
        const field = getField();

        await userEvent.click(screen.getByRole("textbox", { name: "Search" }));

        expect(getInsets(field, getDecoration(field)).left).toBe(12);
    });

    it("rings the pill in Compound's focus blue while the user types in it", async () => {
        render(<Default />);
        const field = getField();
        expect(getComputedStyle(field).outlineStyle).toBe("none");

        await userEvent.click(screen.getByRole("textbox", { name: "Search" }));

        const style = getComputedStyle(field);
        expect([style.outlineStyle, style.outlineWidth, style.outlineOffset]).toEqual(["solid", "2px", "-2px"]);
    });

    it("keeps the magnifier at the left edge while the field holds text, even unfocused", () => {
        render(<WithValue />);
        const field = getField();

        expect(screen.getByRole("textbox", { name: "Search" })).not.toHaveFocus();
        expect(getInsets(field, getDecoration(field)).left).toBe(12);
    });

    it("labels the input with its placeholder", () => {
        render(<CustomPlaceholder />);

        const input = screen.getByRole("textbox", { name: "Search KLIPY" });
        expect(input).toHaveAttribute("placeholder", "Search KLIPY");
    });

    it("is a 36px pill with the round clear button concentric inside it", () => {
        render(<ControlledField initialValue="cat" />);
        const field = getField();
        const clear = screen.getByRole("button", { name: "Clear search" });
        const fieldBox = field.getBoundingClientRect();
        const clearBox = clear.getBoundingClientRect();

        expect(fieldBox.height).toBe(36);
        expect(parseFloat(getComputedStyle(field).borderTopLeftRadius)).toBeGreaterThanOrEqual(fieldBox.height / 2);
        expect(parseFloat(getComputedStyle(clear).borderTopLeftRadius)).toBeGreaterThanOrEqual(clearBox.height / 2);
        const inset = clearBox.top - fieldBox.top;
        expect(fieldBox.right - clearBox.right).toBe(inset);
        expect(fieldBox.bottom - clearBox.bottom).toBe(inset);
        expect(clearBox.height / 2 + inset).toBe(fieldBox.height / 2);
    });

    it("rests with the clear button hidden until the user focuses the field", async () => {
        render(<ControlledField />);

        expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();

        await userEvent.click(screen.getByRole("textbox", { name: "Search" }));
        expect(screen.getByRole("button", { name: "Clear search" })).toBeVisible();

        await userEvent.tab();
        await userEvent.tab();
        expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
    });

    it("keeps showing the clear button while it holds text, even unfocused", async () => {
        const onChange = vi.fn();
        render(<ControlledField onChange={onChange} />);

        await userEvent.type(screen.getByRole("textbox", { name: "Search" }), "cat");
        expect(onChange).toHaveBeenLastCalledWith("cat");

        await userEvent.tab();
        await userEvent.tab();
        expect(screen.getByRole("textbox", { name: "Search" })).not.toHaveFocus();
        expect(screen.getByRole("button", { name: "Clear search" })).toBeVisible();
    });

    it("clears the text and lets go of the focus, so that the field rests again", async () => {
        const onChange = vi.fn();
        render(<ControlledField initialValue="cat" onChange={onChange} />);
        const input = screen.getByRole("textbox", { name: "Search" });

        await userEvent.click(input);
        await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

        expect(onChange).toHaveBeenCalledExactlyOnceWith("");
        expect(input).toHaveValue("");
        expect(document.body).toHaveFocus();
        expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
        const { left, right } = getInsets(getField(), getDecoration(getField()));
        expect(left).toBeCloseTo(right, 0);
    });

    it("searches for nothing when the empty field is cleared, and lets go of the focus", async () => {
        const onChange = vi.fn();
        render(<ControlledField onChange={onChange} />);

        await userEvent.click(screen.getByRole("textbox", { name: "Search" }));
        await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

        expect(onChange).not.toHaveBeenCalled();
        expect(document.body).toHaveFocus();
    });

    it("gives the focus to what holds the field, as a click beside it does, without a ring", async () => {
        const onKeyDown = vi.fn();
        render(
            <div role="dialog" aria-label="Settings" tabIndex={-1} onKeyDown={onKeyDown}>
                <ControlledField initialValue="cat" />
            </div>,
        );
        const dialog = screen.getByRole("dialog");

        await userEvent.click(screen.getByRole("textbox", { name: "Search" }));
        await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

        expect(dialog).toHaveFocus();
        expect(dialog.matches(":focus-visible")).toBe(false);
        // So it still hears Escape
        await userEvent.keyboard("{Escape}");
        expect(onKeyDown).toHaveBeenCalled();
    });

    it("leaves the focus alone when the field it clears doesn't have it", async () => {
        render(
            <>
                <ControlledField initialValue="cat" />
                <button type="button">Other</button>
            </>,
        );
        const other = screen.getByRole("button", { name: "Other" });
        other.focus();

        await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

        expect(screen.getByRole("textbox", { name: "Search" })).toHaveValue("");
        expect(other).toHaveFocus();
    });

    it("lets its user say where the focus goes instead", async () => {
        const ref = React.createRef<HTMLInputElement>();
        render(<ControlledField initialValue="cat" ref={ref} releaseFocus={() => ref.current?.focus()} />);
        const input = screen.getByRole("textbox", { name: "Search" });

        await userEvent.click(input);
        await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

        expect(input).toHaveValue("");
        expect(input).toHaveFocus();
    });

    it("clears the text from the keyboard, which keeps the focus in the input", async () => {
        const onChange = vi.fn();
        render(<ControlledField initialValue="cat" onChange={onChange} />);
        const input = screen.getByRole("textbox", { name: "Search" });

        await userEvent.click(input);
        await userEvent.tab();
        expect(screen.getByRole("button", { name: "Clear search" })).toHaveFocus();
        await userEvent.keyboard("[Enter]");

        expect(input).toHaveValue("");
        expect(input).toHaveFocus();

        await userEvent.tab();
        await userEvent.keyboard("[Enter]");
        expect(onChange).toHaveBeenCalledExactlyOnceWith("");
        expect(input).toHaveFocus();
    });

    it("leaves the resting look when the user tabs into it", async () => {
        render(<ControlledField />);
        const field = getField();

        await userEvent.tab();

        expect(screen.getByRole("textbox", { name: "Search" })).toHaveFocus();
        expect(getInsets(field, getDecoration(field)).left).toBe(12);
        expect(screen.getByRole("button", { name: "Clear search" })).toBeVisible();
    });

    it("passes input attributes and the ref through to the input", async () => {
        const onKeyDown = vi.fn();
        const ref = React.createRef<HTMLInputElement>();
        render(<ControlledField ref={ref} aria-controls="results" onKeyDown={onKeyDown} />);
        const input = screen.getByRole("textbox", { name: "Search" });

        expect(ref.current).toBe(input);
        expect(input).toHaveAttribute("aria-controls", "results");
        await userEvent.type(input, "a");
        expect(onKeyDown).toHaveBeenCalled();
    });

    it("doesn't slide when the user prefers reduced motion", () => {
        // The test browser runs with reduced motion
        expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
        const { container } = render(<Default />);

        const decoration = container.querySelector<HTMLElement>("[aria-hidden='true']")!;
        expect(getComputedStyle(decoration).transitionProperty).toBe("none");
    });

    it("keeps its text selectable", () => {
        render(<Default />);

        expect(getComputedStyle(screen.getByRole("textbox", { name: "Search" })).userSelect).toBe("text");
    });
});

describe("SearchFieldButtonView", () => {
    it("matches snapshot", () => {
        const { container } = render(<DefaultButton />);
        expect(container).toMatchSnapshot();
    });

    it("fills its container", () => {
        render(<DefaultButton />);
        const button = screen.getByRole("button", { name: "Search (Ctrl+K)" });

        expect(button.getBoundingClientRect().width).toBe(button.parentElement!.getBoundingClientRect().width);
    });

    it("looks like a resting field", () => {
        render(
            <>
                <div style={{ width: 320 }}>
                    <SearchFieldView value="" onChange={vi.fn()} />
                </div>
                <div style={{ width: 320 }}>
                    <SearchFieldButtonView>Search</SearchFieldButtonView>
                </div>
            </>,
        );
        const field = getField();
        const button = screen.getByRole("button", { name: "Search" });
        const buttonLabel = screen.getByText("Search", { selector: "button span" });

        const fieldStyle = getComputedStyle(field);
        const buttonStyle = getComputedStyle(button);
        for (const property of ["height", "width", "backgroundColor", "borderRadius", "font", "color"] as const) {
            expect(buttonStyle[property]).toBe(fieldStyle[property]);
        }
        expect(getInsets(button, buttonLabel.parentElement!)).toEqual(getInsets(field, getDecoration(field)));
    });

    it("is a circle as tall as the field around the magnifier without a label", () => {
        render(<IconOnlyButton />);
        const button = screen.getByRole("button", { name: "Search settings" });
        const box = button.getBoundingClientRect();
        const icon = button.querySelector("svg")!.getBoundingClientRect();

        expect([box.width, box.height]).toEqual([36, 36]);
        expect(parseFloat(getComputedStyle(button).borderTopLeftRadius)).toBeGreaterThanOrEqual(18);
        expect([icon.left - box.left, box.right - icon.right, icon.top - box.top]).toEqual([8, 8, 8]);
    });

    it("is a button named after its label", async () => {
        const onClick = vi.fn();
        render(<SearchFieldButtonView onClick={onClick}>Search (Ctrl+K)</SearchFieldButtonView>);

        await userEvent.click(screen.getByRole("button", { name: "Search (Ctrl+K)" }));

        expect(onClick).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("textbox")).toBeNull();
    });
});
