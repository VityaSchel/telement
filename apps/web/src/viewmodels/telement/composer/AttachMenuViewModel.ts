/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import {
    BaseViewModel,
    type UploadButtonViewActions,
    type UploadButtonViewSnapshot,
} from "@element-hq/web-shared-components";
import {
    DocumentIcon,
    ImageIcon,
    LocationPinIcon,
    PollsIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../../languageHandler";
import { type RoomUploadViewModel } from "../../room/RoomUploadViewModel";

/**
 * Option types of the attachment menu that Telement handles itself. Other types belong to
 * {@link RoomUploadViewModel}: its local file upload and options that modules add.
 */
export const AttachMenuOption = {
    PhotoOrVideo: "telement.photo_or_video",
    Poll: "telement.poll",
    Location: "telement.location",
} as const;

/**
 * Upload option type of {@link RoomUploadViewModel} that picks any local file.
 */
const LOCAL_FILE_OPTION = "local";

export interface AttachMenuViewModelProps {
    /**
     * Upload view model of the room, which sends files and runs module upload options.
     */
    roomUpload: RoomUploadViewModel;
    /**
     * Whether polls can be created here. Element doesn't allow polls in threads.
     */
    showPolls: boolean;
    /**
     * Whether location sharing is available.
     */
    showLocation: boolean;
    /**
     * Opens a file picker limited to photos and videos.
     */
    onPhotoOrVideoSelected: () => void;
    onPollSelected: () => void;
    onLocationSelected: () => void;
}

/**
 * View model of the composer's paperclip menu in the Telegram layout: photos and videos, files, module upload
 * options, polls and location.
 */
export class AttachMenuViewModel
    extends BaseViewModel<UploadButtonViewSnapshot, AttachMenuViewModelProps>
    implements UploadButtonViewActions
{
    public constructor(props: AttachMenuViewModelProps) {
        super(props, AttachMenuViewModel.computeSnapshot(props));
        const unsubscribe = props.roomUpload.subscribe(this.updateOptions);
        this.disposables.track(unsubscribe);
    }

    private static computeSnapshot(props: AttachMenuViewModelProps): UploadButtonViewSnapshot {
        const uploadOptions = props.roomUpload.getSnapshot().options;
        // The room upload view model offers nothing when the user can't send messages here.
        if (uploadOptions.length === 0) return { options: [] };

        const options: UploadButtonViewSnapshot["options"] = [
            { type: AttachMenuOption.PhotoOrVideo, label: _t("telement|composer|photo_or_video"), icon: ImageIcon },
            ...uploadOptions.map((option) =>
                option.type === LOCAL_FILE_OPTION
                    ? { type: LOCAL_FILE_OPTION, label: _t("telement|composer|file"), icon: DocumentIcon }
                    : option,
            ),
        ];
        if (props.showPolls) {
            options.push({ type: AttachMenuOption.Poll, label: _t("composer|poll_button"), icon: PollsIcon });
        }
        if (props.showLocation) {
            options.push({ type: AttachMenuOption.Location, label: _t("common|location"), icon: LocationPinIcon });
        }
        return { options };
    }

    private readonly updateOptions = (): void => {
        this.snapshot.set(AttachMenuViewModel.computeSnapshot(this.props));
    };

    public setAvailability(showPolls: boolean, showLocation: boolean): void {
        if (this.props.showPolls === showPolls && this.props.showLocation === showLocation) return;
        this.props = { ...this.props, showPolls, showLocation };
        this.updateOptions();
    }

    public onUploadOptionSelected = (type: string): void => {
        switch (type) {
            case AttachMenuOption.PhotoOrVideo:
                this.props.onPhotoOrVideoSelected();
                break;
            case AttachMenuOption.Poll:
                this.props.onPollSelected();
                break;
            case AttachMenuOption.Location:
                this.props.onLocationSelected();
                break;
            default:
                this.props.roomUpload.onUploadOptionSelected(type);
        }
    };
}
