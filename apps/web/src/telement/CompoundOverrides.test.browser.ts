/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { Button, IconButton, Link, ReleaseAnnouncement, Tooltip, TooltipProvider } from "@vector-im/compound-web";
import { OverflowHorizontalIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

import compoundOverrides from "../../res/css/telement/_CompoundOverrides.pcss?raw";

let stylesheet: HTMLStyleElement;
let root: Root | undefined;

/** Renders real Compound components, so the hashed class names are the installed compound-web's. */
function render(node: ReactNode): void {
    const container = document.createElement("div");
    container.className = "cpd-theme-light";
    document.body.append(container);
    root = createRoot(container);
    flushSync(() => root!.render(createElement(TooltipProvider, null, node)));
}

function byText(text: string): HTMLElement {
    return [...document.querySelectorAll<HTMLElement>("button, a")].find((element) => element.textContent === text)!;
}

/** The tooltip labelling the icon button with the given id: the box around the label its aria-labelledby names. */
function tooltipOf(triggerId: string): HTMLElement {
    const trigger = document.getElementById(triggerId)!;
    return document.getElementById(trigger.getAttribute("aria-labelledby")!)!.parentElement!;
}

type Side = "top" | "right" | "bottom" | "left";

function tooltip(label: string, id: string, placement: Side = "bottom"): ReactNode {
    return createElement(
        Tooltip,
        { label, open: true, placement },
        createElement(IconButton, { id }, createElement(OverflowHorizontalIcon)),
    );
}

/** The space between a tooltip and its trigger, on the given side of the trigger. */
function gapOn(side: Side, trigger: DOMRect, box: DOMRect): number {
    return {
        top: trigger.top - box.bottom,
        right: box.left - trigger.right,
        bottom: box.top - trigger.bottom,
        left: trigger.left - box.right,
    }[side];
}

/** Compound's floating arrow: an SVG straight inside the floating box, whatever its hashed class is called. */
function arrowOf(floating: HTMLElement): SVGElement | null {
    return floating.querySelector(":scope > svg");
}

describe("Telement's overrides of Compound", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            @layer compound-web { ${compoundStyles} }
            @layer app-web { ${compoundOverrides} }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        root?.unmount();
        root = undefined;
        document.body.innerHTML = "";
    });

    it("drops the underline from Compound's tertiary buttons only", () => {
        render([
            createElement(Button, { key: "md", kind: "tertiary", size: "md" }, "Tertiary md"),
            createElement(Button, { key: "lg", kind: "tertiary", size: "lg" }, "Tertiary lg"),
            createElement(Button, { key: "red", kind: "tertiary", size: "md", destructive: true }, "Destructive"),
            createElement(Link, { key: "inline", href: "#" }, "Inline link"),
        ]);

        const decorations = Object.fromEntries(
            ["Tertiary md", "Tertiary lg", "Destructive", "Inline link"].map((label) => [
                label,
                getComputedStyle(byText(label)).textDecorationLine,
            ]),
        );
        expect(decorations).toEqual({
            "Tertiary md": "none",
            "Tertiary lg": "none",
            "Destructive": "none",
            "Inline link": "underline",
        });
    });

    it("rounds a one-line tooltip into a pill", () => {
        render(tooltip("Room options", "short"));
        const element = tooltipOf("short");
        const style = getComputedStyle(element);

        expect(parseFloat(style.borderTopLeftRadius)).toBe(element.getBoundingClientRect().height / 2);
        expect(parseFloat(style.borderTopLeftRadius)).toBe(parseFloat(style.lineHeight) / 2 + 6);
    });

    it("keeps a wrapped tooltip a rounded rectangle with the one-line tooltip's corners", () => {
        render(tooltip("A room name that goes on and on. ".repeat(12), "long"));
        const element = tooltipOf("long");
        const style = getComputedStyle(element);
        const lineHeight = parseFloat(style.lineHeight);

        expect(element.getBoundingClientRect().height).toBeGreaterThanOrEqual(2 * lineHeight + 12);
        expect(parseFloat(style.borderTopLeftRadius)).toBe(lineHeight / 2 + 6);
    });

    it.each<Side>(["top", "right", "bottom", "left"])(
        "draws no arrow on a tooltip %s of its trigger, which keeps a 6px gap from it",
        async (side) => {
            // Room on every side, so the tooltip isn't flipped
            render(
                createElement("div", { style: { padding: "80px 160px" } }, tooltip("Room options", "trigger", side)),
            );
            const element = tooltipOf("trigger");
            const trigger = document.getElementById("trigger")!;
            const arrow = arrowOf(element);

            expect(arrow).not.toBeNull();
            expect(arrow!.checkVisibility()).toBe(false);
            // Compound offsets the tooltip by its arrow's height. floating-ui places it after it mounts, on whole
            // pixels, so a tooltip of fractional size lands up to half a pixel off.
            await expect
                .poll(() => gapOn(side, trigger.getBoundingClientRect(), element.getBoundingClientRect()))
                .toSatisfy((gap: number) => Math.abs(gap - 6) <= 0.5);
        },
    );

    it("keeps the arrow of Compound's release announcements", () => {
        render(
            createElement(
                ReleaseAnnouncement,
                {
                    open: true,
                    header: "New look",
                    description: "Chats now look like Telegram's.",
                    closeLabel: "OK",
                    placement: "bottom",
                    onClick: () => {},
                },
                createElement(Button, { kind: "primary" }, "Anchor"),
            ),
        );
        const announcement = [...document.querySelectorAll<HTMLElement>("h3")].find(
            (element) => element.textContent === "New look",
        )!.parentElement!;

        expect(arrowOf(announcement)?.checkVisibility()).toBe(true);
    });
});
