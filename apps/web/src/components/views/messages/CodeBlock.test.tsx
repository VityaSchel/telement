/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "test-utils-rtl";
import { type Element as ParserElement, htmlToDOM } from "html-react-parser";

import CodeBlock from "./CodeBlock";
import { type ScrollEdges } from "../../../telement/code-block/useScrollEdges";

const { edges } = vi.hoisted(() => ({ edges: { current: { hiddenAtStart: false, hiddenAtEnd: false } } }));

// Layout decides which sides of a block hide code, which happy-dom doesn't do, so the hook says what a test needs
vi.mock("../../../telement/code-block/useScrollEdges", () => ({
    useScrollEdges: (): [() => void, ScrollEdges] => [() => {}, edges.current],
}));

function renderBlock(): HTMLElement {
    const [pre] = htmlToDOM(
        '<pre><code class="language-ts">const accent = "#2481cc";\n</code></pre>',
    ) as ParserElement[];
    const { container } = render(<CodeBlock preNode={pre} />);
    return container.querySelector("pre")!;
}

describe("CodeBlock", () => {
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
        edges.current = scrollEdges;
        const pre = renderBlock();

        for (const side of ["Start", "End"]) {
            const name = `mx_EventTile_codeBlock_hiddenAt${side}`;
            expect(pre.classList.contains(name)).toBe(classes.includes(name));
        }
    });
});
