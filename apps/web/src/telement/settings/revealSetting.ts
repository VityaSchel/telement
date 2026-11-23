/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/** The cards of settings groups (settingsGroupCard in _common.pcss). */
const CARD = [
    ".mx_SettingsSubsection_content",
    ".mx_SettingsFieldset_content",
    ".mx_SettingsSection_content",
    ".mx_SettingsSection_subSections",
].join(", ");

/** The groups, whose label is above their card. */
const GROUP = ".mx_SettingsSubsection, .mx_SettingsFieldset, .mx_SettingsSection";

const FOCUSABLE = "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea, [tabindex]";

/** The class that fills the row search found (_SettingsSearch.pcss). */
export const FOUND_CLASS = "mx_SettingsSearch_found";

/** How long the found row keeps its fill. */
export const FOUND_DURATION_MS = 2000;

/** How long to wait for the tab to show the setting, as some tabs load what they show. */
const WAIT_MS = 3000;
const POLL_MS = 100;

/** A settings row's height (ValueRowView), the least the fill covers. */
const ROW_HEIGHT = 44;

function textOf(element: Element): string {
    return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function isShown(element: Element): boolean {
    return element.getClientRects().length > 0;
}

/**
 * The innermost element under `scope` whose whole text is `text`, preferring one that is shown: a section's heading
 * hidden behind its first group's label still names it.
 */
function findByText(scope: Element, text: string): HTMLElement | undefined {
    const matches = [...scope.querySelectorAll<HTMLElement>("*")].filter(
        (element) => textOf(element) === text && ![...element.children].some((child) => textOf(child) === text),
    );
    return matches.find(isShown) ?? matches[0];
}

function isCard(element: Element): boolean {
    return element.matches(CARD) || (element.tagName === "FORM" && !!element.parentElement?.matches(CARD));
}

/** The row of a card that holds `element`: a settings row, or what the card lists as one of its items. */
function rowOf(element: HTMLElement, scope: Element): HTMLElement {
    const settingsRow = element.closest<HTMLElement>("[data-settings-row]");
    if (settingsRow && scope.contains(settingsRow)) return settingsRow;

    let row = element;
    while (row.parentElement && row.parentElement !== scope && !isCard(row.parentElement)) row = row.parentElement;
    return row;
}

/** Where the setting is shown in the tab panel: its row, or the card of a group found by its label alone. */
export function findSetting(panel: Element, group?: string, label?: string): HTMLElement | undefined {
    const heading = group ? findByText(panel, group) : undefined;
    const scope = heading?.closest(GROUP) ?? panel;

    if (!label) return scope === panel ? undefined : (scope.querySelector<HTMLElement>(CARD) ?? undefined);

    const text = findByText(scope, label) ?? (scope === panel ? undefined : findByText(panel, label));
    return text ? rowOf(text, scope.contains(text) ? scope : panel) : undefined;
}

/**
 * Fills the row with the row hover fill for {@link FOUND_DURATION_MS}, flashing it unless the user prefers reduced
 * motion. The fill reaches 4px from the card's sides, as a settings row's hover fill does, and is at least a row tall.
 */
function flash(row: HTMLElement): void {
    const card = row.matches(CARD) ? row : row.closest(CARD);
    const box = row.getBoundingClientRect();
    if (card && card !== row) {
        const cardBox = card.getBoundingClientRect();
        const inset = 4;
        row.style.setProperty("--mx-settings-found-start", `${box.left - cardBox.left - inset}px`);
        row.style.setProperty("--mx-settings-found-end", `${cardBox.right - box.right - inset}px`);
        row.style.setProperty("--mx-settings-found-block", `${Math.max(0, (ROW_HEIGHT - box.height) / 2)}px`);
    }
    row.classList.add(FOUND_CLASS);
    setTimeout(() => {
        row.classList.remove(FOUND_CLASS);
        for (const property of ["start", "end", "block"]) row.style.removeProperty(`--mx-settings-found-${property}`);
    }, FOUND_DURATION_MS);
}

/**
 * Shows a setting search found, once its tab is open: scrolls its row into the middle of the tab, flashes it and puts
 * the keyboard focus on its control. Waits for the tab to render it, as some tabs load first.
 * @returns a function that stops waiting
 */
export function revealSetting(tabId: string, group?: string, label?: string): () => void {
    // A tab found by its name only opens
    if (!group && !label) return () => {};

    const started = Date.now();
    let timer: number | undefined;

    const attempt = (): void => {
        const panel = document.getElementById(`mx_tabpanel_${tabId}`);
        const row = panel ? findSetting(panel, group, label) : undefined;
        if (!row) {
            if (Date.now() - started < WAIT_MS) timer = window.setTimeout(attempt, POLL_MS);
            return;
        }

        const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        row.scrollIntoView?.({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
        flash(row);
        const control = row.matches(FOCUSABLE) ? row : row.querySelector<HTMLElement>(FOCUSABLE);
        control?.focus({ preventScroll: true });
    };

    attempt();
    return () => window.clearTimeout(timer);
}
