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

// The package doesn't export its token stylesheet on its own, and its build can be older than the badge's source
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../../../packages/shared-components/src/telement/tokens.css?raw";
// eslint-disable-next-line no-restricted-imports
import notificationBadgeStyles from "../../../../../../packages/shared-components/src/notifications/NotificationBadgeView/NotificationBadgeView.module.css?raw";
import readReceiptGroupStyles from "../../../../res/css/views/rooms/_ReadReceiptGroup.pcss?raw";
import lightTheme from "../../../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../../../test/telement/browserCss";
import { loadInter } from "../../../test/telement/fonts";

let stylesheet: HTMLStyleElement;
let removeInter: () => void;

describe("ReadReceiptGroup", () => {
    beforeAll(async () => {
        removeInter = await loadInter();
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} }
            @layer shared-components { ${telementTokens} ${notificationBadgeStyles} }
            @layer app-web { ${toBrowserCss(readReceiptGroupStyles, lightTheme)} }
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

    it("keeps the failed-to-send badge a 16px circle in the receipts' 16px slot, rather than a 20px counter", () => {
        // SentReceipt's failed state, with NotificationBadgeView's unhashed class names
        document.body.innerHTML = `
            <div class="mx_ReadReceiptGroup cpd-theme-light">
                <div class="mx_ReadReceiptGroup_button" role="status">
                    <span class="mx_ReadReceiptGroup_container">
                        <div class="notificationBadge visible highlight badge2Char" data-badge-type="badge_2char">
                            <span class="count">!</span>
                        </div>
                    </span>
                </div>
            </div>
        `;
        const slot = document.querySelector(".mx_ReadReceiptGroup_container")!.getBoundingClientRect();
        const badge = document.querySelector("[data-badge-type]")!.getBoundingClientRect();

        expect(slot.height).toBe(16);
        expect([badge.width, badge.height]).toEqual([16, 16]);
        expect([badge.top, badge.bottom]).toEqual([slot.top, slot.bottom]);
    });
});
