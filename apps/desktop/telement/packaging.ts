/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/** The parts of electron-builder's configuration that Telement changes. */
interface PackagingConfiguration {
    extraMetadata: { description: string };
    deb: { recommends?: string[]; synopsis?: string };
}

/** Changes upstream's electron-builder configuration where Telement's packages differ from Element's. */
export function configureTelementPackaging(config: PackagingConfiguration): void {
    // Without a list, electron-builder recommends libappindicator3-1, which Electron no longer uses
    config.deb.recommends = [];
    config.deb.synopsis = config.extraMetadata.description;
}
