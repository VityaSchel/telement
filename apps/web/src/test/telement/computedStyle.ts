/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { expect } from "vitest";
import { cdp, userEvent } from "vitest/browser";

/** What a color token resolves to inside `scope`, such as a theme container, as a computed color. */
export function tokenColor(token: string, scope: Element): string {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    scope.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}

/** The computed style once the element's transitions have run. */
export function settledStyle(element: HTMLElement): CSSStyleDeclaration {
    for (const animation of element.getAnimations()) animation.finish();
    return getComputedStyle(element);
}

/** Holds Space on a focused `<button>`, which keeps it `:active` until `[/Space]` releases it. */
export async function press(button: HTMLElement): Promise<CSSStyleDeclaration> {
    button.focus();
    await userEvent.keyboard("[Space>]");
    return settledStyle(button);
}

/**
 * Sends a command over the browser's CDP session. The session's `send` comes from the Playwright provider's types, which
 * only the browser tests' type check loads: in the app's own, they would change the types of the DOM.
 */
function sendCdp(method: string, params: Record<string, unknown>): Promise<unknown> {
    type Session = { send(method: string, params: Record<string, unknown>): Promise<unknown> };
    return (cdp() as unknown as Session).send(method, params);
}

/**
 * Presses or releases the left mouse button over the element's center. Through CDP, because userEvent can only click,
 * which releases the button before the test can look at it. The test runs in an iframe of the page CDP drives.
 */
export async function mouseButton(type: "mousePressed" | "mouseReleased", target: Element): Promise<void> {
    const frame = window.frameElement!.getBoundingClientRect();
    const scale = frame.width / document.documentElement.clientWidth;
    const box = target.getBoundingClientRect();
    const x = frame.left + (box.left + box.width / 2) * scale;
    const y = frame.top + (box.top + box.height / 2) * scale;
    await sendCdp("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await sendCdp("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
}

/** The background of `element`, by default the pressed one itself, while the mouse button is held on `pressed`. */
export async function pressedFill(pressed: HTMLElement, element: HTMLElement = pressed): Promise<string> {
    await mouseButton("mousePressed", pressed);
    try {
        expect(pressed.matches(":active")).toBe(true);
        return settledStyle(element).backgroundColor;
    } finally {
        await mouseButton("mouseReleased", pressed);
    }
}

/** The background of `element`, by default the hovered one itself, while the pointer is on `hovered`. */
export async function hoveredFill(hovered: HTMLElement, element: HTMLElement = hovered): Promise<string> {
    await userEvent.hover(hovered);
    return settledStyle(element).backgroundColor;
}

/** A color's channels, from `rgb()`, `rgba()` or the `color(srgb …)` that `color-mix()` computes to, in 0-255. */
export function colorChannels(color: string): [number, number, number, number] {
    const srgb = color.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/);
    if (srgb) {
        const [red, green, blue] = srgb.slice(1, 4).map((channel) => Number(channel) * 255);
        return [red, green, blue, srgb[4] === undefined ? 1 : Number(srgb[4])];
    }
    const [red, green, blue, alpha = 1] = color.match(/[\d.]+/g)!.map(Number);
    return [red, green, blue, alpha];
}

/** The color `top`, which may be translucent, drawn over the opaque `bottom`. */
export function composite(top: string, bottom: string): [number, number, number] {
    const [red, green, blue, alpha] = colorChannels(top);
    const under = colorChannels(bottom);
    return [red, green, blue].map((channel, i) => channel * alpha + under[i] * (1 - alpha)) as [number, number, number];
}

/** WCAG's contrast ratio between `top` drawn over the opaque `bottom` and `bottom` itself. */
export function contrastOver(top: string, bottom: string): number {
    const luminance = (rgb: number[]): number => {
        const [red, green, blue] = rgb.map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const [lighter, darker] = [luminance(composite(top, bottom)), luminance(colorChannels(bottom))].sort(
        (a, b) => b - a,
    );
    return (lighter + 0.05) / (darker + 0.05);
}
