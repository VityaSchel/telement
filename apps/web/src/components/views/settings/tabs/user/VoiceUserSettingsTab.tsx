/*
Copyright 2024 New Vector Ltd.
Copyright 2020 The Matrix.org Foundation C.I.C.
Copyright 2019 New Vector Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ChangeEventHandler, type JSX } from "react";
import { logger } from "matrix-js-sdk/src/logger";
import { FALLBACK_ICE_SERVER } from "matrix-js-sdk/src/webrtc/call";
import { type EmptyObject } from "matrix-js-sdk/src/matrix";
import { Alert, Form, SettingsToggleInput } from "@vector-im/compound-web";

import { _t } from "../../../../../languageHandler";
import MediaDeviceHandler, { type IMediaDevices, MediaDeviceKindEnum } from "../../../../../MediaDeviceHandler";
import AccessibleButton from "../../../elements/AccessibleButton";
import { SettingLevel } from "../../../../../settings/SettingLevel";
import SettingsFlag from "../../../elements/SettingsFlag";
import SettingsStore from "../../../../../settings/SettingsStore";
import { requestMediaPermissions } from "../../../../../utils/media/requestMediaPermissions";
import SettingsTab from "../SettingsTab";
import { SettingsSection } from "../../shared/SettingsSection";
import MatrixClientContext from "../../../../../contexts/MatrixClientContext";
import SdkConfig from "../../../../../SdkConfig";
import { knownMediaDevices, refreshMediaDevices, watchMediaDevices } from "../../../../../telement/media/mediaDevices";
import { SettingsValueRow } from "../../../../../telement/settings/SettingsValueRow";

interface IState {
    // Undefined until the browser has listed them, null while it hides their names (telement/media/mediaDevices.ts)
    mediaDevices: IMediaDevices | null | undefined;
    [MediaDeviceKindEnum.AudioOutput]: string | null;
    [MediaDeviceKindEnum.AudioInput]: string | null;
    [MediaDeviceKindEnum.VideoInput]: string | null;
    audioAutoGainControl: boolean;
    audioEchoCancellation: boolean;
    audioNoiseSuppression: boolean;
    enableLegacyCallsVoip: boolean;
}

/**
 * Maps deviceKind to the right get method on MediaDeviceHandler
 * Helpful for setting state
 */
const mapDeviceKindToHandlerValue = (deviceKind: MediaDeviceKindEnum): string | null => {
    switch (deviceKind) {
        case MediaDeviceKindEnum.AudioOutput:
            return MediaDeviceHandler.getAudioOutput();
        case MediaDeviceKindEnum.AudioInput:
            return MediaDeviceHandler.getAudioInput();
        case MediaDeviceKindEnum.VideoInput:
            return MediaDeviceHandler.getVideoInput();
    }
};

export default class VoiceUserSettingsTab extends React.Component<EmptyObject, IState> {
    public static contextType = MatrixClientContext;
    declare public context: React.ContextType<typeof MatrixClientContext>;

    public constructor(props: EmptyObject) {
        super(props);

        this.state = {
            // Telement: the devices the app knows, so that the tab opens with them rather than filling them in later
            mediaDevices: knownMediaDevices(),
            [MediaDeviceKindEnum.AudioOutput]: mapDeviceKindToHandlerValue(MediaDeviceKindEnum.AudioOutput),
            [MediaDeviceKindEnum.AudioInput]: mapDeviceKindToHandlerValue(MediaDeviceKindEnum.AudioInput),
            [MediaDeviceKindEnum.VideoInput]: mapDeviceKindToHandlerValue(MediaDeviceKindEnum.VideoInput),
            audioAutoGainControl: MediaDeviceHandler.getAudioAutoGainControl(),
            audioEchoCancellation: MediaDeviceHandler.getAudioEchoCancellation(),
            audioNoiseSuppression: MediaDeviceHandler.getAudioNoiseSuppression(),
            enableLegacyCallsVoip: SettingsStore.getValue("enableLegacyCallsVoip"),
        };
    }

    private legacyCallsEnabledWatcherRef: string | undefined;
    private stopWatchingMediaDevices?: () => void;

    public componentDidMount(): void {
        this.legacyCallsEnabledWatcherRef = SettingsStore.watchSetting(
            "enableLegacyCallsVoip",
            null,
            (...[, , , , value]) => this.setState({ enableLegacyCallsVoip: value! }),
        );

        this.stopWatchingMediaDevices = watchMediaDevices(() => this.setState({ mediaDevices: knownMediaDevices() }));
    }

