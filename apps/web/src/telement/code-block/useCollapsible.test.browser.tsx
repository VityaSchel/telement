/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useState } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import githubMarkdown from "github-markdown-css/github-markdown-light.css?raw";

import commonStyles from "../../../res/css/_common.pcss?raw";
import fontSizes from "../../../res/css/_font-sizes.pcss?raw";
import eventTileStyles from "../../../res/css/views/rooms/_EventTile.pcss?raw";
import lightTheme from "../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../test/telement/browserCss";
import { useCollapsible } from "./useCollapsible";

/** The viewport of every browser test, in which a collapsed block shows 30% of 720px, 216px, of code. */
const VIEWPORT = [960, 720] as const;

/** A code block's `pre` as CodeBlock renders it, in 22px lines, which says in a data attribute if it is collapsible. */
function Block({ lines, expanded }: { lines: number; expanded: boolean }): JSX.Element {
    const [pre, setPre] = useState<HTMLPreElement | null>(null);
    const collapsible = useCollapsible(pre);
    return (
        <div className="mx_EventTile_content">
            <div className="mx_EventTile_body markdown-body">
                <div className="mx_EventTile_pre_container">
                    <pre
                        ref={setPre}
                        className={expanded ? undefined : "mx_EventTile_collapsedCodeBlock"}
                        style={{ lineHeight: "22px" }}
                        data-collapsible={collapsible}
                    >
                        <code>{"pnpm install\n".repeat(lines)}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
}

let stylesheet: HTMLStyleElement;
let root: Root | undefined;

function render(lines: number, expanded = false): HTMLElement {
    document.body.innerHTML = '<div style="--cpd-space-3x: 12px"></div>';
    root = createRoot(document.body.firstElementChild!);
    flushSync(() => root!.render(<Block lines={lines} expanded={expanded} />));
    return document.querySelector("pre")!;
}

const isCollapsible = (pre: HTMLElement): boolean => pre.dataset.collapsible === "true";

describe("useCollapsible", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            ${githubMarkdown}
            ${toBrowserCss(eventTileStyles, commonStyles, fontSizes, lightTheme)}
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(async () => {
        root?.unmount();
        root = undefined;
        document.body.innerHTML = "";
        await page.viewport(...VIEWPORT);
    });

    it.each([
        [1, false],
        [4, false],
        [5, false],
        // 9 lines of 22px fit in 216px, though the code ends in a newline, which is no line of its own
        [9, false],
        [10, true],
        [30, true],
    ])("says whether a collapsed block of %i lines hides any: %s", async (lines, collapsible) => {
        const pre = render(lines);

        await vi.waitFor(() => expect(isCollapsible(pre)).toBe(collapsible));
        // What the stylesheet really hides
        expect(pre.scrollHeight > pre.clientHeight).toBe(collapsible);
    });

    it.each([
        [9, false],
        [10, true],
    ])("says whether an expanded block of %i lines would hide any if collapsed: %s", async (lines, collapsible) => {
        const pre = render(lines, true);

        await vi.waitFor(() => expect(isCollapsible(pre)).toBe(collapsible));
        expect(pre.scrollHeight).toBe(pre.clientHeight);
    });

    it.each([
        ["collapsed", false],
        ["expanded", true],
    ])("follows the window's height in a %s block, as it decides how many lines a block shows", async (_, expanded) => {
        const pre = render(6, expanded);
        await vi.waitFor(() => expect(isCollapsible(pre)).toBe(false));

        // 30% of 400px, 120px, shows 5 of the 6 lines
        await page.viewport(VIEWPORT[0], 400);
        await vi.waitFor(() => expect(isCollapsible(pre)).toBe(true));

        await page.viewport(...VIEWPORT);
        await vi.waitFor(() => expect(isCollapsible(pre)).toBe(false));
    });

    it("follows the code, as when the message is edited", async () => {
        const pre = render(4);
        await vi.waitFor(() => expect(isCollapsible(pre)).toBe(false));

        flushSync(() => root!.render(<Block lines={12} expanded={false} />));

        await vi.waitFor(() => expect(isCollapsible(pre)).toBe(true));
    });
});
