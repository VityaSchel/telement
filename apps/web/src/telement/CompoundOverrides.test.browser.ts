/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import {
    Avatar,
    Button,
    IconButton,
    Link,
    ReleaseAnnouncement,
    Tooltip,
    TooltipProvider,
} from "@vector-im/compound-web";
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

    it("draws letter avatars as Telegram's gradients with white initials, one for each of Compound's colors", () => {
        // Names that Compound's hash spreads over its six colors
        const names = ["Alice", "Bob", "Charlie", "Dave", "Eve", "Frank", "Grace", "Heidi", "Ivan", "Judy", "Mallory"];
        render(
            names.map((name) => createElement(Avatar, { key: name, id: `@${name}:example.org`, name, size: "48px" })),
        );
        const avatars = [...document.querySelectorAll<HTMLElement>("[data-color]")];
        const colors = new Set(avatars.map((avatar) => avatar.dataset.color));

        expect(colors.size).toBeGreaterThanOrEqual(5);
        for (const avatar of avatars) {
            const style = getComputedStyle(avatar);
            expect(style.backgroundImage).toMatch(/^linear-gradient\(rgb/);
            expect(style.color).toBe("rgb(255, 255, 255)");
            expect(style.borderTopColor).toBe("rgba(0, 0, 0, 0)");
        }
    });

    describe("an avatar whose photo is loading", () => {
        // A 1px transparent GIF, which shows nothing either way
        const photo = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

        /** Bob's avatar with his photo, marked with his letter as Avatar (shared-components) marks it while it loads */
        function renderAvatars(loading: boolean): { withPhoto: HTMLElement; letter: HTMLElement } {
            // Built apart from the calls, which check for data attributes that Compound's props don't list
            const bob = { id: "@bob:example.org", name: "Bob", size: "48px" };
            const withPhoto = { ...bob, "key": "photo", "src": photo, "data-initial": loading ? "B" : undefined };
            const letter = { ...bob, key: "letter" };
            render([
                createElement(Avatar, { ...withPhoto, "data-testid": "with-photo" } as typeof withPhoto),
                createElement(Avatar, { ...letter, "data-testid": "letter" } as typeof letter),
            ]);
            return {
                withPhoto: document.querySelector<HTMLElement>('[data-testid="with-photo"]')!,
                letter: document.querySelector<HTMLElement>('[data-testid="letter"]')!,
            };
        }

        it("shows its letter avatar, as Telegram does, rather than a blank circle", () => {
            const { withPhoto, letter } = renderAvatars(true);
            const style = getComputedStyle(withPhoto);
            const drawnLetter = getComputedStyle(withPhoto, "::before");

            expect(style.backgroundImage).toBe(getComputedStyle(letter).backgroundImage);
            expect(style.color).toBe(getComputedStyle(letter).color);
            expect(drawnLetter.content).toBe('"B"');
            // Where the letter avatar draws its letter: inside its 1px border, in its font and line
            expect([drawnLetter.position, drawnLetter.top, drawnLetter.left]).toEqual(["absolute", "1px", "1px"]);
            for (const property of ["fontSize", "fontWeight", "lineHeight", "textAlign", "textTransform"] as const) {
                expect(drawnLetter[property]).toBe(getComputedStyle(letter)[property]);
            }
            expect(getComputedStyle(withPhoto.querySelector("img")!).visibility).toBe("hidden");
        });

        it("keeps the photo's place and its own size, so nothing moves when the photo shows", () => {
            const { withPhoto, letter } = renderAvatars(true);
            const box = withPhoto.getBoundingClientRect();
            const image = withPhoto.querySelector("img")!.getBoundingClientRect();

            expect([box.width, box.height]).toEqual([48, 48]);
            expect([box.width, box.height]).toEqual([
                letter.getBoundingClientRect().width,
                letter.getBoundingClientRect().height,
            ]);
            // Where it will be seen, so that the browser loads it, lazy as it is
            expect([image.left, image.top, image.width]).toEqual([box.left, box.top, 48]);
        });

        it("shows the photo alone once it has loaded", () => {
            const { withPhoto } = renderAvatars(false);

            expect(getComputedStyle(withPhoto).backgroundImage).toBe("none");
            expect(getComputedStyle(withPhoto, "::before").content).toBe("none");
            expect(getComputedStyle(withPhoto.querySelector("img")!).visibility).toBe("visible");
        });
    });
});
