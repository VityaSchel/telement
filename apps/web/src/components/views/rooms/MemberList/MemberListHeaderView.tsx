/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { Button, Tooltip } from "@vector-im/compound-web";
import React, { type KeyboardEvent, useState } from "react";
import InviteIcon from "@vector-im/compound-design-tokens/assets/web/icons/user-add";
import { UserAddIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import { SearchFieldView } from "@element-hq/web-shared-components";

import { type MemberListViewState } from "../../../viewmodels/memberlist/MemberListViewModel";
import { _t } from "../../../../languageHandler";
import { Key } from "../../../../Keyboard";

interface TooltipProps {
    canInvite: boolean;
    children: React.ReactNode;
}

const InviteTooltip: React.FC<TooltipProps> = ({ canInvite, children }) => {
    const description: string = canInvite ? _t("action|invite") : _t("member_list|invite_button_no_perms_tooltip");
    // If the user isn't allowed to invite others to this room, wrap with a relevant tooltip.
    return <Tooltip description={description}>{children}</Tooltip>;
};

interface Props {
    vm: MemberListViewState;
}

const InviteButton: React.FC<Props> = ({ vm }) => {
    const shouldShowInvite = vm.shouldShowInvite;
    const shouldShowSearch = vm.shouldShowSearch;
    const disabled = !vm.canInvite;

    if (!shouldShowInvite) {
        // In this case, invite button should not be rendered.
        return null;
    }

    if (shouldShowSearch) {
        /// When rendered alongside a search box, the invite button is just an icon.
        return (
            <InviteTooltip canInvite={vm.canInvite}>
                <Button
                    kind="primary"
                    onClick={vm.onInviteButtonClick}
                    size="md"
                    iconOnly={true}
                    Icon={InviteIcon}
                    disabled={disabled}
                    aria-label={_t("action|invite")}
                    type="button"
                />
            </InviteTooltip>
        );
    }

    // Without a search box, invite button is a full size button.
    return (
        <InviteTooltip canInvite={vm.canInvite}>
            <Button
                kind="primary"
                className="mx_MemberListHeaderView_inviteButton"
                size="md"
                Icon={UserAddIcon}
                disabled={!vm.canInvite}
                onClick={vm.onInviteButtonClick}
                type="button"
            >
                {_t("action|invite")}
            </Button>
        </InviteTooltip>
    );
};

/**
 * Telement: the card's controls, the search field and the invite button, in a second header that stays over the list as
 * it scrolls. How many people there are is in the card's title.
 */
export const MemberListHeaderView: React.FC<Props> = ({ vm }: Props) => {
    const [query, setQuery] = useState("");

    if (!vm.shouldShowSearch && !vm.shouldShowInvite) {
        // No search box and no invite icon, so nothing to render!
        return null;
    }

    const search = (newQuery: string): void => {
        setQuery(newQuery);
        vm.search(newQuery);
    };

    // Escape empties the field first, and then closes the panel
    const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== Key.ESCAPE || !query || event.nativeEvent.isComposing) return;
        event.preventDefault();
        event.stopPropagation();
        search("");
    };

    return (
        <header className="mx_BaseCard_controls mx_MemberListHeaderView">
            {vm.shouldShowSearch && (
                <SearchFieldView
                    className="mx_MemberListHeaderView_search"
                    name="searchMembers"
                    role="searchbox"
                    placeholder={_t("member_list|filter_placeholder")}
                    value={query}
                    onChange={search}
                    onKeyDown={onKeyDown}
                />
            )}
            <InviteButton vm={vm} />
        </header>
    );
};
