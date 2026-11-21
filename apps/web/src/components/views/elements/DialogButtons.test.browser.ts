/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// The Playwright provider's types give the CDP session its `send` method
/// <reference types="@vitest/browser-playwright" />

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";

// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../../../res/css/_common.pcss?raw";
import fontSizes from "../../../../res/css/_font-sizes.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import focusRing from "../../../../res/css/telement/FocusRing.pcss?raw";
import { toBrowserCss } from "../../../test/telement/browserCss";
import { press, settledStyle, tokenColor } from "../../../test/telement/computedStyle";

/** A DialogButtons footer, with the classes each of its buttons gets, inside the dialog it belongs to. */
function footer(primaryClasses = "mx_Dialog_primary", cancelClasses = "cancel"): string {
    return `
        <div class="mx_Dialog_buttons">
            <span class="mx_Dialog_buttons_row">
                <button id="cancel" class="mx_LegacyDialogButton ${cancelClasses}" type="button">Cancel</button>
                <button id="primary" class="mx_LegacyDialogButton ${primaryClasses}" type="button">Leave</button>
            </span>
        </div>
    `;
}

/** A footer button with neither the cancel nor the primary class, like AskInviteAnywayDialog's. */
const UNCLASSED_FOOTER = `
    <div class="mx_Dialog_buttons">
        <input id="primary" class="mx_LegacyDialogButton mx_Dialog_primary" type="submit" value="Import">
        <button id="cancel" class="mx_LegacyDialogButton" type="button">Cancel</button>
    </div>
`;

/**
 * ExportE2eKeysDialog's and ImportE2eKeysDialog's footer: Cancel with the cancel class, then the submit button, with no
 * space between them, as React renders it. Their tests check that the components' buttons come in this order and match
 * the footer's cancel and last-child rules.
 */
function keysFooter(primaryLabel: string): string {
    const cancel = '<button id="cancel" class="mx_LegacyDialogButton cancel" type="button">Cancel</button>';
    const primary = `<button id="primary" class="mx_LegacyDialogButton mx_Dialog_primary" type="submit">`;
    return `<div class="mx_Dialog_buttons">${cancel}${primary}${primaryLabel}</button></div>`;
}

const EXPORT_KEYS_FOOTER = keysFooter("Export");
const IMPORT_KEYS_FOOTER = keysFooter("Import");

interface FooterCase {
    name: string;
    html: string;
    id: "cancel" | "primary";
    /** The background and border color tokens on hover */
    hover: [string, string];
    /** The background and border color tokens when pressed */
    pressed: [string, string];
}

const OUTLINE_HOVER: [string, string] = ["--cpd-color-bg-subtle-secondary", "--cpd-color-border-interactive-hovered"];
const OUTLINE_PRESSED: [string, string] = ["--cpd-color-bg-subtle-primary", "--cpd-color-border-interactive-hovered"];
const PRIMARY_HOVER: [string, string] = [
    "--cpd-color-bg-action-primary-hovered",
    "--cpd-color-bg-action-primary-hovered",
];
const PRIMARY_PRESSED: [string, string] = [
    "--cpd-color-bg-action-primary-pressed",
    "--cpd-color-bg-action-primary-pressed",
];

const FOOTER_CASES: FooterCase[] = [
    { name: "the cancel button", html: footer(), id: "cancel", hover: OUTLINE_HOVER, pressed: OUTLINE_PRESSED },
    { name: "the primary button", html: footer(), id: "primary", hover: PRIMARY_HOVER, pressed: PRIMARY_PRESSED },
    {
        name: "a danger primary button",
        html: footer("mx_Dialog_primary danger"),
        id: "primary",
        hover: ["--cpd-color-bg-critical-hovered", "--cpd-color-bg-critical-hovered"],
        pressed: ["--cpd-color-red-1100", "--cpd-color-red-1100"],
    },
    // The footer fills every button but .cancel, so this one takes the primary's colors
    {
        name: "a button without the cancel class",
        html: UNCLASSED_FOOTER,
        id: "cancel",
        hover: PRIMARY_HOVER,
        pressed: PRIMARY_PRESSED,
    },
    {
        name: "Export room keys' Cancel",
        html: EXPORT_KEYS_FOOTER,
        id: "cancel",
        hover: OUTLINE_HOVER,
        pressed: OUTLINE_PRESSED,
    },
    {
        name: "a warning cancel button",
        html: footer("mx_Dialog_primary danger", "warning"),
        id: "cancel",
        hover: ["--cpd-color-bg-critical-subtle", "--cpd-color-border-critical-hovered"],
        pressed: ["--cpd-color-bg-critical-subtle-hovered", "--cpd-color-border-critical-hovered"],
    },
];

