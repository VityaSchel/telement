/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type PropsWithChildren } from "react";
import classNames from "classnames";

import styles from "./TimelineSeparator.module.css";
import { Flex } from "../../../core/utils/Flex";

/**
 * Timeline separator props
 */
export interface TimelineSeparatorProps {
    /**
     * Accessible label for the separator (for example: "Today", "Yesterday", or a date).
     */
    label: string;
    /**
     * The CSS class name.
     */
    className?: string;
    /**
     * Optional children to render inside the timeline separator
     */
    children?: PropsWithChildren["children"];
    /**
     * ARIA role for the separator container.
     * Use "none" when the separator contains interactive controls.
     * @default "separator"
     */
    role?: "separator" | "none";
}

/**
 * Generic timeline separator component to render within a MessagePanel. Like Telegram, it draws its children in a
 * pill centered on the timeline, with no lines beside it.
 *
 * @param label the accessible label string describing the separator
 * @param children the children to draw within the timeline separator
 */
const TimelineSeparator: React.FC<TimelineSeparatorProps> = ({ label, className, children, role = "separator" }) => {
    return (
        <Flex
            className={classNames(className, styles.timelineSeparator)}
            role={role}
            aria-label={role === "separator" ? label : undefined}
            justify="center"
        >
            <Flex className={styles.pill} align="center">
                {children}
            </Flex>
        </Flex>
    );
};

export default TimelineSeparator;
