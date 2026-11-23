/*
 * Copyright 2024 New Vector Ltd.
 * Copyright 2024 The Matrix.org Foundation C.I.C.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX, type PropsWithChildren } from "react";
import { type Room } from "matrix-js-sdk/src/matrix";
import { ValueRowList } from "@element-hq/web-shared-components";

import { useMatrixClientContext } from "../../../contexts/MatrixClientContext";
import { _t } from "../../../languageHandler";
import SettingsFieldset from "./SettingsFieldset";
import Modal from "../../../Modal";
import QuestionDialog from "../dialogs/QuestionDialog";
import { warnSelfDemote } from "../right_panel/UserInfo";
import { mediaFromMxc } from "../../../customisations/Media";
import { PowerLevelRow } from "../../../telement/settings/PowerLevelRow";

/**
 * Display in a fieldset, the power level of the users and allow to change them.
 * Telement: each user is a 52px row with their avatar, name and Matrix ID, and their role as a value at the row's end
 * (PowerLevelRow), applied as soon as it is chosen, as Telegram lists a group's administrators.
 * If there is no user to display, the children is displayed instead.
 */
interface PowerLevelSelectorProps {
    /**
     * The room whose users these are, which gives their names and avatars
     */
    room: Room;
    /**
     * The power levels of the users
     * The key is the user id and the value is the power level
     */
    userLevels: Record<string, number>;
    /**
     * Whether the user can change the power levels of other users
     */
    canChangeLevels: boolean;
    /**
     * The current user's own power level
     */
    currentUserLevel: number;
    /**
     * Applies a new power level as soon as it is chosen. A rejected promise puts the previous one back.
     * @param value - new power level for the user
     * @param userId - the user id
     */
    onClick: (value: number, userId: string) => void | Promise<void>;
    /**
     * Filter the users to display
     * @param user
     */
    filter: (user: string) => boolean;
    /**
     * The title of the fieldset
     */
    title: string;
}

/**
 * Asks before a change that can't be undone, as the member info does: promoting someone to the user's own level, or
 * demoting themselves.
 * @returns whether to go ahead
 */
async function confirmPowerLevelChange(room: Room, isMe: boolean, value: number, myLevel: number): Promise<boolean> {
    if (isMe && value < myLevel) return warnSelfDemote(room.isSpaceRoom());
    if (!isMe && value >= myLevel) {
        const { finished } = Modal.createDialog(QuestionDialog, {
            title: _t("common|warning"),
            description: (
                <div>
                    {_t("user_info|promote_warning")}
                    <br />
                    {_t("common|are_you_sure")}
                </div>
            ),
            button: _t("action|continue"),
        });
        const [confirmed] = await finished;
        return !!confirmed;
    }
    return true;
}

export function PowerLevelSelector({
    room,
    userLevels,
    canChangeLevels,
    currentUserLevel,
    onClick,
    filter,
    title,
    children,
}: PropsWithChildren<PowerLevelSelectorProps>): JSX.Element | null {
    const matrixClient = useMatrixClientContext();

    const collator = new Intl.Collator();

    // We sort the users by power level, then we filter them
    const users = Object.keys(userLevels)
        .sort((userA, userB) => sortUser(collator, userA, userB, userLevels))
        .filter(filter);

    // No user to display, we return the children into fragment to convert it to JSX.Element type
    if (!users.length) return <>{children}</>;

    return (
        <SettingsFieldset legend={title}>
            <ValueRowList>
                {users.map((userId) => {
                    // We only want to display users with a valid power level aka an integer
                    if (!Number.isInteger(userLevels[userId])) return;

                    const isMe = userId === matrixClient.getUserId();
                    // If I can change levels, I can change the level of anyone with a lower level than mine
                    const canChange = canChangeLevels && (userLevels[userId] < currentUserLevel || isMe);

                    const member = room.getMember(userId);
                    const name = member?.name || userId;
                    const avatarMxc = member?.getMxcAvatarUrl();

                    return (
                        <PowerLevelRow
                            key={userId}
                            label={name}
                            description={name === userId ? undefined : userId}
                            avatar={{
                                id: userId,
                                name,
                                src: avatarMxc
                                    ? (mediaFromMxc(avatarMxc).getSquareThumbnailHttp(36) ?? undefined)
                                    : undefined,
                            }}
                            value={userLevels[userId]}
                            disabled={!canChange}
                            maxValue={currentUserLevel}
                            onChange={async (value) => {
                                if (!(await confirmPowerLevelChange(room, isMe, value, currentUserLevel))) {
                                    throw new Error("Power level change cancelled");
                                }
                                await onClick(value, userId);
                            }}
                        />
                    );
                })}
            </ValueRowList>
        </SettingsFieldset>
    );
}

/**
 * Sort the users by power level, then by name
 * @param userA
 * @param userB
 * @param userLevels
 */
function sortUser(
    collator: Intl.Collator,
    userA: string,
    userB: string,
    userLevels: PowerLevelSelectorProps["userLevels"],
): number {
    const powerLevelDiff = userLevels[userA] - userLevels[userB];
    return powerLevelDiff !== 0
        ? powerLevelDiff
        : collator.compare(userA.toLocaleLowerCase(), userB.toLocaleLowerCase());
}
