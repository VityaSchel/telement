/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, {
    type CSSProperties,
    type FocusEvent,
    type JSX,
    type KeyboardEvent,
    type MouseEvent,
    type MouseEventHandler,
    type PointerEvent,
    type Ref,
    useEffect,
    useRef,
} from "react";
import classNames from "classnames";
import {
    CheckIcon,
    CloseIcon,
    DownloadIcon,
    ExitFullScreenIcon,
    ForwardIcon,
    FullScreenIcon,
    PauseSolidIcon,
    PlaySolidIcon,
    VolumeOffSolidIcon,
    VolumeOnSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import { Avatar, IconButton, InlineSpinner } from "@vector-im/compound-web";

import { _t } from "../../../core/i18n/i18n";
import { type ViewModel, useViewModel } from "../../../core/viewmodel";
import styles from "./VideoLightboxView.module.css";

/**
 * Render states of the video viewer.
 */
export const VideoLightboxViewState = {
    /** The video is being downloaded and decrypted. */
    LOADING: "LOADING",
    READY: "READY",
    ERROR: "ERROR",
} as const;

export type VideoLightboxViewState = (typeof VideoLightboxViewState)[keyof typeof VideoLightboxViewState];

/**
 * The playback speeds the viewer offers.
 */
export const VIDEO_PLAYBACK_RATES: readonly number[] = [0.5, 1, 1.25, 1.5, 2];

export interface VideoLightboxViewSnapshot {
    /**
     * The current render state.
     */
    state: VideoLightboxViewState;
    /**
     * Display name of the message's sender.
     */
    senderName: string;
    /**
     * Matrix ID of the message's sender, which picks the avatar's fallback color.
     */
    senderId: string;
    /**
     * Whether the sender's avatar opens their profile.
     */
    canViewSender: boolean;
    /**
     * Address of the sender's avatar.
     */
    senderAvatarUrl?: string;
    /**
     * When the message was sent, such as "Thu, Nov 12, 2026, 10:42 AM".
     */
    dateLabel: string;
    /**
     * Link to the message, opened by the date.
     */
    dateHref?: string;
    /**
     * Address of the video, once it can be played.
     */
    src?: string;
    /**
     * Picture shown until the video plays.
     */
    poster?: string;
    /**
     * Shown instead of the video when it cannot be loaded or played.
     */
    errorLabel?: string;
    /**
     * Whether the video is playing.
     */
    playing: boolean;
    /**
     * Whether the playing video waits for more of it to load. A spinner shows then, and so do the bars.
     */
    buffering: boolean;
    /**
     * Playback position in seconds.
     */
    currentTime: number;
    /**
     * Length of the video in seconds, or 0 while unknown.
     */
    duration: number;
    /**
     * The playback position as shown, such as "0:12".
     */
    currentTimeLabel: string;
    /**
     * The length as shown, such as "1:05".
     */
    durationLabel: string;
    /**
     * Volume from 0 to 1.
     */
    volume: number;
    /**
     * Whether the sound is off.
     */
    muted: boolean;
    /**
     * Playback speed, one of {@link VIDEO_PLAYBACK_RATES}.
     */
    playbackRate: number;
    /**
     * Whether the playback speed menu is open.
     */
    speedMenuOpen: boolean;
    /**
     * Whether the viewer fills the screen.
     */
    fullscreen: boolean;
    /**
     * Whether the viewer can fill the screen.
     */
    canFullscreen: boolean;
    /**
     * Whether the user may save the video.
     */
    canSave: boolean;
    /**
     * Whether the video is being saved.
     */
    saving: boolean;
    /**
     * Whether the message can be forwarded.
     */
    canForward: boolean;
    /**
     * Whether the app uses a high contrast theme. The viewer is always dark.
     */
    highContrast: boolean;
    /**
     * Whether the bars are shown. While the video plays they fade out when the user is idle, and so does the pointer.
     */
    controlsVisible: boolean;
}

export interface VideoLightboxViewActions {
    /** Closes the viewer. */
    onClose: () => void;
    /** Asks where to save the video and saves it there. */
    onSaveClick: () => void;
    /** Forwards the message. */
    onForwardClick: () => void;
    /** Shows the sender's profile. */
    onSenderClick: () => void;
    /** Shows the message in its room. */
    onDateClick: MouseEventHandler<HTMLAnchorElement>;
    /** Closes the speed menu, leaves full screen, or else closes the viewer. */
    onEscape: () => void;
    /** Plays or pauses the video. */
    togglePlay: () => void;
    /** Moves the playback position to a time in seconds. */
    seekTo: (seconds: number) => void;
    /** Moves the playback position a few seconds back. */
    seekBackward: () => void;
    /** Moves the playback position a few seconds forward. */
    seekForward: () => void;
    /** Sets the volume, from 0 to 1. */
    setVolume: (volume: number) => void;
    /** Turns the sound off or on. */
    toggleMute: () => void;
    /** Enters or leaves full screen. */
    toggleFullscreen: () => void;
    /** Opens or closes the playback speed menu. */
    toggleSpeedMenu: () => void;
    /** Closes the playback speed menu. */
    closeSpeedMenu: () => void;
    /** Sets the playback speed and closes the speed menu. */
    setPlaybackRate: (rate: number) => void;
    /** Called whenever the video element's playback state changes. */
    onMediaUpdate: () => void;
    /** Called when the video element cannot play the video. */
    onMediaError: () => void;
    /** Called on every pointer movement, touch and key press: shows the bars and restarts the wait to hide them. */
    onUserActivity: () => void;
    /** Called when the mouse pointer enters or leaves a bar's controls, which stay while the pointer is over them. */
    setControlsHovered: (hovered: boolean) => void;
    /** Called when keyboard focus enters or leaves the bars, which stay while a control has keyboard focus. */
    setControlsFocused: (focused: boolean) => void;
}

export type VideoLightboxViewModel = ViewModel<VideoLightboxViewSnapshot, VideoLightboxViewActions>;

interface VideoLightboxViewProps {
    /**
     * View model providing render state and actions.
     */
    vm: VideoLightboxViewModel;
    /**
     * Ref to the video element, which the view model plays and seeks.
     */
    videoRef?: Ref<HTMLVideoElement>;
    /**
     * Optional host CSS class.
     */
    className?: string;
}

interface RangeStyle extends CSSProperties {
    "--fill": string;
}

function formatRate(rate: number): string {
    return `${rate}×`;
}

function fillStyle(value: number, max: number): RangeStyle {
    const fraction = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
    return { "--fill": `${fraction * 100}%` };
}

/**
 * Keeps keyboard focus with the playback speed menu: on its checked speed when it opens, and back on its button
 * when it closes while focus was inside it.
 */
function useSpeedMenuFocus(
    speedMenuOpen: boolean,
): [React.RefObject<HTMLButtonElement | null>, React.RefObject<HTMLDivElement | null>] {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const wasOpen = useRef(speedMenuOpen);

    useEffect(() => {
        if (speedMenuOpen) {
            menuRef.current?.querySelector<HTMLElement>("[aria-checked='true']")?.focus();
        } else if (wasOpen.current && (!document.activeElement || document.activeElement === document.body)) {
            buttonRef.current?.focus();
        }
        wasOpen.current = speedMenuOpen;
    }, [speedMenuOpen]);

    return [buttonRef, menuRef];
}

/**
 * A full-window video viewer, opened from a video message: the sender and date with "Save as…", forward and close
 * at the top, the video, and playback controls in a bar floating at the bottom. The controls are drawn by the view
 * rather than the browser, so they look the same everywhere.
 *
 * Keyboard: Space plays or pauses, ←/→ move 5 seconds, M mutes, F toggles full screen, and Escape leaves full
 * screen or closes the viewer. On narrow screens the seek bar gets a row of its own.
 *
 * While the video plays, the bars and the pointer fade out when the user is idle and come back on any pointer
 * movement, touch or key press. They only become transparent, so screen readers still reach every control. A tap
 * that brings them back does nothing else, so that it can't press a control the user couldn't see. A control the user
 * reached with the keyboard keeps them, but not the play button that gets focus when the viewer opens.
 */
export function VideoLightboxView({ vm, videoRef, className }: Readonly<VideoLightboxViewProps>): JSX.Element {
    const {
        state,
        senderName,
        senderId,
        canViewSender,
        senderAvatarUrl,
        dateLabel,
        dateHref,
        src,
        poster,
        errorLabel,
        playing,
        buffering,
        currentTime,
        duration,
        currentTimeLabel,
        durationLabel,
        volume,
        muted,
        playbackRate,
        speedMenuOpen,
        fullscreen,
        canFullscreen,
        canSave,
        saving,
        canForward,
        highContrast,
        controlsVisible,
    } = useViewModel(vm);
    const volumeRef = useRef<HTMLInputElement>(null);
    const [speedButtonRef, speedMenuRef] = useSpeedMenuFocus(speedMenuOpen);
    // The element that got focus from the keyboard rather than a click. Browsers start showing the focus ring of a
    // clicked button on the next key press, so this is decided when focus arrives.
    const keyboardFocusRef = useRef<EventTarget | null>(null);
    // Whether the current touch or pen press started while the bars were hidden.
    const revealingPressRef = useRef(false);
    // Whether a key was pressed in the viewer since the last pointer press. Focus that arrives without one, like the
    // play button's when the viewer opens, did not come from the user moving through the controls.
    const keyPressedRef = useRef(false);

    // Every control of the viewer sits in one of its bars, so keyboard focus anywhere in it keeps the bars shown.
    const onFocus = (event: FocusEvent<HTMLDivElement>): void => {
        const keyboardFocus = event.target.matches(":focus-visible");
        keyboardFocusRef.current = keyboardFocus ? event.target : null;
        vm.setControlsFocused(keyboardFocus && keyPressedRef.current);
    };

    const onBlur = (event: FocusEvent<HTMLDivElement>): void => {
        if (!event.currentTarget.contains(event.relatedTarget)) vm.setControlsFocused(false);
    };

    const onPointerDownCapture = (event: PointerEvent<HTMLDivElement>): void => {
        revealingPressRef.current = !controlsVisible && event.pointerType !== "mouse";
        keyPressedRef.current = false;
        vm.onUserActivity();
    };

    const onClickCapture = (event: MouseEvent<HTMLDivElement>): void => {
        if (!revealingPressRef.current) return;
        revealingPressRef.current = false;
        event.preventDefault();
        event.stopPropagation();
    };

    // Only a mouse hovers. A touch enters the controls just before it presses them, and must not show them before the
    // press is seen to have started while they were hidden.
    const onBarPointerEnter = (event: PointerEvent<HTMLDivElement>): void => {
        if (event.pointerType === "mouse") vm.setControlsHovered(true);
    };
    const onBarPointerLeave = (event: PointerEvent<HTMLDivElement>): void => {
        if (event.pointerType === "mouse") vm.setControlsHovered(false);
    };

    // Space plays or pauses wherever focus is, as in Telegram, except in the speed menu and on a control the user
    // reached with the keyboard, which Space activates.
    const spaceTogglesPlay = (target: HTMLElement): boolean => {
        const button = target.closest("button");
        return !target.closest("[role='menu']") && (!button || keyboardFocusRef.current !== button);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.altKey) return;
        if (event.ctrlKey || event.metaKey) {
            if (event.key.toLowerCase() === "s" && canSave) {
                event.preventDefault();
                vm.onSaveClick();
            }
            return;
        }

        const target = event.target as HTMLElement;
        switch (event.key) {
            case " ":
                if (!spaceTogglesPlay(target)) return;
                vm.togglePlay();
                break;
            case "ArrowLeft":
            case "ArrowRight":
                // The volume slider keeps its arrow keys.
                if (target === volumeRef.current) return;
                if (event.key === "ArrowLeft") vm.seekBackward();
                else vm.seekForward();
                break;
            case "m":
            case "M":
                vm.toggleMute();
                break;
            case "f":
            case "F":
                vm.toggleFullscreen();
                break;
            default:
                return;
        }
        event.preventDefault();
        event.stopPropagation();
    };

    // A button activates when Space is released, so the release must not reach a button whose press played or paused.
    const onKeyUp = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.key === " " && spaceTogglesPlay(event.target as HTMLElement)) event.preventDefault();
    };

    // Any key shows the bars. Escape is handled before it reaches the focused control, whose tooltip would otherwise
    // take it.
    const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>): void => {
        revealingPressRef.current = false;
        keyPressedRef.current = true;
        vm.onUserActivity();
        if (event.key !== "Escape") return;
        vm.onEscape();
        event.preventDefault();
        event.stopPropagation();
    };

    const onSpeedMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        const items = Array.from(speedMenuRef.current?.querySelectorAll<HTMLElement>("[role='menuitemradio']") ?? []);
        const index = items.indexOf(document.activeElement as HTMLElement);
        const step = event.key === "ArrowDown" ? 1 : -1;
        items[(index + step + items.length) % items.length]?.focus();
        event.preventDefault();
        event.stopPropagation();
    };

    const onSpeedBlur = (event: React.FocusEvent<HTMLDivElement>): void => {
        if (speedMenuOpen && !event.currentTarget.contains(event.relatedTarget)) vm.closeSpeedMenu();
    };

    const soundOff = muted || volume === 0;
    const playLabel = playing ? _t("action|pause") : _t("action|play");
    const muteLabel = soundOff ? _t("telement|video_lightbox|unmute") : _t("telement|video_lightbox|mute");
    const fullscreenLabel = fullscreen
        ? _t("telement|video_lightbox|exit_full_screen")
        : _t("telement|video_lightbox|full_screen");

    const avatar = (
        <Avatar className={styles.avatar} id={senderId} name={senderName} src={senderAvatarUrl} size="32px" />
    );

    return (
        <div
            className={classNames(
                highContrast ? "cpd-theme-dark-hc" : "cpd-theme-dark",
                styles.root,
                { [styles.controlsHidden]: !controlsVisible },
                className,
            )}
            role="dialog"
            aria-modal="true"
            aria-label={_t("telement|video_lightbox|title")}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onKeyDownCapture={onKeyDownCapture}
            onFocus={onFocus}
            onBlur={onBlur}
            onPointerMove={vm.onUserActivity}
            onPointerDownCapture={onPointerDownCapture}
            onClickCapture={onClickCapture}
        >
            <div className={styles.topBar}>
                <div className={styles.sender} onPointerEnter={onBarPointerEnter} onPointerLeave={onBarPointerLeave}>
                    {canViewSender ? (
                        <button
                            type="button"
                            className={styles.avatarButton}
                            aria-label={_t("telement|video_lightbox|view_profile")}
                            onClick={vm.onSenderClick}
                        >
                            {avatar}
                        </button>
                    ) : (
                        avatar
                    )}
                    <div className={styles.senderText}>
                        <span className={styles.senderName}>{senderName}</span>
                        <a className={styles.date} href={dateHref} onClick={vm.onDateClick}>
                            {dateLabel}
                        </a>
                    </div>
                </div>
                <div className={styles.actions} onPointerEnter={onBarPointerEnter} onPointerLeave={onBarPointerLeave}>
                    {canSave && (
                        <IconButton
                            className={styles.iconButton}
                            size="32px"
                            aria-label={_t("telement|video_lightbox|save_as")}
                            tooltip={_t("telement|video_lightbox|save_as")}
                            tooltipPlacement="bottom"
                            disabled={saving}
                            onClick={vm.onSaveClick}
                        >
                            <DownloadIcon />
                        </IconButton>
                    )}
                    {canForward && (
                        <IconButton
                            className={styles.iconButton}
                            size="32px"
                            aria-label={_t("telement|video_lightbox|forward")}
                            tooltip={_t("telement|video_lightbox|forward")}
                            tooltipPlacement="bottom"
                            onClick={vm.onForwardClick}
                        >
                            <ForwardIcon />
                        </IconButton>
                    )}
                    <IconButton
                        className={styles.iconButton}
                        size="32px"
                        aria-label={_t("action|close")}
                        tooltip={_t("action|close")}
                        tooltipPlacement="bottom"
                        onClick={vm.onClose}
                    >
                        <CloseIcon />
                    </IconButton>
                </div>
            </div>

            {/* Escape and the close button close the viewer from the keyboard. */}
            {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events */}
            <div
                className={styles.stage}
                onClick={(event): void => {
                    if (event.target === event.currentTarget) vm.onClose();
                }}
            >
                {state !== VideoLightboxViewState.ERROR && (
                    <video
                        ref={videoRef}
                        className={styles.video}
                        src={src}
                        poster={poster}
                        autoPlay
                        playsInline
                        crossOrigin="anonymous"
                        onClick={vm.togglePlay}
                        onDoubleClick={vm.toggleFullscreen}
                        onPlay={vm.onMediaUpdate}
                        onPlaying={vm.onMediaUpdate}
                        onWaiting={vm.onMediaUpdate}
                        onCanPlay={vm.onMediaUpdate}
                        onPause={vm.onMediaUpdate}
                        onEnded={vm.onMediaUpdate}
                        onTimeUpdate={vm.onMediaUpdate}
                        onSeeked={vm.onMediaUpdate}
                        onDurationChange={vm.onMediaUpdate}
                        onLoadedMetadata={vm.onMediaUpdate}
                        onVolumeChange={vm.onMediaUpdate}
                        onRateChange={vm.onMediaUpdate}
                        onError={vm.onMediaError}
                    />
                )}
                {(state === VideoLightboxViewState.LOADING || buffering) && (
                    <div
                        className={classNames(styles.status, {
                            [styles.buffering]: state !== VideoLightboxViewState.LOADING,
                        })}
                    >
                        <span className={styles.spinner}>
                            <InlineSpinner aria-label={_t("common|loading")} role="progressbar" size={32} />
                        </span>
                    </div>
                )}
                {state === VideoLightboxViewState.ERROR && (
                    <p className={styles.error} role="alert">
                        {errorLabel}
                    </p>
                )}
            </div>

            {/* A video that can't be played has nothing to control: saving it is what the error suggests. */}
            {state !== VideoLightboxViewState.ERROR && (
                <div className={styles.controls} onPointerEnter={onBarPointerEnter} onPointerLeave={onBarPointerLeave}>
                    <IconButton
                        className={styles.iconButton}
                        size="36px"
                        aria-label={playLabel}
                        tooltip={playLabel}
                        tooltipPlacement="top"
                        // The host's focus lock moves focus here when the viewer opens.
                        data-autofocus
                        onClick={vm.togglePlay}
                    >
                        {playing ? <PauseSolidIcon /> : <PlaySolidIcon />}
                    </IconButton>
                    <div className={styles.timeline}>
                        <span className={styles.time}>{currentTimeLabel}</span>
                        <input
                            type="range"
                            className={classNames(styles.range, styles.seekBar)}
                            min={0}
                            max={duration}
                            step="any"
                            value={Math.min(currentTime, duration)}
                            disabled={duration <= 0}
                            aria-label={_t("telement|video_lightbox|seek")}
                            aria-valuetext={_t("telement|video_lightbox|position", {
                                currentTime: currentTimeLabel,
                                duration: durationLabel,
                            })}
                            style={fillStyle(currentTime, duration)}
                            onChange={(event): void => vm.seekTo(event.currentTarget.valueAsNumber)}
                        />
                        <span className={styles.time}>{durationLabel}</span>
                    </div>
                    <IconButton
                        className={classNames(styles.iconButton, styles.mute)}
                        size="36px"
                        aria-label={muteLabel}
                        tooltip={muteLabel}
                        tooltipPlacement="top"
                        onClick={vm.toggleMute}
                    >
                        {soundOff ? <VolumeOffSolidIcon /> : <VolumeOnSolidIcon />}
                    </IconButton>
                    <input
                        ref={volumeRef}
                        type="range"
                        className={classNames(styles.range, styles.volume)}
                        min={0}
                        max={1}
                        step={0.05}
                        value={soundOff ? 0 : volume}
                        aria-label={_t("telement|video_lightbox|volume")}
                        style={fillStyle(soundOff ? 0 : volume, 1)}
                        onChange={(event): void => vm.setVolume(event.currentTarget.valueAsNumber)}
                    />
                    <div className={styles.speed} onBlur={onSpeedBlur}>
                        <button
                            ref={speedButtonRef}
                            type="button"
                            className={styles.speedButton}
                            aria-label={_t("telement|video_lightbox|playback_speed_value", {
                                rate: formatRate(playbackRate),
                            })}
                            aria-haspopup="menu"
                            aria-expanded={speedMenuOpen}
                            onClick={vm.toggleSpeedMenu}
                        >
                            {formatRate(playbackRate)}
                        </button>
                        {speedMenuOpen && (
                            <div
                                ref={speedMenuRef}
                                className={styles.speedMenu}
                                role="menu"
                                tabIndex={-1}
                                aria-label={_t("telement|video_lightbox|playback_speed")}
                                onKeyDown={onSpeedMenuKeyDown}
                            >
                                {VIDEO_PLAYBACK_RATES.map((rate) => (
                                    <button
                                        key={rate}
                                        type="button"
                                        className={styles.speedMenuItem}
                                        role="menuitemradio"
                                        aria-checked={rate === playbackRate}
                                        onClick={(): void => vm.setPlaybackRate(rate)}
                                    >
                                        {formatRate(rate)}
                                        {rate === playbackRate && (
                                            <CheckIcon width="20" height="20" aria-hidden="true" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {canFullscreen && (
                        <IconButton
                            className={styles.iconButton}
                            size="36px"
                            aria-label={fullscreenLabel}
                            tooltip={fullscreenLabel}
                            tooltipPlacement="top"
                            onClick={vm.toggleFullscreen}
                        >
                            {fullscreen ? <ExitFullScreenIcon /> : <FullScreenIcon />}
                        </IconButton>
                    )}
                </div>
            )}
        </div>
    );
}
