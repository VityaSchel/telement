/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CloseIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";

import accessibleButtonStyles from "../../../../res/css/views/elements/_AccessibleButton.pcss?raw";
import markerStyles from "../../../../res/css/components/views/location/_Marker.pcss?raw";
import beaconStyles from "../../../../res/css/components/views/messages/_MBeaconBody.pcss?raw";
import locationStyles from "../../../../res/css/views/messages/_MLocationBody.pcss?raw";
import replyPreviewStyles from "../../../../res/css/views/rooms/_ReplyPreview.pcss?raw";

const SENDER_COLOUR = "rgb(0, 128, 0)";

const closeIcon = renderToStaticMarkup(createElement(CloseIcon));

const TITLES: Record<string, string> = {
    "a short name": "Reply to <bdi>Alice</bdi>",
    "a long name": `Reply to <bdi>${"Alice Wonderland ".repeat(20)}</bdi>`,
    "a shared name": 'Reply to <bdi>Alice</bdi> <bdi class="mx_ReplyPreview_mxid">@alice:example.org</bdi>',
};

const LOCATION =
    '<div class="mx_MLocationBody"><div class="mx_MLocationBody_map" data-testid="map-wrapper">' +
    '<div class="mx_Map mx_MLocationBody_map" data-testid="map">' +
    '<div class="maplibregl-control-container"><div style="width: 24px; height: 24px"></div></div>' +
    '<div class="mx_Marker"><div class="mx_Marker_border"></div></div>' +
    "</div></div></div>";

const BEACON =
    '<div class="mx_MBeaconBody"><div class="mx_Map mx_MBeaconBody_map"></div>' +
    '<div class="mx_MBeaconBody_chin">Live until 12:00</div></div>';

/** The DOM ReplyPreview renders, with the excerpt's body in place of the shared reply view. */
function replyPreview(title: string, body = "Hello there"): string {
    return `
        <div class="mx_ReplyPreview">
            <div class="mx_ReplyPreview_section mx_Username_color3">
                <div class="mx_ReplyPreview_header">
                    <span class="mx_ReplyPreview_title">${title}</span>
                    <div class="mx_AccessibleButton mx_ReplyPreview_header_cancel" role="button" tabindex="0"
                        aria-label="Cancel reply">${closeIcon}</div>
                </div>
                <div>${body}</div>
            </div>
        </div>
    `;
}

function render(html: string, dir = "ltr"): void {
    document.body.innerHTML = `<div class="cpd-theme-light" dir="${dir}" style="width: 480px">${html}</div>`;
}

function element(selector: string): HTMLElement {
    return document.querySelector<HTMLElement>(selector)!;
}

function rect(selector: string): DOMRect {
    return element(selector).getBoundingClientRect();
}

function centre(box: DOMRect): number {
    return box.top + box.height / 2;
}

let stylesheet: HTMLStyleElement;

describe("ReplyPreview styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            @layer app-web {
                .mx_Username_color3 { color: ${SENDER_COLOUR}; }
                ${accessibleButtonStyles}
                ${markerStyles}
                ${beaconStyles}
                ${locationStyles}
                ${replyPreviewStyles}
            }
        `;
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it.each(Object.entries(TITLES))("centres the cancel icon on the title's line with %s", (_, title) => {
        render(replyPreview(title));

        const titleBox = rect(".mx_ReplyPreview_title");
        const lineHeight = parseFloat(getComputedStyle(element(".mx_ReplyPreview_title")).lineHeight);
        expect(titleBox.height).toBeCloseTo(lineHeight, 1);
        expect(Math.abs(centre(rect(".mx_ReplyPreview_header_cancel svg")) - centre(titleBox))).toBeLessThanOrEqual(
            0.5,
        );
        // The cancel button's target doesn't make the row any higher than the title's line.
        expect(rect(".mx_ReplyPreview_header").bottom).toBeCloseTo(titleBox.bottom, 1);
        expect(titleBox.right).toBeLessThanOrEqual(rect(".mx_ReplyPreview_header_cancel").left);
        expect(rect(".mx_ReplyPreview_header_cancel").right).toBeLessThanOrEqual(rect(".mx_ReplyPreview").right);
    });

    it("draws the quote line and the title in the sender's colour", () => {
        render(replyPreview(TITLES["a short name"]));

        const section = getComputedStyle(element(".mx_ReplyPreview_section"));
        expect(section.borderInlineStartWidth).toBe("2px");
        expect(section.borderInlineStartColor).toBe(SENDER_COLOUR);
        expect(getComputedStyle(element(".mx_ReplyPreview_title")).color).toBe(SENDER_COLOUR);
    });

    it("puts the quote line at the right and the cancel button at the left in right-to-left text", () => {
        render(replyPreview("Reply to <bdi>אליס</bdi>"), "rtl");

        const section = getComputedStyle(element(".mx_ReplyPreview_section"));
        expect(section.borderRightWidth).toBe("2px");
        expect(section.borderLeftWidth).toBe("0px");
        expect(rect(".mx_ReplyPreview_header_cancel").right).toBeLessThanOrEqual(rect(".mx_ReplyPreview_title").left);
    });

    it("sets a shared name's Matrix ID in smaller, regular, secondary text", () => {
        render(replyPreview(TITLES["a shared name"]));

        const title = getComputedStyle(element(".mx_ReplyPreview_title"));
        const mxid = getComputedStyle(element(".mx_ReplyPreview_mxid"));
        expect(parseFloat(mxid.fontSize)).toBeLessThan(parseFloat(title.fontSize));
        expect(mxid.fontWeight).toBe("400");
        expect(mxid.color).not.toBe(SENDER_COLOUR);
    });

    it("shows a location map as a thumbnail as high as a picture's, without its controls", () => {
        render(LOCATION + replyPreview(TITLES["a short name"], LOCATION));

        // The same map outside the preview keeps the timeline's size.
        const [timelineMap, excerptMap] = document.querySelectorAll<HTMLElement>("[data-testid='map']");
        expect(timelineMap.getBoundingClientRect().height).toBe(300);

        for (const map of excerptMap.closest(".mx_MLocationBody")!.querySelectorAll(".mx_MLocationBody_map")) {
            expect(map.getBoundingClientRect().width).toBe(66);
            expect(map.getBoundingClientRect().height).toBe(44);
        }
        expect(getComputedStyle(excerptMap.querySelector(".maplibregl-control-container")!).display).toBe("none");
        expect(getComputedStyle(excerptMap.querySelector(".mx_Marker_border")!).transform).toBe(
            "matrix(0.5, 0, 0, 0.5, 0, 0)",
        );
    });

    it("shows a live location as a thumbnail as high as a picture's, without its status", () => {
        render(replyPreview(TITLES["a short name"], BEACON));

        expect(rect(".mx_MBeaconBody").width).toBe(66);
        expect(rect(".mx_MBeaconBody").height).toBe(44);
        expect(getComputedStyle(element(".mx_MBeaconBody_chin")).display).toBe("none");
    });
});
