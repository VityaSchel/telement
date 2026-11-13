/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { decode } from "blurhash";
import { logger } from "matrix-js-sdk/src/logger";
import { type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { type MediaEventContent, type VideoInfo } from "matrix-js-sdk/src/types";
import {
    BaseViewModel,
    VideoBodyViewState,
    type VideoBodyViewModel as VideoBodyViewModelInterface,
    type VideoBodyViewSnapshot,
} from "@element-hq/web-shared-components";

import { _t } from "../../languageHandler";
import SettingsStore from "../../settings/SettingsStore";
import { mediaFromContent } from "../../customisations/Media";
import { BLURHASH_FIELD } from "../../utils/image-media";
import { type ImageSize, suggestedSize as suggestedVideoSize } from "../../settings/enums/ImageSize";
import { type MediaEventHelper } from "../../utils/MediaEventHelper";
import { type RoomPermalinkCreator } from "../../utils/permalinks/Permalinks";
import { formatVideoTime } from "../../telement/media/formatVideoTime";
import { openVideoLightbox } from "../../telement/media/VideoLightboxDialog";

export interface VideoBodyViewModelProps {
    /**
     * Video event being rendered.
     */
    mxEvent: MatrixEvent;
    /**
     * Helper for resolving encrypted and unencrypted media sources.
     */
    mediaEventHelper?: MediaEventHelper;
    /**
     * Whether the video is being rendered for export instead of the live timeline.
     */
    forExport?: boolean;
    /**
     * Whether opening the video should be disabled.
     */
    inhibitInteraction?: boolean;
    /**
     * Whether the media should currently be shown instead of the preview button.
     */
    mediaVisible: boolean;
    /**
     * Callback invoked when the hidden-media preview is revealed.
     */
    onPreviewClick?: () => void;
    /**
     * Creates the link to the message that the video viewer's date opens.
     */
    permalinkCreator?: RoomPermalinkCreator;
}

interface InternalState {
    /**
     * Decrypted thumbnail URL for encrypted videos.
     */
    decryptedThumbnailUrl: string | null;
    /**
     * Last media-processing error, if any.
     */
    error: unknown | null;
    /**
     * Whether the blurhash poster is being shown while the real poster loads.
     */
    posterLoading: boolean;
    /**
     * Data URL generated from the blurhash placeholder.
     */
    blurhashUrl: string | null;
    /**
     * Current media sizing preference from settings.
     */
    imageSize: ImageSize;
}

/** Width assumed for a video whose message doesn't give its size. */
const DEFAULT_VIDEO_WIDTH = 1920;

type VideoInfoWithBlurhash = VideoInfo & {
    [BLURHASH_FIELD]?: string;
};

/**
 * View model for the video message body: the video's poster, which opens the video viewer. Telement never plays
 * these videos in the timeline; round video notes have their own body.
 */
export class VideoBodyViewModel
    extends BaseViewModel<VideoBodyViewSnapshot, VideoBodyViewModelProps>
    implements VideoBodyViewModelInterface
{
    private state: InternalState;

    public constructor(props: VideoBodyViewModelProps) {
        const initialState = VideoBodyViewModel.createInitialState();
        super(props, VideoBodyViewModel.computeSnapshot(props, initialState));
        this.state = initialState;

        const imageSizeWatcherRef = SettingsStore.watchSetting("Images.size", null, (_s, _r, _l, _nvl, value) => {
            this.setImageSize(value!);
        });
        this.disposables.track(() => SettingsStore.unwatchSetting(imageSizeWatcherRef));
    }

    public loadInitialMediaIfVisible(): void {
        if (this.props.mediaVisible) {
            void this.loadPoster();
        }
    }

    private static createInitialState(): InternalState {
        return {
            decryptedThumbnailUrl: null,
            error: null,
            posterLoading: false,
            blurhashUrl: null,
            imageSize: SettingsStore.getValue("Images.size"),
        };
    }

    private static getInfo(mxEvent: MatrixEvent): VideoInfoWithBlurhash | undefined {
        return mxEvent.getContent<MediaEventContent & { info?: VideoInfoWithBlurhash }>().info;
    }

    /**
     * The video's size from the event metadata. Without one, the poster still needs a video's shape, so assume a
     * full HD video shaped like its thumbnail, or 16:9.
     */
    private static getVideoSize(mxEvent: MatrixEvent): { w: number; h: number } {
        const info = VideoBodyViewModel.getInfo(mxEvent);
        if (info?.w && info.h) {
            return { w: info.w, h: info.h };
        }

        const thumbnail = info?.thumbnail_info;
        const ratio = thumbnail?.w && thumbnail.h ? thumbnail.w / thumbnail.h : 16 / 9;
        return { w: DEFAULT_VIDEO_WIDTH, h: Math.round(DEFAULT_VIDEO_WIDTH / ratio) };
    }

    /**
     * Derive the aspect ratio for the video frame from the video's size.
     */
    private static getAspectRatio(mxEvent: MatrixEvent): string {
        const { w, h } = VideoBodyViewModel.getVideoSize(mxEvent);
        return `${w}/${h}`;
    }

    /**
     * Compute the rendered video dimensions from the video's size and current image-size setting.
     */
    private static getDimensions(mxEvent: MatrixEvent, imageSize: ImageSize): Required<{ w?: number; h?: number }> {
        return suggestedVideoSize(imageSize, VideoBodyViewModel.getVideoSize(mxEvent));
    }

    /**
     * Format the video's length from the event metadata, which gives it in milliseconds.
     */
    private static getDurationLabel(mxEvent: MatrixEvent): string | undefined {
        const duration = VideoBodyViewModel.getInfo(mxEvent)?.duration;
        if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) {
            return undefined;
        }

        return formatVideoTime(duration / 1000);
    }

    /**
     * Resolve the poster: the decrypted thumbnail of an encrypted video, the blurhash while the thumbnail loads, or
     * the thumbnail's address.
     */
    private static getPosterUrl(props: VideoBodyViewModelProps, state: InternalState): string | undefined {
        if (props.forExport) {
            return undefined;
        }

        const media = mediaFromContent(props.mxEvent.getContent<MediaEventContent>());
        if (media.isEncrypted && state.decryptedThumbnailUrl) {
            return state.decryptedThumbnailUrl;
        }
        if (state.posterLoading && state.blurhashUrl) {
            return state.blurhashUrl;
        }
        // An encrypted thumbnail's address serves the encrypted bytes.
        if (!media.isEncrypted && media.hasThumbnail && media.thumbnailHttp) {
            return media.thumbnailHttp;
        }

        return undefined;
    }

    private static computeSnapshot(props: VideoBodyViewModelProps, state: InternalState): VideoBodyViewSnapshot {
        const content = props.mxEvent.getContent<MediaEventContent>();
        const aspectRatio = VideoBodyViewModel.getAspectRatio(props.mxEvent);
        const { w: maxWidth, h: maxHeight } = VideoBodyViewModel.getDimensions(props.mxEvent, state.imageSize);

        if (state.error !== null) {
            return {
                state: VideoBodyViewState.ERROR,
                errorLabel: _t("timeline|m.video|error_decrypting"),
                maxWidth,
                maxHeight,
                aspectRatio,
            };
        }

        if (!props.mediaVisible) {
            return {
                state: VideoBodyViewState.HIDDEN,
                hiddenButtonLabel: _t("timeline|m.video|show_video"),
                maxWidth,
                maxHeight,
                aspectRatio,
            };
        }

        return {
            state: VideoBodyViewState.READY,
            playLabel: _t("telement|media|play_video", { name: content.body }),
            maxWidth,
            maxHeight,
            aspectRatio,
            poster: VideoBodyViewModel.getPosterUrl(props, state),
            durationLabel: VideoBodyViewModel.getDurationLabel(props.mxEvent),
            playable: !props.forExport && !props.inhibitInteraction,
            // An exported chat replaces the file's mxc address with the saved file's path.
            href: props.forExport ? (content.file?.url ?? content.url) : undefined,
        };
    }

    private updateSnapshotFromState(): void {
        this.snapshot.set(VideoBodyViewModel.computeSnapshot(this.props, this.state));
    }

    private setImageSize(imageSize: ImageSize): void {
        if (this.state.imageSize === imageSize) {
            return;
        }

        this.state = {
            ...this.state,
            imageSize,
        };
        this.updateSnapshotFromState();
    }

    private resetMediaState(): void {
        this.state = {
            ...this.state,
            decryptedThumbnailUrl: null,
            error: null,
            posterLoading: false,
            blurhashUrl: null,
        };
    }

    private loadBlurhash(): void {
        const blurhash = VideoBodyViewModel.getInfo(this.props.mxEvent)?.[BLURHASH_FIELD];
        if (!blurhash) {
            return;
        }

        const canvas = document.createElement("canvas");
        const { w: width, h: height } = VideoBodyViewModel.getDimensions(this.props.mxEvent, this.state.imageSize);

        canvas.width = width;
        canvas.height = height;

        const pixels = decode(blurhash, width, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        const imgData = ctx.createImageData(width, height);
        imgData.data.set(pixels);
        ctx.putImageData(imgData, 0, 0);

        this.state = {
            ...this.state,
            blurhashUrl: canvas.toDataURL(),
            posterLoading: true,
        };
        this.updateSnapshotFromState();

        const media = mediaFromContent(this.props.mxEvent.getContent<MediaEventContent>());
        if (media.isEncrypted || !media.hasThumbnail || !media.thumbnailHttp) {
            return;
        }

        const currentEvent = this.props.mxEvent;
        const image = new Image();
        image.onload = (): void => {
            if (this.isDisposed || currentEvent !== this.props.mxEvent || !this.state.posterLoading) {
                return;
            }

            this.state = {
                ...this.state,
                posterLoading: false,
            };
            this.updateSnapshotFromState();
        };
        image.src = media.thumbnailHttp;
    }

    private async loadPoster(): Promise<void> {
        try {
            this.loadBlurhash();
        } catch (error) {
            logger.error("Failed to load blurhash", error);
        }

        if (!this.props.mediaEventHelper?.media.isEncrypted || this.state.decryptedThumbnailUrl !== null) {
            return;
        }

        const currentEvent = this.props.mxEvent;
        const currentHelper = this.props.mediaEventHelper;
        try {
            const thumbnailUrl = await currentHelper.thumbnailUrl.value;

            if (
                this.isDisposed ||
                currentEvent !== this.props.mxEvent ||
                currentHelper !== this.props.mediaEventHelper
            ) {
                return;
            }

            this.state = {
                ...this.state,
                decryptedThumbnailUrl: thumbnailUrl,
            };
            this.updateSnapshotFromState();
        } catch (error) {
            if (
                this.isDisposed ||
                currentEvent !== this.props.mxEvent ||
                currentHelper !== this.props.mediaEventHelper
            ) {
                return;
            }

            logger.warn("Unable to decrypt attachment: ", error);
            this.state = {
                ...this.state,
                error,
            };
            this.updateSnapshotFromState();
        }
    }

    public setEvent(mxEvent: MatrixEvent, mediaEventHelper?: MediaEventHelper): void {
        if (this.props.mxEvent === mxEvent && this.props.mediaEventHelper === mediaEventHelper) {
            return;
        }

        this.props = {
            ...this.props,
            mxEvent,
            mediaEventHelper,
        };
        this.resetMediaState();
        this.updateSnapshotFromState();

        if (this.props.mediaVisible) {
            void this.loadPoster();
        }
    }

    public setForExport(forExport?: boolean): void {
        if (this.props.forExport === forExport) {
            return;
        }

        this.props = {
            ...this.props,
            forExport,
        };
        this.updateSnapshotFromState();
    }

    public setInhibitInteraction(inhibitInteraction?: boolean): void {
        if (this.props.inhibitInteraction === inhibitInteraction) {
            return;
        }

        this.props = {
            ...this.props,
            inhibitInteraction,
        };
        this.updateSnapshotFromState();
    }

    public setMediaVisible(mediaVisible: boolean): void {
        if (this.props.mediaVisible === mediaVisible) {
            return;
        }

        this.props = {
            ...this.props,
            mediaVisible,
        };
        this.updateSnapshotFromState();

        if (mediaVisible) {
            void this.loadPoster();
        }
    }

    public setOnPreviewClick(onPreviewClick?: () => void): void {
        if (this.props.onPreviewClick === onPreviewClick) {
            return;
        }

        this.props = {
            ...this.props,
            onPreviewClick,
        };
    }

    public setPermalinkCreator(permalinkCreator?: RoomPermalinkCreator): void {
        if (this.props.permalinkCreator === permalinkCreator) {
            return;
        }

        this.props = {
            ...this.props,
            permalinkCreator,
        };
    }

    public onPreviewClick = (): void => {
        this.props.onPreviewClick?.();
    };

    public onPlayClick = (): void => {
        if (!this.snapshot.current.playable) {
            return;
        }

        openVideoLightbox({
            mxEvent: this.props.mxEvent,
            mediaEventHelper: this.props.mediaEventHelper,
            permalinkCreator: this.props.permalinkCreator,
        });
    };
}
