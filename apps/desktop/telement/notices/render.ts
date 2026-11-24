/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type Notice } from "./types.ts";

const RULE = "=".repeat(80);
const THIN_RULE = "-".repeat(80);

const INTRODUCTION = `THIRD-PARTY NOTICES

Telement is licensed under the GNU Affero General Public License v3.0 only. It
contains the works listed below, which are by others, each above the text of
its license. Where several licenses are named, the texts are those of the ones
that Telement uses.

The desktop app is also made of Electron and Chromium, whose licenses are in
LICENSE.electron.txt and LICENSES.chromium.html.

This file is generated from what the app bundles.`;

function formatTitle({ name, version, license, within, copyright, remark }: Notice): string {
    const origin = version ? ` ${version}` : within ? `, in ${within}` : "";
    const details = [copyright, remark].filter((detail) => detail !== undefined);
    return [`${name}${origin} (${license})`, ...details.flatMap((detail) => detail.split("\n"))].join("\n    ");
}

const collator = new Intl.Collator("en", { numeric: true });

/** Renders notices as a text file, in which each license text is under the works that share it. */
export function renderNotices(notices: Notice[]): string {
    const sorted = [...notices].sort(
        (a, b) => collator.compare(a.name, b.name) || collator.compare(a.version ?? "", b.version ?? ""),
    );

    const groups = new Map<string, { text: string; titles: Set<string> }>();
    for (const notice of sorted) {
        for (const text of notice.texts) {
            const key = text.replaceAll(/\s+/g, " ").trim();
            const group = groups.get(key) ?? {
                text: text.replaceAll("\r\n", "\n").replace(/^\s*\n|\s+$/g, ""),
                titles: new Set(),
            };
            group.titles.add(formatTitle(notice));
            groups.set(key, group);
        }
    }

    const sections = [...groups.values()].map(({ text, titles }) => [RULE, ...titles, THIN_RULE, "", text].join("\n"));
    return `${[INTRODUCTION, ...sections].join("\n\n")}\n`;
}
