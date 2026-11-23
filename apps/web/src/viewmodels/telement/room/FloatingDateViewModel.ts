/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import {
    BaseViewModel,
    type FloatingDateViewModel as FloatingDateViewModelInterface,
    type FloatingDateViewSnapshot,
} from "@element-hq/web-shared-components";
import { type Room } from "matrix-js-sdk/src/matrix";

import SettingsStore from "../../../settings/SettingsStore";
import { UIFeature } from "../../../settings/UIFeature";
import { type FloatingDateScrollPosition } from "../../../telement/room/FloatingDateScrollPosition";
import { DateSeparatorViewModel } from "../../room/timeline/DateSeparatorViewModel";

/** How long the pill stays after the timeline stops scrolling, as in Telegram. */
export const FLOATING_DATE_IDLE_MS = 1000;

export interface FloatingDateViewModelProps {
    /** The room whose timeline scrolls. */
    room: Room;
}

/**
 * View model of the timeline's floating date pill, which shows the date of the first message in view while the timeline
 * scrolls and hides a second after it stops, as Telegram's does. It doesn't show at the bottom of the timeline, where
 * arriving messages scroll it, nor over a date separator of the timeline's own.
 */
export class FloatingDateViewModel
    extends BaseViewModel<FloatingDateViewSnapshot, FloatingDateViewModelProps>
    implements FloatingDateViewModelInterface
{
    private idleTimer?: ReturnType<typeof setTimeout>;

    public constructor(props: FloatingDateViewModelProps) {
        super(props, { label: "", visible: false, endInset: 0 });
        this.disposables.track(() => clearTimeout(this.idleTimer));
    }

    /** Shows the date of the first message in view, until the timeline has been still for a second. */
    public onScroll = ({ eventId, separatorUnderPill, atBottom, endInset }: FloatingDateScrollPosition): void => {
        const ts = eventId ? this.props.room.findEventById(eventId)?.getTs() : undefined;
        clearTimeout(this.idleTimer);
        if (ts === undefined || atBottom) {
            this.snapshot.merge({ visible: false });
            return;
        }

        const relativeDatesEnabled = SettingsStore.getValue(UIFeature.TimelineEnableRelativeDates);
        this.snapshot.merge({
            label: DateSeparatorViewModel.computeLabel({ ts }, relativeDatesEnabled),
            visible: !separatorUnderPill,
            endInset,
        });
        this.idleTimer = setTimeout(() => this.snapshot.merge({ visible: false }), FLOATING_DATE_IDLE_MS);
    };
}
