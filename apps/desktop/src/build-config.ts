/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import path from "node:path";
import { fileURLToPath } from "node:url";
import { type JsonObject } from "shared-types";

import { loadJsonFile } from "./utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let buildConfig: BuildConfig;

interface BuildConfig {
    // Application User Model ID
    appId: string;
    // Protocol string used for OIDC callbacks
    protocol: string;
    // Older `scheme://` protocol also handled for deep links, if the build has one
    legacyProtocol: string | undefined;
    // Subject name of the code signing cert used for Windows packages, if signed
    // used as a basis for the Tray GUID which must be rolled if the certificate changes.
    windowsCertSubjectName: string | undefined;
}

export function getBuildConfig(): BuildConfig {
    if (!buildConfig) {
        const packageJson = loadJsonFile(path.join(__dirname, "..", "package.json")) as JsonObject;
        const protocol = packageJson["electron_protocol"] as string | undefined;
        buildConfig = {
            appId: (packageJson["electron_appId"] as string) || "im.riot.app",
            protocol: protocol || "io.element.desktop",
            // Packaged builds get both protocols from their variant, which may not have a legacy one
            legacyProtocol: protocol ? (packageJson["electron_legacy_protocol"] as string | undefined) : "element",
            windowsCertSubjectName: packageJson["electron_windows_cert_sn"] as string,
        };
    }

    return buildConfig;
}
