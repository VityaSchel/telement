/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type ChangeEvent, type JSX, useEffect, useRef, useState } from "react";
import { type IEventRelation, M_POLL_START, type Room, THREAD_RELATION_TYPE } from "matrix-js-sdk/src/matrix";
import { UploadButton, useCreateAutoDisposedViewModel } from "@element-hq/web-shared-components";

import { _t } from "../../languageHandler";
import Modal from "../../Modal";
import ErrorDialog from "../../components/views/dialogs/ErrorDialog";
import PollCreateDialog from "../../components/views/elements/PollCreateDialog";
import LocationShareMenu from "../../components/views/location/LocationShareMenu";
import { type MenuProps } from "../../components/structures/ContextMenu";
import { useMatrixClientContext } from "../../contexts/MatrixClientContext";
import { useRoomUploadViewModel } from "../../viewmodels/room/RoomUploadViewModel";
import { AttachMenuViewModel } from "../../viewmodels/telement/composer/AttachMenuViewModel";

interface AttachButtonProps {
    room: Room;
    /**
     * Thread or other relation of the composer.
     */
    relation?: IEventRelation;
    /**
     * Where menus opened from the composer should appear.
     */
    menuPosition?: MenuProps;
    /**
     * Whether polls are enabled in settings.
     */
    showPolls: boolean;
    /**
     * Whether location sharing is available on this platform.
     */
    showLocation: boolean;
}

function openPollDialog(room: Room, userId: string): void {
    if (!room.currentState.maySendEvent(M_POLL_START.name, userId)) {
        Modal.createDialog(ErrorDialog, {
            title: _t("composer|poll_button_no_perms_title"),
            description: _t("composer|poll_button_no_perms_description"),
        });
        return;
    }
    Modal.createDialog(PollCreateDialog, { room }, "mx_CompoundDialog", false, true);
}

/**
 * The paperclip button of the Telegram composer layout, with its menu of photos and videos, files, module upload
 * options, polls and location.
 */
export function AttachButton({
    room,
    relation,
    menuPosition,
    showPolls,
    showLocation,
}: AttachButtonProps): JSX.Element {
    const client = useMatrixClientContext();
    const roomUpload = useRoomUploadViewModel();
    const photoOrVideoInput = useRef<HTMLInputElement>(null);
    const [locationMenuOpen, setLocationMenuOpen] = useState(false);

    const userId = client.getSafeUserId();
    const sender = room.getMember(userId);
    // Element doesn't allow polls in threads.
    const pollsAvailable = showPolls && relation?.rel_type !== THREAD_RELATION_TYPE.name;
    const locationAvailable = showLocation && !!sender;

    const latestRoom = useRef(room);
    latestRoom.current = room;

    const vm = useCreateAutoDisposedViewModel(
        () =>
            new AttachMenuViewModel({
                roomUpload,
                showPolls: pollsAvailable,
                showLocation: locationAvailable,
                onPhotoOrVideoSelected: () => photoOrVideoInput.current?.click(),
                onPollSelected: () => openPollDialog(latestRoom.current, userId),
                onLocationSelected: () => setLocationMenuOpen(true),
            }),
    );

    useEffect(() => {
        vm.setAvailability(pollsAvailable, locationAvailable);
    }, [vm, pollsAvailable, locationAvailable]);

    const onPhotosOrVideosChosen = (event: ChangeEvent<HTMLInputElement>): void => {
        const files = Array.from(event.currentTarget.files ?? []);
        // Clear the input so picking the same file again still fires a change.
        event.currentTarget.value = "";
        void roomUpload.initiateViaInputFiles(files);
    };

    return (
        <>
            {/* The paperclip is at the composer's start, so its menu lines up with it rather than spilling over the
                room list. The class lifts the menu off the composer's border (_TelegramComposer.pcss). */}
            <UploadButton
                vm={vm}
                className="mx_TelementAttachButton"
                size="36px"
                menuAlign="start"
                menuClassName="mx_TelementAttachMenu"
            />
            <input
                ref={photoOrVideoInput}
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                data-testid="telement-photo-or-video-input"
                onChange={onPhotosOrVideosChosen}
            />
            {locationMenuOpen && sender && (
                <LocationShareMenu
                    menuPosition={menuPosition ?? {}}
                    onFinished={() => setLocationMenuOpen(false)}
                    sender={sender}
                    roomId={room.roomId}
                    openMenu={() => setLocationMenuOpen(true)}
                    relation={relation}
                />
            )}
        </>
    );
}
