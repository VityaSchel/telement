/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { type Element as ParserElement, htmlToDOM } from "html-react-parser";

import CodeBlock from "./CodeBlock";
import { type ScrollEdges } from "../../../telement/code-block/useScrollEdges";

const { layout } = vi.hoisted(() => ({
    layout: { edges: { hiddenAtStart: false, hiddenAtEnd: false }, collapsible: false },
}));

// Layout decides which code a block hides, which happy-dom doesn't do, so the hooks say what a test needs
vi.mock("../../../telement/code-block/useScrollEdges", () => ({
    useScrollEdges: (): ScrollEdges => layout.edges,
}));
vi.mock("../../../telement/code-block/useCollapsible", () => ({
    useCollapsible: (): boolean => layout.collapsible,
}));

function renderBlock(code = 'const accent = "#2481cc";\n'): HTMLElement {
    const [pre] = htmlToDOM(`<pre><code class="language-ts">${code}</code></pre>`) as ParserElement[];
    const { container } = render(<CodeBlock preNode={pre} />);
    return container.querySelector("pre")!;
}

describe("CodeBlock", () => {
    beforeEach(() => {
        layout.edges = { hiddenAtStart: false, hiddenAtEnd: false };
        layout.collapsible = false;
    });

    it.each<[string, ScrollEdges, string[]]>([
        ["no side", { hiddenAtStart: false, hiddenAtEnd: false }, []],
        ["its end", { hiddenAtStart: false, hiddenAtEnd: true }, ["mx_EventTile_codeBlock_hiddenAtEnd"]],
        ["its start", { hiddenAtStart: true, hiddenAtEnd: false }, ["mx_EventTile_codeBlock_hiddenAtStart"]],
        [
            "both sides",
            { hiddenAtStart: true, hiddenAtEnd: true },
            ["mx_EventTile_codeBlock_hiddenAtStart", "mx_EventTile_codeBlock_hiddenAtEnd"],
        ],
    ])("marks the code as hidden on %s, for the side to fade out", (_, scrollEdges, classes) => {
        layout.edges = scrollEdges;
        const pre = renderBlock();

        for (const side of ["Start", "End"]) {
            const name = `mx_EventTile_codeBlock_hiddenAt${side}`;
            expect(pre.classList.contains(name)).toBe(classes.includes(name));
        }
    });

    it.each([4, 5, 9])("has nothing to expand in a block of %i lines that hides none of them", (lines) => {
        renderBlock("pnpm install\n".repeat(lines));

        expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Expand" })).not.toBeInTheDocument();
    });

    it("expands and collapses a block that hides lines while it is collapsed, however many it has", async () => {
        layout.collapsible = true;
        const pre = renderBlock("pnpm install\n".repeat(3));
        expect(pre).toHaveClass("mx_EventTile_collapsedCodeBlock");

        await userEvent.click(screen.getByRole("button", { name: "Expand" }));
        expect(pre).not.toHaveClass("mx_EventTile_collapsedCodeBlock");

        await userEvent.click(screen.getByRole("button", { name: "Collapse" }));
        expect(pre).toHaveClass("mx_EventTile_collapsedCodeBlock");
    });

    it("draws the expand button as the copy button beside it, so that their icons have the same color", async () => {
        layout.collapsible = true;
        renderBlock("pnpm install\n".repeat(12));
        const look = (name: string): (string | null)[] => {
            const button = screen.getByRole("button", { name });
            const icon = button.querySelector("svg")!;
            return [
                button.getAttribute("data-kind"),
                button.getAttribute("style"),
                button.className.replace(" mx_EventTile_copyButton", ""),
                icon.parentElement!.className,
                icon.getAttribute("fill"),
            ];
        };

        expect(look("Expand")).toEqual(look("Copy"));
        await userEvent.click(screen.getByRole("button", { name: "Expand" }));
        expect(look("Collapse")).toEqual(look("Copy"));
    });
});
