/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { userEvent } from "vitest/browser";

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
