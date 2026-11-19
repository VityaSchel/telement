/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Text } from "@vector-im/compound-web";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundLightSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-semantic.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
// The package doesn't export its token stylesheet on its own
// eslint-disable-next-line no-restricted-imports
import telementTokens from "../../../../packages/shared-components/src/telement/tokens.css?raw";
import commonStyles from "../../res/css/_common.pcss?raw";
import fontSizes from "../../res/css/_font-sizes.pcss?raw";
import loginStyles from "../../res/css/structures/auth/_Login.pcss?raw";
import authBodyStyles from "../../res/css/views/auth/_AuthBody.pcss?raw";
import confirmUserActionDialogStyles from "../../res/css/views/dialogs/_ConfirmUserActionDialog.pcss?raw";
import inviteDialogStyles from "../../res/css/views/dialogs/_InviteDialog.pcss?raw";
import serverPickerDialogStyles from "../../res/css/views/dialogs/_ServerPickerDialog.pcss?raw";
import spotlightDialogStyles from "../../res/css/views/dialogs/_SpotlightDialog.pcss?raw";
import networkDropdownStyles from "../../res/css/views/directory/_NetworkDropdown.pcss?raw";
import copyableTextStyles from "../../res/css/views/elements/_CopyableText.pcss?raw";
import userInfoStyles from "../../res/css/views/right_panel/_UserInfo.pcss?raw";
import autocompleteStyles from "../../res/css/views/rooms/_Autocomplete.pcss?raw";
import replyPreviewStyles from "../../res/css/views/rooms/_ReplyPreview.pcss?raw";
import roomPreviewBarStyles from "../../res/css/views/rooms/_RoomPreviewBar.pcss?raw";
import roomPreviewCardStyles from "../../res/css/views/rooms/_RoomPreviewCard.pcss?raw";
import peopleRoomSettingsTabStyles from "../../res/css/views/settings/tabs/room/_PeopleRoomSettingsTab.pcss?raw";
import lightTheme from "../../res/themes/light/css/_light.pcss?raw";
import { toBrowserCss } from "../test/telement/browserCss";
import { loadInter } from "../test/telement/fonts";

const APP_STYLES = [
    commonStyles,
    loginStyles,
    authBodyStyles,
    confirmUserActionDialogStyles,
    inviteDialogStyles,
    serverPickerDialogStyles,
    spotlightDialogStyles,
    networkDropdownStyles,
    copyableTextStyles,
    userInfoStyles,
    autocompleteStyles,
    replyPreviewStyles,
    roomPreviewBarStyles,
    roomPreviewCardStyles,
    peopleRoomSettingsTabStyles,
];

/** An ID whose "x" between digits Inter's contextual alternates would draw as a multiplication sign. */
const ID = "!nh71MR5LoKB4y2JICbVIT6R0Jlo_Ml89HD68x8OMnwc:example.org";

