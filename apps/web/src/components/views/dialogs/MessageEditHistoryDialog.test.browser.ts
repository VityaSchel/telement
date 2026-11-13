/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "@vector-im/compound-web";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package's built bundle needs Node's `process`, so ActionBarView's DOM is written out below and its stylesheets
// are loaded from source, with their local class names
// eslint-disable-next-line no-restricted-imports
import flexStyles from "../../../../../../packages/shared-components/src/core/utils/Flex/Flex.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import actionBarStyles from "../../../../../../packages/shared-components/src/room/timeline/event-tile/actions/ActionBarView/ActionBarView.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import editHistoryStyles from "../../../../res/css/views/dialogs/_MessageEditHistoryDialog.pcss?raw";
import threadActionBarStyles from "../../../../res/css/views/messages/_ThreadActionBar.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { cornerRadii, toBrowserCss } from "../../../test/telement/browserCss";
import { loadInter } from "../../../test/telement/fonts";

/** EditHistoryMessage's action bar (ActionBarView with label buttons), as EditHistoryActionBarViewModel sets it up. */
function actionBar(): string {
    const dataAttributes = { "data-presentation": "label" };
    const buttons = ["Remove", "View source"]
        .map((label) =>
            renderToStaticMarkup(
                createElement(
                    Button,
                    {
                        "kind": "tertiary",
                        "size": "md",
                        "className": "toolbar_item",
                        "aria-label": label,
                        ...dataAttributes,
                    },
                    label,
                ),
            ),
        )
        .join("");
    const flex =
        "--mx-flex-display: inline-flex; --mx-flex-direction: row; --mx-flex-align: start; " +
        "--mx-flex-justify: start; --mx-flex-gap: 0; --mx-flex-wrap: nowrap;";
    return `
        <div class="flex mx_ThreadActionBar mx_HistoryActionBar toolbar" role="toolbar" aria-label="Message actions"
            style="${flex}">${buttons}</div>
    `;
}

/** One edit in the dialog's list, as EditHistoryMessage renders it. */
function render(): void {
    document.body.innerHTML = `
        <div class="cpd-theme-light" style="position: relative; width: 600px; padding-top: 48px">
            <ul class="mx_MessageEditHistoryDialog_edits">
                <li>
                    <div class="mx_EventTile">
                        <div class="mx_EventTile_line">
                            <a class="mx_MessageTimestamp">12:36</a>
                            <div class="mx_EventTile_content">Hello there, world</div>
                            ${actionBar()}
                        </div>
                    </div>
                </li>
            </ul>
        </div>
    `;
}

function element(selector: string): HTMLElement {
    return document.querySelector<HTMLElement>(selector)!;
}

let stylesheet: HTMLStyleElement;
let unloadInter: () => void;

describe("MessageEditHistoryDialog styles", () => {
    beforeAll(async () => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} ${flexStyles} ${actionBarStyles} }
            @layer app-web {
                ${threadActionBarStyles}
                ${toBrowserCss(editHistoryStyles, lightTheme)}
            }
        `;
        document.head.append(stylesheet);
        // Text is measured to the half pixel, so with the app's font rather than whatever the system falls back to
        unloadInter = await loadInter();
    });

    afterAll(() => {
        stylesheet.remove();
        unloadInter();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("rounds an edit's action bar as a pill around its pill buttons, as in the timeline", () => {
        render();

        const bar = element(".mx_HistoryActionBar");
        const button = element('.mx_HistoryActionBar [data-presentation="label"]');
        const barHeight = bar.getBoundingClientRect().height;
        expect(cornerRadii(bar)).toEqual({ x: barHeight / 2, y: barHeight / 2 });
        // Concentric: the bar's radius is the button's plus the space and the border between them
        const inset = parseFloat(getComputedStyle(button).marginTop) + parseFloat(getComputedStyle(bar).borderTopWidth);
        expect(cornerRadii(bar).x).toBe(cornerRadii(button).x + inset);
    });

    it("makes the label buttons as tall as icon buttons, so the bar is the 36px that sits it above the edit", () => {
        render();

        for (const button of document.querySelectorAll('.mx_HistoryActionBar [data-presentation="label"]')) {
            expect(button.getBoundingClientRect().height).toBe(28);
        }
        const bar = element(".mx_HistoryActionBar");
        expect(bar.getBoundingClientRect().height).toBe(-parseFloat(getComputedStyle(bar).top));
    });

    it("centers the labels vertically in their buttons", () => {
        render();

        for (const button of document.querySelectorAll('.mx_HistoryActionBar [data-presentation="label"]')) {
            const range = document.createRange();
            range.selectNodeContents(button);
            const text = range.getBoundingClientRect();
            const box = button.getBoundingClientRect();
            expect(Math.abs(text.top + text.height / 2 - (box.top + box.height / 2))).toBeLessThanOrEqual(0.25);
        }
    });
});
