/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import classNames from "classnames";

import { type RightPanelPhases } from "../../../../../stores/right-panel/RightPanelStorePhases";
import { useToggled } from "./useToggled";

type Props = {
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    phases: readonly RightPanelPhases[];
};

/**
 * Use this component for room header icons that toggle different right panel phases.
 * Will add a class to the icon when one of the specified phases is on.
 */
export function ToggleableIcon({ Icon, phases }: Props): React.ReactElement {
    const toggled = useToggled(...phases);
    const highlightClass = classNames({
        mx_RoomHeader_toggled: toggled,
    });

    return <Icon className={highlightClass} />;
}
