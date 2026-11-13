/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import githubMarkdown from "github-markdown-css/github-markdown-light.css?raw";

// The package's built bundle needs Node's `process`, so the reply's DOM is written out below and its stylesheet is
// loaded from source
// eslint-disable-next-line no-restricted-imports
import replyTileStyles from "../../../../packages/shared-components/src/room/timeline/event-tile/EventTileView/ReplyTileView/ReplyTileView.module.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import eventTileStyles from "../../res/css/views/rooms/_EventTile.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";

/** A CSS module's stylesheet with its class names prefixed by the module's name, as the library build names them. */
function moduleStyles(css: string, name: string): string {
    return css.replace(
        /:global\(([^)]*)\)|\.(?=[a-z_])([\w-]+)/gi,
        (_, global, local) => global ?? `.${name}_${local}`,
    );
}

/** A message that is only a code block, as CodeBlock renders it, quoted by ReplyTileView in a reply. */
function render(quoteClass: string): void {
    document.body.innerHTML = `
        <div class="cpd-theme-light" style="display: flow-root; width: 480px">
            <blockquote class="${quoteClass}" style="margin: 0">
                <div class="ReplyTileView_body">
                    <div class="mx_EventTile_content">
                        <div class="mx_EventTile_body markdown-body" dir="auto">
                            <div class="mx_EventTile_pre_container">
                                <pre class="mx_EventTile_collapsedCodeBlock"><div style="display: contents"><code>pnpm install
pnpm i18n
pnpm lint:fmt:fix
</code></div></pre>
                            </div>
                        </div>
                    </div>
                </div>
            </blockquote>
            <p id="after" style="margin: 0">Run them in this order</p>
        </div>
    `;
}

let stylesheet: HTMLStyleElement;

describe("A code block quoted in a reply", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            @layer shared-components {
                ${telementTokens}
                ${moduleStyles(replyTileStyles, "ReplyTileView")}
            }
            @layer app-web {
                ${githubMarkdown}
                ${toBrowserCss(eventTileStyles, commonStyles, fontSizes, lightTheme)}
            }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it.each([
        ["a message's reply quote", "mx_ReplyChain"],
        ["an expanded reply quote", "mx_ReplyChain mx_ReplyChain--expanded"],
        ["the composer's reply preview", "mx_ReplyPreview"],
    ])("in %s keeps the reply tile's 4px below it, not github-markdown-css's 16px", (_, quoteClass) => {
        render(quoteClass);

        const pre = document.querySelector("pre")!;
        expect(getComputedStyle(pre).marginBlockEnd).toBe("4px");
        expect(document.getElementById("after")!.getBoundingClientRect().top - pre.getBoundingClientRect().bottom).toBe(
            4,
        );
    });
});
