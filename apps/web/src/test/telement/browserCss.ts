/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

interface Mixin {
    parameters: string[];
    body: string;
}

const VARIABLE_DEFINITION = /^\s*\$([\w-]+):\s*([^;]+);[ \t]*(?:\/\*.*?\*\/)?[ \t]*$/gm;

/** Splits a comma-separated list, leaving commas inside parentheses alone. */
function splitList(list: string): string[] {
    const items: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < list.length; i++) {
        if (list[i] === "(") depth++;
        else if (list[i] === ")") depth--;
        else if (list[i] === "," && depth === 0) {
            items.push(list.slice(start, i).trim());
            start = i + 1;
        }
    }
    items.push(list.slice(start).trim());
    return items.filter(Boolean);
}

function collectMixins(sources: string[]): Map<string, Mixin> {
    const mixins = new Map<string, Mixin>();
    for (const source of sources) {
        for (const match of source.matchAll(/@define-mixin\s+([\w-]+)\s*([^{]*)\{/g)) {
            let depth = 1;
            let end = match.index + match[0].length;
            for (; depth > 0; end++) {
                if (source[end] === "{") depth++;
                else if (source[end] === "}") depth--;
            }
            mixins.set(match[1], {
                parameters: splitList(match[2]),
                body: source.slice(match.index + match[0].length, end - 1),
            });
        }
    }
    return mixins;
}

function substitute(text: string, variables: Map<string, string>): string {
    return text.replace(/\$([\w-]+)/g, (variable, name: string) => {
        const value = variables.get(name);
        return value === undefined ? variable : substitute(value, variables);
    });
}

/**
 * Turns an app stylesheet into CSS a browser test can load: `@mixin`s are expanded and `$variables` substituted, from
 * the stylesheet's own definitions and those of `sources` (such as `_common.pcss` or a theme). The browser does the
 * nesting, and drops whatever else postcss would have handled.
 */
export function toBrowserCss(pcss: string, ...sources: string[]): string {
    const mixins = collectMixins(sources);
    const expanded = pcss.replace(/@mixin\s+([\w-]+)\s*([^;]*);/g, (call, name: string, list: string) => {
        const mixin = mixins.get(name);
        if (!mixin) return call;
        const values = splitList(list);
        const parameters = new Map(mixin.parameters.map((parameter, i) => [parameter.slice(1), values[i]]));
        return substitute(mixin.body, parameters);
    });

    const variables = new Map<string, string>();
    for (const source of [...sources, pcss]) {
        for (const [, name, value] of source.matchAll(VARIABLE_DEFINITION)) variables.set(name, value.trim());
    }
    return substitute(expanded.replace(VARIABLE_DEFINITION, ""), variables);
}

/**
 * The horizontal and vertical radius of the element's top left corner as drawn, after percentages are resolved and the
 * browser scales radii that don't fit the box, rounded to 0.01px. A pill gives half its height for both, an ellipse
 * gives a wider horizontal radius.
 */
export function cornerRadii(element: Element): { x: number; y: number } {
    const { width, height } = element.getBoundingClientRect();
    const [horizontal, vertical = horizontal] = getComputedStyle(element).borderTopLeftRadius.split(" ");
    const resolve = (radius: string, side: number): number =>
        radius.endsWith("%") ? (parseFloat(radius) / 100) * side : parseFloat(radius);
    const x = resolve(horizontal, width);
    const y = resolve(vertical, height);
    const scale = Math.min(1, width / (2 * x), height / (2 * y));
    const round = (radius: number): number => Math.round(radius * scale * 100) / 100;
    return { x: round(x), y: round(y) };
}
