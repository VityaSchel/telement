/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { type Room } from "matrix-js-sdk/src/matrix";
import { Button } from "@vector-im/compound-web";
import { PlusIcon, RoomIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import { EmptyStateView } from "@element-hq/web-shared-components";

import { _t } from "../../languageHandler";
import { shouldShowComponent } from "../../customisations/helpers/UIComponents";
import { UIComponent } from "../../settings/UIFeature";
import { showAddExistingRooms, showCreateNewRoom } from "../../utils/space";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";

interface Props {
    /** The space whose home has no rooms */
    space: Room;
    /** Whether the user may add rooms to the space, which earns them the buttons that do it */
    canAddRooms: boolean;
}

/**
 * What a space's home shows under "Rooms and spaces" while the space has no rooms: the right panel's empty state, with
 * buttons that add an existing room or create one for the people who may add rooms, and the text alone for others.
 */
export function SpaceHomeEmptyState({ space, canAddRooms }: Readonly<Props>): JSX.Element {
    const onNewRoom = async (): Promise<void> => {
        if (await showCreateNewRoom(space)) {
            defaultDispatcher.fire(Action.UpdateSpaceHierarchy);
        }
    };

    return (
        <EmptyStateView
            className="mx_SpaceHomeEmptyState"
            Icon={RoomIcon}
            title={_t("telement|space_home|empty_title")}
            description={
                canAddRooms
                    ? _t("telement|space_home|empty_description")
                    : _t("telement|space_home|empty_description_no_rights")
            }
        >
            {canAddRooms && (
                <>
                    <Button size="md" kind="secondary" Icon={PlusIcon} onClick={() => showAddExistingRooms(space)}>
                        {_t("action|add_existing_room")}
                    </Button>
                    {shouldShowComponent(UIComponent.CreateRooms) && (
                        <Button size="md" kind="secondary" Icon={RoomIcon} onClick={onNewRoom}>
                            {_t("action|new_room")}
                        </Button>
                    )}
                </>
            )}
        </EmptyStateView>
    );
}
