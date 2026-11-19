/*
Copyright 2024,2025 New Vector Ltd.
Copyright 2021-2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ChangeEvent, type ReactNode, useId, useMemo } from "react";
import { HelpMessage, InlineField, Label, ToggleInput } from "@vector-im/compound-web";
import { VideoCallSolidIcon, HomeSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import classNames from "classnames";

import { _t } from "../../../../../languageHandler";
import SettingsStore from "../../../../../settings/SettingsStore";
import { SettingLevel } from "../../../../../settings/SettingLevel";
import { useSettingValue } from "../../../../../hooks/useSettings";
import { MetaSpace } from "../../../../../stores/spaces";
import SettingsTab from "../SettingsTab";
import { SettingsSection } from "../../shared/SettingsSection";
import { SettingsSubsection } from "../../shared/SettingsSubsection";
import SdkConfig from "../../../../../SdkConfig";

export const onMetaSpaceChangeFactory = (metaSpace: MetaSpace) => async (e: ChangeEvent<HTMLInputElement>) => {
    const currentValue = SettingsStore.getValue("Spaces.enabledMetaSpaces");
    await SettingsStore.setValue("Spaces.enabledMetaSpaces", null, SettingLevel.ACCOUNT, {
        ...currentValue,
        [metaSpace]: e.target.checked,
    });
};

interface SidebarToggleProps {
    /** The toggle's label, which may start with the space's icon. */
    "label": ReactNode;
    /** What the space shows, under the label. */
    "description": ReactNode;
    "checked": boolean;
    "disabled"?: boolean;
    "onChange": (event: ChangeEvent<HTMLInputElement>) => void;
    "className"?: string;
    "data-testid"?: string;
}

/**
 * One of the spaces to show, as a toggle like every other on/off setting (Compound's SettingsToggleInput, whose label
 * can't hold the space's icon).
 */
const SidebarToggle: React.FC<SidebarToggleProps> = ({ label, description, className, ...inputProps }) => {
    const id = useId();
    const descriptionId = useId();
    return (
        <InlineField
            className={classNames("mx_SidebarUserSettingsTab_toggle", className)}
            name={id}
            control={<ToggleInput id={id} aria-describedby={descriptionId} {...inputProps} />}
        >
            <Label htmlFor={id}>{label}</Label>
            <HelpMessage id={descriptionId}>{description}</HelpMessage>
        </InlineField>
    );
};

const SidebarUserSettingsTab: React.FC = () => {
    const {
        [MetaSpace.Home]: homeEnabled,
        [MetaSpace.Orphans]: orphansEnabled,
        [MetaSpace.VideoRooms]: videoRoomsEnabled,
    } = useSettingValue("Spaces.enabledMetaSpaces");
    const allRoomsInHome = useSettingValue("Spaces.allRoomsInHome");
    const guestSpaUrl = useMemo(() => {
        return SdkConfig.get("element_call").guest_spa_url;
    }, []);
    const conferenceSubsectionText =
        _t("settings|sidebar|metaspaces_video_rooms_description") +
        (guestSpaUrl ? " " + _t("settings|sidebar|metaspaces_video_rooms_description_invite_extension") : "");

    const onAllRoomsInHomeToggle = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
        await SettingsStore.setValue("Spaces.allRoomsInHome", null, SettingLevel.ACCOUNT, event.target.checked);
    };

    return (
        <SettingsTab>
            <SettingsSection>
                <SettingsSubsection
                    heading={_t("settings|sidebar|metaspaces_subsection")}
                    description={_t("settings|sidebar|spaces_explainer")}
                    formWrap
                >
                    <SidebarToggle
                        checked={!!homeEnabled}
                        onChange={onMetaSpaceChangeFactory(MetaSpace.Home)}
                        disabled={homeEnabled}
                        label={
                            <>
                                <HomeSolidIcon className="mx_SidebarUserSettingsTab_icon" />
                                {_t("common|home")}
                            </>
                        }
                        description={_t("settings|sidebar|metaspaces_home_description")}
                    />

                    <SidebarToggle
                        checked={allRoomsInHome}
                        disabled={!homeEnabled}
                        onChange={onAllRoomsInHomeToggle}
                        className="mx_SidebarUserSettingsTab_homeAllRoomsToggle"
                        data-testid="mx_SidebarUserSettingsTab_homeAllRoomsToggle"
                        label={_t("settings|sidebar|metaspaces_home_all_rooms")}
                        description={_t("settings|sidebar|metaspaces_home_all_rooms_description")}
                    />

                    <SidebarToggle
                        checked={!!orphansEnabled}
                        onChange={onMetaSpaceChangeFactory(MetaSpace.Orphans)}
                        label={_t("settings|sidebar|metaspaces_orphans")}
                        description={_t("settings|sidebar|metaspaces_orphans_description")}
                    />
                    {SettingsStore.getValue("feature_video_rooms") && (
                        <SidebarToggle
                            checked={!!videoRoomsEnabled}
                            onChange={onMetaSpaceChangeFactory(MetaSpace.VideoRooms)}
                            label={
                                <>
                                    <VideoCallSolidIcon className="mx_SidebarUserSettingsTab_icon" />
                                    {_t("settings|sidebar|metaspaces_video_rooms")}
                                </>
                            }
                            description={conferenceSubsectionText}
                        />
                    )}
                </SettingsSubsection>
            </SettingsSection>
        </SettingsTab>
    );
};

export default SidebarUserSettingsTab;
