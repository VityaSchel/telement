/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "@vector-im/compound-web";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import fontSizes from "../../../../res/css/_font-sizes.pcss?raw";
import accessibleButtonStyles from "../../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import pollCreateDialogStyles from "../../../../res/css/views/dialogs/_PollCreateDialog.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../../test/telement/browserCss";
import { press, settledStyle, tokenColor } from "../../../test/telement/computedStyle";

const PILL_KINDS = [
    "primary",
    "primary_outline",
    "secondary",
    "danger",
    "danger_outline",
    "primary_sm",
    "danger_sm",
    "link_sm",
] as const;
type PillKind = (typeof PILL_KINDS)[number];

const BORDERLESS_KINDS: readonly PillKind[] = ["secondary", "link_sm"];

/** Compound Button's hover and pressed colors for the kind each AccessibleButton kind stands for. */
const STATE_COLORS: Record<PillKind, { hover: string; pressed: string; border?: [string, string] }> = {
    primary: { hover: "--cpd-color-bg-action-primary-hovered", pressed: "--cpd-color-bg-action-primary-pressed" },
    primary_sm: { hover: "--cpd-color-bg-action-primary-hovered", pressed: "--cpd-color-bg-action-primary-pressed" },
    danger: { hover: "--cpd-color-bg-critical-hovered", pressed: "--cpd-color-red-1100" },
    danger_sm: { hover: "--cpd-color-bg-critical-hovered", pressed: "--cpd-color-red-1100" },
    primary_outline: {
        hover: "--cpd-color-bg-subtle-secondary",
        pressed: "--cpd-color-bg-subtle-primary",
        border: ["--cpd-color-border-interactive-hovered", "--cpd-color-border-interactive-hovered"],
    },
    danger_outline: {
        hover: "--cpd-color-bg-critical-subtle",
        pressed: "--cpd-color-bg-critical-subtle-hovered",
        border: ["--cpd-color-border-critical-hovered", "--cpd-color-border-critical-hovered"],
    },
    secondary: { hover: "--cpd-color-bg-subtle-secondary", pressed: "--cpd-color-bg-subtle-primary" },
    link_sm: { hover: "--cpd-color-bg-subtle-secondary", pressed: "--cpd-color-bg-subtle-primary" },
};

interface ButtonOptions {
    id?: string;
    /** The element AccessibleButton renders, `div` unless its `element` prop says otherwise */
    tag?: "div" | "button";
    disabled?: boolean;
    style?: string;
    attributes?: string;
}

/** The element AccessibleButton renders for a kind: its classes in the order AccessibleButton.tsx joins them. */
function accessibleButton(kind: string, label: string, options: ButtonOptions = {}): string {
    const classes = ["mx_AccessibleButton", "mx_AccessibleButton_hasKind", `mx_AccessibleButton_kind_${kind}`];
    if (options.disabled) classes.push("mx_AccessibleButton_disabled");
    const disabled = options.disabled ? ' aria-disabled="true" disabled=""' : "";
    const tag = options.tag ?? "div";
    return `<${tag} id="${options.id ?? kind}" class="${classes.join(" ")}"${disabled} role="button" tabindex="0"
        style="${options.style ?? ""}" ${options.attributes ?? ""}>${label}</${tag}>`;
}

function render(html: string): void {
    document.body.innerHTML = `
        <div class="cpd-theme-light" style="font: var(--cpd-font-body-md-regular)">${html}</div>
    `;
}

/** The Compound Button kind each AccessibleButton kind stands for, whose disabled look it takes. */
const COMPOUND_KINDS = {
    primary: "primary",
    primary_sm: "primary",
    danger: "primary",
    danger_sm: "primary",
    icon_primary: "primary",
    primary_outline: "secondary",
    danger_outline: "secondary",
    icon_primary_outline: "secondary",
    secondary: "tertiary",
    link: "tertiary",
    link_inline: "tertiary",
    link_sm: "tertiary",
    danger_inline: "tertiary",
    content_inline: "tertiary",
} as const;

