/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type ComponentProps, type JSX, memo, useContext, useId, useLayoutEffect, useState } from "react";
import { ChatFilter, IconButton } from "@vector-im/compound-web";
import ChevronDownIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-down";

import { Flex } from "../../core/utils/Flex";
import { RovingTabIndexContext, RovingTabIndexProvider, useRovingTabIndex } from "../../core/roving";
import { _t } from "../../core/i18n/i18n";
import { useCollapseFilters } from "./useCollapseFilters";
import { useVisibleFilters, type FilterId } from "./useVisibleFilters";
import styles from "./RoomListPrimaryFilters.module.css";

/**
 * Maps filter IDs to translated labels
 */
const filterIdToLabel = (filterId: FilterId): string => {
    switch (filterId) {
        case "unread":
            return _t("room_list|filters|unread");
        case "people":
            return _t("room_list|filters|people");
        case "rooms":
            return _t("room_list|filters|rooms");
        case "mentions":
            return _t("room_list|filters|mentions");
        case "invites":
            return _t("room_list|filters|invites");
        case "low_priority":
            return _t("room_list|filters|low_priority");
    }
};

/**
 * A filter that holds the filters' one Tab stop while it is the active one, as the options of a listbox do: the arrow
 * keys move through the filters and Tab leaves them. While the active filter is hidden, because it wrapped while the
 * filters are collapsed, the first filter shown holds the stop instead.
 */
function RovingChatFilter(props: ComponentProps<typeof ChatFilter>): JSX.Element {
    const [onFocus, , ref, nodeRef] = useRovingTabIndex<HTMLButtonElement>();
    const { state } = useContext(RovingTabIndexContext);

    // ChatFilter renders tabIndex 0 whatever it is given, so the stop is set on its button, which React leaves alone as
    // the value it renders never changes. Which filters are shown changes outside React (useCollapseFilters), so this
    // runs after every render.
    useLayoutEffect(() => {
        const node = nodeRef.current;
        if (!node) return;
        const isShown = (element?: HTMLElement): element is HTMLElement => !!element && element.offsetParent !== null;
        const holder = isShown(state.activeNode) ? state.activeNode : state.nodes.find(isShown);
        node.tabIndex = node === holder ? 0 : -1;
    });

    return <ChatFilter {...props} ref={ref} onFocus={onFocus} />;
}

/**
 * Props for RoomListPrimaryFilters component
 */
export interface RoomListPrimaryFiltersProps {
    /** Array of filter IDs to display */
    filterIds: FilterId[];
    /** Currently active filter ID (if any) */
    activeFilterId?: FilterId;
    /** Callback when a filter is toggled */
    onToggleFilter: (filterId: FilterId) => void;
}

/**
 * The primary filters component for the room list.
 * Displays a collapsible list of filters with expand/collapse functionality.
 */
export const RoomListPrimaryFilters = memo(function RoomListPrimaryFilters({
    filterIds,
    activeFilterId,
    onToggleFilter,
}: RoomListPrimaryFiltersProps): JSX.Element | null {
    const id = useId();
    const [isExpanded, setIsExpanded] = useState(false);

    const {
        ref,
        isWrapping: displayChevron,
        wrappingIndex,
    } = useCollapseFilters<HTMLUListElement>(isExpanded, "wrapping");
    const visibleFilterIds = useVisibleFilters(filterIds, activeFilterId, wrappingIndex);

    // Telement: the chevron follows the filters, where it is drawn, so that Tab reaches it after them
    return (
        <Flex
            className={styles.roomListPrimaryFilters}
            data-testid="primary-filters"
            gap="var(--cpd-space-3x)"
            justify="space-between"
        >
            <RovingTabIndexProvider handleLeftRight handleHomeEnd>
                {({ onKeyDownHandler }) => (
                    <Flex
                        id={id}
                        as="div"
                        role="listbox"
                        aria-label={_t("room_list|primary_filters")}
                        aria-orientation="horizontal"
                        align="center"
                        gap="var(--cpd-space-2x)"
                        wrap="wrap"
                        className={styles.list}
                        ref={ref}
                        onKeyDown={onKeyDownHandler}
                    >
                        {visibleFilterIds.map((filterId, index) => (
                            <RovingChatFilter
                                // oxlint-disable-next-line react/no-array-index-key
                                key={`${filterId}-${index}`}
                                role="option"
                                aria-selected={filterId === activeFilterId}
                                selected={filterId === activeFilterId}
                                onClick={() => onToggleFilter(filterId)}
                            >
                                {filterIdToLabel(filterId)}
                            </RovingChatFilter>
                        ))}
                    </Flex>
                )}
            </RovingTabIndexProvider>
            {displayChevron && (
                <IconButton
                    aria-expanded={isExpanded}
                    aria-controls={id}
                    className={styles.iconButton}
                    aria-label={isExpanded ? _t("room_list|collapse_filters") : _t("room_list|expand_filters")}
                    size="28px"
                    // Whole pixels around a 20px icon inside the outline, where Compound pads a 28px button by 3.5px
                    style={{ padding: "calc(var(--cpd-space-1x) - var(--cpd-border-width-1))" }}
                    onClick={() => setIsExpanded((expanded) => !expanded)}
                >
                    <ChevronDownIcon />
                </IconButton>
            )}
        </Flex>
    );
});
