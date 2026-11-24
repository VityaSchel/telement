/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { RightPanelPhases } from "../../stores/right-panel/RightPanelStorePhases";

/** Where the room header's buttons say which element they open and close (`aria-controls`). */
export const RIGHT_PANEL_ID = "mx_RightPanel";

/**
 * The phases of one of the right panel's panes. The panel shows one pane at a time, and the pane's button in the room
 * header opens and closes it. The first phase is the pane itself; the others are pages that replace it, from which the
 * button goes back to it.
 */
export type RightPanelPane = readonly [pane: RightPanelPhases, ...pages: RightPanelPhases[]];

export const ROOM_INFO_PANE: RightPanelPane = [
    RightPanelPhases.RoomSummary,
    RightPanelPhases.FilePanel,
    RightPanelPhases.PinnedMessages,
    RightPanelPhases.Extensions,
    RightPanelPhases.Widget,
    RightPanelPhases.DocumentViewer,
];

export const THREADS_PANE: RightPanelPane = [RightPanelPhases.ThreadPanel, RightPanelPhases.ThreadView];

export const PEOPLE_PANE: RightPanelPane = [
    RightPanelPhases.MemberList,
    RightPanelPhases.MemberInfo,
    RightPanelPhases.ThreePidMemberInfo,
    RightPanelPhases.EncryptionPanel,
];

/**
 * Room info in a DM, whose header has no people button: the list of people, opened from room info, and a person's
 * profile are pages of room info there.
 */
export const DM_INFO_PANE: RightPanelPane = [...ROOM_INFO_PANE, ...PEOPLE_PANE];

export const NOTIFICATIONS_PANE: RightPanelPane = [RightPanelPhases.NotificationPanel];

export const CHAT_PANE: RightPanelPane = [RightPanelPhases.Timeline];
