/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { type MouseEventHandler } from "react";
import { type MatrixEvent } from "matrix-js-sdk/src/matrix";
import {
    BaseViewModel,
    type TileErrorViewSnapshot as TileErrorViewSnapshotInterface,
    type TileErrorViewModel as TileErrorViewModelInterface,
} from "@element-hq/web-shared-components";

import { _t } from "../../languageHandler";
import Modal from "../../Modal";
import ViewSource from "../../components/structures/ViewSource";

export interface TileErrorViewModelProps {
    /**
     * Event whose tile failed to render.
     */
    mxEvent: MatrixEvent;
    /**
     * Whether developer mode is enabled, which controls the view-source action.
     */
    developerMode: boolean;
}

/**
 * Returns the localized view-source action label when developer mode is enabled.
 */
function getViewSourceCtaLabel(developerMode: boolean): string | undefined {
    return developerMode ? _t("action|view_source") : undefined;
}

/**
 * ViewModel for the tile error fallback, providing the snapshot shown when a tile fails to render.
 *
 * The snapshot includes the fallback message, event type, and optional view-source action label.
 * The view model also exposes a click handler for that action, opening the view-source dialog
 * when available.
 */
export class TileErrorViewModel
    extends BaseViewModel<TileErrorViewSnapshotInterface, TileErrorViewModelProps>
    implements TileErrorViewModelInterface
{
    private static readonly computeSnapshot = (props: TileErrorViewModelProps): TileErrorViewSnapshotInterface => ({
        message: _t("timeline|error_rendering_message"),
        eventType: props.mxEvent.getType(),
        viewSourceCtaLabel: getViewSourceCtaLabel(props.developerMode),
    });

    public constructor(props: TileErrorViewModelProps) {
        super(props, TileErrorViewModel.computeSnapshot(props));
    }

    public setDeveloperMode(developerMode: boolean): void {
        this.props.developerMode = developerMode;

        const nextViewSourceCtaLabel = getViewSourceCtaLabel(developerMode);
        this.snapshot.merge({ viewSourceCtaLabel: nextViewSourceCtaLabel });
    }

    public onViewSourceClick: MouseEventHandler<HTMLButtonElement> = () => {
        if (!this.snapshot.current.viewSourceCtaLabel) {
            return;
        }

        Modal.createDialog(
            ViewSource,
            {
                mxEvent: this.props.mxEvent,
            },
            "mx_Dialog_viewsource",
        );
    };
}
