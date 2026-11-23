/*
Copyright 2024 New Vector Ltd.
Copyright 2024 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import SearchIcon from "@vector-im/compound-design-tokens/assets/web/icons/search";
import CloseIcon from "@vector-im/compound-design-tokens/assets/web/icons/close";
import ChevronUpIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-up";
import ChevronDownIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-down";
import { IconButton, Link } from "@vector-im/compound-web";

import { _t } from "../../../languageHandler";
import SearchWarning, { WarningKind } from "../elements/SearchWarning";
import { type SearchInfo, SearchScope } from "../../../Searching";
import InlineSpinner from "../elements/InlineSpinner";
import { type SearchStep, searchHitEvents } from "../../../telement/room/searchHits";

interface Props {
    searchInfo?: SearchInfo;
    isRoomEncrypted: boolean;
    onSearchScopeChange(this: void, scope: SearchScope): void;
    onCancelClick(this: void): void;
    /** Telement: opens the result before or after the one the timeline shows, or the newest from the list. */
    onStepResult?(this: void, step: SearchStep): void;
    /** Telement: shows the list of results again in place of the timeline. */
    onShowResults?(this: void): void;
}

const RoomSearchAuxPanel: React.FC<Props> = ({
    searchInfo,
    isRoomEncrypted,
    onSearchScopeChange,
    onCancelClick,
    onStepResult,
    onShowResults,
}) => {
    const scope = searchInfo?.scope ?? SearchScope.Room;
    // Telement: a search of this room steps through its results in the timeline, as Telegram's in-chat search does: up
    // to older results, down to newer ones, with the place of the one shown among them
    const loaded = searchHitEvents(searchInfo?.results).length;
    const hit = searchInfo?.hit;
    const stepping = scope === SearchScope.Room && !!onStepResult && loaded > 0;
    const canStepOlder = hit === undefined || hit + 1 < loaded || !!searchInfo?.results?.next_batch;
    const canStepNewer = hit !== undefined && hit > 0;

    return (
        <div className="mx_RoomSearchAuxPanel">
            <div className="mx_RoomSearchAuxPanel_summary">
                <SearchIcon width="24px" height="24px" />
                <div className="mx_RoomSearchAuxPanel_summary_text">
                    {searchInfo?.count !== undefined ? (
                        _t(
                            "room|search|summary",
                            { count: searchInfo.count },
                            { query: () => <strong>{searchInfo.term}</strong> },
                        )
                    ) : searchInfo?.error !== undefined ? (
                        searchInfo?.error.message
                    ) : (
                        <InlineSpinner />
                    )}
                    <SearchWarning
                        kind={WarningKind.Search}
                        isRoomEncrypted={isRoomEncrypted}
                        showLogo={false}
                        scope={scope}
                        roomId={searchInfo?.roomId}
                    />
                </div>
            </div>
            <div className="mx_RoomSearchAuxPanel_buttons">
                {hit !== undefined && onShowResults ? (
                    <Link className="mx_RoomSearchAuxPanel_scopeButton" onClick={onShowResults} kind="primary">
                        {_t("telement|search|show_results")}
                    </Link>
                ) : (
                    <Link
                        className="mx_RoomSearchAuxPanel_scopeButton"
                        onClick={() =>
                            onSearchScopeChange(scope === SearchScope.Room ? SearchScope.All : SearchScope.Room)
                        }
                        kind="primary"
                    >
                        {scope === SearchScope.All
                            ? _t("room|search|this_room_button")
                            : _t("room|search|all_rooms_button")}
                    </Link>
                )}
                {stepping && (
                    <div className="mx_RoomSearchAuxPanel_steps">
                        {hit !== undefined && (
                            <span className="mx_RoomSearchAuxPanel_position">
                                {_t("telement|search|result_position", {
                                    number: hit + 1,
                                    total: Math.max(searchInfo?.count ?? 0, loaded),
                                })}
                            </span>
                        )}
                        <IconButton
                            onClick={() => onStepResult("older")}
                            disabled={!canStepOlder}
                            size="var(--tl-control-size)"
                            style={{ padding: "var(--cpd-space-1-5x)" }}
                            tooltip={_t("telement|search|older_result")}
                            aria-label={_t("telement|search|older_result")}
                        >
                            <ChevronUpIcon />
                        </IconButton>
                        <IconButton
                            onClick={() => onStepResult("newer")}
                            disabled={!canStepNewer}
                            size="var(--tl-control-size)"
                            style={{ padding: "var(--cpd-space-1-5x)" }}
                            tooltip={_t("telement|search|newer_result")}
                            aria-label={_t("telement|search|newer_result")}
                        >
                            <ChevronDownIcon />
                        </IconButton>
                    </div>
                )}
                {/* Closing the search destroys nothing, so it is the gray 36px close button of the right panel's
                    cards, around a 24px icon */}
                <IconButton
                    onClick={onCancelClick}
                    size="var(--tl-control-size)"
                    style={{ padding: "var(--cpd-space-1-5x)" }}
                    tooltip={_t("action|cancel")}
                    aria-label={_t("action|cancel")}
                >
                    <CloseIcon />
                </IconButton>
            </div>
        </div>
    );
};

export default RoomSearchAuxPanel;
