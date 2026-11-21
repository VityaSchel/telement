/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import accessibleButtonStyles from "../../res/css/views/elements/_AccessibleButton.pcss?raw";
import externalLinkStyles from "../../res/css/views/elements/_ExternalLink.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import themeMods from "../../res/themes/light/css/_mods.pcss?raw";
import ExternalLink from "../components/views/elements/ExternalLink";
import { toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";
import { loadInter } from "../test/telement/fonts";

/** Each theme's class with the theme stylesheets it is built from, in the order its entry point imports them. */
const THEMES: [string, string[]][] = [
    ["cpd-theme-light", [lightTheme]],
    ["cpd-theme-dark", [lightTheme, darkTheme]],
];

/** In the order the theme's entry point imports them: the theme's link rule, then the components. */
const APP_STYLES = [commonStyles, themeMods, accessibleButtonStyles, externalLinkStyles];

let stylesheet: HTMLStyleElement;
let removeInter: () => void;

beforeAll(async () => {
    removeInter = await loadInter();
    const themed = THEMES.map(
        ([theme, sources]) =>
            `.${theme} { ${APP_STYLES.map((styles) => toBrowserCss(styles, ...sources, commonStyles, fontSizes)).join("\n")} }`,
    ).join("\n");
    stylesheet = document.createElement("style");
    stylesheet.textContent = `
        @layer compound-tokens, compound-web, shared-components, app-web;
        @layer compound-tokens {
            ${compoundBase} ${compoundSemantic}
            ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
        }
        @layer compound-web { ${compoundStyles} }
        @layer shared-components { ${telementTokens} }
        @layer app-web { ${themed} }
    `;
    document.head.append(stylesheet);
});

afterAll(() => {
    stylesheet.remove();
    removeInter();
});

afterEach(() => {
    document.body.innerHTML = "";
});

/** A link that stays in the app, as AccessibleButton draws one of its link kinds. */
const inAppLink = (kind: "link_inline" | "danger_inline" | "content_inline" | "link"): string =>
    `<div class="mx_AccessibleButton mx_AccessibleButton_hasKind mx_AccessibleButton_kind_${kind}" role="button"
        tabindex="0">click here</div>`;

const leavingLink = renderToStaticMarkup(createElement(ExternalLink, { href: "https://example.org/" }, "here"));

describe.each(THEMES.map(([theme]) => theme))("Inline links in %s", (theme) => {
    function render(html: string, weight = "var(--cpd-font-weight-regular)"): HTMLElement {
        const container = document.createElement("div");
        container.className = theme;
        container.innerHTML = `<div style="font-weight: ${weight}">To see them, ${html}.</div>`;
        document.body.append(container);
        return container;
    }

    it("draws a link in a sentence regular, underlined and in the accent, whether it stays in the app or leaves it", () => {
        const container = render(`${inAppLink("link_inline")} or ${leavingLink}`);
        const [inApp, leaving] = [
            container.querySelector<HTMLElement>(".mx_AccessibleButton")!,
            container.querySelector<HTMLElement>(".mx_ExternalLink")!,
        ];
        const accent = tokenColor("--cpd-color-text-action-accent", container);

        for (const link of [inApp, leaving]) {
            const style = getComputedStyle(link);
            expect([style.fontWeight, style.textDecorationLine, style.color]).toEqual(["400", "underline", accent]);
        }
        expect(inApp.querySelector("svg")).toBeNull();
        expect(leaving.querySelector("svg.mx_ExternalLink_icon")).not.toBeNull();
    });

    it("keeps the weight of the sentence a link is in, like any link", () => {
        const container = render(`${inAppLink("link_inline")} or ${leavingLink}`, "var(--cpd-font-weight-semibold)");

        for (const link of container.querySelectorAll<HTMLElement>(".mx_AccessibleButton, .mx_ExternalLink")) {
            expect(getComputedStyle(link).fontWeight).toBe("600");
        }
    });

    it("draws the red and the text-colored links in a sentence the same way", () => {
        const container = render(`${inAppLink("danger_inline")} or ${inAppLink("content_inline")}`);

        for (const link of container.querySelectorAll<HTMLElement>(".mx_AccessibleButton")) {
            const style = getComputedStyle(link);
            expect([style.fontWeight, style.textDecorationLine]).toEqual(["400", "underline"]);
        }
    });

    it("keeps a link that stands on its own a semibold text button without the underline", () => {
        const container = render(inAppLink("link"));
        const style = getComputedStyle(container.querySelector(".mx_AccessibleButton")!);

        expect([style.fontWeight, style.textDecorationLine]).toEqual(["600", "none"]);
    });

    it("keeps a leaving link's icon on the line of its last word when the line ends with the word", () => {
        const container = document.createElement("div");
        container.className = theme;
        container.innerHTML = `<div id="text" style="font: var(--cpd-font-body-md-regular); font-family: Inter">${renderToStaticMarkup(
            createElement(ExternalLink, { href: "https://example.org/" }, "Apache 2.0"),
        )}</div>`;
        document.body.append(container);
        const text = container.querySelector<HTMLElement>("#text")!;
        const link = container.querySelector<HTMLElement>(".mx_ExternalLink")!;
        // As wide as the link's text, so that only the icon doesn't fit on its line
        const range = document.createRange();
        range.selectNodeContents(link.firstChild!);
        text.style.width = `${Math.ceil(range.getBoundingClientRect().width) + 1}px`;

        const icon = link.querySelector("svg")!.getBoundingClientRect();
        const lines = [...range.getClientRects()];
        const lastLine = lines[lines.length - 1];
        expect(icon.top).toBeGreaterThanOrEqual(lastLine.top);
        expect(icon.bottom).toBeLessThanOrEqual(lastLine.bottom);
        expect(icon.left).toBeGreaterThan(lastLine.right);
    });
});
