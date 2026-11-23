/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type Element as ParserElement } from "html-react-parser";

const LANGUAGE_CLASS_PREFIX = "language-";

/**
 * The language a code block names: the info string of its Markdown fence (```ts), which formatted bodies carry as a
 * `language-…` class on the block's `code`, as the Matrix spec recommends.
 * @param preNode - The block's `pre` element.
 * @returns The language as it was written, or undefined when the block names none.
 */
export function getCodeBlockLanguage(preNode: ParserElement): string | undefined {
    const code = preNode.children.find(
        (child): child is ParserElement => child.type === "tag" && child.tagName.toLowerCase() === "code",
    );
    const languageClass = code?.attribs.class
        ?.split(/\s+/)
        .find((name) => name.startsWith(LANGUAGE_CLASS_PREFIX) && name.length > LANGUAGE_CLASS_PREFIX.length);
    return languageClass?.slice(LANGUAGE_CLASS_PREFIX.length);
}
