/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/*
 * Writes the third-party notices of Telement, or exits with 1 if something that it ships has none.
 * Usage: node generate.ts [--webapp <directory>] [--output <file>] [--report <file>]
 */

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import crates from "./crates.json" with { type: "json" };
import { collectNotices } from "./notices.ts";
import { overrides } from "./overrides.ts";
import { renderNotices } from "./render.ts";

const textsDir = import.meta.dirname;
const desktopDir = path.join(textsDir, "..", "..");

/** Writes the notices, and a list of where they are from if asked to. Returns whether nothing would ship without one. */
export function generate({ webapp, output, report }: { webapp: string; output: string; report?: string }): boolean {
    const input = { webappDir: webapp, desktopDir, textsDir, overrides, crates };
    const { notices, problems, unusedOverrides } = collectNotices(input);

    if (unusedOverrides.length) {
        console.warn(`Overrides that no longer apply to anything:\n  ${unusedOverrides.join("\n  ")}`);
    }
    if (report) {
        const rows = notices.map(({ name, version, within, license, source }) =>
            [name, version ?? (within ? `in ${within}` : ""), license, source].join(" | "),
        );
        fs.writeFileSync(report, `${rows.sort().join("\n")}\n`);
    }
    if (problems.length) {
        console.error(`These would ship without a license notice:\n  ${problems.join("\n  ")}`);
        console.error(`See ${path.join(textsDir, "overrides.ts")}.`);
        return false;
    }

    fs.writeFileSync(output, renderNotices(notices));
    console.log(`Wrote ${notices.length} third-party notices to ${output}`);
    return true;
}

// Whether this is run, rather than imported
if (fs.realpathSync(process.argv[1]) === import.meta.filename) {
    const { values } = parseArgs({
        options: {
            webapp: { type: "string", default: path.join(desktopDir, "webapp") },
            output: {
                type: "string",
                default: path.join(desktopDir, "telement", "release", "THIRD-PARTY-NOTICES.txt"),
            },
            report: { type: "string" },
        },
    });
    if (!generate(values)) process.exitCode = 1;
}
