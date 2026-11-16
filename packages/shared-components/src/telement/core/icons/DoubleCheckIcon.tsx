/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type SVGProps, useId } from "react";

/** Compound's check icon, which this icon draws twice */
const CHECK =
    "M9.55 17.575q-.2 0-.375-.062a.9.9 0 0 1-.325-.213L4.55 13q-.274-.274-.262-.713.012-.437.287-.712a.95.95 0 0 1 " +
    ".7-.275q.425 0 .7.275L9.55 15.15l8.475-8.475q.274-.275.713-.275.437 0 .712.275.275.274.275.713 0 .437-.275.712" +
    "l-9.2 9.2q-.15.15-.325.212a1.1 1.1 0 0 1-.375.063";

/**
 * Two of Compound's checks side by side, as Telegram marks a message that has been read. The second check's short arm
 * starts just past the first check's long arm instead of crossing it.
 */
export function DoubleCheckIcon(props: SVGProps<SVGSVGElement>): JSX.Element {
    const clipId = useId();
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            fill="currentColor"
            viewBox="0 0 24 24"
            {...props}
        >
            <defs>
                <clipPath id={clipId}>
                    <path d="M0.35 25 26.35 -1H30V25Z" />
                </clipPath>
            </defs>
            <path d={CHECK} transform="translate(-2.5 0)" />
            <g clipPath={`url(#${clipId})`}>
                <path d={CHECK} transform="translate(2.5 0)" />
            </g>
        </svg>
    );
}
