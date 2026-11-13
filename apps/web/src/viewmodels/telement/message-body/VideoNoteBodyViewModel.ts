/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { logger } from "matrix-js-sdk/src/logger";
import { type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { type MediaEventContent, type VideoInfo } from "matrix-js-sdk/src/types";
import {
    BaseViewModel,
    formatSeconds,
    VideoNoteBodyViewState,
    VideoNotePlaybackState,
    type VideoNoteBodyViewModel as VideoNoteBodyViewModelInterface,
    type VideoNoteBodyViewSnapshot,
} from "@element-hq/web-shared-components";

import { _t } from "../../../languageHandler";
import SettingsStore from "../../../settings/SettingsStore";
import { mediaFromContent } from "../../../customisations/Media";
import { ImageSize } from "../../../settings/enums/ImageSize";
import { PlaybackManager } from "../../../audio/PlaybackManager";
import { type MediaEventHelper } from "../../../utils/MediaEventHelper";

const DIAMETER_NORMAL = 240;
const DIAMETER_LARGE = 320;

export interface VideoNoteBodyViewModelProps {
    /**
     * Video note event being rendered.
     */
    mxEvent: MatrixEvent;
    /**
     * Helper for resolving encrypted and unencrypted media sources.
     */
    mediaEventHelper?: MediaEventHelper;
    /**
     * Whether the note is being rendered for export instead of live playback.
     */
    forExport?: boolean;
    /**
     * Whether playback and silent looping should be disabled.
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
}

interface InternalState {
    /**
     * Decrypted playable media URL for encrypted notes.
     */
    decryptedUrl: string | null;
    /**
     * Decrypted thumbnail URL for encrypted notes.
     */
    decryptedThumbnailUrl: string | null;
    /**
     * Last media-processing error, if any.
     */
    error: unknown | null;
    /**
     * Whether the source is being decrypted because the user asked to play it.
     */
    fetchingSource: boolean;
    playbackState: VideoNotePlaybackState;
    currentTimeSeconds: number;
    /**
     * Duration reported by the media element, used when the event has no duration.
     */
    loadedDurationSeconds: number | null;
    imageSize: ImageSize;
}

/**
 * View model for a round video note (MSC4546) in the timeline.
 *
 * The note loops silently when videos may autoplay. Clicking it plays it with sound from the start,
 * and only one note plays with sound at a time.
 */
export class VideoNoteBodyViewModel
    extends BaseViewModel<VideoNoteBodyViewSnapshot, VideoNoteBodyViewModelProps>
    implements VideoNoteBodyViewModelInterface
{
    private static playingWithSound: VideoNoteBodyViewModel | null = null;

    private state: InternalState;

    public constructor(props: VideoNoteBodyViewModelProps) {
        const initialState: InternalState = {
            decryptedUrl: null,
            decryptedThumbnailUrl: null,
            error: null,
            fetchingSource: false,
            playbackState: VideoNotePlaybackState.PREVIEW,
            currentTimeSeconds: 0,
            loadedDurationSeconds: null,
            imageSize: SettingsStore.getValue("Images.size"),
        };
        super(props, VideoNoteBodyViewModel.computeSnapshot(props, initialState));
        this.state = initialState;

        const imageSizeWatcherRef = SettingsStore.watchSetting("Images.size", null, (_s, _r, _l, _nvl, value) => {
            this.updateState({ imageSize: value! });
        });
        this.disposables.track(() => SettingsStore.unwatchSetting(imageSizeWatcherRef));
        this.disposables.track(() => {
            if (VideoNoteBodyViewModel.playingWithSound === this) {
                VideoNoteBodyViewModel.playingWithSound = null;
            }
        });
    }

    /**
     * Pauses the note that is playing with sound, so that other media, such as the video viewer, plays alone.
     */
    public static pausePlayingWithSound(): void {
        const note = VideoNoteBodyViewModel.playingWithSound;
        if (note?.state.playbackState === VideoNotePlaybackState.PLAYING) {
            note.updateState({ playbackState: VideoNotePlaybackState.PAUSED });
        }
    }

    private static canPlay(props: VideoNoteBodyViewModelProps): boolean {
        return !props.inhibitInteraction && !props.forExport;
    }

    private static loopsPreview(props: VideoNoteBodyViewModelProps): boolean {
        return VideoNoteBodyViewModel.canPlay(props) && SettingsStore.getValue("autoplayVideo");
    }

    private static getDurationSeconds(props: VideoNoteBodyViewModelProps, state: InternalState): number | null {
        const durationMs = props.mxEvent.getContent<MediaEventContent & { info?: VideoInfo }>().info?.duration;
        if (typeof durationMs === "number" && durationMs > 0) {
            return durationMs / 1000;
        }
        return state.loadedDurationSeconds;
    }

    private static computeSnapshot(
        props: VideoNoteBodyViewModelProps,
        state: InternalState,
    ): VideoNoteBodyViewSnapshot {
        const diameter = state.imageSize === ImageSize.Large ? DIAMETER_LARGE : DIAMETER_NORMAL;

        if (state.error !== null) {
            return {
                state: VideoNoteBodyViewState.ERROR,
                diameter,
                errorLabel: _t("timeline|m.video|error_decrypting"),
            };
        }

        if (!props.mediaVisible) {
            return {
                state: VideoNoteBodyViewState.HIDDEN,
                diameter,
                hiddenButtonLabel: _t("timeline|m.video|show_video"),
            };
        }

        const content = props.mxEvent.getContent<MediaEventContent>();
        const media = mediaFromContent(content);
        const encrypted = !props.forExport && media.isEncrypted;
        const loopPreview = VideoNoteBodyViewModel.loopsPreview(props);

        if (encrypted && state.decryptedUrl === null && (loopPreview || state.fetchingSource)) {
            return { state: VideoNoteBodyViewState.LOADING, diameter };
        }

        let src: string | undefined;
        let poster: string | undefined;
        if (props.forExport) {
            src = content.file?.url ?? content.url;
        } else if (encrypted) {
            src = state.decryptedUrl ?? undefined;
            poster = state.decryptedThumbnailUrl ?? undefined;
        } else {
            src = media.srcHttp ?? undefined;
            poster = (media.hasThumbnail && media.thumbnailHttp) || undefined;
        }

        const durationSeconds = VideoNoteBodyViewModel.getDurationSeconds(props, state);
        const inPreview = state.playbackState === VideoNotePlaybackState.PREVIEW;
        const shownSeconds = inPreview ? durationSeconds : state.currentTimeSeconds;

        return {
            state: VideoNoteBodyViewState.READY,
            diameter,
            src,
            poster,
            loopPreview,
            playbackState: state.playbackState,
            progress: durationSeconds ? Math.min(state.currentTimeSeconds / durationSeconds, 1) : 0,
            timeLabel: shownSeconds === null ? undefined : formatSeconds(shownSeconds, { minutesMinLength: 1 }),
            toggleLabel:
                state.playbackState === VideoNotePlaybackState.PLAYING
                    ? _t("telement|video_note|pause")
                    : _t("telement|video_note|play"),
        };
    }

    private updateState(changes: Partial<InternalState>): void {
        this.state = { ...this.state, ...changes };
        this.snapshot.set(VideoNoteBodyViewModel.computeSnapshot(this.props, this.state));
    }

    private updateProps(changes: Partial<VideoNoteBodyViewModelProps>): void {
        this.props = { ...this.props, ...changes };
        this.snapshot.set(VideoNoteBodyViewModel.computeSnapshot(this.props, this.state));
    }

    private isCurrent(event: MatrixEvent, helper: MediaEventHelper | undefined): boolean {
        return !this.isDisposed && event === this.props.mxEvent && helper === this.props.mediaEventHelper;
    }

    private isEncrypted(): boolean {
        return !this.props.forExport && !!this.props.mediaEventHelper?.media.isEncrypted;
    }

    /**
     * Decrypts the thumbnail, and the video itself when it loops in the timeline.
     */
    private async decryptMedia(): Promise<void> {
        const event = this.props.mxEvent;
        const helper = this.props.mediaEventHelper;
        if (!helper || !this.isEncrypted() || this.state.decryptedUrl !== null) return;

        try {
            const decryptedThumbnailUrl = await helper.thumbnailUrl.value;
            const decryptedUrl = VideoNoteBodyViewModel.loopsPreview(this.props) ? await helper.sourceUrl.value : null;
            if (!this.isCurrent(event, helper)) return;
            this.updateState({ decryptedThumbnailUrl, decryptedUrl });
        } catch (error) {
            if (!this.isCurrent(event, helper)) return;
            logger.warn("Unable to decrypt video note: ", error);
            this.updateState({ error });
        }
    }

    private async decryptSourceForPlayback(): Promise<boolean> {
        const event = this.props.mxEvent;
        const helper = this.props.mediaEventHelper;
        if (!helper) return false;

        this.updateState({ fetchingSource: true });
        try {
            const decryptedUrl = await helper.sourceUrl.value;
            if (!this.isCurrent(event, helper)) return false;
            this.updateState({ decryptedUrl, fetchingSource: false });
            return true;
        } catch (error) {
            if (!this.isCurrent(event, helper)) return false;
            logger.warn("Unable to decrypt video note: ", error);
            this.updateState({ error, fetchingSource: false });
            return false;
        }
    }

    private startPlaying(fromStart: boolean): void {
        const previous = VideoNoteBodyViewModel.playingWithSound;
        if (previous && previous !== this) previous.stopPlaying();
        VideoNoteBodyViewModel.playingWithSound = this;
        PlaybackManager.instance.pauseAllExcept();
        this.updateState({
            playbackState: VideoNotePlaybackState.PLAYING,
            currentTimeSeconds: fromStart ? 0 : this.state.currentTimeSeconds,
        });
    }

    private stopPlaying(): void {
        if (VideoNoteBodyViewModel.playingWithSound === this) {
            VideoNoteBodyViewModel.playingWithSound = null;
        }
        this.updateState({ playbackState: VideoNotePlaybackState.PREVIEW, currentTimeSeconds: 0 });
    }

    public loadInitialMediaIfVisible(): void {
        if (this.props.mediaVisible) void this.decryptMedia();
    }

    public setEvent(mxEvent: MatrixEvent, mediaEventHelper?: MediaEventHelper): void {
        if (this.props.mxEvent === mxEvent && this.props.mediaEventHelper === mediaEventHelper) return;
        this.props = { ...this.props, mxEvent, mediaEventHelper };
        if (VideoNoteBodyViewModel.playingWithSound === this) VideoNoteBodyViewModel.playingWithSound = null;
        this.updateState({
            decryptedUrl: null,
            decryptedThumbnailUrl: null,
            error: null,
            fetchingSource: false,
            playbackState: VideoNotePlaybackState.PREVIEW,
            currentTimeSeconds: 0,
            loadedDurationSeconds: null,
        });
        this.loadInitialMediaIfVisible();
    }

    public setForExport(forExport?: boolean): void {
        if (this.props.forExport !== forExport) this.updateProps({ forExport });
    }

    public setInhibitInteraction(inhibitInteraction?: boolean): void {
        if (this.props.inhibitInteraction !== inhibitInteraction) this.updateProps({ inhibitInteraction });
    }

    public setMediaVisible(mediaVisible: boolean): void {
        if (this.props.mediaVisible === mediaVisible) return;
        this.updateProps({ mediaVisible });
        this.loadInitialMediaIfVisible();
    }

    public setOnPreviewClick(onPreviewClick?: () => void): void {
        this.props = { ...this.props, onPreviewClick };
    }

    public onPreviewClick = (): void => {
        this.props.onPreviewClick?.();
    };

    public onToggle = async (): Promise<void> => {
        if (!VideoNoteBodyViewModel.canPlay(this.props) || this.state.fetchingSource) return;

        switch (this.state.playbackState) {
            case VideoNotePlaybackState.PLAYING:
                this.updateState({ playbackState: VideoNotePlaybackState.PAUSED });
                return;
            case VideoNotePlaybackState.PAUSED:
                this.startPlaying(false);
                return;
            case VideoNotePlaybackState.PREVIEW:
                if (this.isEncrypted() && this.state.decryptedUrl === null) {
                    if (!(await this.decryptSourceForPlayback())) return;
                }
                this.startPlaying(true);
        }
    };

    public onTimeUpdate = (currentTimeSeconds: number, durationSeconds: number): void => {
        const loadedDurationSeconds =
            Number.isFinite(durationSeconds) && durationSeconds > 0
                ? durationSeconds
                : this.state.loadedDurationSeconds;
        if (this.state.playbackState === VideoNotePlaybackState.PREVIEW) {
            // The silent loop shows the total duration, so only learn the duration from it.
            if (loadedDurationSeconds !== this.state.loadedDurationSeconds) this.updateState({ loadedDurationSeconds });
            return;
        }
        this.updateState({ currentTimeSeconds, loadedDurationSeconds });
    };

    public onEnded = (): void => {
        if (this.state.playbackState === VideoNotePlaybackState.PLAYING) this.stopPlaying();
    };
}
