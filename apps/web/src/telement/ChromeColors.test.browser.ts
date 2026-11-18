/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OverflowHorizontalIcon, ReactionIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundLightHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-base.css?raw";
import compoundLightHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-semantic.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import kebabContextMenuStyles from "../../res/css/components/views/context_menus/_KebabContextMenu.pcss?raw";
import presenceLabelStyles from "../../res/css/views/rooms/_PresenceLabel.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import lightHighContrastTheme from "../../res/themes/light-high-contrast/css/_light-high-contrast.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { tokenColor } from "../test/telement/computedStyle";

/** Each theme's class with the theme stylesheets it is built from, in the order its entry point imports them. */
const THEMES: [string, string[]][] = [
    ["cpd-theme-light", [lightTheme]],
    ["cpd-theme-dark", [lightTheme, darkTheme]],
    ["cpd-theme-light-hc", [lightTheme, lightHighContrastTheme]],
];

// A button drawn with _common.pcss's icon button mixin, as the composer's buttons call it
const ICON_BUTTON = `
    .iconButton {
        @mixin composerButton 50%, var(--cpd-color-icon-primary), var(--cpd-color-bg-subtle-primary);
    }
`;

const icon = (Icon: typeof ReactionIcon, className?: string): string =>
    renderToStaticMarkup(createElement(Icon, { className }));

let stylesheet: HTMLStyleElement;

describe("Telement's chrome colors", () => {
    beforeAll(() => {
        // Each theme's variables apply within its own class, as each theme is a separate stylesheet in the app
        const themed = THEMES.map(
            ([theme, sources]) => `.${theme} {
                ${toBrowserCss(ICON_BUTTON + kebabContextMenuStyles + presenceLabelStyles, commonStyles, fontSizes, ...sources)}
            }`,
        ).join("\n");
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, shared-components, app-web;
            @layer compound-tokens {
                ${compoundBase} ${compoundSemantic}
                ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
                ${compoundLightHcTheme} ${compoundLightHcSemantic}
            }
            @layer shared-components { ${telementTokens} }
            @layer app-web { ${themed} }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(async () => {
        await userEvent.unhover(document.body);
        document.body.innerHTML = "";
    });

    function render(theme: string, html: string): HTMLElement {
        const container = document.createElement("div");
        container.className = theme;
        container.innerHTML = html;
        document.body.append(container);
        return container;
    }

    describe.each(THEMES.map(([theme]) => theme))("in %s", (theme) => {
        it("draws icon buttons in the secondary icon gray, and the primary one on hover", async () => {
            const container = render(
                theme,
                `<div class="iconButton" role="button" aria-label="Emoji">${icon(ReactionIcon)}</div>`,
            );
            const button = container.querySelector<HTMLElement>(".iconButton")!;
            const glyph = button.querySelector("svg")!;

            expect(getComputedStyle(glyph).color).toBe(tokenColor("--cpd-color-icon-secondary", container));
            await userEvent.hover(button);
            expect(getComputedStyle(glyph).color).toBe(tokenColor("--cpd-color-icon-primary", container));
        });

        it("draws the kebab menu's icon in the same gray", () => {
            const container = render(theme, icon(OverflowHorizontalIcon, "mx_KebabContextMenu_icon"));

            expect(getComputedStyle(container.querySelector("svg")!).color).toBe(
                tokenColor("--cpd-color-icon-secondary", container),
            );
        });

        it("writes the online presence label in the accent", () => {
            const container = render(theme, `<div class="mx_PresenceLabel mx_PresenceLabel_online">Online</div>`);

            expect(getComputedStyle(container.firstElementChild!).color).toBe(
                tokenColor("--cpd-color-text-action-accent", container),
            );
        });
    });
});
