/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import React from "react";
import userEvent from "@testing-library/user-event";
import type { CDPSession } from "@vitest/browser-playwright";
import { cdp } from "vitest/browser";
import { render, screen } from "@test-utils";
import { describe, expect, it, vi } from "vitest";
// Quote lines and code blocks take their colors and radii from Compound's tokens and Telement's radius tokens
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../../telement/tokens.css";

import { MarkdownViewerView, type MarkdownViewerViewProps } from "./MarkdownViewerView";
import styles from "./MarkdownViewerView.module.css";
import shellStyles from "../DocumentViewerView/DocumentViewerView.module.css";
import { I18nApi } from "../../../core/i18n/I18nApi";
import { I18nContext } from "../../../core/i18n/i18nContext";

const defaultProps: MarkdownViewerViewProps = {
    status: "loading",
    html: "",
};

const renderView = (props: Partial<MarkdownViewerViewProps> = {}): ReturnType<typeof render> =>
    render(<MarkdownViewerView {...defaultProps} {...props} />, {
        wrapper: ({ children }) => <I18nContext.Provider value={new I18nApi()}>{children}</I18nContext.Provider>,
    });

describe("MarkdownViewerView", () => {
    it("builds on the shared document viewer shell", () => {
        renderView({ status: "ready", html: "<p>Hi</p>" });

        expect(screen.getByTestId("document-viewer")).toHaveClass(shellStyles.viewer);
        expect(screen.getByTestId("markdown-content")).toHaveClass(styles.content);
    });

    it("adds a host class to the shell without replacing its own", () => {
        renderView({ className: "mx_HostViewer" });

        const viewer = screen.getByTestId("document-viewer");
        expect(viewer).toHaveClass("mx_HostViewer");
        expect(viewer).toHaveClass(shellStyles.viewer);
    });

    it("shows the loading state without any document", () => {
        renderView({ status: "loading" });

        expect(screen.getByRole("status")).toHaveTextContent("Loading document…");
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.queryByTestId("markdown-content")).not.toBeInTheDocument();
    });

    it("shows the error state without any document", () => {
        renderView({ status: "error", html: "<p>stale</p>" });

        expect(screen.getByRole("alert")).toHaveTextContent("Unable to load this file.");
        expect(screen.queryByTestId("markdown-content")).not.toBeInTheDocument();
    });

    it("shows the rendered document once it is ready", () => {
        renderView({ status: "ready", html: "<h1>Title</h1><p>Body</p>" });

        expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
        expect(screen.getByText("Body")).toBeInTheDocument();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("forwards clicks within the document to the host", async () => {
        const user = userEvent.setup();
        const onContentClick = vi.fn((event: React.MouseEvent) => event.preventDefault());
        renderView({ status: "ready", html: '<p><a href="https://example.org/">A link</a></p>', onContentClick });

        await user.click(screen.getByRole("link", { name: "A link" }));

        expect(onContentClick).toHaveBeenCalledOnce();
    });

    it("puts the document on the card's 12px content edge, 16px under the card header", () => {
        render(
            <div style={{ position: "relative", width: 351, height: 320 }}>
                <MarkdownViewerView {...defaultProps} status="ready" html="<h1>Notes</h1><p>Read me first.</p>" />
            </div>,
            {
                wrapper: ({ children }) => (
                    <I18nContext.Provider value={new I18nApi()}>{children}</I18nContext.Provider>
                ),
            },
        );
        const content = screen.getByTestId("markdown-content").getBoundingClientRect();
        const heading = screen.getByRole("heading", { name: "Notes" }).getBoundingClientRect();

        expect([heading.left - content.left, content.right - heading.right, heading.top - content.top]).toEqual([
            12, 12, 16,
        ]);
    });

    it("rounds a code block by 4px, like a code block in a message", () => {
        renderView({ status: "ready", html: "<p>Run this:</p><pre><code>pnpm install</code></pre>" });
        const block = screen.getByTestId("markdown-content").querySelector("pre")!;
        const style = getComputedStyle(block);

        expect([
            style.borderTopLeftRadius,
            style.borderTopRightRadius,
            style.borderBottomRightRadius,
            style.borderBottomLeftRadius,
        ]).toEqual(["4px", "4px", "4px", "4px"]);
    });

    describe("quotes", () => {
        const renderQuote = (html: string): HTMLElement[] => {
            render(
                <div style={{ position: "relative", width: 480, height: 320 }}>
                    <MarkdownViewerView {...defaultProps} status="ready" html={html} />
                </div>,
                {
                    wrapper: ({ children }) => (
                        <I18nContext.Provider value={new I18nApi()}>{children}</I18nContext.Provider>
                    ),
                },
            );
            return [...screen.getByTestId("markdown-content").querySelectorAll("blockquote")];
        };

        /** What `value`, such as a token or a system color, computes to inside `scope`. */
        const colorOf = (value: string, scope: Element): string => {
            const probe = document.createElement("div");
            probe.style.color = value;
            scope.append(probe);
            const color = getComputedStyle(probe).color;
            probe.remove();
            return color;
        };

        /** How far the quote's first paragraph starts from the quote's start edge. */
        const textInset = (quote: HTMLElement): number => {
            const box = quote.getBoundingClientRect();
            const text = quote.querySelector("p")!.getBoundingClientRect();
            return getComputedStyle(quote).direction === "rtl" ? box.right - text.right : text.left - box.left;
        };

        it("draws the line as a 2px pill along the whole quote, like a quote in a message", () => {
            const [quote] = renderQuote("<blockquote><p>Desks are numbered by team.</p></blockquote><p>Thanks!</p>");
            const line = getComputedStyle(quote, "::before");

            // A border on an empty box, rather than a background, which forced colors would paint over
            expect(line.position).toBe("absolute");
            expect(line.width).toBe("0px");
            expect(line.borderInlineStartStyle).toBe("solid");
            expect(line.borderInlineStartWidth).toBe("2px");
            expect(line.borderInlineStartColor).toBe(colorOf("var(--cpd-color-border-interactive-primary)", quote));
            expect([line.top, line.left]).toEqual(["0px", "0px"]);
            expect(parseFloat(line.height)).toBe(quote.getBoundingClientRect().height);
            const pill = getComputedStyle(document.documentElement).getPropertyValue("--tl-radius-control").trim();
            expect(pill).not.toBe("");
            expect([
                line.borderTopLeftRadius,
                line.borderTopRightRadius,
                line.borderBottomRightRadius,
                line.borderBottomLeftRadius,
            ]).toEqual([pill, pill, pill, pill]);
            expect(getComputedStyle(quote).borderLeftStyle).toBe("none");
            expect(textInset(quote)).toBe(12);
        });

        it("keeps the 12px space under a quote", () => {
            const [quote] = renderQuote("<blockquote><p>Desks are numbered by team.</p></blockquote><p>Thanks!</p>");

            expect(getComputedStyle(quote).marginBottom).toBe("12px");
            expect(getComputedStyle(quote).paddingBlock).toBe("0px");
        });

        it("draws one line per level of a nested quote", () => {
            const [outer, inner] = renderQuote(
                "<blockquote><p>Did you see the plan?</p><blockquote><p>The fifth floor is ready.</p></blockquote></blockquote>",
            );

            expect(inner.getBoundingClientRect().left - outer.getBoundingClientRect().left).toBe(12);
            expect(getComputedStyle(inner, "::before").left).toBe("0px");
            expect(textInset(inner)).toBe(12);
        });

        it("puts the line on the right in right-to-left text", () => {
            const [quote] = renderQuote(
                "<p>הקומה החמישית נפתחת ביום שני.</p><blockquote><p>השולחנות ממוספרים לפי צוות.</p></blockquote>",
            );
            const line = getComputedStyle(quote, "::before");

            expect(getComputedStyle(quote).direction).toBe("rtl");
            expect([line.right, line.borderRightWidth, line.borderLeftWidth]).toEqual(["0px", "2px", "0px"]);
            expect(textInset(quote)).toBe(12);
        });

        it("keeps the line in forced colors", async () => {
            const [quote] = renderQuote("<blockquote><p>Desks are numbered by team.</p></blockquote>");
            const session = cdp() as CDPSession;
            await session.send("Emulation.setEmulatedMedia", {
                features: [{ name: "forced-colors", value: "active" }],
            });

            try {
                expect(matchMedia("(forced-colors: active)").matches).toBe(true);
                const line = getComputedStyle(quote, "::before");
                expect(line.borderInlineStartWidth).toBe("2px");
                expect(line.borderInlineStartColor).toBe(colorOf("CanvasText", quote));
            } finally {
                await session.send("Emulation.setEmulatedMedia", { features: [] });
            }
        });
    });
});
