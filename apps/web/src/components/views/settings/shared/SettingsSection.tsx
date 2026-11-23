/*
Copyright 2024 New Vector Ltd.
Copyright 2022, 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import classnames from "classnames";
import React, { type ComponentProps, createContext, type HTMLAttributes, useContext, useId } from "react";

import Heading from "../../typography/Heading";
import { SettingsHeader } from "../SettingsHeader";

export interface SettingsSectionProps extends HTMLAttributes<HTMLDivElement> {
    heading?: string | React.ReactNode;
    /**
     * Help for the section, shown under its content, as Telegram puts help under a group of settings.
     */
    subHeading?: string | React.ReactNode;
    children?: React.ReactNode;
    legacy?: boolean;
}

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

/**
 * React context to correctly set heading levels in nested settings sections dynamically
 */
export const HeadingLevelContext = createContext<HeadingLevel>(2);

function SectionHeading({
    heading,
    legacy,
    level,
    id,
}: {
    heading: string | React.ReactNode | undefined;
    legacy: boolean;
    level: HeadingLevel;
    id: string;
}): React.ReactNode | undefined {
    switch (typeof heading) {
        case "string":
            return legacy ? (
                <Heading
                    as={`h${level}`}
                    size={(level + 1).toString() as ComponentProps<typeof Heading>["size"]}
                    id={id}
                >
                    {heading}
                </Heading>
            ) : (
                <SettingsHeader as={`h${level}`} label={heading} />
            );
        case "undefined":
            return undefined;
        default:
            return heading;
    }
}

/**
 * A section of settings content
 * A SettingsTab may contain one or more SettingsSections
 * Eg:
 * ```
 * <SettingsTab>
 *      <SettingsSection heading="General">
 *           <SettingsSubsection heading="Profile">
 *              // profile settings form
 *          <SettingsSubsection>
 *          <SettingsSubsection heading="Account">
 *              // account settings
 *          <SettingsSubsection>
 *      </SettingsSection>
 * </SettingsTab>
 * ```
 */
export const SettingsSection: React.FC<SettingsSectionProps> = ({
    className,
    heading,
    subHeading,
    legacy = true,
    children,
    ...rest
}) => {
    const level = useContext(HeadingLevelContext);
    const headingId = useId();
    // Telement: a legacy section isn't drawn with its heading when its first group has a label of its own
    // (_SettingsSection.pcss), so that each group has one label, as in Telegram. The heading still names the section,
    // which is a group labelled by it
    const labelledGroup = legacy && typeof heading === "string";

    return (
        <div
            role={labelledGroup ? "group" : undefined}
            aria-labelledby={labelledGroup ? headingId : undefined}
            {...rest}
            className={classnames("mx_SettingsSection", className, {
                mx_SettingsSection_newUi: !legacy,
            })}
        >
            {heading && <SectionHeading heading={heading} legacy={legacy} level={level} id={headingId} />}
            <HeadingLevelContext.Provider value={heading ? ((level + 1) as HeadingLevel) : level}>
                <div className={legacy ? "mx_SettingsSection_subSections" : "mx_SettingsSection_content"}>
                    {children}
                </div>
            </HeadingLevelContext.Provider>
            {heading && subHeading && <div className="mx_SettingsSection_help">{subHeading}</div>}
        </div>
    );
};
