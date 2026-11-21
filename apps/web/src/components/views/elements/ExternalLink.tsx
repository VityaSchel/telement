/*
Copyright 2024 New Vector Ltd.
Copyright 2021 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type DetailedHTMLProps, type AnchorHTMLAttributes } from "react";
import classNames from "classnames";
import PopOutIcon from "@vector-im/compound-design-tokens/assets/web/icons/pop-out";

interface Props extends DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> {}

/**
 * Simple link component that adds external link icon after link children
 */
const ExternalLink: React.FC<Props> = ({ children, className, ...rest }) => (
    <a target="_blank" rel="noreferrer noopener" {...rest} className={classNames("mx_ExternalLink", className)}>
        {children}
        {/* Telement: a word joiner, in a span that doesn't wrap, keeps the icon on the line of the link's last word
            rather than alone on the next (_ExternalLink.pcss) */}
        <span className="mx_ExternalLink_iconWrapper" aria-hidden={true}>
            {"\u2060"}
            <PopOutIcon className="mx_ExternalLink_icon" />
        </span>
    </a>
);

export default ExternalLink;
