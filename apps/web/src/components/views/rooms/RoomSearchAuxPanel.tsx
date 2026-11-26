/*
Copyright 2024 New Vector Ltd.
Copyright 2024 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type KeyboardEvent, useEffect, useRef, useState } from "react";
import ChevronUpIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-up";
import ChevronDownIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-down";
import CloseIcon from "@vector-im/compound-design-tokens/assets/web/icons/close";
import { IconButton, Link } from "@vector-im/compound-web";
import { SearchFieldView } from "@element-hq/web-shared-components";

import { _t } from "../../../languageHandler";
import SearchWarning, { WarningKind } from "../elements/SearchWarning";
import { type SearchInfo, SearchScope } from "../../../Searching";
import InlineSpinner from "../elements/InlineSpinner";
import { type SearchStep, searchHitEvents } from "../../../telement/room/searchHits";
import { Key } from "../../../Keyboard";
import { useDispatcher } from "../../../hooks/useDispatcher";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";

interface Props {
    /** The search, unless the field is empty. */
    searchInfo?: SearchInfo;
    isRoomEncrypted: boolean;
    /** Telement: what the user searches for, as they type it. */
    onSearchChange(this: void, term: string): void;
    onSearchScopeChange(this: void, scope: SearchScope): void;
    onCancelClick(this: void): void;
    /** Telement: opens the result before or after the one the timeline shows, or the newest from the list. */
    onStepResult?(this: void, step: SearchStep): void;
    /** Telement: shows the list of results again in place of the timeline. */
    onShowResults?(this: void): void;
}

/**
 * Telement: the search bar that the room header's search button opens over the timeline. It holds the search field,
 * where Element's stood in room info, and what a search found.
 */
const RoomSearchAuxPanel: React.FC<Props> = ({
    searchInfo,
    isRoomEncrypted,
    onSearchChange,
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

    // The search starts a moment after the last key, so the field holds what is typed until then. A search started
    // elsewhere, as from the search dialog, is shown in it.
    const term = searchInfo?.term ?? "";
    const [value, setValue] = useState(term);
    useEffect(() => {
        if (term) setValue(term);
    }, [term]);

    const inputRef = useRef<HTMLInputElement>(null);
    useDispatcher(defaultDispatcher, (payload) => {
        if (payload.action === Action.FocusMessageSearch) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    });

    const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== Key.ESCAPE || event.nativeEvent.isComposing) return;
        event.preventDefault();
        event.stopPropagation();
        onCancelClick();
    };

    let details: JSX.Element | undefined;
    if (searchInfo) {
        details = (
            <div className="mx_RoomSearchAuxPanel_details">
                <div className="mx_RoomSearchAuxPanel_summary_text">
                    {searchInfo.count !== undefined ? (
                        _t(
                            "room|search|summary",
                            { count: searchInfo.count },
                            { query: () => <strong>{searchInfo.term}</strong> },
                        )
                    ) : searchInfo.error !== undefined ? (
                        searchInfo.error.message
                    ) : (
                        <InlineSpinner />
                    )}
                    <SearchWarning
                        kind={WarningKind.Search}
                        isRoomEncrypted={isRoomEncrypted}
                        showLogo={false}
                        scope={scope}
                        roomId={searchInfo.roomId}
                    />
                </div>
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
            </div>
        );
    }

    return (
        <div className="mx_RoomSearchAuxPanel" role="search" onKeyDown={onKeyDown}>
            <div className="mx_RoomSearchAuxPanel_bar">
                <SearchFieldView
                    className="mx_RoomSearchAuxPanel_field"
                    placeholder={_t("room|search|placeholder")}
                    name="room_message_search"
                    // A search field to assistive technology, as the browser's search input was
                    role="searchbox"
                    value={value}
                    onChange={(value) => {
                        setValue(value);
                        onSearchChange(value);
                    }}
                    ref={inputRef}
                    autoFocus
                />
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
                {/* The bar's own cross, after the arrows and a gap away from the field's, which only empties it */}
                <IconButton
                    onClick={onCancelClick}
                    size="var(--tl-control-size)"
                    style={{ padding: "var(--cpd-space-1-5x)" }}
                    tooltip={_t("telement|search|close_search")}
                    aria-label={_t("telement|search|close_search")}
                >
                    <CloseIcon />
                </IconButton>
            </div>
            {details}
        </div>
    );
};

export default RoomSearchAuxPanel;