    public componentWillUnmount(): void {
        SettingsStore.unwatchSetting(this.legacyCallsEnabledWatcherRef);
        this.stopWatchingMediaDevices?.();
    }

    private requestMediaPermissions = async (): Promise<void> => {
        const stream = await requestMediaPermissions();
        if (stream) {
            await refreshMediaDevices();
            // kill stream (after we've enumerated the devices, otherwise we'd get empty labels again)
            // so that we don't leave it lingering around with webcam enabled etc
            // as here we called gUM to ask user for permission to their device names only
            stream.getTracks().forEach((track) => track.stop());
        }
    };

    private setDevice = async (deviceId: string, kind: MediaDeviceKindEnum): Promise<void> => {
        // set state immediately so UI is responsive
        this.setState<any>({ [kind]: deviceId });
        try {
            await MediaDeviceHandler.instance.setDevice(deviceId, kind);
        } catch {
            logger.error(`Failed to set device ${kind}: ${deviceId}`);
            // reset state to current value
            this.setState<any>({ [kind]: mapDeviceKindToHandlerValue(kind) });
        }
    };

    private changeWebRtcMethod = (p2p: boolean): void => {
        this.context.setForceTURN(!p2p);
    };

    /**
     * The device in use as a value row, as Telegram lists settings with a value. It is there from the start and always as
     * tall, whatever the app knows of the devices.
     * @param noneLabel - What the row says when there is no device of the kind.
     * @param disabled - Whether nothing uses the device, so that there is nothing to choose.
     */
    private renderDeviceRow(kind: MediaDeviceKindEnum, noneLabel: string, disabled = false): JSX.Element {
        const { mediaDevices } = this.state;
        const devices = mediaDevices?.[kind].slice(0);
        if (!devices?.length) {
            // While the browser hides the devices' names, it uses its own choice
            const unnamed = mediaDevices === null ? _t("voip|default_device") : "";
            return (
                <SettingsValueRow
                    label={_t("common|device")}
                    value={devices ? noneLabel : unnamed}
                    options={[]}
                    onSelect={() => {}}
                    disabled
                />
            );
        }

        const defaultDevice = MediaDeviceHandler.getDefaultDevice(devices);
        // A device that isn't listed shows as the first one, as the dropdown's select did
        const selected = this.state[kind] || defaultDevice;
        return (
            <SettingsValueRow
                label={_t("common|device")}
                options={devices.map((d) => ({ key: d.deviceId, label: d.label }))}
                selectedKey={devices.some((d) => d.deviceId === selected) ? selected : devices[0].deviceId}
                onSelect={(deviceId) => this.setDevice(deviceId, kind)}
                disabled={disabled}
            />
        );
    }

    private onAutoGainChanged: ChangeEventHandler<HTMLInputElement> = async (event) => {
        const enable = event.target.checked;
        await MediaDeviceHandler.setAudioAutoGainControl(enable);
        this.setState({
            audioAutoGainControl: MediaDeviceHandler.getAudioAutoGainControl(),
        });
    };

    private onNoiseSuppressionChanged: ChangeEventHandler<HTMLInputElement> = async (event) => {
        const enable = event.target.checked;
        await MediaDeviceHandler.setAudioNoiseSuppression(enable);
        this.setState({
            audioNoiseSuppression: MediaDeviceHandler.getAudioNoiseSuppression(),
        });
    };

    private onEchoCancellationChanged: ChangeEventHandler<HTMLInputElement> = async (event) => {
        const enable = event.target.checked;
        await MediaDeviceHandler.setAudioEchoCancellation(enable);
        this.setState({
            audioEchoCancellation: MediaDeviceHandler.getAudioEchoCancellation(),
        });
    };

