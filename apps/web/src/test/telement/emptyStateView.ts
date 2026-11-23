/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { createElement, type ComponentType, type SVGAttributes } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// The package's built bundle needs Node's `process`, so the browser tests write the shared empty state's DOM out here
// and load its stylesheets from source, with their class names as written
// eslint-disable-next-line no-restricted-imports
import flexStyles from "../../../../../packages/shared-components/src/core/utils/Flex/Flex.module.css?raw";
// eslint-disable-next-line no-restricted-imports
import emptyStateViewStyles from "../../../../../packages/shared-components/src/telement/core/EmptyStateView/EmptyStateView.module.css?raw";

/** The shared empty state's stylesheets, for the shared-components layer. */
export const EMPTY_STATE_VIEW_STYLES = `${flexStyles}\n${emptyStateViewStyles}`;

interface EmptyStateViewMarkup {
    /** "panel" by default, or "compact" for a popover */
    size?: "panel" | "compact";
    /** The class the app gives it, such as mx_EmptyState in the right panel */
    className?: string;
    Icon: ComponentType<SVGAttributes<SVGElement>>;
    title?: string;
    description?: string;
    /** The buttons' markup */
    actions?: string;
}

/** The DOM of EmptyStateView (shared-components) for the given props, with the class names its stylesheet has. */
export function emptyStateView({
    size = "panel",
    className = "",
    Icon,
    title,
    description,
    actions,
}: EmptyStateViewMarkup): string {
    const flex =
        "--mx-flex-display: flex; --mx-flex-direction: column; --mx-flex-align: center; " +
        "--mx-flex-justify: center; --mx-flex-gap: var(--cpd-space-4x); --mx-flex-wrap: nowrap;";
    const tile = renderToStaticMarkup(createElement(Icon, { "className": "tile", "aria-hidden": true }));
    return `
        <div class="flex emptyState ${size} ${className}" style="${flex}">
            ${tile}
            <div class="text">
                ${title ? `<p class="title">${title}</p>` : ""}
                ${description ? `<p class="description">${description}</p>` : ""}
            </div>
            ${actions ? `<div class="actions">${actions}</div>` : ""}
        </div>
    `;
}
