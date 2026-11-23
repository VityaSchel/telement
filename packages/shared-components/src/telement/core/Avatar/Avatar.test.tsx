/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { createRef } from "react";
import { render, screen, waitFor } from "@test-utils";
import { describe, expect, it } from "vitest";

import { Avatar } from "./Avatar";

let photoCount = 0;

/** A photo no avatar on the page has shown yet: a 2px PNG of its own color. */
function newPhoto(): string {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    const context = canvas.getContext("2d")!;
    context.fillStyle = `rgb(${++photoCount}, 128, 64)`;
    context.fillRect(0, 0, 2, 2);
    return canvas.toDataURL("image/png");
}

/** Resolves once the avatar's photo has loaded or failed. */
function settled(avatar: HTMLElement): Promise<void> {
    const photo = avatar.querySelector("img")!;
    if (photo.complete) return Promise.resolve();
    return new Promise((resolve) => {
        photo.addEventListener("load", () => resolve(), { once: true });
        photo.addEventListener("error", () => resolve(), { once: true });
    });
}

describe("Avatar", () => {
    it("shows the letter avatar while its photo loads, and the photo once it has", async () => {
        render(<Avatar id="@bob:example.org" name="Bob" src={newPhoto()} size="48px" data-testid="avatar" />);
        const avatar = screen.getByTestId("avatar");

        expect(avatar).toHaveAttribute("data-initial", "B");
        expect(avatar.querySelector("img")).not.toBeNull();
        await waitFor(() => expect(avatar).not.toHaveAttribute("data-initial"));
    });

    it("keeps the letter when its photo fails to load", async () => {
        render(<Avatar id="@bob:example.org" name="Bob" src="http://127.0.0.1:9/bob.png" data-testid="avatar" />);
        const avatar = screen.getByTestId("avatar");

        await settled(avatar);
        expect(avatar.querySelector("img")!.naturalWidth).toBe(0);
        expect(avatar).toHaveAttribute("data-initial", "B");
    });

    it("shows a photo the page has shown before at once, as when the room list scrolls a room back in", async () => {
        const photo = newPhoto();
        const { unmount } = render(<Avatar id="@bob:example.org" name="Bob" src={photo} data-testid="avatar" />);
        await waitFor(() => expect(screen.getByTestId("avatar")).not.toHaveAttribute("data-initial"));
        unmount();

        render(<Avatar id="@bob:example.org" name="Bob" src={photo} data-testid="avatar" />);

        expect(screen.getByTestId("avatar")).not.toHaveAttribute("data-initial");
    });

    it("shows the letter again while a new photo loads", async () => {
        const { rerender } = render(<Avatar id="!room" name="#studio" src={newPhoto()} data-testid="avatar" />);
        const avatar = screen.getByTestId("avatar");
        await waitFor(() => expect(avatar).not.toHaveAttribute("data-initial"));

        rerender(<Avatar id="!room" name="#studio" src={newPhoto()} data-testid="avatar" />);

        // The letter after the sigil, as the letter avatar shows it
        expect(avatar).toHaveAttribute("data-initial", "s");
        await waitFor(() => expect(avatar).not.toHaveAttribute("data-initial"));
    });

    it("leaves an avatar without a photo to Compound's letter avatar", () => {
        render(<Avatar id="@bob:example.org" name="Bob" data-testid="avatar" />);
        const avatar = screen.getByTestId("avatar");

        expect(avatar).not.toHaveAttribute("data-initial");
        expect(avatar).toHaveTextContent("B");
    });

    it("passes its ref on to the avatar", () => {
        const ref = createRef<HTMLSpanElement | HTMLButtonElement>();
        render(<Avatar ref={ref} id="@bob:example.org" name="Bob" data-testid="avatar" />);

        expect(ref.current).toBe(screen.getByTestId("avatar"));
    });
});