/** Each place the app shows an identifier, drawn with the classes and nesting its component gives it. */
const IDENTIFIERS: Record<string, string> = {
    "a code block": `<pre><code data-id>${ID}</code></pre>`,
    "inline code": `<p>Run <code data-id>${ID}</code></p>`,
    "a copyable field, such as the room ID in Advanced or the username in Account": `
        <div class="mx_CopyableText mx_CopyableText_border" data-id>${ID}</div>`,
    "the member info's Matrix ID, a Compound Text": `
        <div class="mx_UserInfo mx_BaseCard"><div class="mx_UserInfo_profile">
            ${renderToStaticMarkup(createElement(Text, { "className": "mx_UserInfo_profile_mxid", "data-id": true }, ID))}
        </div></div>`,
    "a user ID or room address in the autocomplete": `
        <div class="mx_Autocomplete_Completion_pill">
            <span class="mx_Autocomplete_Completion_title">Alice</span>
            <span class="mx_Autocomplete_Completion_description" data-id>${ID}</span>
        </div>`,
    "the invite dialog's address bar": `
        <div class="mx_InviteDialog_addressBar"><div class="mx_InviteDialog_editor">
            <input type="text" value="${ID}" data-id>
        </div></div>`,
    "the invite dialog's user IDs": `
        <div class="mx_InviteDialog_tile"><div class="mx_InviteDialog_tile_nameStack">
            <span class="mx_InviteDialog_tile_nameStack_userId" data-id>${ID}</span>
        </div></div>`,
    "a public room's address in Explore rooms": `
        <div class="mx_SpotlightDialog"><div id="mx_SpotlightDialog_content">
            <div class="mx_SpotlightDialog_results"><div class="mx_SpotlightDialog_option">
                <div class="mx_SpotlightDialog_result_publicRoomDetails">
                    <div class="mx_SpotlightDialog_result_publicRoomHeader">
                        <span class="mx_SpotlightDialog_result_publicRoomAlias" data-id>${ID}</span>
                    </div>
                </div>
            </div></div>
        </div></div>`,
    "a person's user ID in the search dialog": `
        <div class="mx_SpotlightDialog"><div id="mx_SpotlightDialog_content">
            <div class="mx_SpotlightDialog_result_details" data-id>${ID}</div>
        </div></div>`,
    "the server on Explore rooms' network button": `
        <div class="mx_SpotlightDialog_options">
            <div class="mx_GenericDropdownMenu_button" data-id>Show: Matrix rooms (example1x2.org)</div>
        </div>`,
    "a server in the network menu": `
        <div class="mx_NetworkDropdown_wrapper"><div class="mx_ContextualMenu">
            <div class="mx_GenericDropdownMenu_Option--label" data-id>example1x2.org</div>
        </div></div>`,
    "the server name of the sign-in page and the server dialog": `
        <div class="mx_Login_underlinedServerName" data-id>example1x2.org</div>`,
    "the server dialog's other homeserver field": `
        <div class="mx_ServerPickerDialog"><div class="mx_Field mx_ServerPickerDialog_otherHomeserver">
            <input type="text" value="example1x2.org" data-id>
        </div></div>`,
    "the sign-in username field": `
        <div class="mx_AuthBody"><div class="mx_Field">
            <input id="mx_LoginForm_username" type="text" value="alice1x2" data-id>
        </div></div>`,
    "the reply preview's user ID": `
        <div class="mx_ReplyPreview"><div class="mx_ReplyPreview_section"><div class="mx_ReplyPreview_header">
            <div class="mx_ReplyPreview_title"><span class="mx_ReplyPreview_mxid" data-id>${ID}</span></div>
        </div></div></div>`,
    "a knocking user's ID in the room's People settings": `<span class="mx_PeopleRoomSettingsTab_userId" data-id>${ID}</span>`,
    "the user ID in a kick or ban dialog": `<div class="mx_ConfirmUserActionDialog_userId" data-id>${ID}</div>`,
    "an inviter's user ID on a room preview": `<span class="mx_RoomPreviewBar_inviter_mxid" data-id>${ID}</span>`,
    "an inviter's user ID on a room preview card": `
        <div class="mx_RoomPreviewCard"><div class="mx_RoomPreviewCard_inviter"><div>
            <span class="mx_RoomPreviewCard_inviter_mxid" data-id>${ID}</span>
        </div></div></div>`,
};

let stylesheet: HTMLStyleElement;
let unloadInter: () => void;

beforeAll(async () => {
    unloadInter = await loadInter();
    stylesheet = document.createElement("style");
    // Unscoped, so that _common.pcss's rule for the body, which turns the alternates on, applies to the page's body
    stylesheet.textContent = `
        @layer compound-tokens, compound-web, shared-components, app-web;
        @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} ${compoundLightSemantic} }
        @layer compound-web { ${compoundStyles} }
        @layer shared-components { ${telementTokens} }
        @layer app-web {
            ${APP_STYLES.map((styles) => toBrowserCss(styles, lightTheme, commonStyles, fontSizes)).join("\n")}
        }
    `;
    document.head.append(stylesheet);
    document.body.classList.add("cpd-theme-light");
});

afterAll(() => {
    stylesheet.remove();
    unloadInter();
    document.body.classList.remove("cpd-theme-light");
});

afterEach(() => {
    document.body.innerHTML = "";
});

describe("Identifiers", () => {
    it("keeps the body's contextual alternates on for prose", () => {
        document.body.innerHTML = `<p>Meet at 10:30, 2x a week</p>`;

        expect(getComputedStyle(document.querySelector("p")!).fontFeatureSettings).toBe(`"calt", "kern", "liga"`);
    });

    it("draws an x between digits as an x, not as the multiplication sign Inter's alternates draw there", () => {
        const text = "HD68x8OMnwc 1920x1080";
        const line = (style: string): string => `<div><span style="font-family: Inter; ${style}">${text}</span></div>`;
        document.body.innerHTML = `
            <div class="mx_CopyableText"><span style="font-family: Inter">${text}</span></div>
            ${line("font-feature-settings: 'calt' 0")}
            ${line("font-feature-settings: 'calt' 1")}
        `;
        const [copyable, typed, alternates] = [...document.querySelectorAll("span")].map(
            (span) => span.getBoundingClientRect().width,
        );

        expect(typed).not.toBe(alternates);
        expect(copyable).toBe(typed);
    });

    it.each(Object.entries(IDENTIFIERS))("draws %s as typed, without contextual alternates", (_, html) => {
        document.body.innerHTML = html;
        const identifier = document.querySelector("[data-id]")!;

        expect(getComputedStyle(identifier).fontFeatureSettings).toBe(`"calt" 0, "kern", "liga"`);
    });
});
