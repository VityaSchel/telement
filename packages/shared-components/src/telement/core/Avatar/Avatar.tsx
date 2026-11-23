/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type ComponentProps, type JSX, useLayoutEffect, useRef, useState } from "react";
import { Avatar as CompoundAvatar, getInitialLetter } from "@vector-im/compound-web";
import { useMergeRefs } from "react-merge-refs";

/**
 * Photos this page has shown, which the browser shows again at once, so an avatar remounted with one, as when the
 * room list scrolls, doesn't flash its letter.
 */
const shownPhotos = new Set<string>();

/**
 * Props for {@link Avatar}: Compound's.
 */
export type AvatarProps = ComponentProps<typeof CompoundAvatar>;

/**
 * Compound's avatar, showing the letter avatar until its photo has loaded, as Telegram does, rather than a blank
 * circle. A photo that fails to load leaves the letter. While it loads, the avatar carries its letter in
 * `data-initial`, which the app's stylesheet draws over the photo's place.
 *
 * @example
 * ```tsx
 * <Avatar id="@bob:example.org" name="Bob" src={photoUrl} size="48px" />
 * ```
 */
export function Avatar({ ref, src, name = "", ...props }: AvatarProps): JSX.Element {
    const avatarRef = useRef<HTMLElement>(null);
    const mergedRef = useMergeRefs([ref, avatarRef]);
    const [loading, setLoading] = useState(false);

    // Before the first paint, so a photo the browser already has shows at once and a missing one shows the letter
    useLayoutEffect(() => {
        const photo = avatarRef.current?.querySelector("img");
        if (!src || !photo || photo.complete || shownPhotos.has(src)) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const onLoad = (): void => {
            shownPhotos.add(src);
            setLoading(false);
        };
        photo.addEventListener("load", onLoad);
        return () => photo.removeEventListener("load", onLoad);
    }, [src]);

    return (
        <CompoundAvatar
            ref={mergedRef}
            src={src}
            name={name}
            data-initial={loading ? getInitialLetter(name) : undefined}
            {...props}
        />
    );
}
