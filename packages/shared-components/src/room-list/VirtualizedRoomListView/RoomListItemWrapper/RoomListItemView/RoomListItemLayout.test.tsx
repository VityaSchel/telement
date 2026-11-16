/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import "../../../../telement/tokens.css";
import React, { type JSX } from "react";
import { render, screen } from "@test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { RoomListItemView, type RoomListItemViewSnapshot } from "./RoomListItemView";
import { useMockedViewModel } from "../../../../core/viewmodel";
import { defaultSnapshot } from "./default-snapshot";
import { mockedActions } from "./mocked-actions";
import styles from "./RoomListItemView.module.css";

const TWO_LINES =
    "Has anyone tried the new release? The room list looks very different now, with two lines of preview and more";

const unread = {
    ...defaultSnapshot.notification,
    hasAnyNotificationOrActivity: true,
    isNotification: true,
    hasUnreadCount: true,
    count: 3,
};

interface RowProps extends Partial<RoomListItemViewSnapshot> {
    isSelected?: boolean;
}

function Row({ isSelected = false, ...overrides }: RowProps): JSX.Element {
    const vm = useMockedViewModel({ ...defaultSnapshot, ...overrides }, mockedActions);
    return (
        <RoomListItemView
            vm={vm}
            isSelected={isSelected}
            isFocused={false}
            onFocus={() => {}}
            renderAvatar={() => <div data-testid="avatar" style={{ width: "48px", height: "48px" }} />}
            role="option"
        />
    );
}

/** A row in a 370px room list panel, the default width. */
function renderRow(props: RowProps = {}, dir: "ltr" | "rtl" = "ltr"): HTMLElement {
    render(
        <div role="listbox" aria-label="Rooms" dir={dir} style={{ width: "370px" }}>
            <Row {...props} />
        </div>,
    );
    return screen.getByRole("option");
}

function rect(element: Element): DOMRect {
    return element.getBoundingClientRect();
}

function part(row: HTMLElement, className: string): HTMLElement {
    return row.querySelector<HTMLElement>(`.${className}`)!;
}

/** The color a token resolves to. */
function colorOf(token: string): string {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
}

/** The vertical center of the n-th line (from 0) of an element whose lines are `lineHeight` tall. */
function lineCenter(element: Element, line: number, lineHeight: number): number {
    return rect(element).top + (line + 0.5) * lineHeight;
}

function center(element: Element): number {
    const { top, height } = rect(element);
    return top + height / 2;
}

/** The height of one preview line at the default font size. */
const PREVIEW_LINE = 16.25;

/** The vertical center of the plate's bottom line: the second of the two preview lines. */
function bottomLineCenter(row: HTMLElement, scale = 1): number {
    return rect(part(row, styles.text)).bottom - (PREVIEW_LINE * scale) / 2;
}

/** The baseline of a badge's digits: the bottom of an empty inline block put on their line. */
function baselineOf(badge: Element): number {
    const probe = document.createElement("span");
    probe.style.display = "inline-block";
    badge.append(probe);
    const baseline = rect(probe).bottom;
    probe.remove();
    return baseline;
}

/** The cap height of an element's font. */
function capHeightOf(element: Element): number {
    const probe = document.createElement("span");
    probe.style.cssText = "position: absolute; display: block; block-size: 1cap;";
    element.append(probe);
    const height = rect(probe).height;
    probe.remove();
    return height;
}

const none = defaultSnapshot.notification;

