/*
Copyright 2024 New Vector Ltd.
Copyright 2021-2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { SliderRowView, useCreateAutoDisposedViewModel, useViewModel } from "@element-hq/web-shared-components";

import EventTilePreview from "../elements/EventTilePreview";
import { useMatrixClientContext } from "../../../contexts/MatrixClientContext";
import { useSettingValue } from "../../../hooks/useSettings";
import { _t } from "../../../languageHandler";
import { useOwnProfile } from "../../../telement/settings/useOwnProfile";
import { FontSizeViewModel } from "../../../viewmodels/telement/settings/FontSizeViewModel";
import { SettingsSubsection } from "./shared/SettingsSubsection";

/**
 * Telement: the font size as a slider between a small and a large letter, as Telegram's Text Size, over a message of the
 * user's in the size it is at. Its row is named "Font size", so the group has no label saying it again.
 */
export default function FontScalingPanel(): JSX.Element {
    const userId = useMatrixClientContext().getSafeUserId();
    const { displayName, avatarMxc } = useOwnProfile();
    const layout = useSettingValue("layout");
    const vm = useCreateAutoDisposedViewModel(() => new FontSizeViewModel());
    const { previewScale } = useViewModel(vm);

    return (
        <SettingsSubsection stretchContent data-testid="mx_FontScalingPanel">
            <SliderRowView
                vm={vm}
                start={<span className="mx_FontScalingPanel_smallLetter">A</span>}
                end={<span className="mx_FontScalingPanel_largeLetter">A</span>}
            />
            <div className="mx_FontScalingPanel_preview">
                <div style={{ zoom: previewScale }}>
                    <EventTilePreview
                        message={_t("common|preview_message")}
                        layout={layout}
                        userId={userId}
                        displayName={displayName}
                        avatarUrl={avatarMxc}
                    />
                </div>
            </div>
        </SettingsSubsection>
    );
}
