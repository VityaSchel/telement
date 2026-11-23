/*
Copyright 2024 New Vector Ltd.
Copyright 2024 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ComponentType } from "react";
import { EmptyStateView } from "@element-hq/web-shared-components";

interface Props {
    Icon: ComponentType<React.SVGAttributes<SVGElement>>;
    title: string;
    description: string;
}

// Telement: the shared empty state, centered in the card, with the card's accent glow behind it
const EmptyState: React.FC<Props> = ({ Icon, title, description }) => {
    return <EmptyStateView className="mx_EmptyState" Icon={Icon} title={title} description={description} />;
};

export default EmptyState;