describe("Room list item layout", () => {
    beforeAll(async () => {
        await document.fonts.load("500 15px Inter");
        await document.fonts.load("400 13px Inter");
        await document.fonts.load("600 11px Inter");
    });

    afterEach(() => {
        document.documentElement.style.fontSize = "";
    });

    it("is a 72px row holding a 64px plate inset 4px on every side, rounded as a row", () => {
        const row = renderRow({ messagePreview: TWO_LINES });
        const plate = part(row, styles.container);

        expect(rect(row).height).toBe(72);
        expect(rect(plate).height).toBe(64);
        expect(rect(plate).top - rect(row).top).toBe(4);
        expect(rect(row).bottom - rect(plate).bottom).toBe(4);
        expect(rect(plate).left - rect(row).left).toBe(4);
        expect(rect(row).right - rect(plate).right).toBe(4);
        expect(getComputedStyle(plate).borderRadius).toBe("8px");
    });

    it("puts the 48px avatar 8px from the plate's start, top and bottom, and the text 12px after it", () => {
        const row = renderRow({ messagePreview: TWO_LINES });
        const plate = rect(part(row, styles.container));
        const avatar = rect(screen.getByTestId("avatar"));

        expect(avatar.width).toBe(48);
        expect(avatar.left - plate.left).toBe(8);
        expect(avatar.top - plate.top).toBe(8);
        expect(plate.bottom - avatar.bottom).toBe(8);
        expect(rect(part(row, styles.text)).left - avatar.right).toBe(12);
    });

    it.each([
        ["a two-line preview", { messagePreview: TWO_LINES }],
        ["a one-line preview", { messagePreview: "bump" }],
        ["no preview", { messagePreview: undefined, messagePreviewSender: undefined }],
    ])("keeps the name, time and two preview lines centered in the plate with %s", (_, props) => {
        const row = renderRow({ ...props, notification: unread });
        const plate = rect(part(row, styles.container));
        const text = rect(part(row, styles.text));

        expect(rect(row).height).toBe(72);
        // 18.75px of name and 2 × 16.25px of preview
        expect(text.height).toBe(51.25);
        expect(text.top - plate.top).toBeCloseTo(plate.bottom - text.bottom, 5);
        // The name sits at the top of the block, so names line up from row to row
        expect(rect(screen.getByTestId("room-name")).top).toBe(text.top);
        expect(center(screen.getByText("12:41"))).toBeCloseTo(center(part(row, styles.titleRow)), 5);
    });

    it("keeps the name's line and the row at their height with a user status emoji after the name", () => {
        const row = renderRow({ messagePreview: TWO_LINES, userStatus: { emoji: "🌴", text: "On holiday" } });
        const plate = rect(part(row, styles.container));
        const avatar = rect(screen.getByTestId("avatar"));

        expect(screen.getByText("🌴")).toBeVisible();
        expect(rect(part(row, styles.titleRow)).height).toBe(18.75);
        expect(rect(part(row, styles.text)).height).toBe(51.25);
        expect(rect(row).height).toBe(72);
        expect(plate.height).toBe(64);
        expect(avatar.top - plate.top).toBe(8);
        expect(plate.bottom - avatar.bottom).toBe(8);
    });

    it("centers the badges on the second preview line when the preview wraps", () => {
        const row = renderRow({ messagePreview: TWO_LINES, notification: unread });
        const preview = part(row, styles.preview);

        expect(rect(preview).height).toBe(32.5);
        expect(center(screen.getByText("3"))).toBeCloseTo(lineCenter(preview, 1, PREVIEW_LINE), 5);
    });

    it.each([
        ["a one-line preview", { messagePreview: "bump" }],
        ["someone typing", { typing: "Grace is typing …" }],
        ["no preview", { messagePreview: undefined, messagePreviewSender: undefined }],
    ])("puts the badges on the plate's bottom line, not under the time, with %s", (_, props) => {
        const row = renderRow({ ...props, notification: unread });

        expect(center(screen.getByText("3"))).toBeCloseTo(bottomLineCenter(row), 5);
        // The preview stays on the line under the name
        const preview = part(row, styles.preview);
        if (preview) expect(rect(preview).top).toBe(rect(part(row, styles.titleRow)).bottom);
    });

    it.each([
        [
            "the @ of a mention without a count",
            { notification: { ...none, hasAnyNotificationOrActivity: true, isMention: true } },
            (row: HTMLElement) => row.querySelector("[data-badge]")!,
        ],
        [
            "a muted room's count",
            { notification: { ...unread, muted: true } },
            (row: HTMLElement) => row.querySelector("[data-badge]")!,
        ],
        [
            "an invite",
            { notification: { ...none, hasAnyNotificationOrActivity: true, invited: true } },
            (row: HTMLElement) => row.querySelector("[data-testid='notification-decoration'] svg")!,
        ],
        [
            "a call",
            { notification: { ...none, callType: "video" as const } },
            (row: HTMLElement) => row.querySelector("[data-testid='notification-decoration'] svg")!,
        ],
        [
            "the activity dot",
            { notification: { ...none, hasAnyNotificationOrActivity: true, isActivityNotification: true } },
            (row: HTMLElement) => row.querySelector("[data-unread-dot]")!,
        ],
        ["a pinned room's pin", { isFavourite: true }, () => screen.getByTestId("pinned-icon")],
    ])("puts %s on the plate's bottom line with a one-line preview", (_, props, find) => {
        const row = renderRow({ messagePreview: "bump", ...props });

        expect(center(find(row))).toBeCloseTo(bottomLineCenter(row), 5);
    });

    it("clamps the preview to two lines with an ellipsis", () => {
        const row = renderRow({ messagePreview: `${TWO_LINES} ${TWO_LINES} ${TWO_LINES}` });
        const preview = part(row, styles.preview);

        expect(rect(preview).height).toBe(32.5);
        expect(preview.scrollHeight).toBeGreaterThan(preview.clientHeight);
        expect(getComputedStyle(preview).webkitLineClamp).toBe("2");
    });

    it("shows the 24px more options button in the time's place on hover without moving the name", async () => {
        const row = renderRow({ name: "Loooooooooooooooooooooooooooooooooooooong name", notification: unread });
        const name = screen.getByTestId("room-name");
        const time = screen.getByText("12:41");
        const nameWidth = rect(name).width;
        const timeEnd = rect(time).right;

        await userEvent.hover(row);
        const button = screen.getByRole("button", { name: "More Options" });

        expect(button).toBeVisible();
        expect(getComputedStyle(time).visibility).toBe("hidden");
        expect(rect(name).width).toBe(nameWidth);
        expect(rect(button).width).toBe(24);
        expect(rect(button).right).toBe(timeEnd);
        expect(center(button)).toBeCloseTo(center(part(row, styles.titleRow)), 5);
        expect(screen.getByText("3")).toBeVisible();
        expect(getComputedStyle(part(row, styles.preview)).color).toBe(colorOf("--cpd-color-text-secondary"));
        expect(getComputedStyle(part(row, styles.container)).backgroundColor).toBe(
            colorOf("--cpd-color-bg-action-tertiary-hovered"),
        );
    });

    it("keeps the name 8px from the time and the plate's padding after the time", () => {
        const row = renderRow({ name: "Loooooooooooooooooooooooooooooooooooooong name" });
        const plate = rect(part(row, styles.container));
        const time = rect(screen.getByText("12:41"));

        expect(time.left - rect(screen.getByTestId("room-name")).right).toBe(8);
        expect(plate.right - time.right).toBe(8);
    });

    it("puts the check 2px before the time, centered on its line, in the accent color", () => {
        const row = renderRow({ lastMessageState: "read", messagePreviewSender: "You" });
        const plate = rect(part(row, styles.container));
        const check = screen.getByTestId("last-message-read");
        const time = rect(screen.getByText("12:41"));

        expect(rect(check).width).toBe(16);
        expect(time.left - rect(check).right).toBe(2);
        expect(plate.right - time.right).toBe(8);
        expect(center(check)).toBeCloseTo(center(part(row, styles.titleRow)), 5);
        expect(getComputedStyle(check).color).toBe(colorOf("--cpd-color-icon-accent-primary"));
    });

    it("hides the check with the time when the more options button takes its place", async () => {
        const row = renderRow({ lastMessageState: "sent", messagePreviewSender: "You" });

        await userEvent.hover(row);

        expect(getComputedStyle(screen.getByTestId("last-message-sent")).visibility).toBe("hidden");
    });

    it("shows the draft label in red, and on the selected plate in the on-solid color", () => {
        const { unmount } = render(<Row draft="See you at nine" />);
        expect(getComputedStyle(screen.getByText("Draft:")).color).toBe(colorOf("--cpd-color-text-critical-primary"));
        unmount();

        render(<Row isSelected={true} lastMessageState="read" messagePreviewSender="You" />);
        expect(getComputedStyle(screen.getByTestId("last-message-read")).color).toBe(
            colorOf("--cpd-color-text-on-solid-primary"),
        );
    });

    it("fills the selected plate with the accent and puts everything on it in the on-solid color", () => {
        const row = renderRow({
            isSelected: true,
            isFavourite: false,
            notification: { ...unread, isMention: true, isNotification: false, muted: true },
        });
        const plate = part(row, styles.container);
        const onSolid = colorOf("--cpd-color-text-on-solid-primary");
        const accent = colorOf("--cpd-color-bg-accent-rest");

        expect(getComputedStyle(plate).backgroundColor).toBe(accent);
        for (const element of [
            screen.getByTestId("room-name"),
            screen.getByText("Alice:"),
            part(row, styles.preview),
            screen.getByText("12:41"),
        ]) {
            expect(getComputedStyle(element).color).toBe(onSolid);
        }
        expect(getComputedStyle(screen.getByTestId("muted-icon")).fill).toBe(onSolid);
        // The counter and the @ are inverted, a muted room's counter too
        const counter = screen.getByText("3");
        const mention = counter.previousElementSibling!;
        for (const badge of [counter, mention]) {
            expect(getComputedStyle(badge).backgroundColor).toBe(onSolid);
            expect(getComputedStyle(badge).color).toBe(accent);
        }
        expect(getComputedStyle(mention.querySelector("svg")!).fill).toBe(accent);
    });

    it("turns the selected plate to the hovered accent on hover", async () => {
        const row = renderRow({ isSelected: true, notification: unread });
        await userEvent.hover(row);

        const hovered = colorOf("--cpd-color-bg-accent-hovered");
        expect(getComputedStyle(part(row, styles.container)).backgroundColor).toBe(hovered);
        expect(getComputedStyle(screen.getByText("3")).color).toBe(hovered);
    });

    it("draws the keyboard focus ring 2px around the plate, inside the row", async () => {
        const row = renderRow();
        row.tabIndex = 0;
        await userEvent.keyboard("{Tab}");
        expect(row).toHaveFocus();

        const plate = getComputedStyle(part(row, styles.container));
        expect(plate.outlineStyle).toBe("solid");
        expect(plate.outlineWidth).toBe("2px");
        expect(plate.outlineOffset).toBe("2px");
        expect(plate.outlineColor).toBe(colorOf("--cpd-color-border-focused"));
        expect(getComputedStyle(row).outlineStyle).toBe("none");
    });

    it("mirrors the row in right-to-left languages", () => {
        const row = renderRow({ isFavourite: true }, "rtl");
        const plate = rect(part(row, styles.container));
        const avatar = rect(screen.getByTestId("avatar"));
        const time = rect(screen.getByText("12:41"));

        expect(plate.right - avatar.right).toBe(8);
        expect(time.left - plate.left).toBe(8);
        expect(rect(part(row, styles.notificationDecoration)).left - plate.left).toBe(8);
        expect(getComputedStyle(screen.getByTestId("pinned-icon")).transform).toMatch(
            /^matrix\(0\.707\d*, -0\.707\d*, 0\.707\d*, 0\.707\d*, 0, 0\)$/,
        );
    });

    it("grows the plate with a larger font instead of clipping the text", () => {
        document.documentElement.style.fontSize = "24px";
        const row = renderRow({ messagePreview: TWO_LINES, notification: unread });
        const plate = rect(part(row, styles.container));
        const text = part(row, styles.text);
        const avatar = rect(screen.getByTestId("avatar"));

        // 1.5 times the text, with the same 6px padding
        expect(rect(text).height).toBeCloseTo(51.25 * 1.5, 5);
        expect(plate.height).toBeCloseTo(51.25 * 1.5 + 12, 5);
        expect(rect(row).height).toBeCloseTo(plate.height + 8, 5);
        expect(rect(part(row, styles.preview)).height).toBeCloseTo(2 * 16.25 * 1.5, 5);
        // The lines fit the text block; only the badge, centered on the last one, reaches into the plate's padding
        expect(rect(part(row, styles.preview)).bottom).toBeCloseTo(rect(text).bottom, 5);
        expect(rect(screen.getByText("3")).bottom).toBeLessThan(plate.bottom);
        expect(avatar.top - plate.top).toBeCloseTo(plate.bottom - avatar.bottom, 5);
    });

    it("keeps the badges on the plate's bottom line with a larger font", () => {
        document.documentElement.style.fontSize = "24px";
        const row = renderRow({ messagePreview: "bump", notification: unread });

        expect(center(screen.getByText("3"))).toBeCloseTo(bottomLineCenter(row, 1.5), 5);
    });

    it.each([
        [16, 20, 6],
        [20, 24, 7],
        [24, 30, 9],
    ])(
        "makes a one-digit counter a circle at a %ipx base font size, %ipx wide, with the digits %ipx from its top and bottom",
        (size, diameter, inset) => {
            document.documentElement.style.fontSize = `${size}px`;
            renderRow({ notification: unread });
            const counter = screen.getByText("3");
            const box = rect(counter);
            const baseline = baselineOf(counter);

            expect(box.height).toBeCloseTo(diameter, 1);
            expect(box.width).toBeCloseTo(box.height, 5);
            // The digits' cap height is in the middle, a whole number of pixels from the top and the bottom
            expect(box.bottom - baseline).toBeCloseTo(inset, 1);
            expect(baseline - capHeightOf(counter) - box.top).toBeCloseTo(inset, 1);
        },
    );

    it.each([16, 24])("makes a longer count a pill padded evenly on every side at a %ipx base font size", (size) => {
        document.documentElement.style.fontSize = `${size}px`;
        renderRow({ notification: { ...unread, count: 128 } });
        const counter = screen.getByText("128");
        const style = getComputedStyle(counter);

        expect(new Set([style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]).size).toBe(1);
        expect(rect(counter).width).toBeGreaterThan(rect(counter).height);
        expect(rect(counter).bottom - baselineOf(counter)).toBeCloseTo(parseFloat(style.paddingBottom), 1);
        expect(style.borderRadius).toBe("9999px");
    });

    it("makes the @ the counter's size, its icon a whole number of pixels from every side, at a 24px base font size", () => {
        document.documentElement.style.fontSize = "24px";
        renderRow({ notification: { ...unread, isMention: true, isNotification: false, count: 2 } });
        const counter = screen.getByText("2");
        const mention = rect(counter.previousElementSibling!);
        const icon = rect(counter.previousElementSibling!.querySelector("svg")!);

        expect(mention.height).toBeCloseTo(rect(counter).height, 5);
        expect(mention.width).toBeCloseTo(mention.height, 5);
        expect(icon.top - mention.top).toBe(5);
        expect(icon.left - mention.left).toBe(5);
        expect(mention.bottom - icon.bottom).toBeCloseTo(5, 5);
        expect(mention.right - icon.right).toBeCloseTo(5, 5);
    });
});
