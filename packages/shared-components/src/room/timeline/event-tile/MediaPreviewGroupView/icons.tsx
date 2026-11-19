/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type MediaPreviewIcon } from "./MediaPreviewGroupView";
import { DocumentIcon, LinkIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import React from "react";

/** White on the icon square's accent, as in Telegram (telement/tokens.css). */
const MEDIA_ICON_COLOR = "var(--tl-color-on-media-icon)";

export function attachmentIcon(_mimeType?: string): MediaPreviewIcon {
    return {
        icon: <DocumentIcon />,
        color: MEDIA_ICON_COLOR,
    };
}

export function linkIcon(): MediaPreviewIcon {
    return {
        icon: <LinkIcon />,
        color: MEDIA_ICON_COLOR,
    };
}
