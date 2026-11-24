/*
Copyright 2024 New Vector Ltd.
Copyright 2020 The Matrix.org Foundation C.I.C.
Copyright 2019 New Vector Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen, waitFor, within } from "test-utils-rtl";
import userEvent from "@testing-library/user-event";
import { logger } from "matrix-js-sdk/src/logger";
import { flushPromises } from "test-utils";

import VoiceUserSettingsTab from "./VoiceUserSettingsTab";
import MediaDeviceHandler, { type IMediaDevices, MediaDeviceKindEnum } from "../../../../../MediaDeviceHandler";
import SdkConfig from "../../../../../SdkConfig";
import { SettingLevel } from "../../../../../settings/SettingLevel";
import SettingsStore from "../../../../../settings/SettingsStore";
import { knownMediaDevices } from "../../../../../telement/media/mediaDevices";
import { requestMediaPermissions } from "../../../../../utils/media/requestMediaPermissions";

vi.mock("../../../../../MediaDeviceHandler");
vi.mock("../../../../../telement/media/mediaDevices", { spy: true });
vi.mock("../../../../../utils/media/requestMediaPermissions");
const MediaDeviceHandlerMock = vi.mocked(MediaDeviceHandler);

describe("<VoiceUserSettingsTab />", () => {
    const getComponent = (): React.ReactElement => <VoiceUserSettingsTab />;

    const audioIn1 = {
        deviceId: "1",
        groupId: "g1",
        kind: MediaDeviceKindEnum.AudioInput,
        label: "Audio input test 1",
    };
    const audioOut1 = {
        deviceId: "4",
        groupId: "g1",
        kind: MediaDeviceKindEnum.AudioOutput,
        label: "Audio output test 1",
    };
    const videoIn1 = {
        deviceId: "2",
        groupId: "g1",
        kind: MediaDeviceKindEnum.VideoInput,
        label: "Video input test 1",
    };
    const videoIn2 = {
        deviceId: "3",
        groupId: "g1",
        kind: MediaDeviceKindEnum.VideoInput,
        label: "Video input test 2",
    };
    const mediaDevices = (devices: Partial<Record<MediaDeviceKindEnum, unknown[]>>): IMediaDevices =>
        ({
            [MediaDeviceKindEnum.AudioOutput]: [],
            [MediaDeviceKindEnum.AudioInput]: [],
            [MediaDeviceKindEnum.VideoInput]: [],
            ...devices,
        }) as IMediaDevices;
    const defaultMediaDevices = mediaDevices({
        [MediaDeviceKindEnum.AudioInput]: [audioIn1],
        [MediaDeviceKindEnum.VideoInput]: [videoIn1, videoIn2],
    });

    /** A group of the tab, by its label: the microphone's, the speaker's, the camera's or the calls'. */
    const group = (name: string): HTMLElement => screen.getByRole("group", { name });

    /** A device's row in its group (ValueRowView): the device in use at the row's end. */
    const deviceRow = (name: string): HTMLElement =>
        within(group(name)).getByText("Device").closest<HTMLElement>("[data-settings-row]")!;

    beforeEach(() => {
        vi.clearAllMocks();
        // What the app knows from an earlier test is not known
        vi.mocked(knownMediaDevices).mockReturnValueOnce(undefined);
        MediaDeviceHandlerMock.getDevices.mockResolvedValue(defaultMediaDevices);
        MediaDeviceHandlerMock.getVideoInput.mockReturnValue(videoIn1.deviceId);

        // @ts-ignore bad mocking
        vi.spyOn(MediaDeviceHandlerMock, "instance", "get").mockReturnValue({
            setDevice: vi.fn().mockResolvedValue(undefined),
        });
    });

    afterEach(async () => {
        vi.mocked(knownMediaDevices).mockReset();
        vi.mocked(SettingsStore.canSetValue).mockRestore?.();
        SdkConfig.reset();
        await SettingsStore.setValue("enableLegacyCallsVoip", null, SettingLevel.DEVICE, null);
    });

    describe("groups", () => {
        /** The group's switches, by the names they are expected to have. */
        const switches = (name: string, labels: string[]): HTMLElement[] =>
            labels.map((label) => within(group(name)).getByRole("switch", { name: label }));

        it("are the microphone, the speaker, the camera and the calls, each with what belongs to it", async () => {
            render(getComponent());
            await flushPromises();

            // Speaker is upstream's "Audio Output", which Telement overrides
            expect(
                screen.getAllByRole("group").map((element) => within(element).getByRole("heading").textContent),
            ).toEqual(["Microphone", "Audio Output", "Camera", "Calls"]);
            expect(deviceRow("Microphone")).toBeInTheDocument();
            expect(within(group("Microphone")).getAllByRole("switch")).toEqual(
                switches("Microphone", [
                    "Automatically adjust the microphone volume",
                    "Noise suppression",
                    "Echo cancellation",
                ]),
            );
            expect(deviceRow("Audio Output")).toBeInTheDocument();
            expect(within(group("Audio Output")).queryByRole("switch")).toBeNull();
            expect(deviceRow("Camera")).toBeInTheDocument();
            expect(within(group("Camera")).getAllByRole("switch")).toEqual(
                switches("Camera", ["Mirror local video feed"]),
            );
            expect(within(group("Calls")).getAllByRole("switch")).toEqual(
                switches("Calls", [
                    "Enable legacy voice/video calls",
                    "Allow Peer-to-Peer for 1:1 calls",
                    "Allow fallback call assist server (turn.matrix.org)",
                ]),
            );
            // Its first row, as a card puts a row 4px from its edge (_common.pcss)
            for (const name of ["Microphone", "Audio Output", "Camera"]) {
                expect(deviceRow(name).parentElement!.firstElementChild).toBe(deviceRow(name));
                expect(deviceRow(name).parentElement).toHaveClass("mx_SettingsSection_subSections");
            }
        });

        it("say what each device is used for in the help under their card", () => {
            render(getComponent());

            for (const [name, help] of [
                ["Microphone", /used for voice messages and legacy calls/],
                ["Audio Output", "The speaker chosen here is used for legacy calls."],
                ["Camera", "The camera chosen here is used for legacy calls."],
            ] as const) {
                expect(within(group(name)).getByText(help)).toHaveClass("mx_SettingsSection_help");
            }
        });

        it("keep what only legacy calls use in place, disabled, while those are off", async () => {
            MediaDeviceHandlerMock.getDevices.mockResolvedValue(
                mediaDevices({ ...defaultMediaDevices, [MediaDeviceKindEnum.AudioOutput]: [audioOut1] }),
            );
            await SettingsStore.setValue("enableLegacyCallsVoip", null, SettingLevel.DEVICE, false);
            // Without a client, account settings can't be set
            vi.spyOn(SettingsStore, "canSetValue").mockReturnValue(true);
            render(getComponent());
            await flushPromises();

            expect(screen.getAllByRole("group")).toHaveLength(4);
            expect(deviceRow("Microphone")).toHaveRole("button");
            for (const [name, device] of [
                ["Audio Output", audioOut1],
                ["Camera", videoIn1],
            ] as const) {
                expect(deviceRow(name)).toHaveAttribute("aria-disabled", "true");
                expect(deviceRow(name)).not.toHaveRole("button");
                expect(deviceRow(name)).toHaveTextContent(`Device${device.label}`);
            }
            for (const name of [
                "Mirror local video feed",
                "Allow Peer-to-Peer for 1:1 calls",
                "Allow fallback call assist server (turn.matrix.org)",
            ]) {
                expect(screen.getByRole("switch", { name })).toBeDisabled();
            }
            // The microphone serves voice messages too
            for (const control of within(group("Microphone")).getAllByRole("switch")) expect(control).toBeEnabled();

            await userEvent.click(screen.getByRole("switch", { name: "Enable legacy voice/video calls" }));
            await waitFor(() => expect(deviceRow("Camera")).toHaveRole("button"));
            expect(screen.getByRole("switch", { name: "Mirror local video feed" })).toBeEnabled();
            expect(screen.getByRole("switch", { name: "Allow Peer-to-Peer for 1:1 calls" })).toBeEnabled();
        });

        it("indent the calls' settings that legacy calls need under their toggle", () => {
            render(getComponent());

            const legacy = screen.getByRole("switch", { name: "Enable legacy voice/video calls" });
            const peerToPeer = screen.getByRole("switch", { name: "Allow Peer-to-Peer for 1:1 calls" });
            expect(peerToPeer.closest(".mx_VoiceUserSettingsTab_dependentToggle")).not.toBeNull();
            expect(legacy.closest(".mx_VoiceUserSettingsTab_dependentToggle")).toBeNull();
            expect(legacy.compareDocumentPosition(peerToPeer)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        });

        it("are the microphone's alone where legacy calls aren't allowed", () => {
            SdkConfig.add({ element_call: { use_exclusively: true } });
            render(getComponent());

            expect(screen.getAllByRole("group")).toEqual([group("Microphone")]);
        });

        it("have no toggle for legacy calls without Element Call, as they are always used", async () => {
            SdkConfig.add({ element_call: { disable: true } });
            await SettingsStore.setValue("enableLegacyCallsVoip", null, SettingLevel.DEVICE, false);
            render(getComponent());
            await flushPromises();

            expect(screen.queryByRole("switch", { name: "Enable legacy voice/video calls" })).toBeNull();
            const peerToPeer = screen.getByRole("switch", { name: "Allow Peer-to-Peer for 1:1 calls" });
            expect(peerToPeer).toBeEnabled();
            expect(peerToPeer.closest(".mx_VoiceUserSettingsTab_dependentToggle")).toBeNull();
            expect(deviceRow("Camera")).toHaveRole("button");
        });
    });

    describe("devices", () => {
        const chooseDevice = async (name: string, device: string): Promise<void> => {
            await userEvent.click(deviceRow(name));
            await userEvent.click(screen.getByRole("menuitemradio", { name: device }));
        };

        it("renders value rows for input devices", async () => {
            render(getComponent());
            await flushPromises();

            expect(deviceRow("Microphone")).toHaveTextContent(`Device${audioIn1.label}`);
            expect(deviceRow("Camera")).toHaveTextContent(`Device${videoIn1.label}`);
        });

        it("updates device", async () => {
            render(getComponent());
            await flushPromises();

            await chooseDevice("Camera", videoIn2.label);

            expect(MediaDeviceHandlerMock.instance.setDevice).toHaveBeenCalledWith(
                videoIn2.deviceId,
                MediaDeviceKindEnum.VideoInput,
            );

            expect(deviceRow("Camera")).toHaveTextContent(videoIn2.label);
        });

        it("logs and resets device when update fails", async () => {
            // stub to avoid littering console with expected error
            vi.spyOn(logger, "error").mockImplementation(() => {});
            vi.mocked(MediaDeviceHandlerMock.instance.setDevice).mockRejectedValue("oups!");
            render(getComponent());
            await flushPromises();

            await chooseDevice("Camera", videoIn2.label);

            expect(MediaDeviceHandlerMock.instance.setDevice).toHaveBeenCalledWith(
                videoIn2.deviceId,
                MediaDeviceKindEnum.VideoInput,
            );

            await flushPromises();

            expect(logger.error).toHaveBeenCalledWith("Failed to set device videoinput: 3");
            // reset to original
            await waitFor(() => expect(deviceRow("Camera")).toHaveTextContent(videoIn1.label));
        });

        it("says when there is no device of a kind, in the row it would be on", async () => {
            render(getComponent());
            await flushPromises();

            expect(deviceRow("Audio Output")).toHaveTextContent("DeviceNo Audio Outputs detected");
            expect(deviceRow("Audio Output")).not.toHaveRole("button");
        });

        it("opens with the devices the app already knows", () => {
            vi.mocked(knownMediaDevices).mockReset().mockReturnValueOnce(defaultMediaDevices);
            render(getComponent());

            expect(deviceRow("Microphone")).toHaveTextContent(`Device${audioIn1.label}`);
            expect(deviceRow("Camera")).toHaveTextContent(`Device${videoIn1.label}`);
        });

        it("opens with a row for each device before the browser has listed them, without asking for permission", async () => {
            render(getComponent());

            for (const name of ["Microphone", "Audio Output", "Camera"]) {
                expect(deviceRow(name)).toHaveTextContent(/^Device$/);
            }
            expect(screen.queryByText("Allow microphone and camera access")).toBeNull();
            const rows = document.querySelectorAll("[data-settings-row]").length;

            await flushPromises();
            expect(deviceRow("Microphone")).toHaveTextContent(`Device${audioIn1.label}`);
            expect(document.querySelectorAll("[data-settings-row]")).toHaveLength(rows);
            expect(screen.queryByText("Allow microphone and camera access")).toBeNull();
        });

        it("follows the devices as they come and go", async () => {
            const target = new EventTarget();
            Object.defineProperty(navigator, "mediaDevices", { value: target, configurable: true });
            render(getComponent());
            await flushPromises();
            expect(deviceRow("Audio Output")).toHaveTextContent("DeviceNo Audio Outputs detected");

            MediaDeviceHandlerMock.getDevices.mockResolvedValue(
                mediaDevices({ ...defaultMediaDevices, [MediaDeviceKindEnum.AudioOutput]: [audioOut1] }),
            );
            target.dispatchEvent(new Event("devicechange"));
            await act(flushPromises);

            expect(deviceRow("Audio Output")).toHaveTextContent(`Device${audioOut1.label}`);
        });

        it("offers to ask for permission while the browser hides the devices' names, and uses its default ones", async () => {
            vi.mocked(knownMediaDevices).mockReset().mockReturnValue(null);
            render(getComponent());

            expect(screen.getByText("Allow microphone and camera access")).toBeInTheDocument();
            for (const name of ["Microphone", "Audio Output", "Camera"]) {
                expect(deviceRow(name)).toHaveTextContent(/^DeviceDefault Device$/);
                expect(deviceRow(name)).not.toHaveRole("button");
            }

            const track = { stop: vi.fn() };
            vi.mocked(requestMediaPermissions).mockImplementation(async () => {
                // The browser names the devices from here on
                vi.mocked(knownMediaDevices).mockReset();
                return { getTracks: () => [track] } as unknown as MediaStream;
            });
            await userEvent.click(screen.getByRole("button", { name: "Request" }));
            await act(flushPromises);

            expect(screen.queryByText("Allow microphone and camera access")).toBeNull();
            expect(deviceRow("Microphone")).toHaveTextContent(`Device${audioIn1.label}`);
            await waitFor(() => expect(track.stop).toHaveBeenCalled());
        });
    });

    it("renders audio processing settings", () => {
        const { getByRole } = render(getComponent());
        expect(getByRole("switch", { name: "Automatically adjust the microphone volume" })).toBeTruthy();
        expect(getByRole("switch", { name: "Noise suppression" })).toBeTruthy();
        expect(getByRole("switch", { name: "Echo cancellation" })).toBeTruthy();
    });

    it("sets and displays audio processing settings", () => {
        MediaDeviceHandlerMock.getAudioAutoGainControl.mockReturnValue(false);
        MediaDeviceHandlerMock.getAudioEchoCancellation.mockReturnValue(true);
        MediaDeviceHandlerMock.getAudioNoiseSuppression.mockReturnValue(false);

        const { getByRole } = render(getComponent());

        getByRole("switch", { name: "Automatically adjust the microphone volume" }).click();
        getByRole("switch", { name: "Noise suppression" }).click();
        getByRole("switch", { name: "Echo cancellation" }).click();

        expect(MediaDeviceHandler.setAudioAutoGainControl).toHaveBeenCalledWith(true);
        expect(MediaDeviceHandler.setAudioEchoCancellation).toHaveBeenCalledWith(false);
        expect(MediaDeviceHandler.setAudioNoiseSuppression).toHaveBeenCalledWith(true);
    });
});