    /** The calls' own settings: whether Element's legacy calls are used, and what they need to connect. */
    private renderCalls(elementCallEnabled: boolean, legacyCallsUsed: boolean): JSX.Element {
        // They only apply while the legacy calls' toggle above them is on, so they sit in under it. Without Element Call
        // there is no such toggle, as legacy calls are always used
        const underLegacyCalls = (toggle: JSX.Element): JSX.Element =>
            elementCallEnabled ? <div className="mx_VoiceUserSettingsTab_dependentToggle">{toggle}</div> : toggle;

        return (
            <SettingsSection heading={_t("keyboard|category_calls")}>
                {elementCallEnabled && <SettingsFlag name="enableLegacyCallsVoip" level={SettingLevel.DEVICE} />}
                {underLegacyCalls(
                    <SettingsFlag
                        name="webRtcAllowPeerToPeer"
                        level={SettingLevel.DEVICE}
                        onChange={this.changeWebRtcMethod}
                        disabled={!legacyCallsUsed}
                    />,
                )}
                {underLegacyCalls(
                    <SettingsFlag
                        name="fallbackICEServerAllowed"
                        label={_t("settings|voip|enable_fallback_ice_server", {
                            server: new URL(FALLBACK_ICE_SERVER).pathname,
                        })}
                        level={SettingLevel.DEVICE}
                        hideIfCannotSet
                        disabled={!legacyCallsUsed}
                    />,
                )}
            </SettingsSection>
        );
    }

    /*
     * Telement: one group for each device, with what belongs to it, then the calls. The microphone serves voice messages
     * too; the speaker and the camera serve legacy calls alone, and stay in place, disabled, while those are off.
     */
    public render(): JSX.Element {
        const elementCallEnabled = !SdkConfig.get("element_call").disable;
        // We also allow/use legacy if element call is not enabled.
        const allowLegacyCalls = !SdkConfig.get("element_call").use_exclusively || !elementCallEnabled;
        const legacyCallsUsed = !elementCallEnabled || this.state.enableLegacyCallsVoip;

        return (
            <SettingsTab>
                <Form.Root
                    onSubmit={(evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                    }}
                >
                    {this.state.mediaDevices === null && (
                        <SettingsSection>
                            <Alert
                                type="info"
                                title={_t("settings|voip|permissions")}
                                actions={
                                    <AccessibleButton onClick={this.requestMediaPermissions} kind="primary">
                                        {_t("settings|voip|request_permissions")}
                                    </AccessibleButton>
                                }
                            >
                                {_t("settings|voip|missing_permissions_prompt", { brand: SdkConfig.get("brand") })}
                            </Alert>
                        </SettingsSection>
                    )}
                    <SettingsSection
                        heading={_t("common|microphone")}
                        subHeading={_t("settings|voip|voice_input_description")}
                    >
                        {this.renderDeviceRow(MediaDeviceKindEnum.AudioInput, _t("settings|voip|audio_input_empty"))}
                        <SettingsToggleInput
                            name="voice-auto-gain"
                            label={_t("settings|voip|voice_agc")}
                            checked={this.state.audioAutoGainControl}
                            onChange={this.onAutoGainChanged}
                        />
                        <SettingsToggleInput
                            name="voice-noise-suppression"
                            label={_t("settings|voip|noise_suppression")}
                            helpMessage={_t("settings|voip|noise_suppression_description")}
                            checked={this.state.audioNoiseSuppression}
                            onChange={this.onNoiseSuppressionChanged}
                        />
                        <SettingsToggleInput
                            name="voice-echo-cancellation"
                            label={_t("settings|voip|echo_cancellation")}
                            helpMessage={_t("settings|voip|echo_cancellation_description")}
                            checked={this.state.audioEchoCancellation}
                            onChange={this.onEchoCancellationChanged}
                        />
                    </SettingsSection>
                    {allowLegacyCalls && (
                        <>
                            <SettingsSection
                                heading={_t("settings|voip|audio_output")}
                                subHeading={_t("telement|settings|speaker_description")}
                            >
                                {this.renderDeviceRow(
                                    MediaDeviceKindEnum.AudioOutput,
                                    _t("settings|voip|audio_output_empty"),
                                    !legacyCallsUsed,
                                )}
                            </SettingsSection>
                            <SettingsSection
                                heading={_t("common|camera")}
                                subHeading={_t("telement|settings|camera_description")}
                            >
                                {this.renderDeviceRow(
                                    MediaDeviceKindEnum.VideoInput,
                                    _t("settings|voip|video_input_empty"),
                                    !legacyCallsUsed,
                                )}
                                <SettingsFlag
                                    name="VideoView.flipVideoHorizontally"
                                    level={SettingLevel.ACCOUNT}
                                    disabled={!legacyCallsUsed}
                                />
                            </SettingsSection>
                            {this.renderCalls(elementCallEnabled, legacyCallsUsed)}
                        </>
                    )}
                </Form.Root>
            </SettingsTab>
        );
    }
}