/** InteractiveAuthDialog after an error: the message, a line break, then the Dismiss button. */
const AUTH_ERROR = `
    <div id="mx_Dialog_content">
        <p role="alert">Invalid username or password</p>
        <br>
        <div id="dismiss" class="mx_AccessibleButton mx_GeneralButton" role="button" tabindex="0">Dismiss</div>
        <div id="below">Below the button</div>
    </div>
`;

function render(html: string): void {
    document.body.innerHTML = `
        <div class="cpd-theme-light"><div class="mx_Dialog" style="width: 600px">${html}</div></div>
    `;
}

function element(id: string): HTMLElement {
    return document.getElementById(id)!;
}

/**
 * Presses or releases the left mouse button over the element's center. Through CDP, because userEvent can only click,
 * which releases the button before the test can look at it. The test runs in an iframe of the page CDP drives.
 */
async function mouse(type: "mousePressed" | "mouseReleased", target: HTMLElement): Promise<void> {
    const frame = window.frameElement!.getBoundingClientRect();
    const scale = frame.width / document.documentElement.clientWidth;
    const box = target.getBoundingClientRect();
    const x = frame.left + (box.left + box.width / 2) * scale;
    const y = frame.top + (box.top + box.height / 2) * scale;
    await cdp().send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await cdp().send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
}

function lightColor(token: string): string {
    return tokenColor(token, document.querySelector(".cpd-theme-light")!);
}

let stylesheet: HTMLStyleElement;

