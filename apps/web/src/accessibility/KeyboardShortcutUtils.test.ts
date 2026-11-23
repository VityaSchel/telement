/*
Copyright 2024 New Vector Ltd.
Copyright 2022 Šimon Brandner <simon.bra.ag@gmail.com>
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockPlatformPeg, unmockPlatformPeg } from "test-utils";

const PATH_TO_KEYBOARD_SHORTCUTS = "./KeyboardShortcuts";
const PATH_TO_KEYBOARD_SHORTCUT_UTILS = "./KeyboardShortcutUtils";

const mockKeyboardShortcuts = (override: Record<string, any>) => {
    vi.doMock(PATH_TO_KEYBOARD_SHORTCUTS, async () => {
        const original = await vi.importActual(PATH_TO_KEYBOARD_SHORTCUTS);
        return {
            ...original,
            ...override,
        };
    });
};
const getFile = async () => await import(PATH_TO_KEYBOARD_SHORTCUTS);
const getUtils = async () => await import(PATH_TO_KEYBOARD_SHORTCUT_UTILS);

describe("KeyboardShortcutUtils", () => {
    beforeEach(() => {
        unmockPlatformPeg();
        vi.resetModules();
    });

    it("doesn't change KEYBOARD_SHORTCUTS when getting shortcuts", async () => {
        mockKeyboardShortcuts({
            KEYBOARD_SHORTCUTS: {
                Keybind1: {},
                Keybind2: {},
            },
            MAC_ONLY_SHORTCUTS: ["Keybind1"],
            DESKTOP_SHORTCUTS: ["Keybind2"],
        });
        mockPlatformPeg({ overrideBrowserShortcuts: vi.fn().mockReturnValue(false) });
        const utils = await getUtils();
        const file = await getFile();
        const copyKeyboardShortcuts = Object.assign({}, file.KEYBOARD_SHORTCUTS);

        utils.getKeyboardShortcuts();
        expect(file.KEYBOARD_SHORTCUTS).toEqual(copyKeyboardShortcuts);
        utils.getKeyboardShortcutsForUI();
        expect(file.KEYBOARD_SHORTCUTS).toEqual(copyKeyboardShortcuts);
    });

    it("lists the shortcuts that fold spaces in the space bar under Navigation, named for what they do", async () => {
        // The real shortcuts, rather than an earlier test's
        vi.doUnmock(PATH_TO_KEYBOARD_SHORTCUTS);
        const { CATEGORIES, CategoryName, KEYBOARD_SHORTCUTS, KeyBindingAction } = await getFile();
        const { default: strings } = await import("../i18n/strings/en_EN.json");
        const folding = [KeyBindingAction.CollapseRoomListSection, KeyBindingAction.ExpandRoomListSection];

        expect(CATEGORIES[CategoryName.NAVIGATION].settingNames).toEqual(expect.arrayContaining(folding));
        expect(CATEGORIES[CategoryName.ROOM_LIST].settingNames).not.toEqual(expect.arrayContaining([folding[0]]));
        expect(CATEGORIES[CategoryName.ROOM_LIST].settingNames).not.toEqual(expect.arrayContaining([folding[1]]));
        expect(folding.map((action) => KEYBOARD_SHORTCUTS[action].displayName)).toEqual([
            "telement|keyboard|space_bar_collapse_space",
            "telement|keyboard|space_bar_expand_space",
        ]);
        expect(strings.telement.keyboard).toMatchObject({
            space_bar_collapse_space: "Collapse a space in the space bar",
            space_bar_expand_space: "Expand a space in the space bar",
        });
    });

    it("lists Telegram's keys for choosing the message to reply to under Composer, Cmd+Up/Down on macOS", async () => {
        vi.doUnmock(PATH_TO_KEYBOARD_SHORTCUTS);
        const { CATEGORIES, CategoryName, KEYBOARD_SHORTCUTS, KeyBindingAction } = await getFile();
        const { default: strings } = await import("../i18n/strings/en_EN.json");
        const walking = [KeyBindingAction.ReplyToPrevMessage, KeyBindingAction.ReplyToNextMessage];

        expect(CATEGORIES[CategoryName.COMPOSER].settingNames).toEqual(expect.arrayContaining(walking));
        expect(walking.map((action) => KEYBOARD_SHORTCUTS[action].default)).toEqual([
            { ctrlOrCmdKey: true, key: "ArrowUp" },
            { ctrlOrCmdKey: true, key: "ArrowDown" },
        ]);
        expect(strings.telement.keyboard).toMatchObject({
            reply_to_previous_message: "Reply to the previous message",
            reply_to_next_message: "Reply to the next message",
        });
    });

    it("binds no other composer keys to Ctrl or Cmd with Up or Down, as editing and send history use Up and Ctrl+Alt+Up", async () => {
        vi.doUnmock(PATH_TO_KEYBOARD_SHORTCUTS);
        const { KeyBindingAction } = await getFile();
        const { default: SettingsStore } = await import("../settings/SettingsStore");
        vi.spyOn(SettingsStore, "getValue").mockReturnValue(false);
        const { defaultBindingsProvider } = await import("../KeyBindingsDefaults");
        const arrows = ["ArrowUp", "ArrowDown"];
        const clashing = [
            ...defaultBindingsProvider.getMessageComposerBindings!(),
            ...defaultBindingsProvider.getRoomBindings!(),
            ...defaultBindingsProvider.getNavigationBindings!(),
            ...defaultBindingsProvider.getAutocompleteBindings!(),
            ...defaultBindingsProvider.getRoomListBindings!(),
            ...defaultBindingsProvider.getAccessibilityBindings!(),
            ...defaultBindingsProvider.getCallBindings!(),
        ].filter(
            ({ keyCombo }) =>
                arrows.includes(keyCombo.key!) &&
                (keyCombo.ctrlOrCmdKey || keyCombo.ctrlKey || keyCombo.metaKey) &&
                !keyCombo.altKey &&
                !keyCombo.shiftKey,
        );

        expect(clashing.map(({ action }) => action).sort()).toEqual(
            [KeyBindingAction.ReplyToNextMessage, KeyBindingAction.ReplyToPrevMessage].sort(),
        );
    });

    it("shows the room list panel shortcuts without binding them", async () => {
        const { KeyBindingAction } = await getFile();
        const utils = await getUtils();
        const { defaultBindingsProvider } = await import("../KeyBindingsDefaults");

        const panelActions = [
            KeyBindingAction.ToggleRoomListPanel,
            KeyBindingAction.ShrinkRoomListPanel,
            KeyBindingAction.GrowRoomListPanel,
            KeyBindingAction.CollapseRoomListPanel,
            KeyBindingAction.ExpandRoomListPanel,
        ];

        for (const action of panelActions) {
            expect(utils.getKeyboardShortcutValue(action)).toBeDefined();
            expect(utils.getKeyboardShortcutDisplayName(action)).toBeDefined();
        }
        // React-resizable-panels handles the keys, so we must not bind them ourselves.
        const boundActions = defaultBindingsProvider.getRoomListBindings!().map((binding) => binding.action);
        for (const action of panelActions) {
            expect(boundActions).not.toContain(action);
        }
    });

    describe("correctly filters shortcuts", () => {
        it("when on web and not on macOS", async () => {
            mockKeyboardShortcuts({
                KEYBOARD_SHORTCUTS: {
                    Keybind1: {},
                    Keybind2: {},
                    Keybind3: { controller: { settingDisabled: true } },
                    Keybind4: {},
                },
                MAC_ONLY_SHORTCUTS: ["Keybind1"],
                DESKTOP_SHORTCUTS: ["Keybind2"],
            });
            mockPlatformPeg({ overrideBrowserShortcuts: vi.fn().mockReturnValue(false) });
            expect((await getUtils()).getKeyboardShortcuts()).toEqual({ Keybind4: {} });
        });

        it("when on desktop", async () => {
            mockKeyboardShortcuts({
                KEYBOARD_SHORTCUTS: {
                    Keybind1: {},
                    Keybind2: {},
                },
                MAC_ONLY_SHORTCUTS: [],
                DESKTOP_SHORTCUTS: ["Keybind2"],
            });
            mockPlatformPeg({ overrideBrowserShortcuts: vi.fn().mockReturnValue(true) });
            expect((await getUtils()).getKeyboardShortcuts()).toEqual({ Keybind1: {}, Keybind2: {} });
        });
    });
});
