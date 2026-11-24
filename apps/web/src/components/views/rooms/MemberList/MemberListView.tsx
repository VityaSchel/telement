/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { Text } from "@vector-im/compound-web";
import React, { type JSX, useCallback, useMemo } from "react";
import { type VirtualizedListContext, FlatVirtualizedList } from "@element-hq/web-shared-components";

import {
    type MemberWithSeparator,
    SEPARATOR,
    useMemberListViewModel,
} from "../../../viewmodels/memberlist/MemberListViewModel";
import { RoomMemberTileView } from "./tiles/RoomMemberTileView";
import { ThreePidInviteTileView } from "./tiles/ThreePidInviteTileView";
import { MemberListHeaderView } from "./MemberListHeaderView";
import BaseCard from "../../right_panel/BaseCard";
import Spinner from "../../elements/Spinner";
import { _t } from "../../../../languageHandler";
import { formatCountLong } from "../../../../utils/FormattingUtils";

interface IProps {
    roomId: string;
}

/**
 * Height of a single member list item
 */
const MEMBER_LIST_ITEM_HEIGHT = 56;
/**
 * Amount to extend the top and bottom of the viewport by.
 * From manual testing 15 items seems to be enough to never really see the blank space when scrolling.
 */
const EXTENDED_VIEWPORT_HEIGHT = 15 * MEMBER_LIST_ITEM_HEIGHT;

const MemberListView: React.FC<IProps> = (props: IProps) => {
    const vm = useMemberListViewModel(props.roomId);
    const { isPresenceEnabled } = vm;

    // While the list is filtered, those listed
    const memberCount = useMemo(() => vm.members.filter((item) => item !== SEPARATOR).length, [vm.members]);

    const getItemKey = useCallback((item: MemberWithSeparator): string => {
        if (item === SEPARATOR) {
            return "separator";
        } else if (item.member) {
            return `member-${item.member.userId}`;
        } else {
            return `threePidInvite-${item.threePidInvite.event.getStateKey()}`;
        }
    }, []);

    const getItemComponent = useCallback(
        (
            index: number,
            item: MemberWithSeparator,
            context: VirtualizedListContext<any>,
            onFocus: (item: MemberWithSeparator, e: React.FocusEvent) => void,
        ): JSX.Element => {
            const itemKey = getItemKey(item);
            const isRovingItem = itemKey === context.tabIndexKey;
            const focused = isRovingItem && context.focused;
            if (item === SEPARATOR) {
                return <hr className="mx_MemberListView_separator" />;
            } else if (item.member) {
                return (
                    <RoomMemberTileView
                        item={item}
                        member={item.member}
                        showPresence={isPresenceEnabled}
                        focused={focused}
                        tabIndex={isRovingItem ? 0 : -1}
                        index={index}
                        memberCount={memberCount}
                        onFocus={onFocus}
                    />
                );
            } else {
                return (
                    <ThreePidInviteTileView
                        item={item}
                        threePidInvite={item.threePidInvite}
                        focused={focused}
                        tabIndex={isRovingItem ? 0 : -1}
                        memberIndex={index - 1} // Adjust as invites are below the separator
                        memberCount={memberCount}
                        onFocus={onFocus}
                    />
                );
            }
        },
        [isPresenceEnabled, getItemKey, memberCount],
    );

    const isItemFocusable = useCallback((item: MemberWithSeparator): boolean => {
        return item !== SEPARATOR;
    }, []);

    let list: JSX.Element;
    if (vm.isLoading) {
        list = <Spinner />;
    } else if (!memberCount) {
        list = (
            <Text as="div" size="sm" className="mx_MemberListView_noMatches" role="status">
                {_t("member_list|no_matches")}
            </Text>
        );
    } else {
        list = (
            <FlatVirtualizedList
                items={vm.members}
                getItemComponent={getItemComponent}
                getItemKey={getItemKey}
                isItemFocusable={isItemFocusable}
                role="listbox"
                aria-label={_t("member_list|list_title")}
                fixedItemHeight={MEMBER_LIST_ITEM_HEIGHT}
                increaseViewportBy={{
                    bottom: EXTENDED_VIEWPORT_HEIGHT,
                    top: EXTENDED_VIEWPORT_HEIGHT,
                }}
            />
        );
    }

    return (
        <BaseCard
            id="memberlist-panel"
            className="mx_MemberListView"
            ariaLabelledBy="memberlist-panel-tab"
            role="tabpanel"
            header={_t("telement|right_panel|people_count", { total: formatCountLong(vm.peopleCount) })}
            // The list scrolls on its own, under the card's two headers
            withoutScrollContainer
        >
            <MemberListHeaderView vm={vm} />
            {list}
        </BaseCard>
    );
};

export default MemberListView;
