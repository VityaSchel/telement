/*
Copyright 2024 New Vector Ltd.
Copyright 2020 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ReactNode, type KeyboardEvent, type Ref, useMemo } from "react";
import classNames from "classnames";
import { Text } from "@vector-im/compound-web";
import { AutoHideScrollbar } from "@element-hq/web-shared-components";

import { CardContext } from "./context";

interface IProps {
    /**
     * The card's title, or what its header holds. Telement's cards have no back or close button: the right panel's panes
     * are opened and closed by their buttons in the room header, and closed by Escape.
     */
    header?: ReactNode | null;
    footer?: ReactNode;
    className?: string;
    id?: string;
    role?: "tabpanel";
    ariaLabelledBy?: string;
    withoutScrollContainer?: boolean;
    onKeyDown?(this: void, ev: KeyboardEvent): void;
    ref?: Ref<HTMLDivElement>;
    children: ReactNode;
}

const BaseCard: React.FC<IProps> = ({
    className,
    id,
    ariaLabelledBy,
    role,
    header,
    footer,
    withoutScrollContainer,
    children,
    onKeyDown,
    ref,
}: IProps) => {
    if (!withoutScrollContainer) {
        children = <AutoHideScrollbar className="mx_AutoHideScrollbar">{children}</AutoHideScrollbar>;
    }

    const context = useMemo(() => ({ isCard: true }), []);

    return (
        <CardContext.Provider value={context}>
            <div
                id={id}
                aria-labelledby={ariaLabelledBy}
                role={role}
                className={classNames("mx_BaseCard", className)}
                ref={ref}
                onKeyDown={onKeyDown}
            >
                {header && (
                    <div className="mx_BaseCard_header">
                        {typeof header === "string" ? (
                            <div className="mx_BaseCard_header_title">
                                <Text
                                    size="md"
                                    weight="medium"
                                    className="mx_BaseCard_header_title_heading"
                                    role="heading"
                                    aria-level={1}
                                >
                                    {header}
                                </Text>
                            </div>
                        ) : (
                            header
                        )}
                    </div>
                )}
                {children}
                {footer && <div className="mx_BaseCard_footer">{footer}</div>}
            </div>
        </CardContext.Provider>
    );
};

export default BaseCard;
