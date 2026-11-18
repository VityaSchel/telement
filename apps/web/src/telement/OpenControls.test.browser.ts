/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar, AvatarStack, IconButton } from "@vector-im/compound-web";
import {
    AttachmentIcon,
    InfoIcon,
    ReactionIcon,
    VideoCallIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundDarkTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-base.css?raw";
import compoundDarkSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-semantic.css?raw";
import compoundLightHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-base.css?raw";
import compoundLightHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-hc-semantic.css?raw";
import compoundDarkHcTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-hc-base.css?raw";
import compoundDarkHcSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-dark-hc-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import emojiButtonStyles from "../../res/css/views/rooms/_EmojiButton.pcss?raw";
import messageComposerStyles from "../../res/css/views/rooms/_MessageComposer.pcss?raw";
import roomHeaderStyles from "../../res/css/views/rooms/_RoomHeader.pcss?raw";
import telegramComposerStyles from "../../res/css/telement/_TelegramComposer.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import lightHighContrastTheme from "../../res/themes/light-high-contrast/css/_light-high-contrast.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { settledStyle, tokenColor } from "../test/telement/computedStyle";

/**
 * Each theme's class with the theme stylesheets it is built from, in the order its entry point imports them. Dark high
 * contrast is the dark theme on a system that asks for more contrast.
 */
const THEMES: [string, string[]][] = [
    ["cpd-theme-light", [lightTheme]],
    ["cpd-theme-dark", [lightTheme, darkTheme]],
    ["cpd-theme-light-hc", [lightTheme, lightHighContrastTheme]],
    ["cpd-theme-dark-hc", [lightTheme, darkTheme]],
];

const APP_STYLES = [roomHeaderStyles, messageComposerStyles, emojiButtonStyles, telegramComposerStyles].join("\n");

const TRANSPARENT = "rgba(0, 0, 0, 0)";
const h = createElement;
const markup = renderToStaticMarkup;

let stylesheet: HTMLStyleElement;

beforeAll(() => {
    // Each theme's variables apply within its own class, as each theme is a separate stylesheet in the app
    const themed = THEMES.map(
        ([theme, sources]) => `.${theme} { ${toBrowserCss(APP_STYLES, commonStyles, fontSizes, ...sources)} }`,
    ).join("\n");
    stylesheet = document.createElement("style");
    stylesheet.textContent = `
        @layer compound-tokens, compound-web, shared-components, app-web;
        @layer compound-tokens {
            ${compoundBase} ${compoundSemantic}
            ${compoundLightTheme} ${compoundLightSemantic} ${compoundDarkTheme} ${compoundDarkSemantic}
            ${compoundLightHcTheme} ${compoundLightHcSemantic} ${compoundDarkHcTheme} ${compoundDarkHcSemantic}
        }
        @layer compound-web { ${compoundStyles} }
        @layer shared-components { ${telementTokens} }
        @layer app-web {
            body { margin: 0; }
            ${themed}
        }
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

/** Renders `html` in a container of the theme, which is returned. */
function render(theme: string, html: string): HTMLElement {
    const container = document.createElement("div");
    container.className = theme;
    container.style.font = "var(--cpd-font-body-md-regular)";
    container.innerHTML = html;
    document.body.append(container);
    return container;
}

function byLabel(label: string): HTMLElement {
    return document.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
}

/** The color a button's glyph is painted in: the fill its paths end up with. */
function glyphColor(button: Element): string {
    return getComputedStyle(button.querySelector("svg path")!).fill;
}

/**
 * The room header's controls whose panel, call or menu is open: room info with its card open, the video call button
 * with its menu of call types open, and the face pile with the member list open. Then the composer's paperclip and
 * emoji buttons with their menu and drawer open.
 */
function openControls(): string {
    const facePile = `
        <div class="mx_AccessibleButton mx_FacePile mx_FacePile_toggled" role="button" aria-label="3 members">
            ${markup(
                h(
                    AvatarStack,
                    null,
                    ["a", "b", "c"].map((name) => h(Avatar, { key: name, id: name, name, size: "20px" })),
                ),
            )}
            3
        </div>`;
    return `
        <header class="mx_RoomHeader" style="display: flex; align-items: center; gap: 12px">
            ${markup(h(IconButton, { "aria-label": "Room info" }, h(InfoIcon, { className: "mx_RoomHeader_toggled" })))}
            ${markup(
                h(
                    IconButton,
                    { "aria-label": "Video call", "aria-haspopup": "menu", "aria-expanded": true },
                    h(VideoCallIcon),
                ),
            )}
            ${facePile}
        </header>
        <div class="mx_MessageComposer">
            <div class="mx_MessageComposer_row" style="display: flex">
                ${markup(
                    h(
                        IconButton,
                        {
                            "className": "mx_TelementAttachButton",
                            "size": "36px",
                            "aria-label": "Attachment",
                            "aria-haspopup": "menu",
                            "aria-expanded": true,
                        },
                        h(AttachmentIcon),
                    ),
                )}
                <div class="mx_AccessibleButton mx_MessageComposer_button mx_EmojiButton_highlight" role="button"
                    aria-label="Emoji">${markup(h(ReactionIcon))}</div>
            </div>
        </div>
    `;
}

describe.each(THEMES.map(([theme]) => theme))("Controls whose panel, call, menu or drawer is open in %s", (theme) => {
    it("draw their glyph, or the face pile its count, in the accent, with no fill of their own", () => {
        const container = render(theme, openControls());
        const accent = tokenColor("--cpd-color-icon-accent-primary", container);
        const header = document.querySelector<HTMLElement>(".mx_RoomHeader")!;
        const pile = byLabel("3 members");

        for (const label of ["Room info", "Video call", "Attachment", "Emoji"]) {
            expect([label, settledStyle(byLabel(label)).backgroundColor, glyphColor(byLabel(label))]).toEqual([
                label,
                TRANSPARENT,
                accent,
            ]);
        }
        // The face pile's own background is the header's
        expect(getComputedStyle(pile).backgroundColor).toBe(getComputedStyle(header).backgroundColor);
        expect(getComputedStyle(pile).color).toBe(tokenColor("--cpd-color-text-action-accent", container));
        expect(getComputedStyle(pile).color).toBe(accent);
    });

    it("keep the accent on the gray hover fill when hovered", async () => {
        const container = render(theme, openControls());
        const accent = tokenColor("--cpd-color-icon-accent-primary", container);
        const hover = tokenColor("--cpd-color-bg-subtle-primary", container);

        for (const label of ["Room info", "Video call", "Attachment", "Emoji"]) {
            await userEvent.hover(byLabel(label));
            expect([label, settledStyle(byLabel(label)).backgroundColor, glyphColor(byLabel(label))]).toEqual([
                label,
                hover,
                accent,
            ]);
        }
        await userEvent.hover(byLabel("3 members"));
        expect(getComputedStyle(byLabel("3 members")).backgroundColor).toBe(hover);
        expect(getComputedStyle(byLabel("3 members")).color).toBe(accent);
    });
});
