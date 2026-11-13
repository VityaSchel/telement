/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// The Playwright provider's types give the CDP session its `send` method
/// <reference types="@vitest/browser-playwright" />

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cdp } from "vitest/browser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CloseIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import compoundBase from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-base.css?raw";
import compoundSemantic from "@vector-im/compound-design-tokens/assets/web/css/cpd-common-semantic.css?raw";
import compoundLightTheme from "@vector-im/compound-design-tokens/assets/web/css/cpd-theme-light-base.css?raw";
import compoundStyles from "@vector-im/compound-web/dist/style.css?raw";
import sharedComponentsStyles from "@element-hq/web-shared-components/dist/element-web-shared-components.css?raw";

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

function quoteLine(): CSSStyleDeclaration {
    return getComputedStyle(element(".mx_ReplyPreview_section"), "::before");
}

function centre(box: DOMRect): number {
    return box.top + box.height / 2;
}

let stylesheet: HTMLStyleElement;

describe("ReplyPreview styles", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = `
            @layer compound-tokens, compound-web, shared-components, app-web;
            @layer compound-tokens { ${compoundBase} ${compoundSemantic} ${compoundLightTheme} }
            @layer compound-web { ${compoundStyles} }
            ${sharedComponentsStyles}
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

        expect(quoteLine().borderInlineStartColor).toBe(SENDER_COLOUR);
        expect(getComputedStyle(element(".mx_ReplyPreview_title")).color).toBe(SENDER_COLOUR);
    });

    it("draws the quote line as a 2px pill along the quote, 12px from the title", () => {
        render(replyPreview(TITLES["a short name"]));

        const line = quoteLine();
        const section = rect(".mx_ReplyPreview_section");
        // A border on an empty box, rather than a background, which forced colors would paint over
        expect(line.borderInlineStartStyle).toBe("solid");
        expect(line.borderInlineStartWidth).toBe("2px");
        expect(line.width).toBe("0px");
        expect(parseFloat(line.height)).toBe(section.height);
        expect(line.left).toBe("0px");
        // Both ends are round, on the side of the title as on the outer side
        for (const radius of [
            line.borderTopLeftRadius,
            line.borderTopRightRadius,
            line.borderBottomRightRadius,
            line.borderBottomLeftRadius,
        ]) {
            expect(parseFloat(radius)).toBeGreaterThanOrEqual(parseFloat(line.borderInlineStartWidth) / 2);
        }
        expect(rect(".mx_ReplyPreview_title").left - section.left).toBe(12);
    });

    it("puts the quote line at the right and the cancel button at the left in right-to-left text", () => {
        render(replyPreview("Reply to <bdi>אליס</bdi>"), "rtl");

        expect(quoteLine().right).toBe("0px");
        expect(quoteLine().borderRightWidth).toBe("2px");
        expect(rect(".mx_ReplyPreview_section").right - rect(".mx_ReplyPreview_title").right).toBe(12);
        expect(rect(".mx_ReplyPreview_header_cancel").right).toBeLessThanOrEqual(rect(".mx_ReplyPreview_title").left);
    });

    it("keeps the quote line in forced colors", async () => {
        render(replyPreview(TITLES["a short name"]));
        const probe = document.createElement("div");
        probe.style.color = "CanvasText";
        document.body.append(probe);

        await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
        try {
            expect(matchMedia("(forced-colors: active)").matches).toBe(true);
            expect(quoteLine().borderInlineStartWidth).toBe("2px");
            expect(quoteLine().borderInlineStartColor).toBe(getComputedStyle(probe).color);
        } finally {
            await cdp().send("Emulation.setEmulatedMedia", { features: [] });
        }
    });

    it("rounds the cancel button as a control", () => {
        render(replyPreview(TITLES["a short name"]));

        const probe = document.createElement("div");
        probe.style.borderRadius = "var(--tl-radius-control)";
        document.body.append(probe);
        const cancel = rect(".mx_ReplyPreview_header_cancel");
        expect(cancel.width).toBe(cancel.height);
        expect(getComputedStyle(element(".mx_ReplyPreview_header_cancel")).borderRadius).toBe(
            getComputedStyle(probe).borderRadius,
        );
        expect(parseFloat(getComputedStyle(probe).borderRadius)).toBeGreaterThanOrEqual(cancel.width / 2);
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
