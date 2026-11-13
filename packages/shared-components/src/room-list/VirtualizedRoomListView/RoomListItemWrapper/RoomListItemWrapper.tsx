/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { memo, type JSX } from "react";

import { RoomListItemView, type RoomListItemViewProps } from "./RoomListItemView";
import { getItemAccessibleProps } from "../../../core/VirtualizedList";

export interface RoomListItemWrapperProps extends RoomListItemViewProps {
    /** Index of this room in the list */
    roomIndex: number;
    /** Total number of rooms in the list */
    roomCount: number;
}

/**
 * Wraps RoomListItemView with the accessibility props of an option in the room list (listbox).
 */
export const RoomListItemWrapper = memo(function RoomListItemWrapper({
    roomIndex,
    roomCount,
    ...rest
}: RoomListItemWrapperProps): JSX.Element {
    return <RoomListItemView {...rest} {...getItemAccessibleProps("listbox", roomIndex, roomCount)} />;
});
