/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type MouseEvent, type RefObject } from "react";
import { logger } from "matrix-js-sdk/src/logger";
import { type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { type MediaEventContent, type VideoInfo } from "matrix-js-sdk/src/types";
import {
    BaseViewModel,
    VideoLightboxViewState,
    VIDEO_PLAYBACK_RATES,
    type VideoLightboxViewModel as VideoLightboxViewModelInterface,
    type VideoLightboxViewSnapshot,
} from "@element-hq/web-shared-components";

import { _t } from "../../../languageHandler";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import SettingsStore from "../../../settings/SettingsStore";
import dis from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import { type ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { type ViewUserPayload } from "../../../dispatcher/payloads/ViewUserPayload";
import { type OpenForwardDialogPayload } from "../../../dispatcher/payloads/OpenForwardDialogPayload";
import { formatFullDate } from "../../../DateUtils";
import { mediaFromMxc } from "../../../customisations/Media";
import { MediaEventHelper } from "../../../utils/MediaEventHelper";
import { isContentActionable } from "../../../utils/EventUtils";
import { type RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { getForwardableEvent } from "../../../events/forward/getForwardableEvent";
import { PlaybackManager } from "../../../audio/PlaybackManager";
import { formatVideoTime } from "../../../telement/media/formatVideoTime";
import { checkMediaSavingAllowed, saveMediaAs } from "../../../telement/media/saveMediaAs";
import { isHighContrast } from "../../../telement/media/isHighContrast";
import { VideoNoteBodyViewModel } from "../message-body/VideoNoteBodyViewModel";

/** How far the arrow keys move the playback position, in seconds. */
const SEEK_STEP_SECONDS = 5;
/** How long the controls stay after the last pointer movement, touch or key press while the video plays, in ms. */
const CONTROLS_HIDE_DELAY_MS = 3000;
/** The video element's readyState from which it has the next frames: HTMLMediaElement.HAVE_FUTURE_DATA. */
const HAVE_FUTURE_DATA = 3;
const AVATAR_SIZE = 64;

export interface VideoLightboxViewModelProps {
    /**
     * The video message.
     */
    mxEvent: MatrixEvent;
    /**
     * The message's media helper, whose already loaded files are reused. The viewer makes its own without it.
     */
    mediaEventHelper?: MediaEventHelper;
    /**
     * Creates the link to the message that the date opens.
     */
    permalinkCreator?: RoomPermalinkCreator;
    /**
     * The video element the view renders.
     */
    videoRef: RefObject<HTMLVideoElement | null>;
    /**
     * Closes the viewer.
     */
    onFinished: () => void;
}

/**
 * View model of the video viewer ({@link VideoLightboxView}). It loads the video, decrypting it if needed, and drives
 * the video element through the view's controls.
 *
 * Full screen shows the whole page rather than the viewer alone, so that what opens over the viewer still shows:
 * the forward dialog, error dialogs and tooltips. The viewer covers the page anyway.
 *
 * While the video plays, the controls hide 3 seconds after the last pointer movement, touch or key press, unless the
 * pointer is over them, a control has keyboard focus or the speed menu is open. They also stay while the video waits
 * for more of it to load, as a streamed video does when the connection is slow.
 */
export class VideoLightboxViewModel
    extends BaseViewModel<VideoLightboxViewSnapshot, VideoLightboxViewModelProps>
    implements VideoLightboxViewModelInterface
{
    private readonly mediaEventHelper: MediaEventHelper;
    private readonly infoDurationSeconds: number;
    private controlsHovered = false;
    private controlsFocused = false;
    private optionsButtonRect?: DOMRect;
    private hideControlsTimer?: ReturnType<typeof setTimeout>;

    public constructor(props: VideoLightboxViewModelProps) {
        const infoDuration = props.mxEvent.getContent<MediaEventContent & { info?: VideoInfo }>().info?.duration;
        const infoDurationSeconds = typeof infoDuration === "number" && infoDuration > 0 ? infoDuration / 1000 : 0;
        super(props, VideoLightboxViewModel.computeInitialSnapshot(props, infoDurationSeconds));
        this.infoDurationSeconds = infoDurationSeconds;

        this.mediaEventHelper = props.mediaEventHelper ?? new MediaEventHelper(props.mxEvent);
        if (!props.mediaEventHelper) this.disposables.track(() => this.mediaEventHelper.destroy());

        document.addEventListener("fullscreenchange", this.onFullscreenChange);
        this.disposables.track(() => {
            document.removeEventListener("fullscreenchange", this.onFullscreenChange);
            if (this.snapshot.current.fullscreen && document.fullscreenElement) this.exitFullscreen();
        });

        this.restartHideControlsTimer();
        this.disposables.track(() => clearTimeout(this.hideControlsTimer));

        void this.loadVideo();
        void this.loadPoster();
        void this.checkSaving();
    }

    private static computeInitialSnapshot(
        props: VideoLightboxViewModelProps,
        infoDurationSeconds: number,
    ): VideoLightboxViewSnapshot {
        const { mxEvent, permalinkCreator } = props;
        const sender = mxEvent.sender;
        const senderId = mxEvent.getSender() ?? "";
        const avatarMxc = sender?.getMxcAvatarUrl();
        const eventId = mxEvent.getId();
        const client = MatrixClientPeg.safeGet();

        return {
            state: VideoLightboxViewState.LOADING,
            senderName: sender?.name ?? senderId,
            senderId,
            canViewSender: !!sender,
            senderAvatarUrl: avatarMxc
                ? (mediaFromMxc(avatarMxc).getThumbnailOfSourceHttp(AVATAR_SIZE, AVATAR_SIZE, "crop") ?? undefined)
                : undefined,
            dateLabel: formatFullDate(
                new Date(mxEvent.getTs()),
                SettingsStore.getValue("showTwelveHourTimestamps"),
                false,
            ),
            dateHref: (eventId && permalinkCreator?.forEvent(eventId)) || "#",
            playing: false,
            buffering: false,
            currentTime: 0,
            duration: 0,
            currentTimeLabel: formatVideoTime(0),
            durationLabel: formatVideoTime(infoDurationSeconds),
            volume: 1,
            muted: false,
            playbackRate: 1,
            speedMenuOpen: false,
            fullscreen: false,
            canFullscreen: !!document.fullscreenEnabled,
            canSave: MediaEventHelper.isEligible(mxEvent),
            saving: false,
            canForward: isContentActionable(mxEvent) && !!getForwardableEvent(mxEvent, client),
            optionsOpen: false,
            highContrast: isHighContrast(),
            controlsVisible: true,
        };
    }

    private get video(): HTMLVideoElement | null {
        return this.props.videoRef.current;
    }

    private async loadVideo(): Promise<void> {
        try {
            const src = await this.mediaEventHelper.sourceUrl.value;
            if (this.isDisposed) return;
            if (!src) throw new Error("The video has no address");
            this.snapshot.merge({ state: VideoLightboxViewState.READY, src });
        } catch (error) {
            if (this.isDisposed) return;
            logger.warn("Unable to load the video", error);
            this.snapshot.merge({
                state: VideoLightboxViewState.ERROR,
                errorLabel: _t("timeline|m.video|error_decrypting"),
            });
        }
    }

    private async loadPoster(): Promise<void> {
        try {
            const poster = await this.mediaEventHelper.thumbnailUrl.value;
            if (!this.isDisposed && poster) this.snapshot.merge({ poster });
        } catch (error) {
            logger.warn("Unable to load the video's thumbnail", error);
        }
    }

    private async checkSaving(): Promise<void> {
        const check = checkMediaSavingAllowed(this.props.mxEvent);
        if (!check) return;
        this.snapshot.merge({ canSave: false });
        const allowed = await check;
        if (!this.isDisposed)
            this.snapshot.merge({ canSave: allowed && MediaEventHelper.isEligible(this.props.mxEvent) });
    }

    private restartHideControlsTimer(): void {
        clearTimeout(this.hideControlsTimer);
        this.hideControlsTimer = setTimeout(this.hideControls, CONTROLS_HIDE_DELAY_MS);
    }

    /** Whether the video plays on, so that nothing it shows needs the controls. */
    private static isPlayingOn(snapshot: Pick<VideoLightboxViewSnapshot, "playing" | "buffering">): boolean {
        return snapshot.playing && !snapshot.buffering;
    }

    private hideControls = (): void => {
        const { state, speedMenuOpen, optionsOpen } = this.snapshot.current;
        const playingOn = VideoLightboxViewModel.isPlayingOn(this.snapshot.current);
        if (state !== VideoLightboxViewState.READY || !playingOn || speedMenuOpen || optionsOpen) return;
        if (this.controlsHovered || this.controlsFocused) return;
        this.snapshot.merge({ controlsVisible: false });
    };

    public onUserActivity = (): void => {
        this.snapshot.merge({ controlsVisible: true });
        this.restartHideControlsTimer();
    };

    public setControlsHovered = (hovered: boolean): void => {
        this.controlsHovered = hovered;
        this.onUserActivity();
    };

    public setControlsFocused = (focused: boolean): void => {
        this.controlsFocused = focused;
        this.onUserActivity();
    };

    private onFullscreenChange = (): void => {
        this.snapshot.merge({ fullscreen: document.fullscreenElement === document.documentElement });
    };

    private exitFullscreen(): void {
        document.exitFullscreen().catch((error) => logger.warn("Could not leave full screen", error));
    }

    public onClose = (): void => {
        this.props.onFinished();
    };

    public onSaveClick = async (): Promise<void> => {
        if (this.snapshot.current.saving || !this.snapshot.current.canSave) return;
        this.snapshot.merge({ saving: true });
        try {
            await saveMediaAs(this.props.mxEvent, this.mediaEventHelper);
        } finally {
            if (!this.isDisposed) this.snapshot.merge({ saving: false });
        }
    };

    public onForwardClick = (): void => {
        const event = getForwardableEvent(this.props.mxEvent, MatrixClientPeg.safeGet());
        if (!event) return;
        // The forward dialog opens over the viewer, so the video waits for the user to come back.
        this.video?.pause();
        dis.dispatch<OpenForwardDialogPayload>({
            action: Action.OpenForwardDialog,
            event,
            permalinkCreator: this.props.permalinkCreator ?? null,
        });
    };

    /** Where the open options menu's button is, which the menu opens next to. */
    public get optionsAnchor(): DOMRect | undefined {
        return this.snapshot.current.optionsOpen ? this.optionsButtonRect : undefined;
    }

    public onOptionsClick = (button: HTMLElement): void => {
        this.optionsButtonRect = button.getBoundingClientRect();
        this.snapshot.merge({ optionsOpen: true, controlsVisible: true });
    };

    /** Called when the options menu closes. */
    public closeOptions = (): void => {
        this.snapshot.merge({ optionsOpen: false });
        this.restartHideControlsTimer();
    };

    public onSenderClick = (): void => {
        const member = this.props.mxEvent.sender;
        if (!member) return;
        dis.dispatch<ViewUserPayload>({ action: Action.ViewUser, member });
        this.props.onFinished();
    };

    public onDateClick = (event: MouseEvent<HTMLAnchorElement>): void => {
        // The link can still be opened in a new tab or copied, but a plain click shows the message in Telement.
        event.preventDefault();
        dis.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            event_id: this.props.mxEvent.getId(),
            highlighted: true,
            room_id: this.props.mxEvent.getRoomId(),
        });
        this.props.onFinished();
    };

    public onEscape = (): void => {
        if (this.snapshot.current.speedMenuOpen) {
            this.snapshot.merge({ speedMenuOpen: false });
        } else if (document.fullscreenElement) {
            this.exitFullscreen();
        } else {
            this.props.onFinished();
        }
    };

    public togglePlay = (): void => {
        const video = this.video;
        if (!video || this.snapshot.current.state !== VideoLightboxViewState.READY) return;
        if (video.paused || video.ended) {
            // play() rejects when a pause interrupts it or the browser refuses to play, which the controls show.
            video.play()?.catch((error) => logger.debug("The video did not play", error));
        } else {
            video.pause();
        }
    };

    public seekTo = (seconds: number): void => {
        const video = this.video;
        if (!video || !Number.isFinite(seconds)) return;
        const duration = this.getDuration(video);
        video.currentTime = Math.min(Math.max(seconds, 0), duration > 0 ? duration : Number.POSITIVE_INFINITY);
        this.onMediaUpdate();
    };

    public seekBackward = (): void => {
        if (this.video) this.seekTo(this.video.currentTime - SEEK_STEP_SECONDS);
    };

    public seekForward = (): void => {
        if (this.video) this.seekTo(this.video.currentTime + SEEK_STEP_SECONDS);
    };

    public setVolume = (volume: number): void => {
        const video = this.video;
        if (!video || !Number.isFinite(volume)) return;
        video.volume = Math.min(Math.max(volume, 0), 1);
        video.muted = video.volume === 0;
        this.onMediaUpdate();
    };

    public toggleMute = (): void => {
        const video = this.video;
        if (!video) return;
        if (video.muted || video.volume === 0) {
            video.muted = false;
            if (video.volume === 0) video.volume = 1;
        } else {
            video.muted = true;
        }
        this.onMediaUpdate();
    };

    public toggleFullscreen = (): void => {
        if (document.fullscreenElement) {
            this.exitFullscreen();
            return;
        }
        if (!document.fullscreenEnabled) return;
        document.documentElement
            .requestFullscreen()
            .catch((error) => logger.warn("Could not enter full screen", error));
    };

    public toggleSpeedMenu = (): void => {
        this.snapshot.merge({ speedMenuOpen: !this.snapshot.current.speedMenuOpen });
    };

    public closeSpeedMenu = (): void => {
        this.snapshot.merge({ speedMenuOpen: false });
    };

    public setPlaybackRate = (rate: number): void => {
        if (!VIDEO_PLAYBACK_RATES.includes(rate)) return;
        const video = this.video;
        if (video) {
            // Loading a source resets the speed to the default one, so set both.
            video.defaultPlaybackRate = rate;
            video.playbackRate = rate;
        }
        this.snapshot.merge({ playbackRate: rate, speedMenuOpen: false });
    };

    /**
     * The video's length in seconds: the browser's, or the message's when the browser doesn't know it, as with videos
     * recorded in a browser. 0 when neither knows.
     */
    private getDuration(video: HTMLVideoElement): number {
        return Number.isFinite(video.duration) && video.duration > 0 ? video.duration : this.infoDurationSeconds;
    }

    public onMediaUpdate = (): void => {
        const video = this.video;
        if (!video) return;
        const playing = !video.paused && !video.ended;
        const buffering = playing && video.readyState < HAVE_FUTURE_DATA;
        // Voice messages and video notes stop while a video plays, as they do for each other.
        if (playing && !this.snapshot.current.playing) {
            PlaybackManager.instance.pauseAllExcept();
            VideoNoteBodyViewModel.pausePlayingWithSound();
        }
        // The controls stay for a while once the video starts or stops waiting for data, also when it starts by
        // itself after loading.
        const playingOn = VideoLightboxViewModel.isPlayingOn({ playing, buffering });
        if (playingOn && !VideoLightboxViewModel.isPlayingOn(this.snapshot.current)) this.restartHideControlsTimer();

        const duration = this.getDuration(video);
        this.snapshot.merge({
            playing,
            buffering,
            currentTime: video.currentTime,
            duration,
            currentTimeLabel: formatVideoTime(video.currentTime),
            durationLabel: formatVideoTime(duration),
            volume: video.volume,
            muted: video.muted,
            playbackRate: video.playbackRate,
            // A paused, finished or waiting video shows its controls.
            controlsVisible: playingOn ? this.snapshot.current.controlsVisible : true,
        });
    };

    public onMediaError = (): void => {
        if (this.snapshot.current.state !== VideoLightboxViewState.READY) return;
        this.snapshot.merge({
            state: VideoLightboxViewState.ERROR,
            playing: false,
            buffering: false,
            errorLabel: _t("telement|media|video_unplayable"),
            controlsVisible: true,
        });
    };
}
