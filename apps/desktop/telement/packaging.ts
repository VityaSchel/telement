/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type Configuration } from "electron-builder";

/** The parts of electron-builder's configuration that Telement changes. */
interface PackagingConfiguration {
    extraMetadata: { name: string; productName: string; description: string };
    extraResources?: Configuration["extraResources"];
    linux: { extraFiles?: Configuration["extraFiles"] };
    deb: { recommends?: string[]; synopsis?: string; fpm: string[] };
}

const COPYRIGHT_NOTE = "telement/release/COPYRIGHT";
const LICENSE_TEXTS = ["LICENSE-AGPL-3.0", "LICENSE-GPL-3.0"];

/** Changes upstream's electron-builder configuration where Telement's packages differ from Element's. */
export function configureTelementPackaging(config: PackagingConfiguration): void {
    const { name, productName } = config.extraMetadata;

    // Without a list, electron-builder recommends libappindicator3-1, which Electron no longer uses
    config.deb.recommends = [];
    config.deb.synopsis = config.extraMetadata.description;

    config.extraResources = [
        config.extraResources ?? [],
        { from: COPYRIGHT_NOTE, to: "COPYRIGHT" },
        LICENSE_TEXTS.map((fileName) => ({ from: `../../${fileName}`, to: fileName })),
    ].flat();

    // These are for the tar.gz. The deb packs the same directory, but installs a desktop file and an icon itself.
    config.linux.extraFiles = [
        { from: "telement/release/install.txt", to: "install.txt" },
        { from: `telement/release/${name}.desktop`, to: `share/applications/${name}.desktop` },
        { from: "build/icon.png", to: `share/icons/hicolor/512x512/apps/${name}.png` },
    ];
    for (const entry of ["install.txt", "share"]) {
        config.deb.fpm.push("--exclude", `opt/${productName}/${entry}`);
    }

    // Debian's place for it. fpm takes files only after all of its options.
    config.deb.fpm.push(`${COPYRIGHT_NOTE}=/usr/share/doc/${name}/copyright`);
}
