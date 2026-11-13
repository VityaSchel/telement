/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type UploadButtonViewSnapshot } from "@element-hq/web-shared-components";

import { type RoomUploadViewModel } from "../../room/RoomUploadViewModel";
import { AttachMenuOption, AttachMenuViewModel, type AttachMenuViewModelProps } from "./AttachMenuViewModel";

class FakeRoomUpload {
    private readonly listeners = new Set<() => void>();
    public readonly onUploadOptionSelected = vi.fn();

    public constructor(private snapshot: { options: UploadButtonViewSnapshot["options"] }) {}

    public getSnapshot = (): { options: UploadButtonViewSnapshot["options"] } => this.snapshot;

    public subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    public setOptions(options: UploadButtonViewSnapshot["options"]): void {
        this.snapshot = { options };
        this.listeners.forEach((listener) => listener());
    }
}

describe("AttachMenuViewModel", () => {
    let roomUpload: FakeRoomUpload;
    let props: AttachMenuViewModelProps;
    let vm: AttachMenuViewModel;

    const optionTypes = (): string[] => vm.getSnapshot().options.map((option) => option.type);

    beforeEach(() => {
        roomUpload = new FakeRoomUpload({
            options: [
                { type: "local", label: "Attachment" },
                { type: "module.drive", label: "From Drive" },
            ],
        });
        props = {
            roomUpload: roomUpload as unknown as RoomUploadViewModel,
            showPolls: true,
            showLocation: true,
            onPhotoOrVideoSelected: vi.fn(),
            onPollSelected: vi.fn(),
            onLocationSelected: vi.fn(),
        };
        vm = new AttachMenuViewModel(props);
    });

    afterEach(() => {
        vm.dispose();
    });

    it("lists photos and videos, files, module options, polls and location", () => {
        expect(vm.getSnapshot().options.map(({ type, label }) => ({ type, label }))).toEqual([
            { type: AttachMenuOption.PhotoOrVideo, label: "Photo or video" },
            { type: "local", label: "File" },
            { type: "module.drive", label: "From Drive" },
            { type: AttachMenuOption.Poll, label: "Poll" },
            { type: AttachMenuOption.Location, label: "Location" },
        ]);
    });

    it("leaves out polls and location when they aren't available", () => {
        vm.setAvailability(false, false);

        expect(optionTypes()).toEqual([AttachMenuOption.PhotoOrVideo, "local", "module.drive"]);
    });

    it("offers nothing when the user can't send messages", () => {
        roomUpload.setOptions([]);

        expect(vm.getSnapshot().options).toEqual([]);
    });

    it("follows module options added later", () => {
        roomUpload.setOptions([
            { type: "local", label: "Attachment" },
            { type: "module.drive", label: "From Drive" },
            { type: "module.camera", label: "From camera" },
        ]);

        expect(optionTypes()).toContain("module.camera");
    });

    it.each([
        [AttachMenuOption.PhotoOrVideo, "onPhotoOrVideoSelected"],
        [AttachMenuOption.Poll, "onPollSelected"],
        [AttachMenuOption.Location, "onLocationSelected"],
    ] as const)("handles %s itself", (type, callback) => {
        vm.onUploadOptionSelected(type);

        expect(props[callback]).toHaveBeenCalledTimes(1);
        expect(roomUpload.onUploadOptionSelected).not.toHaveBeenCalled();
    });

    it.each(["local", "module.drive"])("passes %s to the room upload view model", (type) => {
        vm.onUploadOptionSelected(type);

        expect(roomUpload.onUploadOptionSelected).toHaveBeenCalledWith(type);
    });

    it("stops following the room upload view model once disposed", () => {
        vm.dispose();
        roomUpload.setOptions([]);

        expect(vm.getSnapshot().options).not.toEqual([]);
    });
});
