/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { findSetting, FOUND_CLASS, FOUND_DURATION_MS, revealSetting } from "./revealSetting";

/** A tab panel as the settings tabs render one: groups labelled above their cards. */
const PANEL = `
    <div id="mx_tabpanel_USER_PREFERENCES_TAB">
        <div class="mx_SettingsSection">
            <h2 style="display: none">Preferences</h2>
            <div class="mx_SettingsSection_subSections">
                <div class="mx_SettingsSubsection" id="composer">
                    <div class="mx_SettingsSubsectionHeading"><h3>Composer</h3></div>
                    <div class="mx_SettingsSubsection_content" id="composer-card">
                        <form>
                            <div class="mx_SettingsFlag" id="markdown">
                                <label>Enable Markdown</label><input type="checkbox" id="markdown-input">
                            </div>
                            <div class="mx_SettingsFlag" id="emoji"><label>Enable Emoji suggestions</label></div>
                        </form>
                    </div>
                </div>
                <div class="mx_SettingsSubsection" id="time">
                    <div class="mx_SettingsSubsectionHeading"><h3>Displaying time</h3></div>
                    <div class="mx_SettingsSubsection_content" id="time-card">
                        <button data-settings-row="" id="timezone">
                            <span><span>Set timezone</span></span><span><span>Browser default</span></span>
                        </button>
                        <div class="mx_SettingsFlag" id="twelve"><label>Enable Markdown</label></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

describe("findSetting", () => {
    beforeEach(() => {
        document.body.innerHTML = PANEL;
    });

    const panel = (): HTMLElement => document.getElementById("mx_tabpanel_USER_PREFERENCES_TAB")!;

    it("finds a setting's row by its label in its group, as an item of its card", () => {
        expect(findSetting(panel(), "Composer", "Enable Emoji suggestions")?.id).toBe("emoji");
        // The same label in another group is that group's
        expect(findSetting(panel(), "Displaying time", "Enable Markdown")?.id).toBe("twelve");
        expect(findSetting(panel(), "Composer", "Enable Markdown")?.id).toBe("markdown");
    });

    it("finds a settings row as a whole, and a setting without a group anywhere on the tab", () => {
        expect(findSetting(panel(), undefined, "Set timezone")?.id).toBe("timezone");
        expect(findSetting(panel(), undefined, "Enable Emoji suggestions")?.id).toBe("emoji");
    });

    it("finds a group by its label alone as its card", () => {
        expect(findSetting(panel(), "Displaying time")?.id).toBe("time-card");
    });

    it("finds a group without content, such as the FAQ, as its description's card", () => {
        document.body.innerHTML = `
            <div id="panel">
                <div class="mx_SettingsSubsection">
                    <div class="mx_SettingsSubsectionHeading"><h3>FAQ</h3></div>
                    <div class="mx_SettingsSubsection_description" id="faq-card"><div>For help, see here.</div></div>
                </div>
            </div>
        `;

        expect(findSetting(document.getElementById("panel")!, "FAQ")?.id).toBe("faq-card");
    });

    it("finds a section that holds groups as the first one's card, as it has no card of its own", () => {
        document.body.innerHTML = `
            <div id="panel">
                <div class="mx_SettingsSection">
                    <h2>Moderation</h2>
                    <div class="mx_SettingsSection_subSections">
                        <div class="mx_SettingsSubsection">
                            <div class="mx_SettingsSubsection_content" id="moderation-card">
                                <fieldset class="mx_SettingsFieldset">
                                    <div class="mx_SettingsFieldset_content">Invites</div>
                                </fieldset>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        expect(findSetting(document.getElementById("panel")!, "Moderation")?.id).toBe("moderation-card");
    });

    it("finds nothing for a label the tab doesn't show", () => {
        expect(findSetting(panel(), "Composer", "Wallpaper")).toBeUndefined();
        expect(findSetting(panel(), "Wallpapers")).toBeUndefined();
    });
});

describe("revealSetting", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        document.body.innerHTML = "";
        HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("waits for the tab to show the setting, then scrolls to it, fills it for two seconds and focuses it", () => {
        revealSetting("USER_PREFERENCES_TAB", "Composer", "Enable Markdown");
        vi.advanceTimersByTime(300);

        document.body.innerHTML = PANEL;
        vi.advanceTimersByTime(100);

        const row = document.getElementById("markdown")!;
        expect(row.classList.contains(FOUND_CLASS)).toBe(true);
        expect(row.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "center" }));
        expect(document.activeElement).toBe(document.getElementById("markdown-input"));

        vi.advanceTimersByTime(FOUND_DURATION_MS);
        expect(row.classList.contains(FOUND_CLASS)).toBe(false);
        expect(row.style.getPropertyValue("--mx-settings-found-start")).toBe("");
    });

    it("gives up after a few seconds, and stops when asked", () => {
        const stop = revealSetting("USER_PREFERENCES_TAB", "Composer", "Enable Markdown");
        stop();
        vi.advanceTimersByTime(100);
        document.body.innerHTML = PANEL;
        vi.advanceTimersByTime(5000);

        expect(document.querySelector(`.${FOUND_CLASS}`)).toBeNull();
    });

    it("only opens a tab found by its name", () => {
        document.body.innerHTML = PANEL;
        revealSetting("USER_PREFERENCES_TAB");
        vi.advanceTimersByTime(100);

        expect(document.querySelector(`.${FOUND_CLASS}`)).toBeNull();
    });
});