describe("Legacy dialog button styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${focusRing} }
            /* Compound's stylesheet defines the pill radius */
            @layer compound-web { ${compoundStyles} }
            @layer shared-components { ${telementTokens} }
            @layer app-web {
                ${toBrowserCss(lightTheme)}
                ${toBrowserCss(commonStyles, commonStyles, fontSizes, lightTheme)}
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

    it.each(["cancel", "primary"])(
        "gives the footer's %s button Compound's md geometry, as wide as its label",
        (id) => {
            render(footer());
            const button = element(id);
            const style = getComputedStyle(button);

            expect(button.getBoundingClientRect().height).toBe(36);
            expect(style.borderTopWidth).toBe("1px");
            expect([style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]).toEqual([
                "3px",
                "19px",
                "3px",
                "19px",
            ]);
            expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThanOrEqual(18);
            expect(style.fontWeight).toBe("600");
            // No 156px minimum (TELEMENT.md, "Colors, type and components")
            const label = document.createRange();
            label.selectNodeContents(button);
            expect(button.getBoundingClientRect().width).toBeCloseTo(
                label.getBoundingClientRect().width + 2 * (19 + 1),
                0,
            );
        },
    );

    it.each(FOOTER_CASES)("colors $name like Compound's Button on hover", async ({ html, id, hover }) => {
        render(html);

        await userEvent.hover(element(id));

        const style = settledStyle(element(id));
        expect([style.backgroundColor, style.borderTopColor]).toEqual(hover.map(lightColor));
    });

    it.each(FOOTER_CASES)("colors $name like Compound's Button when pressed", async ({ html, id, pressed }) => {
        render(html);

        const style = await press(element(id));

        expect([style.backgroundColor, style.borderTopColor]).toEqual(pressed.map(lightColor));
    });

    it("renders Export room keys' Cancel as an outline beside the filled Export", () => {
        render(EXPORT_KEYS_FOOTER);
        const cancel = getComputedStyle(element("cancel"));
        const primary = getComputedStyle(element("primary"));

        expect(cancel.backgroundColor).toBe(lightColor("--cpd-color-bg-action-secondary-rest"));
        expect(cancel.borderTopColor).toBe(lightColor("--cpd-color-border-interactive-secondary"));
        expect(cancel.color).toBe(lightColor("--cpd-color-text-primary"));
        expect(primary.backgroundColor).toBe(lightColor("--cpd-color-bg-action-primary-rest"));
    });

    it.each([
        ["Export", EXPORT_KEYS_FOOTER],
        ["Import", IMPORT_KEYS_FOOTER],
    ])("puts %s room keys' Cancel first and the primary flush with the footer's right edge", (_name, html) => {
        render(html);
        const footer = document.querySelector(".mx_Dialog_buttons")!.getBoundingClientRect();
        const cancel = element("cancel").getBoundingClientRect();
        const primary = element("primary").getBoundingClientRect();

        // Like a DialogButtons footer, whose row puts the column gap between the buttons and nothing after them
        expect(primary.right).toBe(footer.right);
        expect(primary.left - cancel.right).toBe(8);
    });

    it("shows Compound's pressed color, unfiltered, while the mouse holds a button down", async () => {
        render(footer());
        const button = element("primary");

        await mouse("mousePressed", button);
        const style = settledStyle(button);
        const pressed = { active: button.matches(":active"), focusVisible: button.matches(":focus-visible") };
        const { filter, backgroundColor } = style;
        await mouse("mouseReleased", button);

        expect(pressed).toEqual({ active: true, focusVisible: false });
        expect(filter).toBe("none");
        expect(backgroundColor).toBe(lightColor("--cpd-color-bg-action-primary-pressed"));
        // Still focused after the click, still without the filter
        expect(button.matches(":focus")).toBe(true);
        expect(getComputedStyle(button).filter).toBe("none");
    });

    it("rings a button focused from the keyboard in the app's one focus ring, rather than brightening it", async () => {
        render(footer());
        const button = element("primary");

        const style = await press(button);

        expect(button.matches(":focus-visible")).toBe(true);
        expect(style.filter).toBe("none");
        expect(`${style.outlineStyle} ${style.outlineWidth} ${style.outlineOffset}`).toBe("solid 2px 1px");
        expect(style.outlineColor).toBe(lightColor("--cpd-color-border-focused"));
    });

    it("keeps a warning cancel button a red outline, like Compound's destructive secondary Button", () => {
        render(footer("mx_Dialog_primary danger", "warning"));
        const style = getComputedStyle(element("cancel"));

        expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(style.borderTopColor).toBe(lightColor("--cpd-color-border-critical-subtle"));
        expect(style.color).toBe(lightColor("--cpd-color-text-critical-primary"));
    });

    it("leaves a disabled button's colors alone on hover", async () => {
        render(footer().replace('type="button">Leave', 'type="button" disabled>Leave'));
        const before = getComputedStyle(element("primary")).backgroundColor;

        await userEvent.hover(element("primary"));

        expect(settledStyle(element("primary")).backgroundColor).toBe(before);
    });

    it("lays the interactive auth Dismiss button out as a 36px Compound md button", () => {
        render(AUTH_ERROR);
        const button = element("dismiss");
        const style = getComputedStyle(button);
        const box = button.getBoundingClientRect();

        expect([style.display, style.alignItems, style.justifyContent]).toEqual(["inline-flex", "center", "center"]);
        expect(box.height).toBe(36);
        expect([style.paddingTop, style.paddingLeft]).toEqual(["4px", "20px"]);
        expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThanOrEqual(18);
        expect(style.fontWeight).toBe("600");
        // The whole button takes part in layout, so what follows starts below it
        expect(element("below").getBoundingClientRect().top).toBeGreaterThanOrEqual(box.bottom);
    });

    it("colors the Dismiss button like Compound's primary Button on hover and when pressed", async () => {
        // A <button> so that holding Space presses it; the rules don't depend on the element
        render(
            AUTH_ERROR.replace(/<div id="dismiss"([^>]*)>Dismiss<\/div>/, '<button id="dismiss"$1>Dismiss</button>'),
        );

        await userEvent.hover(element("dismiss"));
        expect(settledStyle(element("dismiss")).backgroundColor).toBe(
            lightColor("--cpd-color-bg-action-primary-hovered"),
        );

        const pressed = await press(element("dismiss"));
        expect(pressed.backgroundColor).toBe(lightColor("--cpd-color-bg-action-primary-pressed"));
    });
});
