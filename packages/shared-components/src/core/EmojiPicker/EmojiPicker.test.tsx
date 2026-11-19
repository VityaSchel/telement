/*
 * Copyright 2026 Element Creations Ltd.
 * Copyright 2023 The Matrix.org Foundation C.I.C.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import { DATA_BY_CATEGORY } from "@matrix-org/emojibase-bindings";
import userEvent from "@testing-library/user-event";
import type { CDPSession } from "@vitest/browser-playwright";
import { cdp } from "vitest/browser";
import { render, waitFor, screen, within } from "@test-utils";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
// The layout assertions need the real spacing tokens and Compound's pill radius
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import compoundWebStyles from "@vector-im/compound-web/dist/style.css?inline";
import "../../telement/tokens.css";

import { EMOJIS_PER_ROW, EmojiPicker, filterEmojis } from "./EmojiPicker";

describe("EmojiPicker", function () {
    // As in the app, Compound's component styles sit in a layer below the picker's, so its headings keep their size
    const compoundWebLayer = document.createElement("style");
    beforeAll(() => {
        compoundWebLayer.textContent = `@layer compound-web { ${compoundWebStyles} }`;
        document.head.append(compoundWebLayer);
    });
    afterAll(() => compoundWebLayer.remove());

    // Recent emojis as they would be provided by the app, most used first
    const RECENT_EMOJIS = ["😀", "🎉", "❤️"];

    // Helper to get the currently active emoji's text content from the grid
    const getActiveEmojiText = (container: HTMLElement): string =>
        container.querySelector('[role="gridcell"] [tabindex="0"]')?.textContent || "";

    it("draws the lines under its tabs and over its footer in the divider color, which menus step up in dark themes", () => {
        const { container } = render(
            <div style={{ "--cpd-color-separator-primary": "rgb(255, 0, 0)" } as React.CSSProperties}>
                <EmojiPicker onChoose={() => false} onFinished={vi.fn()} />
            </div>,
        );

        expect(getComputedStyle(screen.getByRole("tablist", { name: "Categories" })).borderBottomColor).toBe(
            "rgb(255, 0, 0)",
        );
        expect(getComputedStyle(container.querySelector("[class*='module_footer']")!).borderTopColor).toBe(
            "rgb(255, 0, 0)",
        );
    });

    it("should disable the recent category when no recent emojis", () => {
        render(<EmojiPicker onChoose={() => false} onFinished={vi.fn()} />);

        const recentTab = screen.getByRole("tab", { name: "Frequently Used" });
        expect(recentTab).toBeDisabled();
    });

    it("should select the people category by default when no recent emojis", () => {
        render(<EmojiPicker onChoose={() => false} onFinished={vi.fn()} />);

        const peopleTab = screen.getByRole("tab", { name: "😀" });
        expect(peopleTab).toHaveAttribute("aria-selected", "true");
    });

    it("should enable and select the recent category when recent emojis are supplied", () => {
        render(<EmojiPicker onChoose={() => false} onFinished={vi.fn()} recentEmojis={RECENT_EMOJIS} />);

        const recentTab = screen.getByRole("tab", { name: "Frequently Used" });
        expect(recentTab).toBeEnabled();
        expect(recentTab).toHaveAttribute("aria-selected", "true");
    });

    it("should record recent emoji when onChoose does not return false", async () => {
        const onChoose = vi.fn(() => true);
        const onRecordRecent = vi.fn();
        const { container } = render(
            <EmojiPicker onChoose={onChoose} onFinished={vi.fn()} onRecordRecent={onRecordRecent} />,
        );

        await waitFor(() => {
            expect(container.querySelector('[role="gridcell"]')).toBeInTheDocument();
        });

        await userEvent.click(container.querySelector('[role="gridcell"] [role="button"]')!);
        expect(onChoose).toHaveBeenCalledWith("😀");
        expect(onRecordRecent).toHaveBeenCalledWith("😀");
    });

    it("should not record recent emoji when onChoose returns false", async () => {
        const onRecordRecent = vi.fn();
        const { container } = render(
            <EmojiPicker onChoose={() => false} onFinished={vi.fn()} onRecordRecent={onRecordRecent} />,
        );

        await waitFor(() => {
            expect(container.querySelector('[role="gridcell"]')).toBeInTheDocument();
        });

        await userEvent.click(container.querySelector('[role="gridcell"] [role="button"]')!);
        expect(onRecordRecent).not.toHaveBeenCalled();
    });

    it("should not mangle default order after filtering", async () => {
        const { container } = render(<EmojiPicker onChoose={() => false} onFinished={vi.fn()} />);

        // Extract the list of emoji currently visible in the grid
        const getVisibleEmojis = (): string[] =>
            Array.from(container.querySelectorAll('[role="gridcell"]')).map((cell) => cell.textContent || "");

        await waitFor(() => {
            expect(container.querySelector('[role="gridcell"]')).toBeInTheDocument();
        });

        // Wait for the virtualized rows to settle (out-of-view categories drop
        // their transient initial rows once measured) before capturing.
        const beforeEmojis = getVisibleEmojis();

        const input = container.querySelector("input")!;

        // Apply a filter and assert that the visible emoji have changed
        await userEvent.type(input, "test");
        await waitFor(() => expect(getVisibleEmojis()).not.toEqual(beforeEmojis));

        // There may be different numbers of emoji before after since virtuoso may
        // end up rendering more or fewer off screen. Chop any excess off so that it's
        // just the *order* we're comparing.
        await userEvent.clear(input);
        await waitFor(() => {
            const afterEmojis = getVisibleEmojis();
            const length = Math.min(beforeEmojis.length, afterEmojis.length);
            expect(afterEmojis.slice(0, length)).toEqual(beforeEmojis.slice(0, length));
        });
    });

    it("should keep the filter applied when recentEmojis prop is changed", async () => {
        const { container, rerender } = render(
            <EmojiPicker onChoose={() => false} onFinished={vi.fn()} recentEmojis={[...RECENT_EMOJIS]} />,
        );

        const getVisibleEmojis = (): string[] =>
            Array.from(container.querySelectorAll('[role="gridcell"]')).map((cell) => cell.textContent || "");

        const input = container.querySelector("input")!;
        await userEvent.type(input, "wave");
        await waitFor(() => expect(getVisibleEmojis()).toContain("👋"));
        const filtered = getVisibleEmojis();

        // add another recently used emoji but it doesn't match the filter, so it should not change what's visible.
        rerender(<EmojiPicker onChoose={() => false} onFinished={vi.fn()} recentEmojis={["🦡", ...RECENT_EMOJIS]} />);

        expect(input).toHaveValue("wave");
        expect(getVisibleEmojis()).toEqual(filtered);
    });

    it("sort emojis by shortcode and size", function () {
        const sorted = filterEmojis(DATA_BY_CATEGORY.people, "heart");

        expect(sorted[0].shortcodes[0]).toEqual("heart");
        expect(sorted[1].shortcodes[0]).toEqual("heartbeat");
    });

    it("should allow keyboard navigation using arrow keys", async () => {
        const onChoose = vi.fn();
        const onFinished = vi.fn();
        const { container } = render(<EmojiPicker onChoose={onChoose} onFinished={onFinished} />);

        const input = container.querySelector("input")!;
        await userEvent.click(input);

        function getEmoji(): string {
            return getActiveEmojiText(container);
        }

        await waitFor(() => expect(getEmoji()).toEqual("😀"));
        // First arrow key press shows highlight without navigating
        await userEvent.keyboard("[ArrowDown]");
        expect(getEmoji()).toEqual("😀");
        // Subsequent arrow keys navigate
        await userEvent.keyboard("[ArrowDown]");
        expect(getEmoji()).toEqual("🙂");
        await userEvent.keyboard("[ArrowUp]");
        expect(getEmoji()).toEqual("😀");
        await userEvent.keyboard("Flag");
        await waitFor(() => expect(getEmoji()).not.toEqual("😀"));
        await userEvent.keyboard("[ArrowRight]");
        await userEvent.keyboard("[ArrowRight]");
        expect(getEmoji()).toEqual("📫️");
        await userEvent.keyboard("[ArrowDown]");
        expect(getEmoji()).toEqual("🇦🇨");
        await userEvent.keyboard("[ArrowLeft]");
        expect(getEmoji()).toEqual("📭️");
        await userEvent.keyboard("[ArrowUp]");
        expect(getEmoji()).toEqual("⛳️");
        await userEvent.keyboard("[ArrowRight]");
        expect(getEmoji()).toEqual("📫️");
        await userEvent.keyboard("[Enter]");

        expect(onChoose).toHaveBeenCalledWith("📫️");
        expect(onFinished).toHaveBeenCalled();
    });

    it("should move actual focus when navigating between emojis after Tab", async () => {
        const onChoose = vi.fn();
        const onFinished = vi.fn();
        const { container } = render(<EmojiPicker onChoose={onChoose} onFinished={onFinished} />);

        const input = container.querySelector("input")!;
        await userEvent.click(input);

        // Wait for emojis to render
        await waitFor(() => {
            expect(container.querySelector('[role="gridcell"]')).toBeInTheDocument();
        });

        function getEmoji(): string {
            return document.activeElement?.textContent || "";
        }

        function getVirtuallyFocusedEmoji(): string {
            return getActiveEmojiText(container);
        }

        // Initially, arrow keys use virtual focus (aria-activedescendant)
        // The first emoji is virtually focused by default
        expect(input).toHaveFocus();
        expect(getVirtuallyFocusedEmoji()).toEqual("😀");
        expect(getEmoji()).toEqual(""); // No actual emoji has focus

        // First arrow key press shows highlight without navigating
        await userEvent.keyboard("[ArrowDown]");
        expect(input).toHaveFocus(); // Input still has focus
        expect(getVirtuallyFocusedEmoji()).toEqual("😀"); // Virtual focus stayed on first emoji
        expect(getEmoji()).toEqual(""); // No actual emoji has focus

        // Second arrow key press navigates
        await userEvent.keyboard("[ArrowDown]");
        expect(input).toHaveFocus(); // Input still has focus
        expect(getVirtuallyFocusedEmoji()).toEqual("🙂"); // Virtual focus moved
        expect(getEmoji()).toEqual(""); // No actual emoji has focus

        // Tab past the clear button, which sits between the search field and the grid, to move actual focus to the
        // emoji
        await userEvent.keyboard("[Tab]");
        expect(screen.getByRole("button", { name: "Clear search" })).toHaveFocus();
        await userEvent.keyboard("[Tab]");
        expect(input).not.toHaveFocus();
        expect(getEmoji()).toEqual("🙂"); // Now emoji has actual focus

        // Arrow keys now move actual DOM focus between emojis
        await userEvent.keyboard("[ArrowDown]");
        expect(getEmoji()).toEqual("🤩"); // Actual focus moved down one row
        expect(input).not.toHaveFocus();

        await userEvent.keyboard("[ArrowUp]");
        expect(getEmoji()).toEqual("🙂"); // Actual focus moved back up
        expect(input).not.toHaveFocus();

        await userEvent.keyboard("[ArrowRight]");
        expect(getEmoji()).toEqual("🙃"); // Actual focus moved right
        expect(input).not.toHaveFocus();
    });

    it("should not select emoji on Enter press before highlight is shown", async () => {
        const onChoose = vi.fn();
        const onFinished = vi.fn();
        const { container } = render(<EmojiPicker onChoose={onChoose} onFinished={onFinished} />);

        const input = container.querySelector("input")!;
        await userEvent.click(input);

        // Wait for emojis to render
        await waitFor(() => {
            expect(container.querySelector('[role="gridcell"]')).toBeInTheDocument();
        });

        // Press Enter immediately without interacting with arrow keys or search
        await userEvent.keyboard("[Enter]");

        // onChoose and onFinished should not be called
        expect(onChoose).not.toHaveBeenCalled();
        expect(onFinished).not.toHaveBeenCalled();

        // Now press arrow key to show highlight
        await userEvent.keyboard("[ArrowDown]");

        // Press Enter again - now it should work
        await userEvent.keyboard("[Enter]");

        // onChoose and onFinished should be called
        expect(onChoose).toHaveBeenCalledWith("😀");
        expect(onFinished).toHaveBeenCalled();
    });

    it("should reset to first emoji when filter is cleared after navigation", async () => {
        const onChoose = vi.fn();
        const onFinished = vi.fn();
        const { container } = render(<EmojiPicker onChoose={onChoose} onFinished={onFinished} />);

        const input = container.querySelector("input")!;
        await userEvent.click(input);

        function getEmoji(): string {
            return getActiveEmojiText(container);
        }

        // Initially on first emoji
        await waitFor(() => expect(getEmoji()).toEqual("😀"));

        // Show highlight with first arrow press
        await userEvent.keyboard("[ArrowDown]");
        expect(getEmoji()).toEqual("😀");

        // Navigate to a different emoji
        await userEvent.keyboard("[ArrowDown]");
        expect(getEmoji()).toEqual("🙂");
        await userEvent.keyboard("[ArrowDown]");
        expect(getEmoji()).toEqual("🤩");

        // Type a search query to filter emojis (this sets showHighlight=true)
        await userEvent.type(input, "think");
        await waitFor(() => {
            // After filtering, we should be on the "thinking" emoji
            expect(getEmoji()).toEqual("🤔");
        });

        // Clear the search filter
        await userEvent.clear(input);

        // After clearing, showHighlight is false, so the highlight is hidden
        // The activeNode might still be on 🤔, but we can't see it

        // Press arrow key - this should reset to first emoji AND show highlight
        await userEvent.keyboard("[ArrowDown]");
        await waitFor(() => {
            expect(getEmoji()).toEqual("😀"); // Should now be on first emoji with highlight shown
        });

        // Next arrow key should navigate from first emoji
        await userEvent.keyboard("[ArrowDown]");
        expect(getEmoji()).toEqual("🙂");
    });

    it("should point aria-activedescendant at the active emoji while searching", async () => {
        const { container } = render(<EmojiPicker onChoose={vi.fn()} onFinished={vi.fn()} />);

        const input = container.querySelector("input")!;
        await userEvent.click(input);

        function getActiveEmoji(): HTMLElement {
            return container.querySelector<HTMLElement>('[role="gridcell"] [tabindex="0"]')!;
        }

        // With no query, the input must not claim an active descendant: doing so makes
        // screen readers read out the first emoji merely on focusing the input.
        await waitFor(() => expect(getActiveEmoji()).toBeInTheDocument());
        expect(input).not.toHaveAttribute("aria-activedescendant");

        // Once there's a query, the active emoji must be identified to screen readers,
        // which requires the emoji cells to have IDs for aria-activedescendant to target.
        await userEvent.type(input, "te");
        await waitFor(() => expect(getActiveEmoji().textContent).toEqual("🧑‍🏫"));

        const activeId = getActiveEmoji().id;
        expect(activeId).not.toEqual("");
        expect(input).toHaveAttribute("aria-activedescendant", activeId);
        expect(container.querySelectorAll(`[id="${activeId}"]`)).toHaveLength(1);

        // ...and it must follow the selection as the query changes
        await userEvent.type(input, "s");
        await waitFor(() => expect(getActiveEmoji().textContent).toEqual("🧪"));
        expect(input).toHaveAttribute("aria-activedescendant", getActiveEmoji().id);
        expect(getActiveEmoji().id).not.toEqual(activeId);
    });

    describe("when it opens", () => {
        const renderAndWait = async (recentEmojis?: string[]): Promise<HTMLElement> => {
            const { container } = render(
                <EmojiPicker onChoose={vi.fn()} onFinished={vi.fn()} recentEmojis={recentEmojis} />,
            );
            await waitFor(() => expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(0));
            return container;
        };

        const getAutofocusedTabs = (): HTMLElement[] =>
            screen.getAllByRole("tab").filter((tab) => tab.hasAttribute("data-autofocus"));

        it("leaves the search field at rest", async () => {
            await renderAndWait();

            expect(screen.getByRole("textbox", { name: "Search" })).not.toHaveFocus();
            expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
            // Focusing is left to the menu it opens in, unless the host asks for it
            expect(document.body).toHaveFocus();
        });

        it("focuses the selected category itself when the host asks for it", async () => {
            render(<EmojiPicker onChoose={vi.fn()} onFinished={vi.fn()} recentEmojis={RECENT_EMOJIS} autoFocus />);

            await waitFor(() => expect(screen.getByRole("tab", { name: "Frequently Used" })).toHaveFocus());
            expect(screen.getByRole("textbox", { name: "Search" })).not.toHaveFocus();

            // Only when it opens: selecting another category leaves focus where the user put it
            const search = screen.getByRole("textbox", { name: "Search" });
            await userEvent.click(search);
            screen.getByRole("tab", { name: "🐕" }).click();
            await waitFor(() =>
                expect(screen.getByRole("tab", { name: "🐕" })).toHaveAttribute("aria-selected", "true"),
            );
            expect(search).toHaveFocus();
        });

        it("asks the focus lock of the menu it opens in to focus the selected category", async () => {
            await renderAndWait(RECENT_EMOJIS);

            expect(getAutofocusedTabs()).toEqual([screen.getByRole("tab", { name: "Frequently Used" })]);
            expect(screen.getByRole("tab", { name: "Frequently Used" })).toHaveAttribute("data-autofocus", "true");

            await userEvent.click(screen.getByRole("tab", { name: "🐕" }));
            await waitFor(() => expect(getAutofocusedTabs()).toEqual([screen.getByRole("tab", { name: "🐕" })]));
        });

        it("moves from the selected category to the first emoji with the down arrow", async () => {
            const onChoose = vi.fn();
            const onFinished = vi.fn();
            const { container } = render(<EmojiPicker onChoose={onChoose} onFinished={onFinished} />);
            await waitFor(() => expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(0));
            screen.getByRole("tab", { name: "😀" }).focus();

            await userEvent.keyboard("[ArrowDown]");
            expect(document.activeElement).toBe(container.querySelector('[role="gridcell"] [tabindex="0"]'));
            expect(document.activeElement).toHaveTextContent("😀");

            await userEvent.keyboard("[ArrowDown]");
            expect(document.activeElement).toHaveTextContent("🙂");
            await userEvent.keyboard("[Enter]");
            expect(onChoose).toHaveBeenCalledWith("🙂");
            expect(onFinished).toHaveBeenCalled();
        });

        it("still moves between categories with the left and right arrows", async () => {
            await renderAndWait();
            screen.getByRole("tab", { name: "😀" }).focus();

            await userEvent.keyboard("[ArrowRight]");

            expect(screen.getByRole("tab", { name: "🐕" })).toHaveFocus();
        });

        it("moves down into the category whose tab has focus", async () => {
            await renderAndWait();
            const firstAnimal = DATA_BY_CATEGORY.nature[0].unicode;
            screen.getByRole("tab", { name: "😀" }).focus();

            await userEvent.keyboard("[ArrowRight]");
            await waitFor(() => expect(screen.getByRole("gridcell", { name: firstAnimal })).toBeVisible());
            await userEvent.keyboard("[ArrowDown]");

            expect(document.activeElement).toHaveTextContent(firstAnimal);
            expect(document.activeElement).toHaveAttribute("tabindex", "0");
        });

        it("moves down to the emoji the user left in that category", async () => {
            await renderAndWait();
            const [firstSmiley, secondSmiley] = DATA_BY_CATEGORY.people.map((emoji) => emoji.unicode);
            screen.getByRole("tab", { name: "😀" }).focus();

            await userEvent.keyboard("[ArrowDown]");
            expect(document.activeElement).toHaveTextContent(firstSmiley);
            await userEvent.keyboard("[ArrowRight]");
            expect(document.activeElement).toHaveTextContent(secondSmiley);

            // Back past the search field, which sits between the category bar and the emoji
            await userEvent.tab({ shift: true });
            expect(screen.getByRole("textbox", { name: "Search" })).toHaveFocus();
            await userEvent.tab({ shift: true });
            expect(screen.getByRole("tab", { name: "😀" })).toHaveFocus();
            await userEvent.keyboard("[ArrowDown]");

            expect(document.activeElement).toHaveTextContent(secondSmiley);
        });

        it("moves down to an emoji the user can't choose, as the arrows in the grid do", async () => {
            const firstSmiley = DATA_BY_CATEGORY.people[0].unicode;
            render(
                <EmojiPicker
                    onChoose={vi.fn()}
                    onFinished={vi.fn()}
                    isEmojiDisabled={(unicode) => unicode === firstSmiley}
                />,
            );
            await waitFor(() => expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(0));
            screen.getByRole("tab", { name: "😀" }).focus();

            await userEvent.keyboard("[ArrowDown]");

            expect(document.activeElement).toHaveTextContent(firstSmiley);
            expect(document.activeElement).toHaveAttribute("aria-disabled", "true");
        });

        it("takes the up arrow from the category bar to the search field, which Tab can't reach in a menu", async () => {
            const container = await renderAndWait();
            screen.getByRole("tab", { name: "😀" }).focus();
            const activeEmoji = container.querySelector('[role="gridcell"] [tabindex="0"]');

            await userEvent.keyboard("[ArrowUp]");

            expect(screen.getByRole("textbox", { name: "Search" })).toHaveFocus();
            expect(container.querySelector('[role="gridcell"] [tabindex="0"]')).toBe(activeEmoji);
        });

        it("reaches the search field below the category bar with Tab, and goes back with Shift+Tab", async () => {
            await renderAndWait();
            screen.getByRole("tab", { name: "😀" }).focus();

            await userEvent.tab();
            expect(screen.getByRole("textbox", { name: "Search" })).toHaveFocus();

            await userEvent.tab({ shift: true });
            expect(screen.getByRole("tab", { name: "😀" })).toHaveFocus();
        });
    });

    describe("layout", () => {
        const renderAndWait = async (
            recentEmojis?: string[],
        ): Promise<{
            scroller: HTMLElement;
            input: HTMLElement;
            tablist: HTMLElement;
        }> => {
            render(<EmojiPicker onChoose={vi.fn()} onFinished={vi.fn()} recentEmojis={recentEmojis} />);
            const input = screen.getByRole("textbox", { name: "Search" });
            await waitFor(() => expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(0));
            const tablist = screen.getByRole("tablist");
            // The scroll container holds the search field and the emoji
            const scroller = input.closest<HTMLElement>("section > div")!;
            return { scroller, input, tablist };
        };

        // The color a CSS color value resolves to here, such as a token or a system color in forced colors
        const colorOf = (value: string): string => {
            const probe = document.createElement("div");
            probe.style.color = value;
            document.body.append(probe);
            const color = getComputedStyle(probe).color;
            probe.remove();
            return color;
        };

        // How thick a line drawn as a box with a top border, or a background, is
        const lineThickness = (style: CSSStyleDeclaration): number =>
            style.boxSizing === "border-box"
                ? parseFloat(style.height)
                : parseFloat(style.height) + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);

        // Where the baseline of an inline element's text sits on the page
        const baselineOf = (element: Element): number => {
            const probe = document.createElement("span");
            probe.style.cssText = "display: inline-block; width: 0; height: 0; vertical-align: baseline";
            element.append(probe);
            const top = probe.getBoundingClientRect().top;
            probe.remove();
            return top;
        };

        it("keeps the category bar above the search field, which scrolls away with the emoji", async () => {
            const { scroller, input, tablist } = await renderAndWait();
            expect(scroller).toContainElement(input);
            expect(scroller).not.toContainElement(tablist);
            expect(tablist.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            const scrollerTop = scroller.getBoundingClientRect().top;
            expect(tablist.getBoundingClientRect().bottom).toBeLessThanOrEqual(scrollerTop);
            expect(input.getBoundingClientRect().top).toBeGreaterThanOrEqual(scrollerTop);

            scroller.scrollTop = 500;
            await waitFor(() => expect(scroller.scrollTop).toBe(500));

            expect(input.getBoundingClientRect().bottom).toBeLessThanOrEqual(scrollerTop);
            expect(tablist.getBoundingClientRect().bottom).toBeLessThanOrEqual(scrollerTop);
        });

        it("lines the category tabs, the search field, the headers and the emoji up 8px from the edges", async () => {
            // A full row of recently used emoji and a short one below it
            const { scroller, input, tablist } = await renderAndWait([
                "👍",
                "❤️",
                "😂",
                "😮",
                "😢",
                "🎉",
                "🙏",
                "👀",
                "🔥",
                "✅",
            ]);
            const scrollerBox = scroller.getBoundingClientRect();
            // Leave out the scrollbar, whose width depends on the platform
            const contentRight = scrollerBox.left + scroller.clientWidth;
            const tabs = screen.getAllByRole("tab");
            const barBox = tablist.getBoundingClientRect();

            expect(tabs[0].getBoundingClientRect().left - barBox.left).toBe(8);
            expect(barBox.right - tabs[tabs.length - 1].getBoundingClientRect().right).toBe(8);
            const fieldBox = input.parentElement!.getBoundingClientRect();
            expect([fieldBox.left - scrollerBox.left, contentRight - fieldBox.right]).toEqual([8, 8]);
            const heading = screen.getByRole("heading", { name: "Frequently Used" });
            expect(heading.getBoundingClientRect().left - scrollerBox.left).toBe(8);
            const cells = Array.from(screen.getAllByRole("row")[1].querySelectorAll('[role="gridcell"]'));
            expect(cells).toHaveLength(EMOJIS_PER_ROW);
            expect(cells[0].getBoundingClientRect().left - scrollerBox.left).toBe(8);
            expect(contentRight - cells[cells.length - 1].getBoundingClientRect().right).toBeCloseTo(8, 0);
            // A short row keeps its emoji in the columns of the full rows above it
            const shortRow = screen.getAllByRole("row")[2].querySelectorAll('[role="gridcell"]');
            expect(shortRow[0].getBoundingClientRect().left).toBe(cells[0].getBoundingClientRect().left);
            expect(shortRow[1].getBoundingClientRect().left).toBe(cells[1].getBoundingClientRect().left);
        });

        it("rounds its top corners concentric with the category tabs", async () => {
            const { tablist } = await renderAndWait();

            const picker = screen.getByRole("region", { name: "Emoji picker" });
            const pickerBox = picker.getBoundingClientRect();
            const tabBox = within(tablist).getAllByRole("tab")[0].getBoundingClientRect();
            const pickerStyle = getComputedStyle(picker);
            expect(pickerStyle.overflow).toBe("clip");
            // Concentric: a tab's radius plus its inset from the picker's edges
            const inset = tabBox.top - pickerBox.top;
            expect(tabBox.left - pickerBox.left).toBe(inset);
            expect(parseFloat(pickerStyle.borderTopLeftRadius)).toBe(tabBox.height / 2 + inset);
            expect(pickerStyle.borderTopLeftRadius).toBe("26px");
            expect(pickerStyle.borderTopRightRadius).toBe("26px");
        });

        it.each([
            ["while there are no recent emoji, in the disabled icon color", undefined, "--cpd-color-icon-disabled"],
            ["with recent emoji, in the secondary icon color", RECENT_EMOJIS, "--cpd-color-icon-secondary"],
        ])("draws Frequently Used as Compound's history icon %s, centered in its circle", async (_, recent, color) => {
            await renderAndWait(recent);
            const tab = screen.getByRole("tab", { name: "Frequently Used" });
            const icon = tab.querySelector("svg")!;
            const tabBox = tab.getBoundingClientRect();
            const iconBox = icon.getBoundingClientRect();

            expect(tab.textContent).toBe("");
            expect(icon).toHaveAttribute("aria-hidden", "true");
            expect(getComputedStyle(icon).color).toBe(colorOf(`var(${color})`));
            // Not faded, unlike a disabled emoji
            expect(getComputedStyle(tab).filter).toBe("none");
            expect([iconBox.width, iconBox.height]).toEqual([24, 24]);
            expect(iconBox.left - tabBox.left).toBe(tabBox.right - iconBox.right);
            expect(iconBox.top - tabBox.top).toBe(tabBox.bottom - iconBox.bottom);
        });

        it("fades the emoji of a category that has nothing matching the search", async () => {
            const { input } = await renderAndWait();
            await userEvent.type(input, "pizza");

            await waitFor(() => expect(screen.getByRole("tab", { name: "🐕" })).toBeDisabled());
            expect(getComputedStyle(screen.getByRole("tab", { name: "🐕" })).filter).toBe("opacity(0.3)");
        });

        it("highlights a category tab as a circle on hover and keyboard focus", async () => {
            await renderAndWait();
            const tab = screen.getByRole("tab", { name: "😀" });
            const tabBox = tab.getBoundingClientRect();
            expect([tabBox.width, tabBox.height]).toEqual([36, 36]);
            expect(parseFloat(getComputedStyle(tab).borderTopLeftRadius)).toBeGreaterThanOrEqual(tabBox.height / 2);
            // The emoji sits in the middle of the circle
            const glyph = document.createRange();
            glyph.selectNodeContents(tab);
            const glyphBox = glyph.getBoundingClientRect();
            expect(Math.abs(glyphBox.top - tabBox.top - (tabBox.bottom - glyphBox.bottom))).toBeLessThanOrEqual(0.5);
            expect(Math.abs(glyphBox.left - tabBox.left - (tabBox.right - glyphBox.right))).toBeLessThanOrEqual(0.5);

            tab.focus();
            await userEvent.keyboard("[ArrowRight]");
            const focused = screen.getByRole("tab", { name: "🐕" });
            expect(focused).toHaveFocus();
            const focusStyle = getComputedStyle(focused);
            // A ring just inside the circle, which follows its radius
            expect([focusStyle.outlineStyle, focusStyle.outlineWidth, focusStyle.outlineOffset]).toEqual([
                "solid",
                "2px",
                "-2px",
            ]);
        });

        it("marks the selected category with a line with round ends, as wide as its emoji, on the bar's border", async () => {
            const { tablist } = await renderAndWait();
            const selected = screen.getByRole("tab", { name: "😀" });
            const indicator = getComputedStyle(selected, "::after");
            const tabBox = selected.getBoundingClientRect();

            expect(indicator.content).toBe('""');
            expect([lineThickness(indicator), indicator.width]).toEqual([2, "20px"]);
            expect(indicator.borderTopColor).toBe(colorOf("var(--cpd-color-text-action-accent)"));
            expect(parseFloat(indicator.borderTopLeftRadius)).toBeGreaterThanOrEqual(1);
            // Below the circle and resting on the bar's bottom border
            const barStyle = getComputedStyle(tablist);
            const barInnerBottom = tablist.getBoundingClientRect().bottom - parseFloat(barStyle.borderBottomWidth);
            expect(tabBox.bottom + -parseFloat(indicator.bottom)).toBe(barInnerBottom);
            expect(getComputedStyle(screen.getByRole("tab", { name: "🐕" }), "::after").content).toBe("none");
        });

        it("keeps the selected category's line in forced colors", async () => {
            await renderAndWait();
            const selected = screen.getByRole("tab", { name: "😀" });
            const session = cdp() as CDPSession;
            await session.send("Emulation.setEmulatedMedia", {
                features: [{ name: "forced-colors", value: "active" }],
            });

            try {
                expect(matchMedia("(forced-colors: active)").matches).toBe(true);
                const indicator = getComputedStyle(selected, "::after");
                expect(lineThickness(indicator)).toBe(2);
                expect(indicator.borderTopWidth).toBe("2px");
                expect(indicator.borderTopColor).toBe(colorOf("CanvasText"));
            } finally {
                await session.send("Emulation.setEmulatedMedia", { features: [] });
            }
        });

        it("pads the quick reactions as evenly as the list's sections, and keeps them in place on hover", async () => {
            render(<EmojiPicker onChoose={vi.fn()} onFinished={vi.fn()} />);
            await waitFor(() => expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(0));
            const picker = screen.getByRole("region", { name: "Emoji picker" });
            const toolbar = screen.getByRole("toolbar", { name: "Quick Reactions" });
            const section = toolbar.parentElement!;
            const label = screen.getByRole("heading", { name: "Quick Reactions" });
            const cells = Array.from(toolbar.querySelectorAll<HTMLElement>("[class*='item']")).filter(
                (cell) => cell.parentElement === toolbar,
            );
            const sectionTop =
                section.getBoundingClientRect().top + parseFloat(getComputedStyle(section).borderTopWidth);
            const labelBox = label.getBoundingClientRect();
            const cellBox = toolbar.getBoundingClientRect();

            expect(labelBox.top - sectionTop).toBe(8);
            expect(cellBox.top - labelBox.bottom).toBe(4);
            expect(picker.getBoundingClientRect().bottom - cellBox.bottom).toBe(8);
            // The same inset as the list's emoji
            const pickerBox = picker.getBoundingClientRect();
            expect(cells).toHaveLength(EMOJIS_PER_ROW);
            expect(labelBox.left - pickerBox.left).toBe(8);
            expect(cells[0].getBoundingClientRect().left - pickerBox.left).toBe(8);
            expect(pickerBox.right - cells[cells.length - 1].getBoundingClientRect().right).toBeCloseTo(8, 0);

            // Hovering one shows its name and shortcode in the label
            await userEvent.hover(within(toolbar).getAllByRole("button")[3]);
            await waitFor(() => expect(label).toHaveTextContent("party poppertada"));
            expect(toolbar.getBoundingClientRect().top).toBe(cellBox.top);
            const [name, shortcode] = Array.from(label.querySelectorAll("span"));
            expect(baselineOf(shortcode)).toBe(baselineOf(name));

            // Hovering the list swaps them for a preview of the same height
            const sectionHeight = section.getBoundingClientRect().height;
            await userEvent.hover(screen.getAllByRole("button", { name: "😀" })[0]);
            await waitFor(() => expect(screen.queryByRole("toolbar", { name: "Quick Reactions" })).toBeNull());
            const preview = picker.lastElementChild!;
            expect(preview.getBoundingClientRect().height).toBe(sectionHeight);
        });

        it("keeps the quick reactions' padding at a larger font size, with the preview as tall", async () => {
            const root = document.documentElement;
            const fontSize = root.style.fontSize;
            root.style.fontSize = "20px";
            try {
                render(
                    // The app's body font, whose line height sets the height of the emoji
                    <div style={{ font: "var(--cpd-font-body-md-regular)" }}>
                        <EmojiPicker onChoose={vi.fn()} onFinished={vi.fn()} />
                    </div>,
                );
                await waitFor(() => expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(0));
                const picker = screen.getByRole("region", { name: "Emoji picker" });
                const toolbar = screen.getByRole("toolbar", { name: "Quick Reactions" });
                const section = toolbar.parentElement!;
                const labelBox = screen.getByRole("heading", { name: "Quick Reactions" }).getBoundingClientRect();
                const cellBox = toolbar.getBoundingClientRect();
                const sectionTop =
                    section.getBoundingClientRect().top + parseFloat(getComputedStyle(section).borderTopWidth);

                expect(labelBox.height).toBe(25);
                expect([
                    labelBox.top - sectionTop,
                    cellBox.top - labelBox.bottom,
                    picker.getBoundingClientRect().bottom - cellBox.bottom,
                ]).toEqual([8, 4, 8]);

                // The longest name stays on the label's line instead of pushing the emoji down
                await userEvent.hover(within(toolbar).getAllByRole("button")[2]);
                const label = screen.getByRole("heading", { name: /grinning face with smiling eyes/i });
                expect(label.getBoundingClientRect().height).toBe(25);
                expect(toolbar.getBoundingClientRect().top).toBe(cellBox.top);

                const sectionHeight = section.getBoundingClientRect().height;
                await userEvent.hover(screen.getAllByRole("button", { name: "😀" })[0]);
                await waitFor(() => expect(screen.queryByRole("toolbar", { name: "Quick Reactions" })).toBeNull());
                expect(picker.lastElementChild!.getBoundingClientRect().height).toBe(sectionHeight);
            } finally {
                root.style.fontSize = fontSize;
            }
        });

        it("rings an emoji focused with the keyboard inside its rounded cell, like the category tabs", async () => {
            render(<EmojiPicker onChoose={vi.fn()} onFinished={vi.fn()} />);
            await waitFor(() => expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(0));
            const expectRing = (focused: Element): void => {
                const style = getComputedStyle(focused);
                expect([style.outlineStyle, style.outlineWidth, style.outlineOffset, style.borderRadius]).toEqual([
                    "solid",
                    "2px",
                    "-2px",
                    "4px",
                ]);
            };

            screen.getByRole("tab", { name: "😀" }).focus();
            await userEvent.keyboard("[ArrowDown]");
            const inGrid = document.activeElement!;
            expect(inGrid).toHaveTextContent("😀");
            expectRing(inGrid);
            // The cell's highlight behind it is rounded like the emoji's own
            const cell = inGrid.closest('[role="gridcell"]')!;
            expect(getComputedStyle(cell).backgroundColor).toBe(colorOf("var(--cpd-color-bg-subtle-primary)"));
            expect(getComputedStyle(cell).borderRadius).toBe("4px");

            const quick = within(screen.getByRole("toolbar", { name: "Quick Reactions" })).getAllByRole("button")[0];
            quick.focus();
            expect(quick).toHaveFocus();
            expectRing(quick);
            expect(getComputedStyle(quick).backgroundColor).toBe(colorOf("var(--cpd-color-bg-subtle-primary)"));
        });

        it("takes the tabs' size and the radii from Telement's tokens", async () => {
            render(
                <div
                    style={
                        {
                            "--tl-control-size": "40px",
                            "--tl-radius-inline": "6px",
                            "--tl-radius-control": "7px",
                        } as React.CSSProperties
                    }
                >
                    <EmojiPicker onChoose={vi.fn()} onFinished={vi.fn()} />
                </div>,
            );
            const input = screen.getByRole("textbox", { name: "Search" });
            await waitFor(() => expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(0));

            const picker = screen.getByRole("region", { name: "Emoji picker" });
            const pickerStyle = getComputedStyle(picker);
            const tab = screen.getByRole("tab", { name: "😀" });
            const tabBox = tab.getBoundingClientRect();
            const inset = tabBox.top - picker.getBoundingClientRect().top;
            expect(tabBox.height).toBe(40);
            expect(input.parentElement!.getBoundingClientRect().height).toBe(40);
            expect(parseFloat(pickerStyle.borderTopLeftRadius)).toBe(tabBox.height / 2 + inset);
            expect(pickerStyle.borderBottomLeftRadius).toBe("6px");

            expect(getComputedStyle(tab).borderRadius).toBe("7px");
            expect(getComputedStyle(tab, "::after").borderRadius).toBe("7px");
            const cell = screen.getAllByRole("button", { name: "😀" })[0].firstElementChild!;
            expect(getComputedStyle(cell).borderRadius).toBe("6px");
        });

        it("draws each emoji in a 38px square rounded by 4px, keeping a selected one's border inside it", async () => {
            render(
                // The app's body font, whose line height sets the height of the emoji
                <div style={{ font: "var(--cpd-font-body-md-regular)" }}>
                    <EmojiPicker
                        onChoose={vi.fn()}
                        onFinished={vi.fn()}
                        recentEmojis={RECENT_EMOJIS}
                        selectedEmojis={new Set(["🎉"])}
                    />
                </div>,
            );
            await waitFor(() => expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(0));
            const cell = (name: string): HTMLElement =>
                screen.getAllByRole("checkbox", { name })[0].firstElementChild as HTMLElement;
            const glyphOffset = (item: HTMLElement): number[] => {
                const glyph = document.createRange();
                glyph.selectNodeContents(item);
                const glyphBox = glyph.getBoundingClientRect();
                const itemBox = item.getBoundingClientRect();
                return [glyphBox.left - itemBox.left, glyphBox.top - itemBox.top];
            };
            const plain = cell("😀");
            const selected = cell("🎉");
            expect(selected).toHaveAttribute("class", expect.stringContaining("itemSelected"));

            for (const item of [plain, selected]) {
                const box = item.getBoundingClientRect();
                expect([box.width, box.height]).toEqual([38, 38]);
                expect(getComputedStyle(item).borderRadius).toBe("4px");
            }
            expect(getComputedStyle(selected).borderTopWidth).toBe("1px");
            expect(glyphOffset(selected)).toEqual(glyphOffset(plain));
            expect(plain.closest('[role="row"]')!.getBoundingClientRect().height).toBe(38);
        });

        it("selects the category whose emoji show below the category bar", async () => {
            await renderAndWait();

            await userEvent.click(screen.getByRole("tab", { name: "🐕" }));

            await waitFor(() =>
                expect(screen.getByRole("tab", { name: "🐕" })).toHaveAttribute("aria-selected", "true"),
            );
            expect(screen.getByRole("tab", { name: "😀" })).toHaveAttribute("aria-selected", "false");
        });

        it("scrolls back to the search field and the best matches when the query changes", async () => {
            const { scroller, input } = await renderAndWait();
            scroller.scrollTop = 500;
            await waitFor(() => expect(scroller.scrollTop).toBe(500));

            await userEvent.type(input, "cat");

            await waitFor(() => expect(scroller.scrollTop).toBe(0));
            expect(screen.getByRole("tab", { name: "😀" })).toHaveAttribute("aria-selected", "true");
        });

        it("selects the first category left by a query that doesn't scroll the picker", async () => {
            const { scroller, input } = await renderAndWait(RECENT_EMOJIS);
            expect(scroller.scrollTop).toBe(0);
            expect(screen.getByRole("tab", { name: "Frequently Used" })).toHaveAttribute("aria-selected", "true");

            await userEvent.click(input);
            await userEvent.keyboard("cat");

            // No recently used emoji match, so the first category left is Smileys & People
            await waitFor(() =>
                expect(screen.getByRole("tab", { name: "😀" })).toHaveAttribute("aria-selected", "true"),
            );
            expect(screen.getByRole("tab", { name: "😀" })).toBeEnabled();
            expect(screen.getByRole("tab", { name: "Frequently Used" })).toBeDisabled();

            // The selected category stays reachable with Shift+Tab, before the search field
            await userEvent.tab({ shift: true });
            expect(screen.getByRole("tab", { name: "😀" })).toHaveFocus();
        });

        it("clears the query with the clear button and keeps typing in the search field", async () => {
            const { input } = await renderAndWait();
            await userEvent.click(input);

            await userEvent.type(input, "wave");
            await waitFor(() => expect(screen.getByRole("gridcell", { name: "👋" })).toBeInTheDocument());
            await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

            expect(input).toHaveValue("");
            expect(input).toHaveFocus();
            await waitFor(() => expect(screen.queryByRole("gridcell", { name: "👋" })).toBeNull());
        });

        it("only lets the user select text in the search field", async () => {
            const { input } = await renderAndWait();

            expect(getComputedStyle(screen.getByRole("region", { name: "Emoji picker" })).userSelect).toBe("none");
            expect(getComputedStyle(input).userSelect).toBe("text");
        });
    });

    describe("Category keyboard selection", () => {
        it("check tabindex for the first category when no recent emojis", async () => {
            const { container } = render(<EmojiPicker onChoose={vi.fn()} onFinished={vi.fn()} />);

            await waitFor(() => {
                expect(container.querySelector('[data-category-id="people"]')).toBeInTheDocument();
            });

            // People category should have tabindex="0"
            const peopleTab = container.querySelector('[title*="Smileys"]');
            expect(peopleTab).toHaveAttribute("tabindex", "0");
            expect(peopleTab).toHaveAttribute("aria-selected", "true");

            // Other categories should have tabindex="-1"
            const natureTab = container.querySelector('[title*="Animals"]');
            expect(natureTab).toHaveAttribute("tabindex", "-1");
        });

        it("check tabindex for recent category when recent emojis exist", async () => {
            const { container } = render(
                <EmojiPicker recentEmojis={RECENT_EMOJIS.slice(0, 2)} onChoose={vi.fn()} onFinished={vi.fn()} />,
            );

            await waitFor(() => {
                expect(container.querySelector('[data-category-id="recent"]')).toBeInTheDocument();
            });

            // Recent category should have tabindex="0"
            const recentTab = container.querySelector('[title*="Frequently"]');
            expect(recentTab).toHaveAttribute("tabindex", "0");
            expect(recentTab).toHaveAttribute("aria-selected", "true");

            // People category should have tabindex="-1"
            const peopleTab = container.querySelector('[title*="Smileys"]');
            expect(peopleTab).toHaveAttribute("tabindex", "-1");
        });

        it("should update table position when clicking on a different category tab", async () => {
            const { container } = render(<EmojiPicker onChoose={vi.fn()} onFinished={vi.fn()} />);

            await waitFor(() => {
                expect(container.querySelector('[data-category-id="people"]')).toBeInTheDocument();
            });

            // Initially, people category should be visible
            const peopleTab = container.querySelector('[title*="Smileys"]')!;
            expect(peopleTab).toHaveAttribute("tabindex", "0");

            // Click on nature category tab
            const natureTab = container.querySelector('[title*="Animals"]')!;
            await userEvent.click(natureTab);

            // Wait for scroll and visibility update
            await waitFor(() => {
                const natureCategory = container.querySelector('[data-category-id="nature"]');
                expect(natureCategory).toBeInTheDocument();
            });
        });

        it("should navigate between category tabs using arrow keys", async () => {
            const { container } = render(<EmojiPicker onChoose={vi.fn()} onFinished={vi.fn()} />);

            await waitFor(() => {
                expect(container.querySelector('[data-category-id="people"]')).toBeInTheDocument();
            });

            // Focus on the category header
            const peopleTab = container.querySelector<HTMLButtonElement>('[title*="Smileys"]')!;
            peopleTab.focus();
            expect(peopleTab).toHaveFocus();

            // Press ArrowRight to move to next category
            await userEvent.keyboard("[ArrowRight]");

            // Should focus on next enabled category and trigger scroll
            await waitFor(() => {
                // Verify focus moved away from people tab
                expect(peopleTab).not.toHaveFocus();

                // Verify some other category tab now has focus
                const focusedTab = document.activeElement;
                expect(focusedTab?.getAttribute("role")).toBe("tab");
                expect(focusedTab).not.toBe(peopleTab);
            });
        });

        it("should navigate to first/last category using Home/End keys", async () => {
            const { container } = render(<EmojiPicker onChoose={vi.fn()} onFinished={vi.fn()} />);

            await waitFor(() => {
                expect(container.querySelector('[data-category-id="people"]')).toBeInTheDocument();
            });

            // Focus on the category header
            const peopleTab = container.querySelector<HTMLButtonElement>('[title*="Smileys"]')!;
            peopleTab.focus();

            // Press End to jump to last category
            await userEvent.keyboard("[End]");

            await waitFor(() => {
                const flagsTab = container.querySelector('[title*="Flags"]')!;
                expect(flagsTab).toHaveFocus();
            });

            // Press Home to jump to first category
            await userEvent.keyboard("[Home]");

            await waitFor(() => {
                expect(peopleTab).toHaveFocus();
            });
        });
    });
});
