/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type Plugin } from "postcss";

/** Writes every character of some CSS that isn't ASCII as its escape, which strings, names and URLs read the same. */
function escapeNonAscii(css: string): string {
    // The space ends the escape, so that a digit or letter after it isn't read as part of it
    return css.replace(/[^\0-\x7f]/gu, (character) => `\\${character.codePointAt(0)!.toString(16)} `);
}

/**
 * A PostCSS plugin that leaves nothing but ASCII in the stylesheets the app ships, so that they read the same whatever
 * encoding they are decoded in. A stylesheet has no encoding of its own: without a charset in its Content-Type it takes
 * the page's, and U+200B, the empty text that gives a box a line of text's baseline, then shows as "â€‹". Escapes in the
 * sources aren't enough, as the shared components' build turns them back into the characters.
 */
export function asciiCss(): Plugin {
    return {
        postcssPlugin: "telement-ascii-css",
        // Once the other plugins are done
        OnceExit(root) {
            root.walk((node) => {
                if (node.type === "decl") {
                    node.prop = escapeNonAscii(node.prop);
                    node.value = escapeNonAscii(node.value);
                } else if (node.type === "rule") {
                    node.selector = escapeNonAscii(node.selector);
                } else if (node.type === "atrule") {
                    node.params = escapeNonAscii(node.params);
                }
            });
        },
    };
}
