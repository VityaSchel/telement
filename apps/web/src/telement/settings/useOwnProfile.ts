/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { useEventEmitterState } from "../../hooks/useEventEmitter";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import { OwnProfileStore } from "../../stores/OwnProfileStore";

interface OwnProfile {
    /** The user's display name, or their Matrix ID without one. */
    displayName: string;
    /** The `mxc:` URL of the user's avatar. */
    avatarMxc?: string;
}

/**
 * The user's own profile, as the app's menus show it: the cached one from the first render, then the latest, as it changes
 * on this device or another.
 */
export function useOwnProfile(): OwnProfile {
    const store = OwnProfileStore.instance;
    const displayName = useEventEmitterState(store, UPDATE_EVENT, () => store.displayName ?? "");
    const avatarMxc = useEventEmitterState(store, UPDATE_EVENT, () => store.avatarMxc ?? undefined);
    return { displayName, avatarMxc };
}
