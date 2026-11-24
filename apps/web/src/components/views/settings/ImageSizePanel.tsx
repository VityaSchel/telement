/*
Copyright 2024 New Vector Ltd.
Copyright 2021 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { type EmptyObject } from "matrix-js-sdk/src/matrix";
import { RadioInput } from "@vector-im/compound-web";

import SettingsStore from "../../../settings/SettingsStore";
import { _t } from "../../../languageHandler";
import { SettingLevel } from "../../../settings/SettingLevel";
import { ImageSize } from "../../../settings/enums/ImageSize";
import { SettingsSubsection } from "./shared/SettingsSubsection";
import ImgSizeNormalIcon from "../../../../res/img/element-icons/settings/img-size-normal.svg?react";
import ImgSizeLargeIcon from "../../../../res/img/element-icons/settings/img-size-large.svg?react";

interface IState {
    size: ImageSize;
}

export default class ImageSizePanel extends React.Component<EmptyObject, IState> {
    public constructor(props: EmptyObject) {
        super(props);

        this.state = {
            size: SettingsStore.getValue("Images.size"),
        };
    }

    private onSizeChange = (ev: React.ChangeEvent<HTMLInputElement>): void => {
        const newSize = ev.target.value as ImageSize;
        this.setState({ size: newSize });

        void SettingsStore.setValue("Images.size", null, SettingLevel.ACCOUNT, newSize);
    };

    public render(): React.ReactNode {
        const choices = [
            { size: ImageSize.Normal, label: _t("settings|appearance|image_size_default"), Icon: ImgSizeNormalIcon },
            { size: ImageSize.Large, label: _t("settings|appearance|image_size_large"), Icon: ImgSizeLargeIcon },
        ];

        // Telement: cards like the message layouts' (LayoutSwitcher), the radio and the size's name heading the drawing
        return (
            <SettingsSubsection heading={_t("settings|appearance|timeline_image_size")} stretchContent>
                <div className="mx_ImageSizePanel_choices">
                    {choices.map(({ size, label, Icon }) => (
                        <label key={size} className="mx_ImageSizePanel_choice">
                            <span className="mx_ImageSizePanel_header">
                                <RadioInput
                                    name="image_size"
                                    value={size}
                                    checked={this.state.size === size}
                                    onChange={this.onSizeChange}
                                />
                                {label}
                            </span>
                            <Icon className="mx_ImageSizePanel_size" />
                        </label>
                    ))}
                </div>
            </SettingsSubsection>
        );
    }
}
