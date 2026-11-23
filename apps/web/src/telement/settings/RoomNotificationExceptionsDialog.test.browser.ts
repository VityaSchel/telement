/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";

import exceptionsDialogStyles from "../../../res/css/telement/_RoomNotificationExceptionsDialog.pcss?raw";
import lightTheme from "../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../test/telement/browserCss";

let stylesheet: HTMLStyleElement;

describe("RoomNotificationExceptionsDialog", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `${compoundBase} ${compoundSemantic} ${toBrowserCss(exceptionsDialogStyles, lightTheme)}`;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
        document.body.innerHTML = "";
    });

    it("is a 640px list dialog, its content 592px between the dialog's 24px edges", () => {
        document.body.innerHTML = `<div class="mx_RoomNotificationExceptionsDialog" style="padding: 0 24px"></div>`;
        const dialog = document.querySelector<HTMLElement>(".mx_RoomNotificationExceptionsDialog")!;

        expect(getComputedStyle(dialog).width).toBe("592px");
        expect(dialog.getBoundingClientRect().width).toBe(640);
    });
});
