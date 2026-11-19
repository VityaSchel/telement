/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { describe, expect, it } from "vitest";
import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";

import { render, screen } from "@test-utils";
import { MessageStatusView, type MessageStatus } from "./MessageStatusView";

describe("MessageStatusView", () => {
    it.each<[MessageStatus, string]>([
        ["sending", "Sending"],
        ["sent", "Sent"],
        ["read", "Read"],
        ["failed", "Failed to send"],
    ])("names the %s status for screen readers", (status, label) => {
        render(<MessageStatusView status={status} />);

        expect(screen.getByRole("img", { name: label })).toHaveAttribute("data-status", status);
    });

    it("draws two checks once the message is read, and one before", () => {
        const { container, rerender } = render(<MessageStatusView status="sent" />);
        // The paths drawn, not the clip that keeps the second check off the first
        const paths = (): number => container.querySelectorAll("svg path:not(defs path)").length;
        const sent = paths();

        rerender(<MessageStatusView status="read" />);

        expect(sent).toBe(1);
        expect(paths()).toBe(2);
    });

    it.each<MessageStatus>(["sending", "sent", "read", "failed"])("draws the %s status in a 16px box", (status) => {
        render(<MessageStatusView status={status} />);
        const box = screen.getByRole("img").getBoundingClientRect();

        expect([box.width, box.height]).toEqual([16, 16]);
    });

    it.each<[MessageStatus, number]>([
        ["sending", 12],
        ["failed", 12],
        ["sent", 16],
        ["read", 16],
    ])("draws the %s glyph %ipx wide, centered in its box", (status, size) => {
        render(<MessageStatusView status={status} />);
        const box = screen.getByRole("img").getBoundingClientRect();
        const icon = screen.getByRole("img").querySelector("svg")!.getBoundingClientRect();

        expect([icon.width, icon.height]).toEqual([size, size]);
        expect(icon.left - box.left).toBe((16 - size) / 2);
        expect(icon.top - box.top).toBe((16 - size) / 2);
    });

    it("takes the color of the text around it, as the time's color where it follows the time", () => {
        render(
            <span style={{ color: "rgb(1, 2, 3)" }}>
                <MessageStatusView status="read" />
            </span>,
        );

        expect(getComputedStyle(screen.getByRole("img").querySelector("svg")!).color).toBe("rgb(1, 2, 3)");
    });

    it("draws the failed mark in the critical color", () => {
        render(
            <span style={{ color: "rgb(1, 2, 3)" }}>
                <MessageStatusView status="failed" />
            </span>,
        );
        const critical = getComputedStyle(document.documentElement)
            .getPropertyValue("--cpd-color-icon-critical-primary")
            .trim();
        const probe = document.createElement("span");
        probe.style.color = critical;
        document.body.append(probe);

        expect(getComputedStyle(screen.getByRole("img")).color).toBe(getComputedStyle(probe).color);
        probe.remove();
    });
});
