/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, Field, InlineField, Label, RadioControl, Root } from "@vector-im/compound-web";
import { ChevronDownIcon, TakePhotoIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
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
import createRoomDialogStyles from "../../res/css/views/dialogs/_CreateRoomDialog.pcss?raw";
import emptyStateStyles from "../../res/css/views/right_panel/_EmptyState.pcss?raw";
import pinnedMessagesCardStyles from "../../res/css/views/right_panel/_PinnedMessagesCard.pcss?raw";
import userInfoStyles from "../../res/css/views/right_panel/_UserInfo.pcss?raw";
import avatarSettingStyles from "../../res/css/views/settings/_AvatarSetting.pcss?raw";
import imageSizePanelStyles from "../../res/css/views/settings/_ImageSizePanel.pcss?raw";
import layoutSwitcherStyles from "../../res/css/views/settings/_LayoutSwitcher.pcss?raw";
import themeChoicePanelStyles from "../../res/css/views/settings/_ThemeChoicePanel.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import darkTheme from "../../res/themes/dark/css/_dark.pcss?raw";
import lightHighContrastTheme from "../../res/themes/light-high-contrast/css/_light-high-contrast.pcss?raw";
import imageSizeNormal from "../../res/img/element-icons/settings/img-size-normal.svg?raw";
import imageSizeLarge from "../../res/img/element-icons/settings/img-size-large.svg?raw";
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

const APP_STYLES = [
    themeChoicePanelStyles,
    layoutSwitcherStyles,
    imageSizePanelStyles,
    avatarSettingStyles,
    userInfoStyles,
    pinnedMessagesCardStyles,
    createRoomDialogStyles,
    emptyStateStyles,
    // A dialog's surface, raised a gray step in dark themes, as .mx_Dialog is (_common.pcss)
    ".raised { @mixin floatingSurface; }",
].join("\n");

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
function render(theme: string, html: string, dir = "ltr"): HTMLElement {
    const container = document.createElement("div");
    container.className = theme;
    container.dir = dir;
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

/** The theme chips as ThemeChoicePanel renders them, each in the theme it shows, the first one selected. */
function themeChips(): string {
    return markup(
        h(
            Root,
            { className: "mx_ThemeChoicePanel_ThemeSelectors" },
            [
                ["Light", "cpd-theme-light"],
                ["Dark", "cpd-theme-dark"],
            ].map(([name, theme], index) =>
                h(
                    InlineField,
                    {
                        key: name,
                        name: "themeSelector",
                        className: `mx_ThemeChoicePanel_themeSelector ${theme} ${index === 0 ? "mx_ThemeChoicePanel_themeSelector_enabled" : ""}`,
                        control: h(RadioControl, { name: "themeSelector", value: name, defaultChecked: index === 0 }),
                    },
                    h(Label, { className: "mx_ThemeChoicePanel_themeSelector_Label" }, name),
                ),
            ),
        ),
    );
}

/** The layout options as LayoutSwitcher renders them, with message bubbles selected. */
function layoutCards(): string {
    return markup(
        h(
            Root,
            { className: "mx_LayoutSwitcher_LayoutSelector", style: { width: "307px" } },
            ["Modern", "Message bubbles"].map((name) =>
                h(
                    Field,
                    { key: name, name: "layout", className: "mxLayoutSwitcher_LayoutSelector_LayoutRadio" },
                    h(
                        Label,
                        { "aria-label": name },
                        h(
                            "div",
                            { className: "mxLayoutSwitcher_LayoutSelector_LayoutRadio_inline" },
                            h(RadioControl, { name: "layout", value: name, defaultChecked: name !== "Modern" }),
                            h("span", null, name),
                        ),
                        h("hr", { className: "mxLayoutSwitcher_LayoutSelector_LayoutRadio_separator" }),
                        h("div", {
                            className: "mxLayoutSwitcher_LayoutSelector_LayoutRadio_EventTilePreview",
                            style: { height: "40px" },
                        }),
                    ),
                ),
            ),
        ),
    );
}

/** The image size options as ImageSizePanel renders them, with the drawings inline as SVGR inlines them. */
function imageSizeCards(): string {
    const option = (name: string, drawing: string, checked: boolean): string => `
        <label aria-label="${name}">
            ${drawing.replace("<svg ", '<svg class="mx_ImageSizePanel_size" ')}
            <label class="mx_StyledRadioButton">
                <input type="radio" name="image_size" value="${name}" ${checked ? "checked" : ""} />
                <div><div></div></div>
                <div class="mx_StyledRadioButton_content">${name}</div>
            </label>
        </label>`;
    return `<div class="mx_ImageSizePanel_radios">
        ${option("Default", imageSizeNormal, true)}${option("Large", imageSizeLarge, false)}
    </div>`;
}

/** The parts of a color in `rgb()`, `rgba()` or `color(srgb …)` form, its channels from 0 to 255. */
function colorParts(color: string): { rgb: number[]; alpha: number } {
    const srgb = color.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/);
    if (srgb) {
        return {
            rgb: srgb.slice(1, 4).map((channel) => Math.round(Number(channel) * 255)),
            alpha: srgb[4] === undefined ? 1 : Number(srgb[4]),
        };
    }
    const [r, g, b, alpha = 1] = color.match(/[\d.]+/g)!.map(Number);
    return { rgb: [r, g, b], alpha };
}

describe.each(THEMES.map(([theme]) => theme))("Telement's accents in %s", (theme) => {
    describe("settings choices drawn as cards", () => {
        it("ring the selected theme chip in the accent of the theme it shows, the other keeping a field's border", () => {
            render(theme, themeChips());
            const [selected, other] = [...document.querySelectorAll<HTMLElement>(".mx_ThemeChoicePanel_themeSelector")];
            const ring = getComputedStyle(selected);

            expect([ring.outlineStyle, ring.outlineWidth, ring.outlineOffset]).toEqual(["solid", "2px", "-2px"]);
            expect(ring.outlineColor).toBe(tokenColor("--cpd-color-border-accent-primary", selected));
            expect(getComputedStyle(other).outlineStyle).toBe("none");
            expect(getComputedStyle(other).borderTopColor).toBe(
                tokenColor("--cpd-color-border-interactive-secondary", other),
            );
        });

        it("keep what a theme chip holds in place when it is selected", () => {
            render(theme, themeChips());
            const [selected, other] = [...document.querySelectorAll<HTMLElement>(".mx_ThemeChoicePanel_themeSelector")];
            const radioInset = (chip: HTMLElement): number[] => {
                const radio = chip.querySelector("input")!.getBoundingClientRect();
                const box = chip.getBoundingClientRect();
                return [radio.left - box.left, radio.top - box.top];
            };

            expect(radioInset(selected)).toEqual(radioInset(other));
        });

        it("ring the selected layout in the accent, the other keeping a field's border", () => {
            const container = render(theme, layoutCards());
            const [modern, bubbles] = [
                ...document.querySelectorAll<HTMLElement>(".mxLayoutSwitcher_LayoutSelector_LayoutRadio"),
            ];
            const ring = getComputedStyle(bubbles);

            expect([ring.outlineStyle, ring.outlineWidth, ring.outlineOffset]).toEqual(["solid", "2px", "-2px"]);
            expect(ring.outlineColor).toBe(tokenColor("--cpd-color-border-accent-primary", container));
            expect(getComputedStyle(modern).outlineStyle).toBe("none");
            expect(getComputedStyle(modern).borderTopColor).toBe(
                tokenColor("--cpd-color-border-interactive-secondary", container),
            );
        });

        it("move the ring to the layout chosen next", () => {
            render(theme, layoutCards());
            const [modern, bubbles] = [
                ...document.querySelectorAll<HTMLElement>(".mxLayoutSwitcher_LayoutSelector_LayoutRadio"),
            ];

            modern.querySelector("input")!.click();
            expect(getComputedStyle(modern).outlineWidth).toBe("2px");
            expect(getComputedStyle(bubbles).outlineStyle).toBe("none");
        });

        it("ring the selected image size's drawing in the accent, the other drawing edged with a field's border", () => {
            const container = render(theme, `<div class="raised">${imageSizeCards()}</div>`);
            const [normal, large] = [...document.querySelectorAll<SVGElement>(".mx_ImageSizePanel_size")];
            const ring = getComputedStyle(normal);
            const edge = getComputedStyle(large);

            expect([ring.outlineStyle, ring.outlineWidth, ring.outlineOffset]).toEqual(["solid", "2px", "-2px"]);
            expect(ring.outlineColor).toBe(tokenColor("--cpd-color-border-accent-primary", container));
            // Over the drawing's own 1px edge, along its 8px corners
            expect([edge.outlineStyle, edge.outlineWidth, edge.outlineOffset]).toEqual(["solid", "1px", "-1px"]);
            expect(edge.outlineColor).toBe(tokenColor("--cpd-color-border-interactive-secondary", container));
            expect([ring.borderTopLeftRadius, edge.borderBottomRightRadius]).toEqual(["8px", "8px"]);
        });
    });

    describe("the avatar's edit badge", () => {
        function renderAvatarSetting(dir = "ltr"): { surface: HTMLElement; avatar: DOMRect; badge: HTMLElement } {
            const container = render(
                theme,
                `<div class="raised" style="padding: 24px">
                    <div class="mx_AvatarSetting_avatar" role="group">
                        <div class="mx_AccessibleButton mx_AvatarSetting_avatarDisplay" role="button">
                            <span style="display: block; width: 120px; height: 120px; border-radius: 50%"></span>
                        </div>
                        <div class="mx_AvatarSetting_uploadButton" role="button" tabindex="0" aria-label="Edit photo"
                            aria-haspopup="menu">${markup(h(TakePhotoIcon, { "aria-hidden": true, "width": "16px", "height": "16px" }))}</div>
                    </div>
                </div>`,
                dir,
            );
            return {
                surface: container.querySelector<HTMLElement>(".raised")!,
                avatar: container.querySelector(".mx_AvatarSetting_avatar")!.getBoundingClientRect(),
                badge: byLabel("Edit photo"),
            };
        }

        it("is a 28px accent circle with a white 16px camera in its middle", () => {
            const { badge } = renderAvatarSetting();
            const box = badge.getBoundingClientRect();
            const camera = badge.querySelector("svg")!.getBoundingClientRect();

            expect([box.width, box.height, getComputedStyle(badge).borderTopLeftRadius]).toEqual([28, 28, "50%"]);
            expect(settledStyle(badge).backgroundColor).toBe(tokenColor("--cpd-color-bg-accent-rest", badge));
            expect(glyphColor(badge)).toBe(tokenColor("--tl-color-on-accent", badge));
            expect(glyphColor(badge)).toBe("rgb(255, 255, 255)");
            expect([camera.width, camera.height, camera.left - box.left, camera.top - box.top]).toEqual([16, 16, 6, 6]);
        });

        it("is kept apart from the photo by a 2px ring in the dialog's color", () => {
            const { surface, badge } = renderAvatarSetting();

            expect(getComputedStyle(badge).boxShadow).toBe(
                `${getComputedStyle(surface).backgroundColor} 0px 0px 0px 2px`,
            );
        });

        it("takes the accent's hovered fill on hover and while its menu is open, one step from its rest fill", async () => {
            const { badge } = renderAvatarSetting();

            await userEvent.hover(badge);
            expect(settledStyle(badge).backgroundColor).toBe(tokenColor("--cpd-color-bg-accent-hovered", badge));
            await userEvent.unhover(badge);
            badge.classList.add("mx_AvatarSetting_uploadButton_active");
            expect(settledStyle(badge).backgroundColor).toBe(tokenColor("--cpd-color-bg-accent-hovered", badge));
        });

        it("draws the keyboard focus ring outside the ring in the dialog's color, clear of the accent", async () => {
            const { badge } = renderAvatarSetting();

            await userEvent.tab();
            expect(document.activeElement).toBe(badge);
            const focused = getComputedStyle(badge);
            expect([focused.outlineStyle, focused.outlineWidth, focused.outlineOffset]).toEqual([
                "solid",
                "2px",
                "2px",
            ]);
            expect(focused.outlineColor).toBe(tokenColor("--cpd-color-border-focused", badge));
        });

        it("keeps a transparent 1px border, so that the circle keeps its edge in forced colors", () => {
            const { badge } = renderAvatarSetting();
            const { borderTopStyle, borderTopWidth, borderTopColor } = getComputedStyle(badge);

            expect([borderTopStyle, borderTopWidth, borderTopColor]).toEqual(["solid", "1px", TRANSPARENT]);
        });

        it.each(["ltr", "rtl"])("sits on the photo's bottom corner at the end of the line (%s)", (dir) => {
            const { avatar, badge } = renderAvatarSetting(dir);
            const box = badge.getBoundingClientRect();

            expect(box.bottom).toBe(avatar.bottom);
            expect(dir === "rtl" ? box.left : box.right).toBe(dir === "rtl" ? avatar.left : avatar.right);
        });
    });

    describe("standalone text buttons", () => {
        function renderTextButtons(disabled = false): HTMLElement {
            return render(
                theme,
                `<div class="mx_UserInfo mx_BaseCard">
                    <div class="mx_UserInfo_verification">
                        ${markup(h(Button, { kind: "tertiary", size: "md", className: "mx_UserInfo_verify_button", disabled }, "Verify User"))}
                    </div>
                </div>
                <div class="mx_PinnedMessagesCard">
                    <div class="mx_PinnedMessagesCard_unpin">
                        ${markup(h(Button, { kind: "tertiary", disabled }, "Unpin all messages"))}
                    </div>
                </div>
                <div class="raised">
                    <details class="mx_CreateRoomDialog_details">
                        <summary class="mx_CreateRoomDialog_details_summary" id="advanced">Show advanced${markup(
                            h(ChevronDownIcon, { className: "mx_CreateRoomDialog_details_chevron" }),
                        )}</summary>
                    </details>
                </div>`,
            );
        }

        function textButton(text: string): HTMLElement {
            return [...document.querySelectorAll<HTMLElement>("button")].find((button) => button.textContent === text)!;
        }

        it("draw Verify User, Unpin all messages and Show advanced in the accent", () => {
            const container = renderTextButtons();
            const accent = tokenColor("--cpd-color-text-action-accent", container);

            expect(getComputedStyle(textButton("Verify User")).color).toBe(accent);
            expect(getComputedStyle(textButton("Unpin all messages")).color).toBe(accent);
            const advanced = document.querySelector<HTMLElement>("#advanced")!;
            expect(getComputedStyle(advanced).color).toBe(accent);
            expect(glyphColor(advanced)).toBe(accent);
        });

        it("keep Compound's disabled text color while disabled", () => {
            const container = renderTextButtons(true);
            const disabled = tokenColor("--cpd-color-text-disabled", container);

            expect(getComputedStyle(textButton("Verify User")).color).toBe(disabled);
            expect(getComputedStyle(textButton("Unpin all messages")).color).toBe(disabled);
        });
    });

    it("tints the right panel's empty state with the accent at the strength of Element's green", () => {
        const container = render(
            theme,
            `<div class="mx_BaseCard" style="position: relative; width: 352px; height: 400px; overflow: hidden">
                <div class="mx_EmptyState"><p>No files in this room</p></div>
            </div>`,
        );
        const glow = getComputedStyle(document.querySelector(".mx_EmptyState")!, "::before").backgroundImage;
        const [center] = glow.match(/(?:rgba?|color)\([^()]*\)/g)!;

        expect(colorParts(center)).toEqual({
            rgb: colorParts(tokenColor("--cpd-color-icon-accent-primary", container)).rgb,
            alpha: 0.12,
        });
    });
});
