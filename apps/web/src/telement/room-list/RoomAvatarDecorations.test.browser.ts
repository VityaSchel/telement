/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import roomAvatarViewStyles from "../../../res/css/views/avatars/_RoomAvatarView.pcss?raw";
import iconMask from "../../../res/img/element-icons/roomlist/room-avatar-view-icon-mask.svg?raw";
import presenceMask from "../../../res/img/element-icons/roomlist/room-avatar-view-presence-mask.svg?raw";
import { toBrowserCss } from "../../test/telement/browserCss";

const SCALE = 4;

/** The DOM that DecoratedRoomAvatarView renders around a 48px avatar, with a 16px icon or an 8px presence dot. */
function renderDecoratedAvatar(kind: "icon" | "presence"): { avatar: HTMLElement; decoration: Element } {
    const decorationClass = kind === "icon" ? "mx_RoomAvatarView_icon" : "mx_RoomAvatarView_PresenceDecoration";
    const size = kind === "icon" ? 16 : 8;
    document.body.innerHTML = `
        <div class="mx_RoomAvatarView" style="display: flex">
            <span class="mx_RoomAvatarView_RoomAvatar mx_RoomAvatarView_RoomAvatar_${kind}"
                style="display: block; inline-size: var(--room-avatar-size); block-size: var(--room-avatar-size)"></span>
            <svg class="${decorationClass}" width="${size}px" height="${size}px" viewBox="0 0 24 24"></svg>
        </div>
    `;
    return {
        avatar: document.querySelector<HTMLElement>(".mx_RoomAvatarView_RoomAvatar")!,
        decoration: document.querySelector(`.${decorationClass}`)!,
    };
}

/** Draws a mask at 4 times its size, and returns the opacity of the mask at a point given in CSS pixels. */
async function maskOpacity(svg: string): Promise<(x: number, y: number) => number> {
    const image = new Image();
    image.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 48 * SCALE;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    return (x, y) => data[(Math.round(y * SCALE) * canvas.width + Math.round(x * SCALE)) * 4 + 3] / 255;
}

/** Points on a circle around a center, every 15°, that are inside the 48px avatar. */
function ring(cx: number, cy: number, radius: number): [number, number][] {
    const points: [number, number][] = [];
    for (let angle = 0; angle < 360; angle += 15) {
        const x = cx + radius * Math.cos((angle * Math.PI) / 180);
        const y = cy + radius * Math.sin((angle * Math.PI) / 180);
        if (x >= 0 && x < 48 && y >= 0 && y < 48) points.push([x, y]);
    }
    return points;
}

let stylesheet: HTMLStyleElement;

describe("Room list avatar decorations", () => {
    beforeAll(() => {
        stylesheet = document.createElement("style");
        stylesheet.textContent = toBrowserCss(roomAvatarViewStyles);
        document.head.append(stylesheet);
    });

    afterAll(() => {
        stylesheet.remove();
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it.each([
        ["icon", iconMask, "room-avatar-view-icon-mask.svg", 8],
        ["presence", presenceMask, "room-avatar-view-presence-mask.svg", 4],
    ] as const)("cuts the 48px avatar 2px around its %s decoration", async (kind, mask, file, radius) => {
        const { avatar, decoration } = renderDecoratedAvatar(kind);
        const box = avatar.getBoundingClientRect();
        const dot = decoration.getBoundingClientRect();
        const cx = dot.left + dot.width / 2 - box.left;
        const cy = dot.top + dot.height / 2 - box.top;

        expect(box.width).toBe(48);
        expect(box.height).toBe(48);
        expect(dot.width).toBe(radius * 2);
        expect(getComputedStyle(avatar).maskImage).toContain(file);
        // Centered on the avatar's circle, at its bottom right, like Telegram's online dot
        expect(Math.hypot(cx - 24, cy - 24)).toBeCloseTo(24, 0);
        expect(cx).toBe(cy);

        const opacity = await maskOpacity(mask);
        expect(opacity(cx, cy)).toBe(0);
        for (const [x, y] of ring(cx, cy, radius + 1.5)) expect(opacity(x, y)).toBe(0);
        for (const [x, y] of ring(cx, cy, radius + 2.5)) expect(opacity(x, y)).toBe(1);
        expect(opacity(24, 24)).toBe(1);
    });
});