/** A disabled Compound Button of the given kind, red for the destructive kinds as their AccessibleButton kinds are. */
function disabledCompoundButton(
    kind: (typeof COMPOUND_KINDS)[keyof typeof COMPOUND_KINDS],
    destructive: boolean,
): string {
    return renderToStaticMarkup(
        createElement(Button, { kind, destructive, disabled: true, size: "md", id: `compound-${kind}` }, "Continue"),
    );
}

function element(id: string): HTMLElement {
    return document.getElementById(id)!;
}

function lightColor(token: string): string {
    return tokenColor(token, document.querySelector(".cpd-theme-light")!);
}

let stylesheet: HTMLStyleElement;

describe("AccessibleButton styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            /* Compound's stylesheet defines the pill radius */
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} }
            @layer app-web {
                ${accessibleButtonStyles}
                ${toBrowserCss(pollCreateDialogStyles, lightTheme, fontSizes)}
            }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(async () => {
        await userEvent.keyboard("[/Space]");
        document.body.innerHTML = "";
    });

    it.each(PILL_KINDS)("gives the %s kind Compound's md button geometry", (kind) => {
        render(accessibleButton(kind, "Continue"));
        const button = element(kind);
        const style = getComputedStyle(button);
        const border = BORDERLESS_KINDS.includes(kind) ? 0 : 1;

        expect(button.getBoundingClientRect().height).toBe(36);
        expect(parseFloat(style.borderTopWidth)).toBe(border);
        expect([style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]).toEqual(
            [4 - border, 20 - border, 4 - border, 20 - border].map((px) => `${px}px`),
        );
        expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThanOrEqual(button.getBoundingClientRect().height / 2);
        expect(style.fontWeight).toBe("600");
        expect(style.textDecorationLine).toBe("none");
    });

    it.each(["block", "inline-block"])(
        "keeps a pill's label where it sits in an inline-flex pill when a local rule makes it display: %s",
        (display) => {
            render(
                accessibleButton("primary_outline", "Cancel", { id: "flex" }) +
                    accessibleButton("primary_outline", "Cancel", { id: "block", style: `display: ${display}` }),
            );
            const labelOffset = (id: string): number => {
                const range = document.createRange();
                range.selectNodeContents(element(id));
                return range.getBoundingClientRect().top - element(id).getBoundingClientRect().top;
            };

            expect(element("block").getBoundingClientRect().height).toBe(36);
            expect(Math.abs(labelOffset("block") - labelOffset("flex"))).toBeLessThanOrEqual(0.5);
        },
    );

    it.each(PILL_KINDS)("colors the %s kind like Compound's Button on hover and when pressed", async (kind) => {
        const colors = STATE_COLORS[kind];
        render(
            accessibleButton(kind, "Hovered", { id: "hovered" }) +
                // A <button> so that holding Space presses it; the rules don't depend on the element
                accessibleButton(kind, "Pressed", { id: "pressed", tag: "button" }) +
                accessibleButton(kind, "Expanded", { id: "expanded", attributes: 'aria-expanded="true"' }),
        );
        // The borderless kinds have a 0px border, whose color doesn't show
        const borderless = BORDERLESS_KINDS.includes(kind);
        const borderColor = (style: CSSStyleDeclaration): string | null => (borderless ? null : style.borderTopColor);

        await userEvent.hover(element("hovered"));
        const hovered = settledStyle(element("hovered"));
        expect(hovered.backgroundColor).toBe(lightColor(colors.hover));
        expect(borderColor(hovered)).toBe(borderless ? null : lightColor(colors.border?.[0] ?? colors.hover));

        const pressedBorder = borderless ? null : lightColor(colors.border?.[1] ?? colors.pressed);
        const pressed = await press(element("pressed"));
        expect(pressed.backgroundColor).toBe(lightColor(colors.pressed));
        expect(borderColor(pressed)).toBe(pressedBorder);

        // An open menu button shows the pressed color, as Compound's does
        const expanded = settledStyle(element("expanded"));
        expect(expanded.backgroundColor).toBe(lightColor(colors.pressed));
        expect(borderColor(expanded)).toBe(pressedBorder);
    });

    it.each(Object.entries(COMPOUND_KINDS))(
        "disables the %s kind the way Compound disables its %s Button, without fading it",
        (kind, compoundKind) => {
            render(
                accessibleButton(kind, "Continue", { disabled: true }) +
                    disabledCompoundButton(compoundKind, kind.startsWith("danger")),
            );
            const disabled = getComputedStyle(element(kind));
            const compound = getComputedStyle(element(`compound-${compoundKind}`));
            // A filled button's border takes its fill, an outline button's is Compound's; plain buttons have none
            const border = (style: CSSStyleDeclaration): string | null =>
                compoundKind === "tertiary" ? null : style.borderTopColor;
            const compoundBorder = {
                primary: compound.backgroundColor,
                secondary: compound.borderTopColor,
                tertiary: null,
            };

            expect(disabled.opacity).toBe("1");
            expect(disabled.cursor).toBe("not-allowed");
            expect(disabled.color).toBe(lightColor("--cpd-color-text-disabled"));
            expect({ color: disabled.color, fill: disabled.backgroundColor, border: border(disabled) }).toEqual({
                color: compound.color,
                fill: compound.backgroundColor,
                border: compoundBorder[compoundKind],
            });
        },
    );

    it("fades only the poll dialog's buttons without a kind while disabled, not those with Compound's disabled look", () => {
        render(`
            <div class="mx_PollCreateDialog">
                ${accessibleButton("secondary", "Add option", { disabled: true })}
                <div id="remove" class="mx_AccessibleButton mx_PollCreateDialog_removeOption mx_AccessibleButton_disabled"
                    aria-disabled="true" role="button" tabindex="0"></div>
            </div>
        `);
        const addOption = getComputedStyle(element("secondary"));

        expect(addOption.opacity).toBe("1");
        expect(addOption.color).toBe(lightColor("--cpd-color-text-disabled"));
        expect(getComputedStyle(element("remove")).opacity).toBe("0.4");
    });

    it("leaves a disabled pill's colors alone on hover", async () => {
        render(accessibleButton("primary", "Continue", { disabled: true }));
        const before = getComputedStyle(element("primary")).backgroundColor;

        await userEvent.hover(element("primary"));

        expect(settledStyle(element("primary")).backgroundColor).toBe(before);
    });

    it.each([
        ["link", "none"],
        ["link_inline", "underline"],
        ["danger_inline", "underline"],
        ["content_inline", "underline"],
    ])("keeps the %s kind a link without padding or a minimum height, with text-decoration %s", (kind, decoration) => {
        render(`<p style="margin: 0">Lost your password? ${accessibleButton(kind, "Reset it")}</p>`);
        const link = element(kind);
        const style = getComputedStyle(link);

        expect(style.padding).toBe("0px");
        expect(style.minBlockSize).not.toBe("36px");
        expect(link.getBoundingClientRect().height).toBeLessThan(36);
        expect(style.textDecorationLine).toBe(decoration);
    });

    it.each(["link", "link_inline"])("colors the %s kind with the accent", (kind) => {
        render(accessibleButton(kind, "Reset it"));

        expect(getComputedStyle(element(kind)).color).toBe(lightColor("--tl-accent-900"));
    });

    it.each(["icon", "icon_primary", "icon_primary_outline"])("keeps the %s kind a 32px circle", (kind) => {
        render(accessibleButton(kind, '<svg width="18" height="18"></svg>'));
        const button = element(kind);
        const box = button.getBoundingClientRect();

        expect([box.width, box.height]).toEqual([32, 32]);
        expect(parseFloat(getComputedStyle(button).borderTopLeftRadius)).toBeGreaterThanOrEqual(16);
    });
});
