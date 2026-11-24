/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type Configuration } from "electron-builder";

/** The parts of electron-builder's configuration that Telement changes. */
interface PackagingConfiguration {
    extraMetadata: { name: string; description: string };
    extraResources?: Configuration["extraResources"];
    deb: { recommends?: string[]; synopsis?: string; fpm: string[] };
}

const COPYRIGHT_NOTE = "telement/release/COPYRIGHT";
const LICENSE_TEXTS = ["LICENSE-AGPL-3.0", "LICENSE-GPL-3.0"];

/** Changes upstream's electron-builder configuration where Telement's packages differ from Element's. */
export function configureTelementPackaging(config: PackagingConfiguration): void {
    // Without a list, electron-builder recommends libappindicator3-1, which Electron no longer uses
    config.deb.recommends = [];
    config.deb.synopsis = config.extraMetadata.description;

    config.extraResources = [
        config.extraResources ?? [],
        { from: COPYRIGHT_NOTE, to: "COPYRIGHT" },
        LICENSE_TEXTS.map((fileName) => ({ from: `../../${fileName}`, to: fileName })),
    ].flat();

    // Debian's place for it. fpm takes files only after all of its options.
    config.deb.fpm.push(`${COPYRIGHT_NOTE}=/usr/share/doc/${config.extraMetadata.name}/copyright`);
}
