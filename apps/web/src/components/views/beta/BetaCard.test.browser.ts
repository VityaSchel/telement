/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../../../res/css/_common.pcss?raw";
import fontSizes from "../../../../res/css/_font-sizes.pcss?raw";
import betaCardStyles from "../../../../res/css/views/beta/_BetaCard.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../../../res/themes/dark/css/_dark.pcss?raw";
import lightImage from "../../../../res/img/betas/video_rooms.png";
import darkImage from "../../../../res/img/betas/video_rooms_dark.png";
import { toBrowserCss } from "../../../test/telement/browserCss";

/** Each theme's class with the theme stylesheets it is built from. Dark high contrast is the dark theme's build. */
const THEMES: [string, string[]][] = [
    ["cpd-theme-light", [lightTheme]],
    ["cpd-theme-light-hc", [lightTheme]],
    ["cpd-theme-dark", [lightTheme, darkTheme]],
    ["cpd-theme-dark-hc", [lightTheme, darkTheme]],
];

let stylesheet: HTMLStyleElement;

beforeAll(() => {
    const themed = THEMES.map(
        ([theme, sources]) => `.${theme} { ${toBrowserCss(betaCardStyles, ...sources, commonStyles, fontSizes)} }`,
    ).join("\n");
    stylesheet = document.createElement("style");
    stylesheet.textContent = `
        @layer compound-tokens, shared-components, app-web;
        @layer compound-tokens {
            ${compoundBase} ${compoundSemantic}
            ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
        }
        @layer shared-components { ${telementTokens} }
        @layer app-web { ${themed} }
    `;
    document.head.append(stylesheet);
});

afterAll(() => {
    stylesheet.remove();
});

afterEach(() => {
    document.body.innerHTML = "";
});

/** The illustration column of a beta card, as BetaCard draws it, with or without a dark illustration. */
function render(theme: string, withDark: boolean): HTMLImageElement[] {
    const container = document.createElement("div");
    container.className = theme;
    container.innerHTML = `
        <div class="mx_BetaCard"><div class="mx_BetaCard_columns"><div class="mx_BetaCard_columns_image_wrapper">
            <img class="mx_BetaCard_columns_image" src="${lightImage}" alt="">
            ${withDark ? `<img class="mx_BetaCard_columns_image mx_BetaCard_columns_image_dark" src="${darkImage}" alt="" loading="lazy">` : ""}
        </div></div></div>
    `;
    document.body.append(container);
    return [...container.querySelectorAll("img")];
}

const shown = (images: HTMLImageElement[]): string[] =>
    images.filter((image) => getComputedStyle(image).display !== "none").map((image) => image.getAttribute("src")!);

describe("The beta card's illustration", () => {
    it.each(THEMES.map(([theme]) => theme))("in %s shows the light or the dark one, never both", (theme) => {
        expect(shown(render(theme, true))).toEqual([theme.startsWith("cpd-theme-dark") ? darkImage : lightImage]);
    });

    it.each(THEMES.map(([theme]) => theme))("in %s shows the light one for a beta without a dark one", (theme) => {
        expect(shown(render(theme, false))).toEqual([lightImage]);
    });

    it("draws the dark illustration at the light one's size, so the card keeps its layout", async () => {
        const [light, dark] = [lightImage, darkImage].map((src) => Object.assign(new Image(), { src }));
        await Promise.all([light.decode(), dark.decode()]);

        expect([dark.naturalWidth, dark.naturalHeight]).toEqual([light.naturalWidth, light.naturalHeight]);
    });
});
