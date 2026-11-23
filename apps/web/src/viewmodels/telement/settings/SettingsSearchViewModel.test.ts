/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsSearchViewModel, type SettingsSearchTarget } from "./SettingsSearchViewModel";

const TARGETS: SettingsSearchTarget[] = [
    { tabId: "USER_PREFERENCES_TAB", path: ["Preferences"] },
    {
        tabId: "USER_PREFERENCES_TAB",
        path: ["Preferences", "Link previews", "Enable inline URL previews by default"],
        group: "Link previews",
        label: "Enable inline URL previews by default",
    },
    { tabId: "USER_APPEARANCE_TAB", path: ["Appearance", "Font size"], label: "Font size" },
    {
        tabId: "USER_PREFERENCES_TAB",
        path: ["Preferences", "Timeline", "Show previews/thumbnails for images"],
        group: "Timeline",
        label: "Show previews/thumbnails for images",
    },
    { tabId: "USER_SECURITY_TAB", path: ["Security & privacy", "Présence"], group: "Présence" },
    {
        tabId: "USER_PREFERENCES_TAB",
        path: ["Preferences", "Link previews", "Show in encrypted rooms"],
        group: "Link previews",
        label: "Show in encrypted rooms",
    },
];

describe("SettingsSearchViewModel", () => {
    let vm: SettingsSearchViewModel;
    const onChoose = vi.fn();

    const create = (): SettingsSearchViewModel =>
        (vm = new SettingsSearchViewModel({ getTargets: () => TARGETS, onChoose }));

    afterEach(() => {
        vm.dispose();
        onChoose.mockReset();
    });

    const paths = (): string[] => vm.getSnapshot().results.map((result) => result.path.join(" › "));

    it("finds nothing until something is typed", () => {
        create();
        vm.setQuery("  ");
        expect(vm.getSnapshot()).toMatchObject({ query: "  ", results: [] });
    });

    it("finds what has a word starting with each word typed, a setting named so before one in a group named so", () => {
        create();

        vm.setQuery("preview");

        expect(paths()).toEqual([
            "Preferences › Link previews › Enable inline URL previews by default",
            "Preferences › Timeline › Show previews/thumbnails for images",
            "Preferences › Link previews › Show in encrypted rooms",
        ]);
    });

    it("needs every word typed, in any order, and ignores case and accents", () => {
        create();

        vm.setQuery("URL inline");
        expect(paths()).toEqual(["Preferences › Link previews › Enable inline URL previews by default"]);

        vm.setQuery("presence");
        expect(paths()).toEqual(["Security & privacy › Présence"]);

        vm.setQuery("size font");
        expect(paths()).toEqual(["Appearance › Font size"]);
    });

    it("puts a setting whose name starts with what was typed first", () => {
        create();

        vm.setQuery("font");

        expect(paths()[0]).toBe("Appearance › Font size");
    });

    it("moves the active result around the list and to the one under the pointer", () => {
        create();
        vm.setQuery("preview");

        vm.moveActive(1);
        expect(vm.getSnapshot().activeIndex).toBe(1);
        vm.moveActive(-2);
        expect(vm.getSnapshot().activeIndex).toBe(2);
        vm.setActiveIndex(0);
        expect(vm.getSnapshot().activeIndex).toBe(0);

        vm.setQuery("previews");
        expect(vm.getSnapshot().activeIndex).toBe(0);
    });

    it("opens the place chosen", () => {
        create();
        vm.setQuery("font");

        vm.choose(vm.getSnapshot().results[0].id);

        expect(onChoose).toHaveBeenCalledWith(TARGETS[2]);
    });

    it("reads the places again for each search, in the language of the moment", () => {
        const getTargets = vi.fn(() => TARGETS);
        vm = new SettingsSearchViewModel({ getTargets, onChoose });

        vm.setQuery("f");
        vm.setQuery("fo");

        expect(getTargets).toHaveBeenCalledTimes(2);
    });
});
